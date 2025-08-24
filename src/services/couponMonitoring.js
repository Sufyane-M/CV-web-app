// Sistema di monitoraggio per rilevare attività sospette sui coupon
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configurazione email per notifiche (opzionale)
const emailTransporter = process.env.SMTP_HOST ? nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
}) : null;

class CouponMonitoringService {
  constructor() {
    this.suspiciousThresholds = {
      // Soglie per rilevare attività sospette
      maxValidationAttemptsPerHour: 50,
      maxFailedAttemptsPerIP: 20,
      maxCouponUsagePerDay: 100,
      maxUniqueIPsPerCoupon: 10,
      maxCouponCreationPerDay: 20
    };
  }

  // Analizza i pattern di utilizzo dei coupon
  async analyzeUsagePatterns() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const alerts = [];

      // 1. Controlla tentativi di validazione eccessivi per IP
      const { data: ipAttempts } = await supabase
        .from('coupon_security_log')
        .select('ip_address, COUNT(*) as attempt_count')
        .gte('created_at', oneHourAgo.toISOString())
        .eq('action_type', 'validation_failed')
        .group('ip_address')
        .having('COUNT(*)', 'gt', this.suspiciousThresholds.maxFailedAttemptsPerIP);

      if (ipAttempts && ipAttempts.length > 0) {
        alerts.push({
          type: 'EXCESSIVE_VALIDATION_ATTEMPTS',
          severity: 'HIGH',
          description: `${ipAttempts.length} IP hanno superato la soglia di tentativi falliti`,
          data: ipAttempts,
          timestamp: now
        });
      }

      // 2. Controlla utilizzo eccessivo di coupon
      const { data: dailyUsage } = await supabase
        .from('coupon_usage')
        .select('COUNT(*) as usage_count')
        .gte('used_at', oneDayAgo.toISOString())
        .single();

      if (dailyUsage && dailyUsage.usage_count > this.suspiciousThresholds.maxCouponUsagePerDay) {
        alerts.push({
          type: 'EXCESSIVE_DAILY_USAGE',
          severity: 'MEDIUM',
          description: `Utilizzo giornaliero coupon: ${dailyUsage.usage_count}`,
          data: dailyUsage,
          timestamp: now
        });
      }

      // 3. Controlla coupon utilizzati da troppi IP diversi
      const { data: couponIPs } = await supabase
        .rpc('get_coupon_ip_diversity', {
          time_window: '24 hours'
        });

      if (couponIPs) {
        const suspiciousCoupons = couponIPs.filter(
          item => item.unique_ips > this.suspiciousThresholds.maxUniqueIPsPerCoupon
        );

        if (suspiciousCoupons.length > 0) {
          alerts.push({
            type: 'COUPON_IP_DIVERSITY',
            severity: 'HIGH',
            description: `${suspiciousCoupons.length} coupon utilizzati da troppi IP diversi`,
            data: suspiciousCoupons,
            timestamp: now
          });
        }
      }

      // 4. Controlla creazione eccessiva di coupon
      const { data: couponCreation } = await supabase
        .from('coupons')
        .select('COUNT(*) as creation_count')
        .gte('created_at', oneDayAgo.toISOString())
        .single();

      if (couponCreation && couponCreation.creation_count > this.suspiciousThresholds.maxCouponCreationPerDay) {
        alerts.push({
          type: 'EXCESSIVE_COUPON_CREATION',
          severity: 'MEDIUM',
          description: `Creazione giornaliera coupon: ${couponCreation.creation_count}`,
          data: couponCreation,
          timestamp: now
        });
      }

      // Salva gli alert nel database
      if (alerts.length > 0) {
        await this.saveAlerts(alerts);
        await this.notifyAdmins(alerts);
      }

      return alerts;
    } catch (error) {
      console.error('Errore nell\'analisi dei pattern:', error);
      return [];
    }
  }

  // Rileva tentativi di brute force sui coupon
  async detectBruteForceAttempts() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Trova IP con troppi tentativi falliti
      const { data: suspiciousIPs } = await supabase
        .from('coupon_security_log')
        .select(`
          ip_address,
          COUNT(*) as failed_attempts,
          MIN(created_at) as first_attempt,
          MAX(created_at) as last_attempt,
          ARRAY_AGG(DISTINCT coupon_code) as attempted_codes
        `)
        .gte('created_at', oneHourAgo.toISOString())
        .eq('action_type', 'validation_failed')
        .group('ip_address')
        .having('COUNT(*)', 'gt', 10);

      if (suspiciousIPs && suspiciousIPs.length > 0) {
        // Blocca automaticamente gli IP sospetti
        for (const ip of suspiciousIPs) {
          await this.blockSuspiciousIP(ip.ip_address, {
            reason: 'Brute force detection',
            failed_attempts: ip.failed_attempts,
            time_window: '1 hour',
            attempted_codes: ip.attempted_codes
          });
        }

        return suspiciousIPs;
      }

      return [];
    } catch (error) {
      console.error('Errore nel rilevamento brute force:', error);
      return [];
    }
  }

  // Analizza i pattern temporali di utilizzo
  async analyzeTemporalPatterns() {
    try {
      const { data: hourlyUsage } = await supabase
        .rpc('get_hourly_coupon_usage', {
          days_back: 7
        });

      if (!hourlyUsage) return null;

      // Calcola statistiche
      const usageCounts = hourlyUsage.map(h => h.usage_count);
      const average = usageCounts.reduce((a, b) => a + b, 0) / usageCounts.length;
      const max = Math.max(...usageCounts);

      // Rileva picchi anomali (più di 3x la media)
      const anomalies = hourlyUsage.filter(h => h.usage_count > average * 3);

      if (anomalies.length > 0) {
        await this.logSecurityEvent({
          action_type: 'temporal_anomaly',
          details: {
            anomalies,
            average_usage: average,
            max_usage: max,
            anomaly_threshold: average * 3
          }
        });
      }

      return {
        average,
        max,
        anomalies,
        total_hours: hourlyUsage.length
      };
    } catch (error) {
      console.error('Errore nell\'analisi temporale:', error);
      return null;
    }
  }

  // Blocca un IP sospetto
  async blockSuspiciousIP(ipAddress, reason) {
    try {
      // Inserisci nella blacklist (se esiste una tabella apposita)
      const { error } = await supabase
        .from('ip_blacklist')
        .upsert({
          ip_address: ipAddress,
          reason: JSON.stringify(reason),
          blocked_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 ore
        });

      if (error && error.code !== '42P01') { // Ignora se la tabella non esiste
        console.error('Errore nel blocco IP:', error);
      }

      // Log dell'evento
      await this.logSecurityEvent({
        ip_address: ipAddress,
        action_type: 'ip_blocked',
        details: reason
      });

      console.log(`IP ${ipAddress} bloccato per:`, reason);
    } catch (error) {
      console.error('Errore nel blocco IP:', error);
    }
  }

  // Salva gli alert nel database
  async saveAlerts(alerts) {
    try {
      const alertRecords = alerts.map(alert => ({
        alert_type: alert.type,
        severity: alert.severity,
        description: alert.description,
        alert_data: alert.data,
        created_at: alert.timestamp.toISOString()
      }));

      const { error } = await supabase
        .from('security_alerts')
        .insert(alertRecords);

      if (error && error.code !== '42P01') { // Ignora se la tabella non esiste
        console.error('Errore nel salvataggio alert:', error);
      }
    } catch (error) {
      console.error('Errore nel salvataggio alert:', error);
    }
  }

  // Notifica gli amministratori
  async notifyAdmins(alerts) {
    try {
      const highSeverityAlerts = alerts.filter(a => a.severity === 'HIGH');
      
      if (highSeverityAlerts.length === 0) return;

      // Notifica via email se configurata
      if (emailTransporter && process.env.ADMIN_EMAIL) {
        const subject = `[SICUREZZA] ${highSeverityAlerts.length} alert di sicurezza coupon`;
        const text = highSeverityAlerts
          .map(alert => `${alert.type}: ${alert.description}`)
          .join('\n');

        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@example.com',
          to: process.env.ADMIN_EMAIL,
          subject,
          text
        });
      }

      // Notifica via webhook se configurato
      if (process.env.SECURITY_WEBHOOK_URL) {
        await fetch(process.env.SECURITY_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alerts: highSeverityAlerts,
            timestamp: new Date().toISOString()
          })
        });
      }

      console.log(`Notificati ${highSeverityAlerts.length} alert di alta severità`);
    } catch (error) {
      console.error('Errore nelle notifiche admin:', error);
    }
  }

  // Log di eventi di sicurezza
  async logSecurityEvent(eventData) {
    try {
      const { error } = await supabase
        .from('coupon_security_log')
        .insert({
          ...eventData,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Errore nel logging evento:', error);
      }
    } catch (error) {
      console.error('Errore nel logging evento:', error);
    }
  }

  // Genera report di sicurezza
  async generateSecurityReport(days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [securityLogs, couponUsage, alerts] = await Promise.all([
        supabase
          .from('coupon_security_log')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false }),
        
        supabase
          .from('coupon_usage')
          .select('*')
          .gte('used_at', startDate.toISOString()),
        
        supabase
          .from('security_alerts')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false })
      ]);

      return {
        period: `${days} giorni`,
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
        security_events: securityLogs.data?.length || 0,
        coupon_usage: couponUsage.data?.length || 0,
        alerts: alerts.data?.length || 0,
        high_severity_alerts: alerts.data?.filter(a => a.severity === 'HIGH').length || 0,
        details: {
          security_logs: securityLogs.data || [],
          usage_data: couponUsage.data || [],
          alert_data: alerts.data || []
        }
      };
    } catch (error) {
      console.error('Errore nella generazione report:', error);
      return null;
    }
  }
}

// Funzione per avviare il monitoraggio periodico
const startPeriodicMonitoring = () => {
  const monitoring = new CouponMonitoringService();
  
  // Analisi ogni 15 minuti
  setInterval(async () => {
    try {
      await monitoring.analyzeUsagePatterns();
      await monitoring.detectBruteForceAttempts();
    } catch (error) {
      console.error('Errore nel monitoraggio periodico:', error);
    }
  }, 15 * 60 * 1000);
  
  // Analisi temporale ogni ora
  setInterval(async () => {
    try {
      await monitoring.analyzeTemporalPatterns();
    } catch (error) {
      console.error('Errore nell\'analisi temporale:', error);
    }
  }, 60 * 60 * 1000);
  
  console.log('Monitoraggio sicurezza coupon avviato');
};

module.exports = {
  CouponMonitoringService,
  startPeriodicMonitoring
};