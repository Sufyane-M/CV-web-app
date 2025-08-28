-- Migration: Add Keywords Analysis Columns
-- Description: Adds keywords_found and keywords_missing columns to cv_analyses table for enhanced keyword matching functionality

-- Add keywords_found column (array of found keywords)
ALTER TABLE public.cv_analyses 
ADD COLUMN IF NOT EXISTS keywords_found TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS keywords_missing TEXT[] DEFAULT '{}';

-- Add indexes for better performance on keyword searches
CREATE INDEX IF NOT EXISTS idx_cv_analyses_keywords_found 
ON public.cv_analyses USING GIN (keywords_found);

CREATE INDEX IF NOT EXISTS idx_cv_analyses_keywords_missing 
ON public.cv_analyses USING GIN (keywords_missing);

-- Add comments to document the new columns
COMMENT ON COLUMN public.cv_analyses.keywords_found IS 'Array of keywords found in CV that match job description requirements';
COMMENT ON COLUMN public.cv_analyses.keywords_missing IS 'Array of keywords from job description that are missing in the CV';

-- Update the updated_at trigger to include the new columns
-- (The existing trigger will automatically handle these columns)

-- Optional: Add a function to calculate keyword match percentage
CREATE OR REPLACE FUNCTION calculate_keyword_match_percentage(
    p_keywords_found TEXT[],
    p_keywords_missing TEXT[]
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_keywords INTEGER;
    found_keywords INTEGER;
BEGIN
    found_keywords := array_length(p_keywords_found, 1);
    total_keywords := found_keywords + array_length(p_keywords_missing, 1);
    
    -- Handle edge cases
    IF total_keywords = 0 THEN
        RETURN 0.00;
    END IF;
    
    IF found_keywords IS NULL THEN
        found_keywords := 0;
    END IF;
    
    RETURN ROUND((found_keywords::DECIMAL / total_keywords::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add a computed column helper function for keyword statistics
CREATE OR REPLACE FUNCTION get_keyword_stats(analysis_id UUID)
RETURNS TABLE(
    total_keywords INTEGER,
    found_keywords INTEGER,
    missing_keywords INTEGER,
    match_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(array_length(ca.keywords_found, 1), 0) + COALESCE(array_length(ca.keywords_missing, 1), 0) as total_keywords,
        COALESCE(array_length(ca.keywords_found, 1), 0) as found_keywords,
        COALESCE(array_length(ca.keywords_missing, 1), 0) as missing_keywords,
        calculate_keyword_match_percentage(ca.keywords_found, ca.keywords_missing) as match_percentage
    FROM public.cv_analyses ca
    WHERE ca.id = analysis_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_keyword_match_percentage(TEXT[], TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_keyword_stats(UUID) TO authenticated;

-- Add RLS policies for the new columns (they inherit from existing table policies)
-- No additional RLS policies needed as the columns are part of the existing table

-- Migration completed successfully
-- New columns: keywords_found, keywords_missing
-- New functions: calculate_keyword_match_percentage, get_keyword_stats
-- New indexes: idx_cv_analyses_keywords_found, idx_cv_analyses_keywords_missing