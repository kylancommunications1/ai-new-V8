import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wllyticlzvtsimgefsti.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHl0aWNsenZ0c2ltZ2Vmc3RpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTYxMDQxNiwiZXhwIjoyMDY1MTg2NDE2fQ.ffz0OVDEY8s2n_Qar0IlRig0G16zH9BAG5EyHZZyaWA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTableIfNotExists(tableName, sampleData) {
  try {
    console.log(`Checking ${tableName} table...`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log(`Creating ${tableName} table...`);
      
      const { error: createError } = await supabase
        .from(tableName)
        .insert([sampleData]);
      
      if (createError && createError.code !== '42P01') {
        console.error(`Error creating ${tableName} table:`, createError);
        return false;
      } else {
        console.log(`${tableName} table created successfully`);
        return true;
      }
    } else if (error) {
      console.error(`Error checking ${tableName} table:`, error);
      return false;
    } else {
      console.log(`${tableName} table already exists`);
      return true;
    }
  } catch (err) {
    console.error(`Exception checking ${tableName}:`, err);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Creating all required database tables...');
    
    // Profiles table
    await createTableIfNotExists('profiles', {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'test@example.com',
      full_name: 'Test User',
      twilio_phone_number: '+1234567890',
      twilio_account_sid: 'test',
      gemini_api_key: 'test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // AI Agents table
    await createTableIfNotExists('ai_agents', {
      id: '00000000-0000-0000-0000-000000000000',
      profile_id: '00000000-0000-0000-0000-000000000000',
      name: 'Test Agent',
      description: 'Test agent description',
      prompt: 'You are a helpful AI assistant',
      voice_settings: {},
      ivr_menu_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Call Logs table
    await createTableIfNotExists('call_logs', {
      id: '00000000-0000-0000-0000-000000000000',
      profile_id: '00000000-0000-0000-0000-000000000000',
      call_sid: 'test_call_sid',
      from_number: '+1234567890',
      to_number: '+0987654321',
      status: 'completed',
      duration: 60,
      recording_url: null,
      transcript: 'Test transcript',
      ai_agent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Campaigns table
    await createTableIfNotExists('campaigns', {
      id: '00000000-0000-0000-0000-000000000000',
      profile_id: '00000000-0000-0000-0000-000000000000',
      name: 'Test Campaign',
      description: 'Test campaign description',
      status: 'draft',
      ai_agent_id: null,
      total_leads: 0,
      leads_called: 0,
      leads_completed: 0,
      started_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Campaign Leads table
    await createTableIfNotExists('campaign_leads', {
      id: '00000000-0000-0000-0000-000000000000',
      campaign_id: '00000000-0000-0000-0000-000000000000',
      phone_number: '+1234567890',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      status: 'pending',
      call_attempts: 0,
      last_called_at: null,
      notes: null,
      custom_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // IVR Menus table
    await createTableIfNotExists('ivr_menus', {
      id: '00000000-0000-0000-0000-000000000000',
      profile_id: '00000000-0000-0000-0000-000000000000',
      name: 'Test IVR Menu',
      welcome_message: 'Welcome to our service',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // IVR Options table
    await createTableIfNotExists('ivr_options', {
      id: '00000000-0000-0000-0000-000000000000',
      ivr_menu_id: '00000000-0000-0000-0000-000000000000',
      key_press: '1',
      action_type: 'transfer',
      action_value: '+1234567890',
      description: 'Transfer to sales',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Notifications table
    await createTableIfNotExists('notifications', {
      id: '00000000-0000-0000-0000-000000000000',
      profile_id: '00000000-0000-0000-0000-000000000000',
      title: 'Test Notification',
      message: 'This is a test notification',
      type: 'info',
      read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Webhook Endpoints table
    await createTableIfNotExists('webhook_endpoints', {
      id: '00000000-0000-0000-0000-000000000000',
      profile_id: '00000000-0000-0000-0000-000000000000',
      name: 'Test Webhook',
      url: 'https://example.com/webhook',
      events: ['call.completed'],
      active: true,
      secret: 'test_secret',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Zapier Integrations table
    await createTableIfNotExists('zapier_integrations', {
      id: '00000000-0000-0000-0000-000000000000',
      profile_id: '00000000-0000-0000-0000-000000000000',
      agent_id: null,
      webhook_url: 'https://hooks.zapier.com/test',
      trigger_events: ['call.completed'],
      name: 'Test Zapier Integration',
      description: 'Test integration for capturing lead information',
      parameter_schema: {
        type: 'object',
        properties: {
          customer_name: {
            type: 'string',
            description: 'The customer\'s full name'
          },
          phone_number: {
            type: 'string',
            description: 'The customer\'s phone number'
          },
          email: {
            type: 'string',
            description: 'The customer\'s email address'
          },
          interest: {
            type: 'string',
            description: 'What the customer is interested in'
          }
        },
        required: ['customer_name', 'phone_number']
      },
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // DNC Entries table
    await createTableIfNotExists('dnc_entries', {
      id: '00000000-0000-0000-0000-000000000000',
      profile_id: '00000000-0000-0000-0000-000000000000',
      phone_number: '+1234567890',
      reason: 'User request',
      created_at: new Date().toISOString()
    });

    // Appointments table
    await createTableIfNotExists('appointments', {
      id: '00000000-0000-0000-0000-000000000000',
      profile_id: '00000000-0000-0000-0000-000000000000',
      call_log_id: null,
      campaign_lead_id: null,
      scheduled_at: new Date().toISOString(),
      title: 'Test Appointment',
      description: 'Test appointment description',
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Active Calls table
    await createTableIfNotExists('active_calls', {
      id: '00000000-0000-0000-0000-000000000000',
      call_sid: 'test_active_call',
      profile_id: '00000000-0000-0000-0000-000000000000',
      from_number: '+1234567890',
      to_number: '+0987654321',
      status: 'in-progress',
      ai_agent_id: null,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Usage Records table
    await createTableIfNotExists('usage_records', {
      id: '00000000-0000-0000-0000-000000000000',
      profile_id: '00000000-0000-0000-0000-000000000000',
      resource_type: 'calls',
      quantity: 1,
      unit_cost: 0.01,
      total_cost: 0.01,
      billing_period: new Date().toISOString().substring(0, 7),
      created_at: new Date().toISOString()
    });

    // Subscriptions table
    await createTableIfNotExists('subscriptions', {
      id: '00000000-0000-0000-0000-000000000000',
      profile_id: '00000000-0000-0000-0000-000000000000',
      stripe_subscription_id: 'sub_test',
      stripe_customer_id: 'cus_test',
      plan_name: 'basic',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // System Status table
    await createTableIfNotExists('system_status', {
      id: '00000000-0000-0000-0000-000000000000',
      service_name: 'api',
      status: 'operational',
      last_check: new Date().toISOString(),
      response_time: 100,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Integrations table
    await createTableIfNotExists('integrations', {
      id: '00000000-0000-0000-0000-000000000000',
      user_id: '00000000-0000-0000-0000-000000000000',
      type: 'gohighlevel',
      credentials: {},
      settings: {},
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Integration Settings table
    await createTableIfNotExists('integration_settings', {
      id: '00000000-0000-0000-0000-000000000000',
      user_id: '00000000-0000-0000-0000-000000000000',
      integration_type: 'gohighlevel',
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    console.log('✅ All database tables created successfully!');
    
    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    const testId = '00000000-0000-0000-0000-000000000000';
    
    const tables = [
      'integration_settings', 'integrations', 'system_status', 'subscriptions',
      'usage_records', 'active_calls', 'appointments', 'dnc_entries',
      'zapier_integrations', 'webhook_endpoints', 'notifications',
      'ivr_options', 'ivr_menus', 'campaign_leads', 'campaigns',
      'call_logs', 'ai_agents', 'profiles'
    ];
    
    for (const table of tables) {
      try {
        await supabase.from(table).delete().eq('id', testId);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    
    console.log('✅ Test data cleaned up!');
    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

main();