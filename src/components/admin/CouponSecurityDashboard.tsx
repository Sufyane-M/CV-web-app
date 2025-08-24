import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Activity, Users, TrendingUp, Eye, Ban } from 'lucide-react';
import { couponService } from '../../services/couponService';

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  timestamp: string;
  data?: any;
}

interface SecurityStats {
  total_usage: number;
  unique_coupons_used: number;
  unique_users: number;
  security_events: number;
  failed_validations: number;
  blocked_attempts: number;
  top_suspicious_ips: Array<{ ip: string; attempts: number }>;
  top_used_coupons: Array<{ code: string; usage: number }>;
}

interface SuspiciousPattern {
  pattern_type: string;
  severity: string;
  description: string;
  affected_entities: any;
  detection_time: string;
}

const CouponSecurityDashboard: React.FC = () => {
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<SecurityAlert[]>([]);
  const [suspiciousPatterns, setSuspiciousPatterns] = useState<SuspiciousPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState(7);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadSecurityData();
    
    if (autoRefresh) {
      const interval = setInterval(loadSecurityData, 30000); // Refresh ogni 30 secondi
      return () => clearInterval(interval);
    }
  }, [selectedTimeframe, autoRefresh]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      const [stats, alerts, patterns] = await Promise.all([
        fetchSecurityStats(),
        fetchRecentAlerts(),
        fetchSuspiciousPatterns()
      ]);
      
      setSecurityStats(stats);
      setRecentAlerts(alerts);
      setSuspiciousPatterns(patterns);
    } catch (error) {
      console.error('Errore nel caricamento dati sicurezza:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityStats = async (): Promise<SecurityStats> => {
    const response = await fetch(`/api/coupons/admin/security-stats?days=${selectedTimeframe}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Errore nel caricamento statistiche');
    }
    
    return response.json();
  };

  const fetchRecentAlerts = async (): Promise<SecurityAlert[]> => {
    const response = await fetch(`/api/coupons/admin/security-alerts?limit=20`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Errore nel caricamento alert');
    }
    
    return response.json();
  };

  const fetchSuspiciousPatterns = async (): Promise<SuspiciousPattern[]> => {
    const response = await fetch(`/api/coupons/admin/suspicious-patterns?hours=24`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Errore nel caricamento pattern sospetti');
    }
    
    return response.json();
  };

  const blockIP = async (ipAddress: string, reason: string) => {
    try {
      const response = await fetch('/api/coupons/admin/block-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        },
        body: JSON.stringify({ ipAddress, reason })
      });
      
      if (response.ok) {
        alert(`IP ${ipAddress} bloccato con successo`);
        loadSecurityData();
      } else {
        throw new Error('Errore nel blocco IP');
      }
    } catch (error) {
      console.error('Errore nel blocco IP:', error);
      alert('Errore nel blocco IP');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'text-red-600 bg-red-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('it-IT');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Dashboard Sicurezza Coupon
          </h1>
          <p className="text-gray-600 mt-1">
            Monitoraggio in tempo reale della sicurezza del sistema coupon
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Ultimo giorno</option>
            <option value={7}>Ultima settimana</option>
            <option value={30}>Ultimo mese</option>
          </select>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          
          <button
            onClick={loadSecurityData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Aggiorna
          </button>
        </div>
      </div>

      {/* Statistiche principali */}
      {securityStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utilizzi Totali</p>
                <p className="text-2xl font-bold text-gray-900">{securityStats.total_usage}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Eventi Sicurezza</p>
                <p className="text-2xl font-bold text-gray-900">{securityStats.security_events}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tentativi Bloccati</p>
                <p className="text-2xl font-bold text-gray-900">{securityStats.blocked_attempts}</p>
              </div>
              <Ban className="h-8 w-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utenti Unici</p>
                <p className="text-2xl font-bold text-gray-900">{securityStats.unique_users}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Alert recenti */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alert Recenti
            </h2>
          </div>
          
          <div className="p-6">
            {recentAlerts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nessun alert recente</p>
            ) : (
              <div className="space-y-4">
                {recentAlerts.slice(0, 10).map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{alert.type}</p>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatTimestamp(alert.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pattern sospetti */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Pattern Sospetti
            </h2>
          </div>
          
          <div className="p-6">
            {suspiciousPatterns.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nessun pattern sospetto rilevato</p>
            ) : (
              <div className="space-y-4">
                {suspiciousPatterns.map((pattern, index) => (
                  <div key={index} className="p-3 rounded-lg border border-red-200 bg-red-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">{pattern.pattern_type}</p>
                        <p className="text-sm text-red-700">{pattern.description}</p>
                        <p className="text-xs text-red-600 mt-1">{formatTimestamp(pattern.detection_time)}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(pattern.severity)}`}>
                        {pattern.severity}
                      </div>
                    </div>
                    
                    {pattern.affected_entities?.ip_address && (
                      <div className="mt-2 pt-2 border-t border-red-200">
                        <button
                          onClick={() => blockIP(pattern.affected_entities.ip_address, pattern.description)}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
                        >
                          Blocca IP {pattern.affected_entities.ip_address}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top IP sospetti e coupon più utilizzati */}
      {securityStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Top IP sospetti */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Top IP Sospetti</h2>
            </div>
            
            <div className="p-6">
              {securityStats.top_suspicious_ips?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nessun IP sospetto</p>
              ) : (
                <div className="space-y-3">
                  {securityStats.top_suspicious_ips?.slice(0, 10).map((ip, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{ip.ip}</p>
                        <p className="text-xs text-gray-600">{ip.attempts} tentativi falliti</p>
                      </div>
                      <button
                        onClick={() => blockIP(ip.ip, `${ip.attempts} tentativi falliti`)}
                        className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                      >
                        Blocca
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top coupon utilizzati */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Coupon Più Utilizzati</h2>
            </div>
            
            <div className="p-6">
              {securityStats.top_used_coupons?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nessun utilizzo</p>
              ) : (
                <div className="space-y-3">
                  {securityStats.top_used_coupons?.slice(0, 10).map((coupon, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{coupon.code}</p>
                        <p className="text-xs text-gray-600">{coupon.usage} utilizzi</p>
                      </div>
                      <div className="text-right">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, (coupon.usage / Math.max(...securityStats.top_used_coupons!.map(c => c.usage))) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponSecurityDashboard;