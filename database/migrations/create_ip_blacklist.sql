-- Creazione tabella per la blacklist degli IP
-- Questa tabella gestisce il blocco temporaneo o permanente di indirizzi IP sospetti

CREATE TABLE IF NOT EXISTS ip_blacklist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    blocked_by UUID REFERENCES auth.users(id),
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_permanent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indici per ottimizzare le query
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip_address ON ip_blacklist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_blocked_at ON ip_blacklist(blocked_at);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_expires_at ON ip_blacklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_active ON ip_blacklist(ip_address) 
    WHERE expires_at IS NULL OR expires_at > NOW();

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_ip_blacklist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ip_blacklist_updated_at
    BEFORE UPDATE ON ip_blacklist
    FOR EACH ROW
    EXECUTE FUNCTION update_ip_blacklist_updated_at();

-- Funzione per verificare se un IP è bloccato
CREATE OR REPLACE FUNCTION is_ip_blacklisted(check_ip INET)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ip_blacklist 
        WHERE ip_address = check_ip 
        AND (is_permanent = TRUE OR expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per pulire automaticamente gli IP scaduti
CREATE OR REPLACE FUNCTION cleanup_expired_ip_blocks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ip_blacklist 
    WHERE is_permanent = FALSE 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log dell'operazione di pulizia
    INSERT INTO coupon_security_log (action_type, details)
    VALUES ('cleanup_expired_ips', jsonb_build_object(
        'deleted_count', deleted_count,
        'cleanup_time', NOW()
    ));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Creazione tabella per gli alert di sicurezza
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT,
    details JSONB,
    ip_address INET,
    user_id UUID REFERENCES auth.users(id),
    coupon_code VARCHAR(50),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indici per la tabella security_alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_security_alerts_ip ON security_alerts(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_alerts_unresolved ON security_alerts(is_resolved) 
    WHERE is_resolved = FALSE;

-- RLS (Row Level Security) per limitare l'accesso agli amministratori
ALTER TABLE ip_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Policy per ip_blacklist - solo admin possono vedere e modificare
CREATE POLICY "Admin can manage IP blacklist" ON ip_blacklist
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy per security_alerts - solo admin possono vedere e modificare
CREATE POLICY "Admin can manage security alerts" ON security_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Funzione per creare automaticamente alert di sicurezza
CREATE OR REPLACE FUNCTION create_security_alert(
    p_alert_type VARCHAR(50),
    p_severity VARCHAR(20),
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_coupon_code VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    alert_id UUID;
BEGIN
    INSERT INTO security_alerts (
        alert_type, severity, title, description, details,
        ip_address, user_id, coupon_code
    ) VALUES (
        p_alert_type, p_severity, p_title, p_description, p_details,
        p_ip_address, p_user_id, p_coupon_code
    ) RETURNING id INTO alert_id;
    
    -- Log dell'alert nel sistema di log
    INSERT INTO coupon_security_log (
        ip_address, user_id, coupon_code, action_type, details
    ) VALUES (
        p_ip_address, p_user_id, p_coupon_code, 'security_alert_created',
        jsonb_build_object(
            'alert_id', alert_id,
            'alert_type', p_alert_type,
            'severity', p_severity,
            'title', p_title
        )
    );
    
    RETURN alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per bloccare automaticamente IP sospetti
CREATE OR REPLACE FUNCTION auto_block_suspicious_ip(
    p_ip_address INET,
    p_reason TEXT,
    p_duration_hours INTEGER DEFAULT 24
)
RETURNS BOOLEAN AS $$
DECLARE
    existing_block RECORD;
BEGIN
    -- Verifica se l'IP è già bloccato
    SELECT * INTO existing_block FROM ip_blacklist 
    WHERE ip_address = p_ip_address 
    AND (is_permanent = TRUE OR expires_at IS NULL OR expires_at > NOW());
    
    IF existing_block.id IS NOT NULL THEN
        -- IP già bloccato, estendi la durata se necessario
        UPDATE ip_blacklist 
        SET expires_at = GREATEST(expires_at, NOW() + INTERVAL '1 hour' * p_duration_hours),
            reason = reason || '; ' || p_reason,
            updated_at = NOW()
        WHERE id = existing_block.id;
        
        RETURN FALSE; -- IP già bloccato
    ELSE
        -- Blocca nuovo IP
        INSERT INTO ip_blacklist (
            ip_address, reason, expires_at, blocked_by
        ) VALUES (
            p_ip_address, 
            p_reason, 
            NOW() + INTERVAL '1 hour' * p_duration_hours,
            NULL -- Blocco automatico
        );
        
        -- Crea alert di sicurezza
        PERFORM create_security_alert(
            'auto_ip_block',
            'high',
            'IP automaticamente bloccato',
            'IP bloccato automaticamente per attività sospetta: ' || p_reason,
            jsonb_build_object(
                'ip_address', p_ip_address,
                'reason', p_reason,
                'duration_hours', p_duration_hours,
                'auto_block', true
            ),
            p_ip_address
        );
        
        RETURN TRUE; -- Nuovo blocco creato
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commenti per documentazione
COMMENT ON TABLE ip_blacklist IS 'Tabella per gestire la blacklist degli indirizzi IP sospetti';
COMMENT ON TABLE security_alerts IS 'Tabella per gli alert di sicurezza del sistema coupon';
COMMENT ON FUNCTION is_ip_blacklisted(INET) IS 'Verifica se un indirizzo IP è attualmente bloccato';
COMMENT ON FUNCTION cleanup_expired_ip_blocks() IS 'Pulisce automaticamente i blocchi IP scaduti';
COMMENT ON FUNCTION create_security_alert IS 'Crea un nuovo alert di sicurezza nel sistema';
COMMENT ON FUNCTION auto_block_suspicious_ip IS 'Blocca automaticamente un IP sospetto';