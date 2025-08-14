interface AlertThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

interface Alert {
  id: string;
  timestamp: number;
  level: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  url: string;
  userAgent: string;
  sessionId: string;
}

interface AlertCallback {
  (alert: Alert): void;
}

class PerformanceAlertSystem {
  private thresholds: AlertThreshold[] = [
    { metric: 'LCP', warning: 2500, critical: 4000, unit: 'ms' },
    { metric: 'FID', warning: 100, critical: 300, unit: 'ms' },
    { metric: 'CLS', warning: 0.1, critical: 0.25, unit: 'score' },
    { metric: 'TTFB', warning: 600, critical: 1000, unit: 'ms' },
    { metric: 'FCP', warning: 1800, critical: 3000, unit: 'ms' },
    { metric: 'Bundle Size', warning: 1000, critical: 1500, unit: 'KB' },
    { metric: 'API Response', warning: 1000, critical: 3000, unit: 'ms' },
    { metric: 'Memory Usage', warning: 50, critical: 100, unit: 'MB' },
  ];

  private alerts: Alert[] = [];
  private alertCallbacks: AlertCallback[] = [];
  private sessionId: string;
  private alertCooldown: Map<string, number> = new Map();
  private cooldownPeriod: number = 60000; // 1 minuto
  private cleanupInterval?: NodeJS.Timeout;
  
  // Memory management constants
  private readonly MAX_ALERTS = 50;
  private readonly CLEANUP_THRESHOLD = 25;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minuti

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startCleanupInterval();
  }

  private generateSessionId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  onAlert(callback: AlertCallback) {
    this.alertCallbacks.push(callback);
  }

  checkMetric(metric: string, value: number, context?: any) {
    const threshold = this.thresholds.find(t => t.metric === metric);
    if (!threshold) return;

    // Check cooldown
    const cooldownKey = `${metric}-${Math.floor(value / 100)}`; // Group similar values
    const lastAlert = this.alertCooldown.get(cooldownKey);
    if (lastAlert && Date.now() - lastAlert < this.cooldownPeriod) {
      return; // Skip alert due to cooldown
    }

    let level: 'warning' | 'critical' | null = null;
    let thresholdValue: number;

    if (value >= threshold.critical) {
      level = 'critical';
      thresholdValue = threshold.critical;
    } else if (value >= threshold.warning) {
      level = 'warning';
      thresholdValue = threshold.warning;
    }

    if (level) {
      const alert: Alert = {
        id: `${metric}-${Date.now()}`,
        timestamp: Date.now(),
        level,
        metric,
        value,
        threshold: thresholdValue,
        message: this.generateAlertMessage(metric, value, threshold, level),
        url: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
      };

      this.alerts.push(alert);
      this.alertCooldown.set(cooldownKey, Date.now());
      
      // Trigger callbacks
      this.alertCallbacks.forEach(callback => {
        try {
          callback(alert);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Alert callback error:', error);
          }
        }
      });

      // Send to monitoring service
      this.sendAlertToService(alert, context);

      // Log to console
      if (import.meta.env.DEV) {
        const emoji = level === 'critical' ? '🚨' : '⚠️';
        console.warn(`${emoji} Performance Alert: ${alert.message}`);
      }
    }
  }

  private generateAlertMessage(
    metric: string, 
    value: number, 
    threshold: AlertThreshold, 
    level: 'warning' | 'critical'
  ): string {
    const formattedValue = this.formatValue(value, threshold.unit);
    const formattedThreshold = this.formatValue(
      level === 'critical' ? threshold.critical : threshold.warning, 
      threshold.unit
    );

    const severity = level === 'critical' ? 'CRITICAL' : 'WARNING';
    
    switch (metric) {
      case 'LCP':
        return `${severity}: Largest Contentful Paint is ${formattedValue} (threshold: ${formattedThreshold}). Users may experience slow loading.`;
      case 'FID':
        return `${severity}: First Input Delay is ${formattedValue} (threshold: ${formattedThreshold}). Page may feel unresponsive.`;
      case 'CLS':
        return `${severity}: Cumulative Layout Shift is ${formattedValue} (threshold: ${formattedThreshold}). Page layout is unstable.`;
      case 'TTFB':
        return `${severity}: Time to First Byte is ${formattedValue} (threshold: ${formattedThreshold}). Server response is slow.`;
      case 'FCP':
        return `${severity}: First Contentful Paint is ${formattedValue} (threshold: ${formattedThreshold}). Initial render is slow.`;
      case 'API Response':
        return `${severity}: API response time is ${formattedValue} (threshold: ${formattedThreshold}). Backend performance issue.`;
      case 'Memory Usage':
        return `${severity}: Memory usage is ${formattedValue} (threshold: ${formattedThreshold}). Potential memory leak.`;
      default:
        return `${severity}: ${metric} is ${formattedValue} (threshold: ${formattedThreshold}).`;
    }
  }

  private formatValue(value: number, unit: string): string {
    switch (unit) {
      case 'ms':
        return `${Math.round(value)}ms`;
      case 'score':
        return value.toFixed(3);
      case 'KB':
        return `${Math.round(value)}KB`;
      case 'MB':
        return `${Math.round(value)}MB`;
      default:
        return value.toString();
    }
  }

  private async sendAlertToService(alert: Alert, context?: any) {
    // Disabilitato: non inviare alert al backend
    return;
  }

  private storeAlertLocally(alert: Alert) {
    try {
      const stored = localStorage.getItem('performance_alerts') || '[]';
      const alerts = JSON.parse(stored);
      alerts.push(alert);
      
      // Keep only last 20 alerts
      if (alerts.length > 20) {
        alerts.splice(0, alerts.length - 20);
      }
      
      localStorage.setItem('performance_alerts', JSON.stringify(alerts));
    } catch (error) {
      console.error('Failed to store alert locally:', error);
    }
  }

  // Get recent alerts
  getRecentAlerts(limit: number = 10): Alert[] {
    return this.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Get alerts by level
  getAlertsByLevel(level: 'warning' | 'critical'): Alert[] {
    return this.alerts.filter(alert => alert.level === level);
  }

  // Clear old alerts
  clearOldAlerts(maxAge: number = 3600000) { // 1 hour default
    const cutoff = Date.now() - maxAge;
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  // Get alert statistics
  getAlertStats() {
    const now = Date.now();
    const oneHour = 3600000;
    const recentAlerts = this.alerts.filter(alert => now - alert.timestamp < oneHour);
    
    return {
      total: this.alerts.length,
      recentHour: recentAlerts.length,
      critical: recentAlerts.filter(a => a.level === 'critical').length,
      warning: recentAlerts.filter(a => a.level === 'warning').length,
      byMetric: recentAlerts.reduce((acc, alert) => {
        acc[alert.metric] = (acc[alert.metric] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  // Update thresholds
  updateThreshold(metric: string, warning: number, critical: number) {
    const threshold = this.thresholds.find(t => t.metric === metric);
    if (threshold) {
      threshold.warning = warning;
      threshold.critical = critical;
    }
  }

  // Cleanup
  private cleanupAlerts() {
    // Rimuovi gli alert più vecchi mantenendo solo i più recenti
    if (this.alerts.length > this.MAX_ALERTS) {
      const alertsToKeep = this.MAX_ALERTS - this.CLEANUP_THRESHOLD;
      this.alerts = this.alerts.slice(-alertsToKeep);
      
      if (import.meta.env.DEV) {
        console.log(`🧹 Cleaned up alerts, kept ${alertsToKeep} most recent`);
      }
    }
    
    // Pulisci anche la cooldown map dalle voci scadute
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.alertCooldown.forEach((timestamp, key) => {
      if (now - timestamp > this.cooldownPeriod * 2) { // Doppio del cooldown period
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => this.alertCooldown.delete(key));
  }
  
  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupAlerts();
    }, this.CLEANUP_INTERVAL);
  }
  
  private stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  destroy() {
    this.stopCleanupInterval();
    this.alerts = [];
    this.alertCallbacks = [];
    this.alertCooldown.clear();
  }

}

export const performanceAlerts = new PerformanceAlertSystem();
export default performanceAlerts;
export type { Alert, AlertThreshold, AlertCallback };