import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
    console.error('Please check your .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Add gemini_model column to profiles table
 * This migration adds support for users to select their preferred Gemini model
 */
async function addGeminiModelColumn() {
    console.log('🚀 Starting Gemini model column migration...');
    
    try {
        // First, check if the column already exists
        const { data: existingColumns, error: columnCheckError } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'profiles')
            .eq('column_name', 'gemini_model');

        if (columnCheckError) {
            console.log('⚠️ Could not check existing columns, proceeding with migration...');
        } else if (existingColumns && existingColumns.length > 0) {
            console.log('✅ gemini_model column already exists in profiles table');
            return;
        }

        console.log('📝 Adding gemini_model column to profiles table...');
        
        // Since Supabase doesn't directly support ALTER TABLE via the client,
        // we'll need to handle this via the SQL editor or by creating a migration
        console.log('⚠️ This migration requires manual SQL execution in Supabase dashboard');
        console.log('');
        console.log('Please run the following SQL in your Supabase SQL Editor:');
        console.log('');
        console.log('-- Add gemini_model column to profiles table');
        console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gemini_model TEXT DEFAULT \'gemini-2.5-flash-preview-native-audio-dialog\';');
        console.log('');
        console.log('-- Add constraint to ensure only valid models are allowed');
        console.log('ALTER TABLE profiles ADD CONSTRAINT profiles_gemini_model_check CHECK (gemini_model IN (');
        console.log('    \'gemini-live-2.5-flash-preview\',');
        console.log('    \'gemini-2.0-flash-live-001\',');
        console.log('    \'gemini-2.5-flash-preview-native-audio-dialog\'');
        console.log('));');
        console.log('');
        console.log('-- Update existing profiles with default model');
        console.log('UPDATE profiles SET gemini_model = \'gemini-2.5-flash-preview-native-audio-dialog\' WHERE gemini_model IS NULL;');
        console.log('');
        
        // Try to update any existing profiles via direct update (this will work if column exists)
        try {
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, gemini_model')
                .limit(5);

            if (!profilesError && profiles) {
                console.log(`✅ Found ${profiles.length} existing profiles to potentially update`);
                
                // Update profiles that don't have a gemini_model set
                const { data: updateData, error: updateError } = await supabase
                    .from('profiles')
                    .update({ gemini_model: 'gemini-2.5-flash-preview-native-audio-dialog' })
                    .is('gemini_model', null)
                    .select('id');

                if (!updateError && updateData) {
                    console.log(`✅ Updated ${updateData.length} profiles with default Gemini model`);
                }
            }
        } catch (updateError) {
            console.log('ℹ️ Could not update existing profiles (column may not exist yet)');
        }

        console.log('🎉 Migration guidance completed!');
        console.log('');
        console.log('Available Gemini models:');
        console.log('  - gemini-live-2.5-flash-preview');
        console.log('  - gemini-2.0-flash-live-001');
        console.log('  - gemini-2.5-flash-preview-native-audio-dialog (default)');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

/**
 * Main function to run the migration
 */
async function main() {
    try {
        await addGeminiModelColumn();
        console.log('✅ Migration script completed successfully');
    } catch (error) {
        console.error('❌ Migration script failed:', error);
        process.exit(1);
    }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export {
    addGeminiModelColumn,
    main
};
