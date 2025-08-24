-- Tabella per il logging degli eventi di sicurezza del sistema coupon
CREATE TABLE IF NOT EXISTS coupon_security_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    coupon_code VARCHAR(50),
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'validation_failed',
        'blocked_brute_force',
        'duplicate_usage_attempt',
        'rate_limit_exceeded',
        'invalid_format',
        'suspicious_activity'
    )),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per ottimizzare le query di sicurezza
CREATE INDEX IF NOT EXISTS idx_coupon_security_log_ip_created 
    ON coupon_security_log(ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coupon_security_log_user_created 
    ON coupon_security_log(user_id, created_at DESC) 
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coupon_security_log_action_created 
    ON coupon_security_log(action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coupon_security_log_coupon_created 
    ON coupon_security_log(coupon_code, created_at DESC) 
    WHERE coupon_code IS NOT NULL;

-- RLS (Row Level Security) per proteggere i log
ALTER TABLE coupon_security_log ENABLE ROW LEVEL SECURITY;

-- Policy per permettere solo agli admin di leggere i log
CREATE POLICY "Admin can view security logs" ON coupon_security_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- Policy per permettere al sistema di inserire log (usando service role)
CREATE POLICY "System can insert security logs" ON coupon_security_log
    FOR INSERT WITH CHECK (true);

-- Funzione per pulire automaticamente i log vecchi (oltre 90 giorni)
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM coupon_security_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Trigger per eseguire la pulizia automatica ogni giorno
-- (Questo richiede l'estensione pg_cron se disponibile)
-- SELECT cron.schedule('cleanup-security-logs', '0 2 * * *', 'SELECT cleanup_old_security_logs();');

-- Commenti per documentazione
COMMENT ON TABLE coupon_security_log IS 'Log degli eventi di sicurezza del sistema coupon';
COMMENT ON COLUMN coupon_security_log.ip_address IS 'Indirizzo IP del client';
COMMENT ON COLUMN coupon_security_log.user_id IS 'ID utente se autenticato';
COMMENT ON COLUMN coupon_security_log.coupon_code IS 'Codice coupon coinvolto nell evento';
COMMENT ON COLUMN coupon_security_log.action_type IS 'Tipo di evento di sicurezza';
COMMENT ON COLUMN coupon_security_log.details IS 'Dettagli aggiuntivi dell evento in formato JSON';