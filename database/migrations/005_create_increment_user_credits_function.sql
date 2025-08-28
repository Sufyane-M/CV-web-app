-- Migration: Create increment_user_credits function for atomic credit operations
-- This function atomically increments user credits and updates the updated_at timestamp
-- Returns the new credit balance

CREATE OR REPLACE FUNCTION increment_user_credits(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS TABLE(
  new_credits INTEGER,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_credits INTEGER;
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT 0, FALSE, 'User ID cannot be null';
    RETURN;
  END IF;

  IF p_amount IS NULL THEN
    RETURN QUERY SELECT 0, FALSE, 'Amount cannot be null';
    RETURN;
  END IF;

  -- Lock the user profile row and get current credits
  SELECT credits INTO v_current_credits
  FROM user_profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, FALSE, 'User not found';
    RETURN;
  END IF;

  -- Calculate new credits (prevent negative credits for decrements)
  v_new_credits := v_current_credits + p_amount;
  
  IF v_new_credits < 0 THEN
    RETURN QUERY SELECT v_current_credits, FALSE, 'Insufficient credits';
    RETURN;
  END IF;

  -- Update credits and timestamp atomically
  UPDATE user_profiles
  SET 
    credits = v_new_credits,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Return success result
  RETURN QUERY SELECT v_new_credits, TRUE, 'Credits updated successfully';
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN QUERY SELECT 0, FALSE, SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_user_credits(UUID, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION increment_user_credits(UUID, INTEGER) IS 
'Atomically increments user credits by the specified amount and updates the updated_at timestamp. Returns new credit balance and operation status.';