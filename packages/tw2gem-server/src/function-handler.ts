// import { DatabaseService } from '../../dashboard/src/services/database'
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
// Import GhlService dynamically to avoid module not found error
// import { GhlService } from './ghl-service';

export interface FunctionCallRequest {
  name: string
  args: Record<string, any>
  callId: string
  userId?: string
  agentId?: string
}

export interface FunctionCallResponse {
  success: boolean
  result?: any
  error?: string
  executionTime?: number
}

export interface FunctionDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  handler: (args: Record<string, any>, context: FunctionContext) => Promise<any>
  requiresAuth?: boolean
  permissions?: string[]
  isZapier?: boolean
  webhookUrl?: string
}

export interface FunctionContext {
  callId: string
  userId?: string
  agentId?: string
  supabase?: any
  functionName?: string
}

export interface ZapierIntegration {
  id: string
  agent_id: string
  name: string
  description: string
  webhook_url: string
  parameter_schema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export class FunctionCallHandler {
  private functions: Map<string, FunctionDefinition> = new Map();
  private supabase: any;
  private zapierIntegrations: Map<string, ZapierIntegration> = new Map();
  private ghlService: any = null;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    this.registerCoreFunctions();
  }
  
  // Set the GHL service instance
  setGhlService(apiKey: string, locationId: string) {
    try {
      // Dynamically import GhlService
      const GhlServiceClass = require('./ghl-service').GhlService;
      this.ghlService = new GhlServiceClass(apiKey, locationId);
    } catch (error) {
      console.error('Failed to initialize GHL service:', error);
    }
    this.registerGhlFunctions();
  }
  
  // Clear the GHL service instance
  clearGhlService() {
    this.ghlService = null;
    this.unregisterGhlFunctions();
  }
  
  // Load Zapier integrations for a specific agent
  async loadZapierIntegrations(agentId: string): Promise<void> {
    if (!this.supabase) {
      console.warn('Supabase client not initialized, cannot load Zapier integrations');
      return;
    }
    
    try {
      console.log(`Loading Zapier integrations for agent ${agentId}...`);
      
      // Clear any existing Zapier integrations for this agent
      this.clearZapierIntegrations(agentId);
      
      // Fetch Zapier integrations from the database
      const { data: zapierIntegrations, error } = await this.supabase
        .from('agent_zaps')
        .select('*')
        .eq('agent_id', agentId);
        
      if (error) {
        console.error('Error loading Zapier integrations:', error);
        return;
      }
      
      if (!zapierIntegrations || zapierIntegrations.length === 0) {
        console.log(`No Zapier integrations found for agent ${agentId}`);
        return;
      }
      
      console.log(`Found ${zapierIntegrations.length} Zapier integrations for agent ${agentId}`);
      
      // Register each Zapier integration as a function
      zapierIntegrations.forEach((integration: ZapierIntegration) => {
        this.registerZapierFunction(integration);
      });
    } catch (error) {
      console.error('Error in loadZapierIntegrations:', error);
    }
  }
  
  // Clear Zapier integrations for a specific agent
  clearZapierIntegrations(agentId: string): void {
    // Remove any existing Zapier functions for this agent
    for (const [name, func] of this.functions.entries()) {
      if (func.isZapier) {
        const integration = this.zapierIntegrations.get(name);
        if (integration && integration.agent_id === agentId) {
          this.functions.delete(name);
          this.zapierIntegrations.delete(name);
          console.log(`Removed Zapier function: ${name}`);
        }
      }
    }
  }

  // Register a new function
  registerFunction(definition: FunctionDefinition) {
    this.functions.set(definition.name, definition);
    console.log(`Registered function: ${definition.name}`);
  }
  
  // Register a Zapier function
  registerZapierFunction(integration: ZapierIntegration) {
    // Store the integration for reference
    this.zapierIntegrations.set(integration.name, integration);
    
    // Create a function definition from the Zapier integration
    const functionDef: FunctionDefinition = {
      name: integration.name,
      description: integration.description,
      parameters: integration.parameter_schema,
      isZapier: true,
      webhookUrl: integration.webhook_url,
      handler: this.handleZapierWebhook.bind(this)
    };
    
    // Register the function
    this.registerFunction(functionDef);
  }
  
  // Handler for Zapier webhook calls
  private async handleZapierWebhook(args: Record<string, any>, context: FunctionContext): Promise<any> {
    try {
      // Get the function name from the context
      const functionName = context.functionName || '';
      
      // Get the Zapier integration
      const integration = this.zapierIntegrations.get(functionName);
      if (!integration) {
        throw new Error(`Zapier integration '${functionName}' not found`);
      }
      
      // Get the webhook URL
      const webhookUrl = integration.webhook_url;
      if (!webhookUrl) {
        throw new Error(`Webhook URL not found for Zapier integration '${functionName}'`);
      }
      
      console.log(`Executing Zapier webhook for ${functionName}:`, {
        webhookUrl,
        args
      });
      
      // Send the request to Zapier
      const response = await axios.post(webhookUrl, args, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Zapier webhook response for ${functionName}:`, {
        status: response.status,
        data: response.data
      });
      
      // Return a success message
      return {
        success: true,
        message: `Successfully executed ${integration.name}`,
        data: response.data
      };
    } catch (error) {
      console.error('Error executing Zapier webhook:', error);
      throw error;
    }
  }

  // Get all registered functions for Gemini setup
  getFunctionDefinitions(): object[] {
    const functions = Array.from(this.functions.values());
    if (functions.length === 0) {
      return [];
    }
    
    return [{
      function_declarations: functions.map(func => ({
        name: func.name,
        description: func.description,
        parameters: func.parameters
      }))
    }];
  }

  // Execute a function call
  async executeFunction(request: FunctionCallRequest): Promise<FunctionCallResponse> {
    const startTime = Date.now();
    
    try {
      const functionDef = this.functions.get(request.name);
      if (!functionDef) {
        return {
          success: false,
          error: `Function '${request.name}' not found`,
          executionTime: Date.now() - startTime
        };
      }

      // Validate permissions if required
      if (functionDef.requiresAuth && !request.userId) {
        return {
          success: false,
          error: 'Authentication required for this function',
          executionTime: Date.now() - startTime
        };
      }

      // Create function context
      const context: FunctionContext = {
        callId: request.callId,
        userId: request.userId,
        agentId: request.agentId,
        supabase: this.supabase,
        functionName: request.name // Add the function name to the context
      };

      // Execute the function
      const result = await functionDef.handler(request.args, context);

      const executionTime = Date.now() - startTime;

      // Log the function call
      if (this.supabase && request.userId) {
        await this.logFunctionCall({
          profile_id: request.userId,
          call_id: request.callId,
          function_name: request.name,
          parameters: request.args,
          result,
          execution_time_ms: executionTime,
          success: true
        });
      }

      return {
        success: true,
        result,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log the failed function call
      if (this.supabase && request.userId) {
        await this.logFunctionCall({
          profile_id: request.userId,
          call_id: request.callId,
          function_name: request.name,
          parameters: request.args,
          execution_time_ms: executionTime,
          success: false,
          error_message: errorMessage
        });
      }

      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  // Register core business functions
  private registerCoreFunctions() {
    // Schedule appointment function
    this.registerFunction({
      name: 'schedule_appointment',
      description: 'Schedule an appointment for a customer',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Customer full name' },
          customer_phone: { type: 'string', description: 'Customer phone number' },
          customer_email: { type: 'string', description: 'Customer email address' },
          appointment_date: { type: 'string', description: 'Appointment date in YYYY-MM-DD format' },
          appointment_time: { type: 'string', description: 'Appointment time in HH:MM format' },
          service_type: { type: 'string', description: 'Type of service requested' },
          notes: { type: 'string', description: 'Additional notes or requirements' }
        },
        required: ['customer_name', 'customer_phone', 'appointment_date', 'appointment_time']
      },
      handler: this.handleScheduleAppointment.bind(this),
      requiresAuth: true
    });
  }
  
  // Register GHL functions
  private registerGhlFunctions() {
    // Only register if GHL service is available
    if (!this.ghlService) {
      return;
    }
    
    // Search for a contact by phone number
    this.registerFunction({
      name: 'ghl_search_contact',
      description: 'Searches for a contact in GoHighLevel using their phone number. Returns the contact ID if found. Always use this before creating a contact.',
      parameters: {
        type: 'object',
        properties: {
          phone_number: {
            type: 'string',
            description: 'The phone number to search for'
          }
        },
        required: ['phone_number']
      },
      handler: this.handleGhlSearchContact.bind(this)
    });
    
    // Create a new contact
    this.registerFunction({
      name: 'ghl_create_contact',
      description: 'Creates a new contact in GoHighLevel with their name and phone number.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The contact\'s full name'
          },
          phone_number: {
            type: 'string',
            description: 'The contact\'s phone number'
          },
          email: {
            type: 'string',
            description: 'The contact\'s email address (optional)'
          },
          tags: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Tags to apply to the contact (optional)'
          }
        },
        required: ['name', 'phone_number']
      },
      handler: this.handleGhlCreateContact.bind(this)
    });
    
    // Add a note to a contact
    this.registerFunction({
      name: 'ghl_add_note',
      description: 'Adds a summary or note to an existing contact\'s record in GoHighLevel. You must get the contact ID first by using the search_contact tool.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: {
            type: 'string',
            description: 'The ID of the contact'
          },
          note: {
            type: 'string',
            description: 'The note content to add'
          }
        },
        required: ['contact_id', 'note']
      },
      handler: this.handleGhlAddNote.bind(this)
    });
    
    // Create an opportunity
    this.registerFunction({
      name: 'ghl_create_opportunity',
      description: 'Creates a new opportunity for a contact in GoHighLevel.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: {
            type: 'string',
            description: 'The ID of the contact'
          },
          name: {
            type: 'string',
            description: 'The name of the opportunity'
          },
          pipeline_id: {
            type: 'string',
            description: 'The ID of the pipeline'
          },
          stage_id: {
            type: 'string',
            description: 'The ID of the stage'
          },
          status: {
            type: 'string',
            enum: ['open', 'won', 'lost'],
            description: 'The status of the opportunity'
          },
          value: {
            type: 'number',
            description: 'The monetary value of the opportunity'
          },
          notes: {
            type: 'string',
            description: 'Notes about the opportunity'
          }
        },
        required: ['contact_id', 'name', 'pipeline_id', 'stage_id']
      },
      handler: this.handleGhlCreateOpportunity.bind(this)
    });
    
    // Create an appointment
    this.registerFunction({
      name: 'ghl_create_appointment',
      description: 'Creates a new appointment for a contact in GoHighLevel.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: {
            type: 'string',
            description: 'The ID of the contact'
          },
          title: {
            type: 'string',
            description: 'The title of the appointment'
          },
          description: {
            type: 'string',
            description: 'The description of the appointment'
          },
          start_time: {
            type: 'string',
            description: 'The start time of the appointment (ISO date string)'
          },
          end_time: {
            type: 'string',
            description: 'The end time of the appointment (ISO date string)'
          },
          calendar_id: {
            type: 'string',
            description: 'The ID of the calendar'
          }
        },
        required: ['contact_id', 'title', 'start_time', 'end_time', 'calendar_id']
      },
      handler: this.handleGhlCreateAppointment.bind(this)
    });
  }
  
  // Unregister GHL functions
  private unregisterGhlFunctions() {
    const ghlFunctions = [
      'ghl_search_contact',
      'ghl_create_contact',
      'ghl_add_note',
      'ghl_create_opportunity',
      'ghl_create_appointment'
    ];
    
    ghlFunctions.forEach(name => {
      if (this.functions.has(name)) {
        this.functions.delete(name);
        console.log(`Unregistered GHL function: ${name}`);
      }
    });

    // Update lead status function
    this.registerFunction({
      name: 'update_lead_status',
      description: 'Update the status of a lead in the CRM',
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'Lead ID to update' },
          status: { 
            type: 'string', 
            enum: ['contacted', 'interested', 'not_interested', 'callback_requested', 'appointment_scheduled', 'converted'],
            description: 'New status for the lead' 
          },
          notes: { type: 'string', description: 'Notes about the interaction' },
          callback_date: { type: 'string', description: 'Callback date if status is callback_requested' },
          interest_level: { type: 'number', minimum: 1, maximum: 10, description: 'Interest level from 1-10' }
        },
        required: ['lead_id', 'status']
      },
      handler: this.handleUpdateLeadStatus.bind(this),
      requiresAuth: true
    });

    // Send follow-up email function
    this.registerFunction({
      name: 'send_followup_email',
      description: 'Send a follow-up email to a customer',
      parameters: {
        type: 'object',
        properties: {
          customer_email: { type: 'string', description: 'Customer email address' },
          template_type: { 
            type: 'string',
            enum: ['appointment_confirmation', 'follow_up', 'thank_you', 'information_request'],
            description: 'Type of email template to use'
          },
          custom_message: { type: 'string', description: 'Custom message to include' },
          appointment_details: { type: 'object', description: 'Appointment details if applicable' }
        },
        required: ['customer_email', 'template_type']
      },
      handler: this.handleSendFollowupEmail.bind(this),
      requiresAuth: true
    });

    // Add to DNC list function
    this.registerFunction({
      name: 'add_to_dnc',
      description: 'Add a phone number to the Do Not Call list',
      parameters: {
        type: 'object',
        properties: {
          phone_number: { type: 'string', description: 'Phone number to add to DNC list' },
          reason: { 
            type: 'string',
            enum: ['customer_request', 'compliance', 'invalid_number', 'other'],
            description: 'Reason for adding to DNC'
          },
          notes: { type: 'string', description: 'Additional notes' }
        },
        required: ['phone_number', 'reason']
      },
      handler: this.handleAddToDNC.bind(this),
      requiresAuth: true
    });

    // Get customer information function
    this.registerFunction({
      name: 'get_customer_info',
      description: 'Retrieve customer information from the database',
      parameters: {
        type: 'object',
        properties: {
          phone_number: { type: 'string', description: 'Customer phone number' },
          email: { type: 'string', description: 'Customer email address' },
          customer_id: { type: 'string', description: 'Customer ID' }
        }
      },
      handler: this.handleGetCustomerInfo.bind(this),
      requiresAuth: true
    });

    // Calculate pricing function
    this.registerFunction({
      name: 'calculate_pricing',
      description: 'Calculate pricing for services based on customer requirements',
      parameters: {
        type: 'object',
        properties: {
          service_type: { type: 'string', description: 'Type of service' },
          quantity: { type: 'number', description: 'Quantity or duration' },
          customer_tier: { 
            type: 'string',
            enum: ['basic', 'standard', 'premium'],
            description: 'Customer tier for pricing'
          },
          discount_code: { type: 'string', description: 'Discount code if applicable' }
        },
        required: ['service_type', 'quantity']
      },
      handler: this.handleCalculatePricing.bind(this),
      requiresAuth: false
    });

    // Check availability function
    this.registerFunction({
      name: 'check_availability',
      description: 'Check availability for appointments or services',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date to check in YYYY-MM-DD format' },
          time_range: { type: 'string', description: 'Time range preference (morning, afternoon, evening)' },
          service_type: { type: 'string', description: 'Type of service' },
          duration: { type: 'number', description: 'Duration in minutes' }
        },
        required: ['date']
      },
      handler: this.handleCheckAvailability.bind(this),
      requiresAuth: true
    });

    // Generate call summary function
    this.registerFunction({
      name: 'generate_call_summary',
      description: 'Generate an AI summary of the call conversation',
      parameters: {
        type: 'object',
        properties: {
          call_id: { type: 'string', description: 'Call ID to summarize' },
          transcript: { type: 'string', description: 'Call transcript text' },
          summary_type: { 
            type: 'string',
            enum: ['brief', 'detailed', 'action_items', 'sentiment'],
            description: 'Type of summary to generate'
          }
        },
        required: ['call_id', 'transcript']
      },
      handler: this.handleGenerateCallSummary.bind(this),
      requiresAuth: true
    });

    // Zapier webhook trigger function
    this.registerFunction({
      name: 'trigger_zapier_webhook',
      description: 'Trigger a Zapier webhook with call data',
      parameters: {
        type: 'object',
        properties: {
          webhook_url: { type: 'string', description: 'Zapier webhook URL' },
          event_type: { 
            type: 'string',
            enum: ['call_completed', 'appointment_scheduled', 'lead_updated', 'follow_up_required'],
            description: 'Type of event to trigger'
          },
          data: { type: 'object', description: 'Data to send to Zapier' }
        },
        required: ['webhook_url', 'event_type', 'data']
      },
      handler: this.handleTriggerZapierWebhook.bind(this),
      requiresAuth: true
    });

    // Create CRM contact function
    this.registerFunction({
      name: 'create_crm_contact',
      description: 'Create a new contact in external CRM system',
      parameters: {
        type: 'object',
        properties: {
          crm_type: { 
            type: 'string',
            enum: ['salesforce', 'hubspot', 'pipedrive', 'zoho'],
            description: 'CRM system type'
          },
          contact_data: {
            type: 'object',
            properties: {
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              company: { type: 'string' },
              notes: { type: 'string' }
            },
            required: ['first_name', 'last_name']
          }
        },
        required: ['crm_type', 'contact_data']
      },
      handler: this.handleCreateCRMContact.bind(this),
      requiresAuth: true
    });
  }

  // Function handlers
  private async handleScheduleAppointment(args: any, context: FunctionContext) {
    if (!context.userId) throw new Error('User ID required');

    const appointmentData = {
      profile_id: context.userId,
      customer_name: args.customer_name,
      customer_phone: args.customer_phone,
      customer_email: args.customer_email,
      appointment_date: args.appointment_date,
      appointment_time: args.appointment_time,
      service_type: args.service_type,
      notes: args.notes || '',
      status: 'scheduled',
      call_id: context.callId
    };

    const { data, error } = await context.supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();

    if (error) throw new Error(`Failed to schedule appointment: ${error.message}`);

    return {
      appointment_id: data.id,
      confirmation_number: `APT-${data.id.slice(-8).toUpperCase()}`,
      message: `Appointment scheduled for ${args.customer_name} on ${args.appointment_date} at ${args.appointment_time}`
    };
  }

  private async handleUpdateLeadStatus(args: any, context: FunctionContext) {
    if (!context.userId) throw new Error('User ID required');

    const updateData: any = {
      status: args.status,
      notes: args.notes,
      last_contact_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (args.callback_date) {
      updateData.callback_date = args.callback_date;
    }

    if (args.interest_level) {
      updateData.interest_level = args.interest_level;
    }

    const { data, error } = await context.supabase
      .from('campaign_leads')
      .update(updateData)
      .eq('id', args.lead_id)
      .eq('profile_id', context.userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update lead: ${error.message}`);

    return {
      lead_id: args.lead_id,
      new_status: args.status,
      message: `Lead status updated to ${args.status}`
    };
  }

  private async handleSendFollowupEmail(args: any, context: FunctionContext) {
    // This would integrate with an email service like SendGrid, Mailgun, etc.
    // For now, we'll log the email request
    
    const emailData = {
      profile_id: context.userId,
      call_id: context.callId,
      recipient_email: args.customer_email,
      template_type: args.template_type,
      custom_message: args.custom_message,
      appointment_details: args.appointment_details,
      sent_at: new Date().toISOString(),
      status: 'queued'
    };

    // Log the email request (you would implement actual email sending)
    console.log('Email queued:', emailData);

    return {
      email_id: `email_${Date.now()}`,
      status: 'queued',
      message: `Follow-up email queued for ${args.customer_email}`
    };
  }

  private async handleAddToDNC(args: any, context: FunctionContext) {
    if (!context.userId) throw new Error('User ID required');

    const dncData = {
      profile_id: context.userId,
      phone_number: args.phone_number,
      reason: args.reason,
      notes: args.notes || '',
      added_by: 'ai_agent',
      call_id: context.callId
    };

    const { data, error } = await context.supabase
      .from('dnc_lists')
      .insert(dncData)
      .select()
      .single();

    if (error) throw new Error(`Failed to add to DNC: ${error.message}`);

    return {
      dnc_id: data.id,
      phone_number: args.phone_number,
      message: `Phone number ${args.phone_number} added to Do Not Call list`
    };
  }

  private async handleGetCustomerInfo(args: any, context: FunctionContext) {
    if (!context.userId) throw new Error('User ID required');

    let query = context.supabase
      .from('campaign_leads')
      .select('*')
      .eq('profile_id', context.userId);

    if (args.phone_number) {
      query = query.eq('phone_number', args.phone_number);
    } else if (args.email) {
      query = query.eq('email', args.email);
    } else if (args.customer_id) {
      query = query.eq('id', args.customer_id);
    } else {
      throw new Error('Phone number, email, or customer ID required');
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { message: 'Customer not found' };
      }
      throw new Error(`Failed to get customer info: ${error.message}`);
    }

    return {
      customer_id: data.id,
      name: `${data.first_name} ${data.last_name}`,
      phone: data.phone_number,
      email: data.email,
      company: data.company,
      status: data.status,
      last_contact: data.last_contact_date,
      notes: data.notes
    };
  }

  private async handleCalculatePricing(args: any, context: FunctionContext) {
    // This would integrate with your pricing engine
    // For now, we'll return sample pricing
    
    const basePrices: Record<string, number> = {
      'consultation': 100,
      'basic_service': 200,
      'premium_service': 500,
      'enterprise_service': 1000
    };

    const tierMultipliers: Record<string, number> = {
      'basic': 1.0,
      'standard': 0.9,
      'premium': 0.8
    };

    const basePrice = basePrices[args.service_type] || 100;
    const quantity = args.quantity || 1;
    const tierMultiplier = tierMultipliers[args.customer_tier] || 1.0;

    let totalPrice = basePrice * quantity * tierMultiplier;

    // Apply discount if provided
    if (args.discount_code) {
      // Simple discount logic - in reality, you'd check against a database
      const discountPercent = args.discount_code === 'SAVE10' ? 0.1 : 0;
      totalPrice = totalPrice * (1 - discountPercent);
    }

    return {
      service_type: args.service_type,
      quantity: args.quantity,
      base_price: basePrice,
      tier_discount: Math.round((1 - tierMultiplier) * 100),
      total_price: Math.round(totalPrice * 100) / 100,
      currency: 'USD'
    };
  }

  private async handleCheckAvailability(args: any, context: FunctionContext) {
    if (!context.userId) throw new Error('User ID required');

    // Check existing appointments for the date
    const { data: appointments, error } = await context.supabase
      .from('appointments')
      .select('appointment_time, duration')
      .eq('profile_id', context.userId)
      .eq('appointment_date', args.date)
      .eq('status', 'scheduled');

    if (error) throw new Error(`Failed to check availability: ${error.message}`);

    // Generate available time slots (simplified logic)
    const businessHours = {
      start: 9, // 9 AM
      end: 17   // 5 PM
    };

    const availableSlots: string[] = [];
    const bookedTimes = appointments?.map((apt: any) => apt.appointment_time) || [];

    for (let hour = businessHours.start; hour < businessHours.end; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      if (!bookedTimes.includes(timeSlot)) {
        availableSlots.push(timeSlot);
      }
    }

    return {
      date: args.date,
      available_slots: availableSlots,
      total_available: availableSlots.length,
      message: availableSlots.length > 0 
        ? `${availableSlots.length} time slots available`
        : 'No availability for this date'
    };
  }

  private async handleGenerateCallSummary(args: any, context: FunctionContext) {
    if (!context.userId) throw new Error('User ID required');

    // Use Gemini to generate call summary
    const summaryPrompts = {
      brief: 'Provide a brief 2-3 sentence summary of this call conversation:',
      detailed: 'Provide a detailed summary including key points, customer needs, and outcomes:',
      action_items: 'Extract action items and next steps from this call conversation:',
      sentiment: 'Analyze the sentiment and customer satisfaction from this call conversation:'
    };

    const prompt = summaryPrompts[args.summary_type as keyof typeof summaryPrompts] || summaryPrompts.brief;
    
    // In a real implementation, you would call Gemini API here
    // For now, we'll create a structured summary
    const summary = {
      call_id: args.call_id,
      summary_type: args.summary_type,
      generated_at: new Date().toISOString(),
      summary_text: `${prompt}\n\n[AI-generated summary would be here based on transcript analysis]`,
      key_points: [
        'Customer inquiry handled',
        'Information provided',
        'Next steps identified'
      ],
      sentiment_score: 0.8, // Positive sentiment
      duration_analyzed: 'Full call',
      confidence_score: 0.95
    };

    // Store summary in database
    const { data, error } = await context.supabase
      .from('call_summaries')
      .insert({
        profile_id: context.userId,
        call_id: args.call_id,
        summary_type: args.summary_type,
        summary_data: summary,
        transcript_length: args.transcript.length
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to store call summary: ${error.message}`);

    return summary;
  }

  private async handleTriggerZapierWebhook(args: any, context: FunctionContext) {
    if (!context.userId) throw new Error('User ID required');

    const webhookPayload = {
      event_type: args.event_type,
      timestamp: new Date().toISOString(),
      user_id: context.userId,
      call_id: context.callId,
      data: args.data
    };

    try {
      // Make HTTP request to Zapier webhook
      const response = await fetch(args.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AI-Call-Center/1.0'
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
      }

      // Log the webhook trigger
      await context.supabase
        .from('webhook_logs')
        .insert({
          profile_id: context.userId,
          webhook_url: args.webhook_url,
          event_type: args.event_type,
          payload: webhookPayload,
          response_status: response.status,
          triggered_at: new Date().toISOString()
        });

      return {
        webhook_id: `webhook_${Date.now()}`,
        status: 'success',
        response_status: response.status,
        message: `Zapier webhook triggered successfully for ${args.event_type}`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log the failed webhook
      await context.supabase
        .from('webhook_logs')
        .insert({
          profile_id: context.userId,
          webhook_url: args.webhook_url,
          event_type: args.event_type,
          payload: webhookPayload,
          error_message: errorMessage,
          triggered_at: new Date().toISOString()
        });

      throw new Error(`Zapier webhook failed: ${errorMessage}`);
    }
  }

  private async handleCreateCRMContact(args: any, context: FunctionContext) {
    if (!context.userId) throw new Error('User ID required');

    // Get CRM integration settings for this user
    const { data: integration, error: integrationError } = await context.supabase
      .from('external_integrations')
      .select('*')
      .eq('profile_id', context.userId)
      .eq('integration_type', args.crm_type)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      throw new Error(`${args.crm_type} integration not configured`);
    }

    const contactData = {
      ...args.contact_data,
      source: 'ai_call_center',
      created_via: 'phone_call',
      call_id: context.callId,
      created_at: new Date().toISOString()
    };

    // In a real implementation, you would make API calls to the specific CRM
    // For now, we'll simulate the CRM contact creation
    const crmContactId = `${args.crm_type}_${Date.now()}`;

    // Store the CRM contact reference in our database
    const { data, error } = await context.supabase
      .from('crm_contacts')
      .insert({
        profile_id: context.userId,
        call_id: context.callId,
        crm_type: args.crm_type,
        crm_contact_id: crmContactId,
        contact_data: contactData,
        integration_id: integration.id
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create CRM contact: ${error.message}`);

    return {
      crm_contact_id: crmContactId,
      crm_type: args.crm_type,
      contact_name: `${args.contact_data.first_name} ${args.contact_data.last_name}`,
      message: `Contact created successfully in ${args.crm_type}`,
      crm_url: `https://${args.crm_type}.com/contacts/${crmContactId}` // Simulated URL
    };
  }

  private async logFunctionCall(logData: any) {
    try {
      await this.supabase
        .from('function_call_logs')
        .insert(logData);
    } catch (error) {
      console.error('Error logging function call:', error);
    }
  }

  // GHL Function Handlers
  
  // Handle GHL search contact function
  private async handleGhlSearchContact(args: Record<string, any>, context: FunctionContext): Promise<any> {
    if (!this.ghlService) {
      throw new Error('GHL service is not initialized');
    }
    
    const { phone_number } = args;
    
    try {
      const contact = await this.ghlService.searchContactByPhone(phone_number);
      
      if (!contact) {
        return {
          found: false,
          message: 'No contact found with this phone number'
        };
      }
      
      return {
        found: true,
        contact_id: contact.id,
        contact_details: {
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          tags: contact.tags
        }
      };
    } catch (error) {
      console.error('Error in handleGhlSearchContact:', error);
      throw new Error(`Failed to search for contact: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Handle GHL create contact function
  private async handleGhlCreateContact(args: Record<string, any>, context: FunctionContext): Promise<any> {
    if (!this.ghlService) {
      throw new Error('GHL service is not initialized');
    }
    
    const { name, phone_number, email, tags } = args;
    
    try {
      // First check if contact already exists
      const existingContact = await this.ghlService.searchContactByPhone(phone_number);
      
      if (existingContact) {
        return {
          already_exists: true,
          contact_id: existingContact.id,
          message: 'Contact already exists with this phone number'
        };
      }
      
      // Create new contact
      const contactData = {
        name,
        phone: phone_number,
        email: email || undefined,
        tags: tags || undefined
      };
      
      const newContact = await this.ghlService.createContact(contactData);
      
      return {
        success: true,
        contact_id: newContact.id,
        message: 'Contact created successfully'
      };
    } catch (error) {
      console.error('Error in handleGhlCreateContact:', error);
      throw new Error(`Failed to create contact: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Handle GHL add note function
  private async handleGhlAddNote(args: Record<string, any>, context: FunctionContext): Promise<any> {
    if (!this.ghlService) {
      throw new Error('GHL service is not initialized');
    }
    
    const { contact_id, note } = args;
    
    try {
      const result = await this.ghlService.addNoteToContact(contact_id, note);
      
      return {
        success: true,
        note_id: result.id,
        message: 'Note added successfully'
      };
    } catch (error) {
      console.error('Error in handleGhlAddNote:', error);
      throw new Error(`Failed to add note: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Handle GHL create opportunity function
  private async handleGhlCreateOpportunity(args: Record<string, any>, context: FunctionContext): Promise<any> {
    if (!this.ghlService) {
      throw new Error('GHL service is not initialized');
    }
    
    const { contact_id, name, pipeline_id, stage_id, status, value, notes } = args;
    
    try {
      const opportunityData = {
        name,
        pipelineId: pipeline_id,
        stageId: stage_id,
        status: status || 'open',
        monetary: value ? { value } : undefined,
        notes
      };
      
      const result = await this.ghlService.createOpportunity(contact_id, opportunityData);
      
      return {
        success: true,
        opportunity_id: result.id,
        message: 'Opportunity created successfully'
      };
    } catch (error) {
      console.error('Error in handleGhlCreateOpportunity:', error);
      throw new Error(`Failed to create opportunity: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Handle GHL create appointment function
  private async handleGhlCreateAppointment(args: Record<string, any>, context: FunctionContext): Promise<any> {
    if (!this.ghlService) {
      throw new Error('GHL service is not initialized');
    }
    
    const { contact_id, title, description, start_time, end_time, calendar_id } = args;
    
    try {
      const appointmentData = {
        title,
        description,
        startTime: start_time,
        endTime: end_time,
        calendarId: calendar_id
      };
      
      const result = await this.ghlService.createAppointment(contact_id, appointmentData);
      
      return {
        success: true,
        appointment_id: result.id,
        message: 'Appointment created successfully'
      };
    } catch (error) {
      console.error('Error in handleGhlCreateAppointment:', error);
      throw new Error(`Failed to create appointment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}