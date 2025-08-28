-- Fix deduct_credit_on_completion function to work with existing table structure
-- The credit_deductions table only has: analysis_id (PK), user_id, deducted_at

CREATE OR REPLACE FUNCTION deduct_credit_on_completion(
    p_user_id UUID,
    p_analysis_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    remaining_credits INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_current_credits INTEGER;
    v_existing_deduction BOOLEAN := FALSE;
BEGIN
    -- Check if credit has already been deducted for this analysis (idempotency)
    SELECT EXISTS(
        SELECT 1 FROM credit_deductions
        WHERE user_id = p_user_id AND analysis_id = p_analysis_id
    ) INTO v_existing_deduction;
    
    IF v_existing_deduction THEN
        -- Credit already deducted, return current state
        SELECT credits INTO v_current_credits
        FROM user_profiles
        WHERE id = p_user_id;
        
        RETURN QUERY SELECT true, COALESCE(v_current_credits, 0), 'Credit already deducted'::TEXT;
        RETURN;
    END IF;
    
    -- Lock user row to prevent race conditions
    SELECT credits INTO v_current_credits
    FROM user_profiles
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Check if user has sufficient credits (now requires 2)
    IF COALESCE(v_current_credits, 0) < 2 THEN
        RETURN QUERY SELECT false, COALESCE(v_current_credits, 0), 'Insufficient credits (2 required)'::TEXT;
        RETURN;
    END IF;
    
    -- Deduct 2 credits
    UPDATE user_profiles
    SET 
        credits = credits - 2,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Record the deduction (only with existing columns)
    INSERT INTO credit_deductions (user_id, analysis_id)
    VALUES (p_user_id, p_analysis_id);
    
    -- Log the transaction
    INSERT INTO credit_transactions (user_id, amount, type, analysis_id, description)
    VALUES (p_user_id, -2, 'consumption', p_analysis_id, 'Analysis completion (2 credits)');
    
    RETURN QUERY SELECT true, v_current_credits - 2, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, COALESCE(v_current_credits, 0), SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION deduct_credit_on_completion(UUID, UUID) IS 'Deducts 2 credits upon analysis completion (fixed for existing table structure)';