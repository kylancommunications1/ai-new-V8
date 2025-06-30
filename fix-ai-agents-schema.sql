-- NON-DESTRUCTIVE: Fix call_logs table enum values for call_status/status field
-- This addresses the error: invalid input value for enum call_status: "ringing"
-- SAFE: Only adds missing enum values, does not drop or alter anything

-- Twilio call status values that need to be supported:
-- queued, ringing, in-progress, completed, busy, failed, no-answer, canceled

-- Check what enum type exists and what values it currently has
DO $$
BEGIN
    -- First, let's see if call_status enum type exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_status') THEN
        RAISE NOTICE 'Found call_status enum type, checking for missing values...';
        
        -- Only add 'ringing' if it doesn't exist (this is the one causing the error)
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'ringing' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'call_status')
        ) THEN
            ALTER TYPE call_status ADD VALUE 'ringing';
            RAISE NOTICE 'Added ringing to call_status enum';
        ELSE
            RAISE NOTICE 'ringing already exists in call_status enum';
        END IF;

        -- Add other common Twilio status values if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'queued' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'call_status')
        ) THEN
            ALTER TYPE call_status ADD VALUE 'queued';
            RAISE NOTICE 'Added queued to call_status enum';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'in-progress' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'call_status')
        ) THEN
            ALTER TYPE call_status ADD VALUE 'in-progress';
            RAISE NOTICE 'Added in-progress to call_status enum';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'busy' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'call_status')
        ) THEN
            ALTER TYPE call_status ADD VALUE 'busy';
            RAISE NOTICE 'Added busy to call_status enum';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'no-answer' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'call_status')
        ) THEN
            ALTER TYPE call_status ADD VALUE 'no-answer';
            RAISE NOTICE 'Added no-answer to call_status enum';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'canceled' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'call_status')
        ) THEN
            ALTER TYPE call_status ADD VALUE 'canceled';
            RAISE NOTICE 'Added canceled to call_status enum';
        END IF;
        
    ELSE
        RAISE NOTICE 'call_status enum type not found - status field may already be text or use different enum';
    END IF;
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error occurred: %', SQLERRM;
        RAISE NOTICE 'This is non-destructive - no changes were made';
END $$;
