-- Simple fix for call_status enum - add missing 'ringing' value
-- Run this in Supabase SQL editor

DO $$
BEGIN
    -- Check if call_status enum exists and add ringing if missing
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_status') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'ringing' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'call_status')
        ) THEN
            ALTER TYPE call_status ADD VALUE 'ringing';
            RAISE NOTICE 'Added ringing to call_status enum';
        ELSE
            RAISE NOTICE 'ringing already exists';
        END IF;
    ELSE
        RAISE NOTICE 'call_status enum not found';
    END IF;
END $$;
