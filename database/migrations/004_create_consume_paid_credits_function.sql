-- Migration: Create atomic credit consumption function
-- This function prevents race conditions in credit deduction by using row-level locking

CREATE OR REPLACE FUNCTION consume_paid_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_analysis_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Get current credits and lock the row to prevent race conditions
  SELECT credits INTO current_credits
  FROM user_profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if sufficient credits available
  IF COALESCE(current_credits, 0) < p_credits THEN
    RETURN FALSE;
  END IF;
  
  -- Update credits atomically
  UPDATE user_profiles
  SET 
    credits = COALESCE(credits, 0) - p_credits,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Insert credit transaction record
  INSERT INTO credit_transactions (
    user_id,
    amount,
    transaction_type,
    analysis_id,
    created_at
  ) VALUES (
    p_user_id,
    -p_credits,
    'debit',
    p_analysis_id,
    NOW()
  );
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION consume_paid_credits(UUID, INTEGER, UUID) TO authenticated;