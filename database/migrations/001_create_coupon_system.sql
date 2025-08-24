-- Migration: Create Coupon System Tables
-- Description: Creates tables for coupon management system with Stripe integration

-- Tabella per i coupon
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    currency VARCHAR(3) DEFAULT 'EUR',
    minimum_amount INTEGER DEFAULT 0, -- in cents
    maximum_discount INTEGER, -- in cents, for percentage discounts
    usage_limit INTEGER, -- null = unlimited
    usage_count INTEGER DEFAULT 0,
    user_usage_limit INTEGER DEFAULT 1, -- how many times a single user can use this coupon
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID, -- references auth.users(id) but not enforced for flexibility
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Tabella per tracciare l'utilizzo dei coupon
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    stripe_coupon_id VARCHAR(255), -- ID del coupon in Stripe
    original_amount INTEGER NOT NULL, -- in cents
    discount_amount INTEGER NOT NULL, -- in cents
    final_amount INTEGER NOT NULL, -- in cents
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(coupon_id, user_id, payment_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_valid_dates ON public.coupons(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON public.coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON public.coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_payment_id ON public.coupon_usage(payment_id);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger per aggiornare il contatore di utilizzi
CREATE OR REPLACE FUNCTION increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.coupons 
    SET usage_count = usage_count + 1 
    WHERE id = NEW.coupon_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_coupon_usage_trigger AFTER INSERT ON public.coupon_usage
    FOR EACH ROW EXECUTE FUNCTION increment_coupon_usage();

-- RLS (Row Level Security) policies
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- Policy per i coupon: tutti possono leggere i coupon attivi, solo admin possono modificare
CREATE POLICY "Coupon read policy" ON public.coupons
    FOR SELECT USING (is_active = true);

CREATE POLICY "Coupon admin policy" ON public.coupons
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.uid() = created_by);

-- Policy per l'utilizzo dei coupon: gli utenti possono vedere solo i propri utilizzi
CREATE POLICY "Coupon usage user policy" ON public.coupon_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Coupon usage insert policy" ON public.coupon_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coupon usage admin policy" ON public.coupon_usage
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Funzione per validare un coupon
CREATE OR REPLACE FUNCTION validate_coupon(
    p_code VARCHAR(50),
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS TABLE(
    is_valid BOOLEAN,
    coupon_id UUID,
    discount_amount INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_coupon RECORD;
    v_usage_count INTEGER;
    v_discount INTEGER;
BEGIN
    -- Trova il coupon
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE code = p_code AND is_active = true;
    
    -- Controlla se il coupon esiste
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, 0, 'Codice coupon non valido';
        RETURN;
    END IF;
    
    -- Controlla se il coupon è scaduto
    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, 0, 'Codice coupon scaduto';
        RETURN;
    END IF;
    
    -- Controlla se il coupon è ancora valido (data inizio)
    IF v_coupon.valid_from > NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, 0, 'Codice coupon non ancora valido';
        RETURN;
    END IF;
    
    -- Controlla il limite di utilizzi globale
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
        RETURN QUERY SELECT false, NULL::UUID, 0, 'Codice coupon esaurito';
        RETURN;
    END IF;
    
    -- Controlla il limite di utilizzi per utente
    SELECT COUNT(*) INTO v_usage_count
    FROM public.coupon_usage
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
    
    IF v_usage_count >= v_coupon.user_usage_limit THEN
        RETURN QUERY SELECT false, NULL::UUID, 0, 'Hai già utilizzato questo coupon';
        RETURN;
    END IF;
    
    -- Controlla l'importo minimo
    IF p_amount < v_coupon.minimum_amount THEN
        RETURN QUERY SELECT false, NULL::UUID, 0, 
            'Importo minimo per questo coupon: €' || (v_coupon.minimum_amount::DECIMAL / 100);
        RETURN;
    END IF;
    
    -- Calcola lo sconto
    IF v_coupon.discount_type = 'percentage' THEN
        v_discount := ROUND(p_amount * v_coupon.discount_value / 100);
        -- Applica il limite massimo di sconto se specificato
        IF v_coupon.maximum_discount IS NOT NULL AND v_discount > v_coupon.maximum_discount THEN
            v_discount := v_coupon.maximum_discount;
        END IF;
    ELSE -- fixed_amount
        v_discount := ROUND(v_coupon.discount_value * 100); -- Convert to cents
        -- Non può essere maggiore dell'importo totale
        IF v_discount > p_amount THEN
            v_discount := p_amount;
        END IF;
    END IF;
    
    RETURN QUERY SELECT true, v_coupon.id, v_discount, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per applicare un coupon
CREATE OR REPLACE FUNCTION apply_coupon(
    p_coupon_id UUID,
    p_user_id UUID,
    p_payment_id UUID,
    p_original_amount INTEGER,
    p_discount_amount INTEGER,
    p_stripe_coupon_id VARCHAR(255) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.coupon_usage (
        coupon_id,
        user_id,
        payment_id,
        stripe_coupon_id,
        original_amount,
        discount_amount,
        final_amount
    ) VALUES (
        p_coupon_id,
        p_user_id,
        p_payment_id,
        p_stripe_coupon_id,
        p_original_amount,
        p_discount_amount,
        p_original_amount - p_discount_amount
    );
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inserisci alcuni coupon di esempio
INSERT INTO public.coupons (code, name, description, discount_type, discount_value, minimum_amount, usage_limit, valid_until)
VALUES 
    ('WELCOME10', 'Sconto Benvenuto 10%', 'Sconto del 10% per i nuovi utenti', 'percentage', 10.00, 0, 100, NOW() + INTERVAL '30 days'),
    ('SAVE5', 'Sconto 5€', 'Sconto fisso di 5€ su tutti gli acquisti', 'fixed_amount', 5.00, 1000, NULL, NOW() + INTERVAL '60 days'),
    ('PREMIUM20', 'Sconto Premium 20%', 'Sconto del 20% per acquisti superiori a 15€', 'percentage', 20.00, 1500, 50, NOW() + INTERVAL '90 days')
ON CONFLICT (code) DO NOTHING;