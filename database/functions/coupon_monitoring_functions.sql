-- Funzioni RPC per il monitoraggio avanzato dei coupon

-- Funzione per ottenere la diversità di IP per coupon
CREATE OR REPLACE FUNCTION get_coupon_ip_diversity(time_window TEXT DEFAULT '24 hours')
RETURNS TABLE (
    coupon_code VARCHAR(50),
    unique_ips BIGINT,
    total_usage BIGINT,
    first_usage TIMESTAMP WITH TIME ZONE,
    last_usage TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cu.coupon_code,
        COUNT(DISTINCT csl.ip_address) as unique_ips,
        COUNT(*) as total_usage,
        MIN(cu.used_at) as first_usage,
        MAX(cu.used_at) as last_usage
    FROM coupon_usage cu
    LEFT JOIN coupon_security_log csl ON csl.coupon_code = cu.coupon_code
    WHERE cu.used_at >= NOW() - time_window::INTERVAL
    GROUP BY cu.coupon_code
    HAVING COUNT(DISTINCT csl.ip_address) > 1
    ORDER BY unique_ips DESC;
END;
$$;

-- Funzione per ottenere l'utilizzo orario dei coupon
CREATE OR REPLACE FUNCTION get_hourly_coupon_usage(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    hour_timestamp TIMESTAMP WITH TIME ZONE,
    usage_count BIGINT,
    unique_users BIGINT,
    unique_ips BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH hourly_data AS (
        SELECT 
            date_trunc('hour', cu.used_at) as hour_ts,
            COUNT(*) as usage_cnt,
            COUNT(DISTINCT cu.user_id) as unique_users_cnt,
            COUNT(DISTINCT csl.ip_address) as unique_ips_cnt
        FROM coupon_usage cu
        LEFT JOIN coupon_security_log csl ON (
            csl.coupon_code = cu.coupon_code 
            AND date_trunc('hour', csl.created_at) = date_trunc('hour', cu.used_at)
        )
        WHERE cu.used_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY date_trunc('hour', cu.used_at)
    )
    SELECT 
        hour_ts as hour_timestamp,
        usage_cnt as usage_count,
        unique_users_cnt as unique_users,
        unique_ips_cnt as unique_ips
    FROM hourly_data
    ORDER BY hour_ts DESC;
END;
$$;

-- Funzione per rilevare pattern sospetti
CREATE OR REPLACE FUNCTION detect_suspicious_patterns(
    lookback_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    pattern_type TEXT,
    severity TEXT,
    description TEXT,
    affected_entities JSONB,
    detection_time TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    threshold_failed_attempts INTEGER := 20;
    threshold_usage_spike NUMERIC := 3.0;
    avg_hourly_usage NUMERIC;
BEGIN
    -- Calcola la media dell'utilizzo orario
    SELECT AVG(hourly_count) INTO avg_hourly_usage
    FROM (
        SELECT COUNT(*) as hourly_count
        FROM coupon_usage
        WHERE used_at >= NOW() - '7 days'::INTERVAL
        GROUP BY date_trunc('hour', used_at)
    ) hourly_stats;

    -- Pattern 1: IP con troppi tentativi falliti
    RETURN QUERY
    SELECT 
        'excessive_failed_attempts'::TEXT as pattern_type,
        'HIGH'::TEXT as severity,
        'IP con ' || failed_count || ' tentativi falliti in ' || lookback_hours || ' ore' as description,
        jsonb_build_object(
            'ip_address', ip_address,
            'failed_attempts', failed_count,
            'time_window_hours', lookback_hours
        ) as affected_entities,
        NOW() as detection_time
    FROM (
        SELECT 
            ip_address,
            COUNT(*) as failed_count
        FROM coupon_security_log
        WHERE created_at >= NOW() - (lookback_hours || ' hours')::INTERVAL
        AND action_type = 'validation_failed'
        GROUP BY ip_address
        HAVING COUNT(*) > threshold_failed_attempts
    ) suspicious_ips;

    -- Pattern 2: Picchi di utilizzo anomali
    IF avg_hourly_usage > 0 THEN
        RETURN QUERY
        SELECT 
            'usage_spike'::TEXT as pattern_type,
            'MEDIUM'::TEXT as severity,
            'Picco di utilizzo: ' || usage_count || ' (media: ' || ROUND(avg_hourly_usage, 2) || ')' as description,
            jsonb_build_object(
                'hour', hour_ts,
                'usage_count', usage_count,
                'average_usage', avg_hourly_usage,
                'spike_ratio', ROUND(usage_count / avg_hourly_usage, 2)
            ) as affected_entities,
            NOW() as detection_time
        FROM (
            SELECT 
                date_trunc('hour', used_at) as hour_ts,
                COUNT(*) as usage_count
            FROM coupon_usage
            WHERE used_at >= NOW() - (lookback_hours || ' hours')::INTERVAL
            GROUP BY date_trunc('hour', used_at)
            HAVING COUNT(*) > avg_hourly_usage * threshold_usage_spike
        ) usage_spikes;
    END IF;

    -- Pattern 3: Coupon utilizzati da troppi IP diversi
    RETURN QUERY
    SELECT 
        'coupon_ip_spread'::TEXT as pattern_type,
        'HIGH'::TEXT as severity,
        'Coupon ' || coupon_code || ' utilizzato da ' || ip_count || ' IP diversi' as description,
        jsonb_build_object(
            'coupon_code', coupon_code,
            'unique_ips', ip_count,
            'usage_count', usage_count
        ) as affected_entities,
        NOW() as detection_time
    FROM (
        SELECT 
            cu.coupon_code,
            COUNT(DISTINCT csl.ip_address) as ip_count,
            COUNT(*) as usage_count
        FROM coupon_usage cu
        LEFT JOIN coupon_security_log csl ON csl.coupon_code = cu.coupon_code
        WHERE cu.used_at >= NOW() - (lookback_hours || ' hours')::INTERVAL
        GROUP BY cu.coupon_code
        HAVING COUNT(DISTINCT csl.ip_address) > 10
    ) spread_coupons;

    -- Pattern 4: Utenti con utilizzo eccessivo
    RETURN QUERY
    SELECT 
        'user_excessive_usage'::TEXT as pattern_type,
        'MEDIUM'::TEXT as severity,
        'Utente con ' || usage_count || ' utilizzi di coupon in ' || lookback_hours || ' ore' as description,
        jsonb_build_object(
            'user_id', user_id,
            'usage_count', usage_count,
            'unique_coupons', unique_coupons
        ) as affected_entities,
        NOW() as detection_time
    FROM (
        SELECT 
            user_id,
            COUNT(*) as usage_count,
            COUNT(DISTINCT coupon_code) as unique_coupons
        FROM coupon_usage
        WHERE used_at >= NOW() - (lookback_hours || ' hours')::INTERVAL
        AND user_id IS NOT NULL
        GROUP BY user_id
        HAVING COUNT(*) > 5
    ) excessive_users;
END;
$$;

-- Funzione per ottenere statistiche di sicurezza
CREATE OR REPLACE FUNCTION get_security_stats(
    days_back INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    start_date TIMESTAMP WITH TIME ZONE;
BEGIN
    start_date := NOW() - (days_back || ' days')::INTERVAL;
    
    WITH stats AS (
        SELECT 
            -- Statistiche generali
            (SELECT COUNT(*) FROM coupon_usage WHERE used_at >= start_date) as total_usage,
            (SELECT COUNT(DISTINCT coupon_code) FROM coupon_usage WHERE used_at >= start_date) as unique_coupons_used,
            (SELECT COUNT(DISTINCT user_id) FROM coupon_usage WHERE used_at >= start_date AND user_id IS NOT NULL) as unique_users,
            
            -- Statistiche di sicurezza
            (SELECT COUNT(*) FROM coupon_security_log WHERE created_at >= start_date) as security_events,
            (SELECT COUNT(*) FROM coupon_security_log WHERE created_at >= start_date AND action_type = 'validation_failed') as failed_validations,
            (SELECT COUNT(*) FROM coupon_security_log WHERE created_at >= start_date AND action_type = 'blocked_brute_force') as blocked_attempts,
            
            -- Top IP con più tentativi falliti
            (SELECT jsonb_agg(jsonb_build_object('ip', ip_address, 'attempts', attempt_count))
             FROM (
                 SELECT ip_address, COUNT(*) as attempt_count
                 FROM coupon_security_log
                 WHERE created_at >= start_date AND action_type = 'validation_failed'
                 GROUP BY ip_address
                 ORDER BY attempt_count DESC
                 LIMIT 10
             ) top_ips) as top_suspicious_ips,
            
            -- Coupon più utilizzati
            (SELECT jsonb_agg(jsonb_build_object('code', coupon_code, 'usage', usage_count))
             FROM (
                 SELECT coupon_code, COUNT(*) as usage_count
                 FROM coupon_usage
                 WHERE used_at >= start_date
                 GROUP BY coupon_code
                 ORDER BY usage_count DESC
                 LIMIT 10
             ) top_coupons) as top_used_coupons
    )
    SELECT jsonb_build_object(
        'period_days', days_back,
        'start_date', start_date,
        'end_date', NOW(),
        'total_usage', total_usage,
        'unique_coupons_used', unique_coupons_used,
        'unique_users', unique_users,
        'security_events', security_events,
        'failed_validations', failed_validations,
        'blocked_attempts', blocked_attempts,
        'top_suspicious_ips', COALESCE(top_suspicious_ips, '[]'::jsonb),
        'top_used_coupons', COALESCE(top_used_coupons, '[]'::jsonb)
    ) INTO result
    FROM stats;
    
    RETURN result;
END;
$$;

-- Funzione per pulire automaticamente i dati vecchi
CREATE OR REPLACE FUNCTION cleanup_old_coupon_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_logs INTEGER;
    deleted_alerts INTEGER;
    result JSONB;
BEGIN
    -- Elimina log di sicurezza più vecchi di 90 giorni
    DELETE FROM coupon_security_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_logs = ROW_COUNT;
    
    -- Elimina alert più vecchi di 30 giorni (se la tabella esiste)
    BEGIN
        DELETE FROM security_alerts 
        WHERE created_at < NOW() - INTERVAL '30 days';
        GET DIAGNOSTICS deleted_alerts = ROW_COUNT;
    EXCEPTION
        WHEN undefined_table THEN
            deleted_alerts := 0;
    END;
    
    result := jsonb_build_object(
        'deleted_security_logs', deleted_logs,
        'deleted_alerts', deleted_alerts,
        'cleanup_date', NOW()
    );
    
    RETURN result;
END;
$$;

-- Funzione per verificare se un IP è nella blacklist
CREATE OR REPLACE FUNCTION is_ip_blacklisted(check_ip INET)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_blocked BOOLEAN := FALSE;
BEGIN
    -- Controlla se l'IP è nella blacklist e non è scaduto
    BEGIN
        SELECT EXISTS(
            SELECT 1 FROM ip_blacklist 
            WHERE ip_address = check_ip 
            AND (expires_at IS NULL OR expires_at > NOW())
        ) INTO is_blocked;
    EXCEPTION
        WHEN undefined_table THEN
            is_blocked := FALSE;
    END;
    
    RETURN is_blocked;
END;
$$;

-- Commenti per documentazione
COMMENT ON FUNCTION get_coupon_ip_diversity(TEXT) IS 'Restituisce la diversità di IP per ogni coupon nel periodo specificato';
COMMENT ON FUNCTION get_hourly_coupon_usage(INTEGER) IS 'Restituisce l utilizzo orario dei coupon negli ultimi N giorni';
COMMENT ON FUNCTION detect_suspicious_patterns(INTEGER) IS 'Rileva pattern sospetti nell utilizzo dei coupon';
COMMENT ON FUNCTION get_security_stats(INTEGER) IS 'Restituisce statistiche di sicurezza complete per il periodo specificato';
COMMENT ON FUNCTION cleanup_old_coupon_data() IS 'Pulisce automaticamente i dati vecchi del sistema coupon';
COMMENT ON FUNCTION is_ip_blacklisted(INET) IS 'Verifica se un IP è nella blacklist';