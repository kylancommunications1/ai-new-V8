# Gemini Model Column Migration

This directory contains migration scripts to add the `gemini_model` column to the `profiles` table, allowing users to select their preferred Gemini AI model.

## Files

- **`add-gemini-model-column.sql`** - Pure SQL migration script for Supabase SQL Editor
- **`add-gemini-model-column.js`** - Node.js migration script with environment variable support

## Purpose

The `gemini_model` column allows users to select from three available Gemini AI models:

- `gemini-live-2.5-flash-preview` - Preview version with latest features
- `gemini-2.0-flash-live-001` - Stable 2.0 version optimized for real-time audio
- `gemini-2.5-flash-preview-native-audio-dialog` - Latest preview with native audio dialog (default)

## Usage

### Option 1: SQL Migration (Recommended)

1. Open your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `add-gemini-model-column.sql`
4. Run the SQL script

### Option 2: Node.js Migration Script

1. Ensure your `.env` file has the required environment variables:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Run the migration script:
   ```bash
   node add-gemini-model-column.js
   ```

The script will:
- Check if the column already exists
- Provide SQL commands for manual execution
- Update any existing profiles with the default model

## What the Migration Does

1. **Adds the `gemini_model` column** to the `profiles` table with a default value
2. **Creates a check constraint** to ensure only valid model names are stored
3. **Updates existing profiles** that don't have a model selected with the default
4. **Adds documentation** via SQL comments

## Schema Changes

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gemini_model TEXT 
DEFAULT 'gemini-2.5-flash-preview-native-audio-dialog';

ALTER TABLE profiles 
ADD CONSTRAINT profiles_gemini_model_check 
CHECK (gemini_model IN (
    'gemini-live-2.5-flash-preview',
    'gemini-2.0-flash-live-001', 
    'gemini-2.5-flash-preview-native-audio-dialog'
));
```

## Integration

After running this migration, the AI call center will:

1. **Read user model preferences** from the `profiles.gemini_model` column
2. **Use the selected model** for each user's AI conversations
3. **Fall back to the default model** if no preference is set

The server code already supports this functionality - see `packages/server/src/server.js` lines 248-276 for the implementation.

## Verification

To verify the migration worked:

```sql
-- Check if column exists
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'gemini_model';

-- Check constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'profiles' AND constraint_name = 'profiles_gemini_model_check';

-- View current profile models
SELECT id, email, gemini_model 
FROM profiles 
LIMIT 5;
```

## Rollback

To rollback this migration:

```sql
-- Remove the constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_gemini_model_check;

-- Remove the column
ALTER TABLE profiles DROP COLUMN IF EXISTS gemini_model;
```

⚠️ **Warning**: Rolling back will lose all user model preferences.
