-- Creazione tabelle per il sistema di pagamenti Stripe

-- Tabella per tracciare le sessioni di pagamento
CREATE TABLE IF NOT EXISTS payment_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  bundle_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT
);

-- Tabella per tracciare i tentativi falliti di aggiunta crediti
CREATE TABLE IF NOT EXISTS failed_credit_additions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  error TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_id ON payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_session_id ON payment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_created_at ON payment_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_failed_credit_additions_user_id ON failed_credit_additions(user_id);
CREATE INDEX IF NOT EXISTS idx_failed_credit_additions_resolved ON failed_credit_additions(resolved);
CREATE INDEX IF NOT EXISTS idx_failed_credit_additions_created_at ON failed_credit_additions(created_at);

-- Funzione per aggiungere crediti all'utente
CREATE OR REPLACE FUNCTION add_credits(user_id UUID, credits_to_add INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Aggiorna i crediti dell'utente
  UPDATE user_profiles 
  SET 
    credits = credits + credits_to_add,
    total_credits_purchased = total_credits_purchased + credits_to_add,
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Crea una transazione di credito
  INSERT INTO credit_transactions (
    user_id,
    amount,
    type,
    description,
    created_at
  ) VALUES (
    user_id,
    credits_to_add,
    'purchase',
    'Crediti acquistati tramite Stripe',
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Abilita Row Level Security
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_credit_additions ENABLE ROW LEVEL SECURITY;

-- Policy per payment_sessions
CREATE POLICY "Users can view own payment sessions" ON payment_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payment sessions" ON payment_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Policy per failed_credit_additions
CREATE POLICY "Users can view own failed credit additions" ON failed_credit_additions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage failed credit additions" ON failed_credit_additions
  FOR ALL USING (auth.role() = 'service_role');

-- Commenti per documentazione
COMMENT ON TABLE payment_sessions IS 'Traccia le sessioni di pagamento Stripe';
COMMENT ON TABLE failed_credit_additions IS 'Traccia i tentativi falliti di aggiunta crediti per retry';
COMMENT ON FUNCTION add_credits(UUID, INTEGER) IS 'Aggiunge crediti all\'utente e crea una transazione';