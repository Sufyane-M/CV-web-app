-- Migration: Update Credit Consumption to 2 Credits
-- Description: Updates credit consumption functions to deduct 2 credits per analysis instead of 1

-- Update consume_user_credit function to deduct 2 credits
CREATE OR REPLACE FUNCTION consume_user_credit(p_user_id UUID, p_analysis_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Verifica crediti disponibili (ora richiede 2 crediti)
    SELECT credits INTO current_credits 
    FROM user_profiles 
    WHERE id = p_user_id;
    
    IF current_credits < 2 THEN
        RETURN FALSE;
    END IF;
    
    -- Consuma 2 crediti invece di 1
    UPDATE user_profiles 
    SET 
        credits = credits - 2,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log dell'operazione con 2 crediti
    INSERT INTO credit_transactions (user_id, amount, type, analysis_id, description)
    VALUES (p_user_id, -2, 'consumption', p_analysis_id, 'Credit consumed for CV analysis (2 credits)');
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update consume_credits_for_analysis function to handle 2 credits by default
CREATE OR REPLACE FUNCTION consume_credits_for_analysis(
    p_user_id UUID,
    p_analysis_id UUID,
    p_credits_amount INTEGER DEFAULT 2  -- Changed default from 1 to 2
)
RETURNS TABLE(
    success BOOLEAN,
    remaining_credits INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_current_credits INTEGER;
    v_existing_record UUID;
BEGIN
    -- Check for existing record to ensure idempotency
    SELECT id INTO v_existing_record
    FROM credit_ledger
    WHERE user_id = p_user_id 
      AND analysis_id = p_analysis_id 
      AND transaction_type = 'deduction';
    
    IF v_existing_record IS NOT NULL THEN
        -- Already processed, return current state
        SELECT credits INTO v_current_credits
        FROM user_profiles
        WHERE id = p_user_id;
        
        RETURN QUERY SELECT true, COALESCE(v_current_credits, 0), 'Already processed'::TEXT;
        RETURN;
    END IF;
    
    -- Get current credits with row lock to prevent race conditions
    SELECT credits INTO v_current_credits
    FROM user_profiles
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Check if user has sufficient credits
    IF COALESCE(v_current_credits, 0) < p_credits_amount THEN
        RETURN QUERY SELECT false, COALESCE(v_current_credits, 0), 'Insufficient credits'::TEXT;
        RETURN;
    END IF;
    
    -- Deduct credits
    UPDATE user_profiles
    SET 
        credits = credits - p_credits_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the transaction in credit_ledger
    INSERT INTO credit_ledger (
        user_id,
        analysis_id,
        transaction_type,
        amount,
        balance_after,
        description,
        metadata
    ) VALUES (
        p_user_id,
        p_analysis_id,
        'deduction',
        -p_credits_amount,
        v_current_credits - p_credits_amount,
        CASE 
            WHEN p_credits_amount = 2 THEN 'CV analysis (2 credits)'
            ELSE 'CV analysis (' || p_credits_amount || ' credits)'
        END,
        jsonb_build_object(
            'analysis_id', p_analysis_id,
            'credits_deducted', p_credits_amount,
            'timestamp', NOW()
        )
    );
    
    RETURN QUERY SELECT true, v_current_credits - p_credits_amount, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, COALESCE(v_current_credits, 0), SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update deduct_credit_on_completion function to deduct 2 credits
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
    v_existing_deduction UUID;
BEGIN
    -- Check if credit has already been deducted for this analysis (idempotency)
    SELECT id INTO v_existing_deduction
    FROM credit_deductions
    WHERE user_id = p_user_id AND analysis_id = p_analysis_id;
    
    IF v_existing_deduction IS NOT NULL THEN
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
    
    -- Record the deduction
    INSERT INTO credit_deductions (user_id, analysis_id, credits_deducted)
    VALUES (p_user_id, p_analysis_id, 2);
    
    -- Log the transaction
    INSERT INTO credit_transactions (user_id, amount, type, analysis_id, description)
    VALUES (p_user_id, -2, 'consumption', p_analysis_id, 'Analysis completion (2 credits)');
    
    RETURN QUERY SELECT true, v_current_credits - 2, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, COALESCE(v_current_credits, 0), SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION consume_user_credit(UUID, UUID) IS 'Consumes 2 credits for CV analysis (updated from 1 credit)';
COMMENT ON FUNCTION consume_credits_for_analysis(UUID, UUID, INTEGER) IS 'Consumes specified credits for analysis with default of 2 credits';
COMMENT ON FUNCTION deduct_credit_on_completion(UUID, UUID) IS 'Deducts 2 credits upon analysis completion (updated from 1 credit)';