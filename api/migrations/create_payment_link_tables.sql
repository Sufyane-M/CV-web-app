-- Create table for payment link transactions
CREATE TABLE IF NOT EXISTS payment_link_transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bundle_id VARCHAR(50) NOT NULL,
  bundle_name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  credits INTEGER NOT NULL,
  stripe_session_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_link_transactions_user_id ON payment_link_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_link_transactions_stripe_session_id ON payment_link_transactions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_link_transactions_status ON payment_link_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_link_transactions_created_at ON payment_link_transactions(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE payment_link_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own payment link transactions" ON payment_link_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all payment link transactions" ON payment_link_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON payment_link_transactions TO authenticated;
GRANT ALL ON payment_link_transactions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE payment_link_transactions_id_seq TO service_role;

-- Add comment
COMMENT ON TABLE payment_link_transactions IS 'Stores transactions from Stripe payment links';