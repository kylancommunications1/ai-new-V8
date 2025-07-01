-- Non-destructive schema update for Gemini model selection
-- This script adds the gemini_model column to the profiles table
-- Run this in your Supabase SQL Editor

-- Add gemini_model column to profiles table (non-destructive)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gemini_model TEXT 
DEFAULT 'gemini-2.5-flash-preview-native-audio-dialog';

-- Add a check constraint to ensure only valid models are allowed
-- This will prevent invalid model names from being stored
DO $$ 
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_gemini_model_check' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_gemini_model_check 
        CHECK (gemini_model IN (
            'gemini-live-2.5-flash-preview',
            'gemini-2.0-flash-live-001', 
            'gemini-2.5-flash-preview-native-audio-dialog'
        ));
    END IF;
END $$;

-- Set default value for existing records that might have NULL
-- This is safe and won't overwrite existing values
UPDATE profiles 
SET gemini_model = 'gemini-2.5-flash-preview-native-audio-dialog' 
WHERE gemini_model IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN profiles.gemini_model IS 'Specifies which Gemini model to use for AI conversations. Options: gemini-live-2.5-flash-preview, gemini-2.0-flash-live-001, gemini-2.5-flash-preview-native-audio-dialog';

-- Verify the changes (optional - for confirmation)
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'gemini_model';
