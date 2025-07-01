import { supabase, supabaseAdmin } from '../lib/supabase';
import type { 
  Profile, 
  CallLog, 
  Campaign, 
  CampaignLead, 
  AnalyticsData,
  DNCEntry,
  WebhookEndpoint,
  WebhookDelivery,
  Subscription,
  UsageRecord,
  SystemStatus,
  AIAgent,
  Appointment,
  ActiveCall,
  // FunctionCallLog
} from '../lib/supabase';

// Admin client already imported as supabaseAdmin

export class DatabaseService {
  // Profile operations
  static async getProfile(userId: string): Promise<Profile | null> {

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }

    return data;
  }

  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }

    return data;
  }

  static async getUserSettings(userId: string): Promise<any> {

    const profile = await this.getProfile(userId);
    return {
      twilio_phone_number: profile?.twilio_phone_number,
      twilio_account_sid: profile?.twilio_account_sid,
      gemini_api_key: profile?.gemini_api_key
    };
  }

  // AI Agents operations
  static async getAIAgents(profileId: string): Promise<AIAgent[]> {

    const { data, error } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching AI agents:', error);
      // In live mode, return empty array instead of demo data
      return [];
    }

    return data || [];
  }

  static async createAIAgent(agent: Omit<AIAgent, 'id' | 'created_at' | 'updated_at'>): Promise<AIAgent | null> {

    const { data, error } = await supabaseAdmin
      .from('ai_agents')
      .insert(agent)
      .select()
      .single();

    if (error) {
      console.error('Error creating AI agent:', error);
      throw error;
    }

    return data;
  }

  static async updateAIAgent(id: string, updates: Partial<AIAgent>): Promise<AIAgent | null> {
    try {
      // Add updated_at timestamp
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      console.log('Updating AI agent with data:', updateData);

      // Use admin client for agent operations
      const { data, error } = await supabaseAdmin
        .from('ai_agents')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating AI agent:', error);
        console.error('Update data was:', updateData);
        throw new Error(`Failed to update agent: ${error.message}`);
      }

      console.log('Successfully updated AI agent:', data);
      return data;
    } catch (error) {
      console.error('Exception in updateAIAgent:', error);
      throw error;
    }
  }

  static async deleteAIAgent(id: string): Promise<boolean> {

    const { error } = await supabaseAdmin
      .from('ai_agents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting AI agent:', error);
      throw error;
    }

    return true;
  }

  // Call logs operations
  static async getCallLogs(profileId: string, limit = 50, offset = 0): Promise<CallLog[]> {

    const { data, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        outbound_campaigns(name)
      `)
      .eq('profile_id', profileId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching call logs:', error);
      // In live mode, return empty array instead of demo data
      return [];
    }

    return data || [];
  }

  static async getActiveCallLogs(profileId: string): Promise<CallLog[]> {

    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching active calls:', error);
      return [];
    }

    return data || [];
  }

  static async createCallLog(callLog: Omit<CallLog, 'id' | 'created_at'>): Promise<CallLog | null> {

    const { data, error } = await supabase
      .from('call_logs')
      .insert(callLog)
      .select()
      .single();

    if (error) {
      console.error('Error creating call log:', error);
      throw error;
    }

    return data;
  }

  static async updateCallLog(id: string, updates: Partial<CallLog>): Promise<CallLog | null> {

    const { data, error } = await supabase
      .from('call_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating call log:', error);
      throw error;
    }

    return data;
  }

  // Campaign operations
  static async getCampaigns(profileId: string): Promise<Campaign[]> {

    const { data, error } = await supabase
      .from('outbound_campaigns')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }

    return data || [];
  }

  static async getCampaign(campaignId: string): Promise<Campaign | null> {

    const { data, error } = await supabase
      .from('outbound_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }

    return data;
  }

  static async createCampaign(campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>): Promise<Campaign | null> {

    const { data, error } = await supabase
      .from('outbound_campaigns')
      .insert(campaign)
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }

    return data;
  }

  static async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {

    const { data, error } = await supabase
      .from('outbound_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }

    return data;
  }

  static async deleteCampaign(id: string): Promise<boolean> {

    const { error } = await supabase
      .from('outbound_campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }

    return true;
  }

  // Campaign leads operations
  static async getCampaignLeads(campaignId: string, options: { limit?: number; offset?: number; status?: string[]; } = {}): Promise<CampaignLead[]> {
    const { limit = 100, offset = 0, status } = options;
    

    let query = supabase
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', campaignId);

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    query = query
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching campaign leads:', error);
      return [];
    }

    return data || [];
  }

  // Appointments operations
  static async getAppointments(profileId: string): Promise<Appointment[]> {

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('profile_id', profileId)
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }

    return data || [];
  }

  static async createAppointment(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment | null> {

    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }

    return data;
  }

  static async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }

    return data;
  }

  static async deleteAppointment(id: string): Promise<boolean> {

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }

    return true;
  }

  static async toggleAgent(agentId: string, isActive: boolean): Promise<boolean> {

    const { error } = await supabase
      .from('ai_agents')
      .update({ is_active: isActive })
      .eq('id', agentId);

    if (error) {
      console.error('Error toggling agent:', error);
      throw error;
    }

    return true;
  }

  // Analytics operations
  static async getAnalytics(profileId: string): Promise<AnalyticsData> {

    try {
      // Get analytics using the database function
      const { data, error } = await supabase.rpc('get_user_analytics', {
        user_id: profileId,
        days_back: 30
      });

      if (error) {
        console.error('Error fetching analytics:', error);
        // Return empty analytics in live mode
        return this.getEmptyAnalytics();
      }

      return data || this.getEmptyAnalytics();
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return this.getEmptyAnalytics();
    }
  }

  // DNC operations
  static async getDNCEntries(profileId: string): Promise<DNCEntry[]> {

    const { data, error } = await supabase
      .from('dnc_lists')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching DNC entries:', error);
      return [];
    }

    return data || [];
  }

  static async addDNCEntry(entry: Omit<DNCEntry, 'id' | 'created_at'>): Promise<DNCEntry> {

    const { data, error } = await supabase
      .from('dnc_lists')
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error('Error adding DNC entry:', error);
      throw error;
    }

    return data;
  }

  static async deleteDNCEntry(id: string): Promise<boolean> {

    const { error } = await supabase
      .from('dnc_lists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting DNC entry:', error);
      throw error;
    }

    return true;
  }

  // Webhook operations
  static async getWebhookEndpoints(profileId: string): Promise<WebhookEndpoint[]> {

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhook endpoints:', error);
      return [];
    }

    return data || [];
  }

  static async getWebhookDeliveries(profileId: string): Promise<WebhookDelivery[]> {

    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select(`
        *,
        webhook_endpoints!inner(profile_id)
      `)
      .eq('webhook_endpoints.profile_id', profileId)
      .order('delivered_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching webhook deliveries:', error);
      return [];
    }

    return data || [];
  }

  // System status
  static async getSystemStatus(): Promise<SystemStatus[]> {

    const { data, error } = await supabase
      .from('system_status')
      .select('*')
      .is('resolved_at', null)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching system status:', error);
      return [];
    }

    return data || [];
  }

  // Demo data methods
  // @ts-ignore
  private static getDemoProfile(userId?: string): Profile {
    // Check if this is the admin user
    if (userId === 'admin-user-id') {
      return {
        id: 'admin-user-id',
        email: 'gamblerspassion@gmail.com',
        client_name: 'Admin User',
        company_name: 'AI Call Center Admin',
        phone_number: '+1 (555) 999-0000',
        plan_name: 'scale',
        monthly_minute_limit: 1800,
        minutes_used: 245,
        is_active: true,
        can_use_inbound: true,
        can_use_outbound_dialer: true,
        max_concurrent_calls: 50,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-14T00:00:00Z'
      };
    }
    
    // Default demo user profile
    return {
      id: 'demo-user-1',
      email: 'demo@example.com',
      client_name: 'Demo User',
      company_name: 'AI Call Center Demo',
      phone_number: '+1 (555) 123-4567',
      plan_name: 'pro',
      monthly_minute_limit: 1000,
      minutes_used: 752,
      is_active: true,
      can_use_inbound: true,
      can_use_outbound_dialer: true,
      max_concurrent_calls: 3,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-10T00:00:00Z'
    };
  }

  // @ts-ignore
  private static getDemoAgents(): AIAgent[] {
    return [
      {
        id: 'agent-1',
        profile_id: 'demo-user-1',
        name: 'Customer Service Agent',
        description: 'Primary customer service agent for general inquiries',
        agent_type: 'customer_service',
        call_direction: 'inbound',
        voice_name: 'Puck',
        language_code: 'en-US',
        system_instruction: 'You are a professional customer service representative.',
        twilio_phone_number: '+1 (555) 0001',
        is_active: true,
        max_concurrent_calls: 2,
        business_hours_start: '09:00',
        business_hours_end: '17:00',
        business_days: [1, 2, 3, 4, 5],
        timezone: 'UTC',
        escalation_enabled: true,
        escalation_type: 'human_agent',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'agent-2',
        profile_id: 'demo-user-1',
        name: 'Sales Agent',
        description: 'Outbound sales agent for lead qualification',
        agent_type: 'sales',
        call_direction: 'outbound',
        voice_name: 'Charon',
        language_code: 'en-US',
        system_instruction: 'You are a professional sales representative.',
        twilio_phone_number: '+1 (555) 0002',
        is_active: true,
        max_concurrent_calls: 1,
        business_hours_start: '09:00',
        business_hours_end: '18:00',
        business_days: [1, 2, 3, 4, 5],
        timezone: 'UTC',
        escalation_enabled: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];
  }

  // @ts-ignore - Demo method kept for future use
  // @ts-ignore
  private static getDemoCallLogs(): CallLog[] {
    return [
      {
        id: 'call-1',
        profile_id: 'demo-user-1',
        agent_id: 'agent-1',
        phone_number_from: '+1 (555) 123-4567',
        phone_number_to: '+1 (555) 987-6543',
        direction: 'inbound',
        status: 'completed',
        started_at: '2024-01-15T10:30:00Z',
        ended_at: '2024-01-15T10:34:23Z',
        duration_seconds: 263,
        call_summary: 'Customer inquiry about product features',
        sentiment_score: 0.8,
        outcome: 'Resolved',
        priority: 'normal',
        customer_satisfaction_score: 5,
        follow_up_required: false,
        tags: ['product-inquiry', 'resolved'],
        created_at: '2024-01-15T10:30:00Z'
      },
      {
        id: 'call-2',
        profile_id: 'demo-user-1',
        agent_id: 'agent-2',
        phone_number_from: '+1 (555) 987-6543',
        phone_number_to: '+1 (555) 456-7890',
        direction: 'outbound',
        status: 'in_progress',
        started_at: '2024-01-15T11:00:00Z',
        duration_seconds: 75,
        call_summary: 'Sales call in progress',
        priority: 'normal',
        follow_up_required: false,
        created_at: '2024-01-15T11:00:00Z'
      }
    ];
  }

  // @ts-ignore
  private static getDemoCampaigns(): Campaign[] {
    return [
      {
        id: 'campaign-1',
        profile_id: 'demo-user-1',
        agent_id: 'agent-2',
        name: 'Q1 Sales Outreach',
        description: 'Quarterly sales campaign for new prospects',
        status: 'active',
        caller_id: '+1 (555) 0002',
        max_concurrent_calls: 2,
        call_timeout_seconds: 30,
        retry_attempts: 3,
        retry_delay_minutes: 60,
        start_time: '09:00',
        end_time: '17:00',
        timezone: 'UTC',
        days_of_week: [1, 2, 3, 4, 5],
        priority: 'normal',
        total_leads: 500,
        leads_called: 156,
        leads_answered: 89,
        leads_completed: 45,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      }
    ];
  }

  // @ts-ignore
  private static getDemoCampaignLeads(): CampaignLead[] {
    return [
      {
        id: 'lead-1',
        campaign_id: 'campaign-1',
        phone_number: '+1 (555) 111-2222',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        company: 'Acme Corp',
        status: 'completed',
        priority: 'normal',
        call_attempts: 1,
        last_call_at: '2024-01-15T10:00:00Z',
        outcome: 'Interested - Follow up scheduled',
        do_not_call: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      }
    ];
  }

  // @ts-ignore
  private static getDemoAppointments(): Appointment[] {
    return [
      {
        id: 'appointment-1',
        profile_id: 'demo-user-1',
        customer_name: 'Jane Smith',
        customer_phone: '+1 (555) 333-4444',
        customer_email: 'jane.smith@example.com',
        appointment_date: '2024-01-20',
        appointment_time: '14:00',
        service_type: 'Product Demo',
        scheduled_date: '2024-01-20T14:00:00Z',
        duration_minutes: 30,
        // location: 'Zoom Meeting', // Property not in Appointment interface
        status: 'scheduled',
        // reminder_sent: false, // Property not in Appointment interface
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      }
    ];
  }

  // @ts-ignore
  private static getDemoAnalytics(): AnalyticsData {
    return {
      totalCalls: 247,
      totalMinutes: 1840,
      successfulCalls: 189,
      averageCallDuration: 447,
      callsByDay: [
        { date: '2024-01-08', count: 32 },
        { date: '2024-01-09', count: 28 },
        { date: '2024-01-10', count: 35 },
        { date: '2024-01-11', count: 41 },
        { date: '2024-01-12', count: 38 },
        { date: '2024-01-13', count: 29 },
        { date: '2024-01-14', count: 44 }
      ],
      callsByStatus: [
        { status: 'completed', count: 189 },
        { status: 'failed', count: 32 },
        { status: 'abandoned', count: 26 }
      ],
      topOutcomes: [
        { outcome: 'Resolved', count: 89 },
        { outcome: 'Follow-up scheduled', count: 45 },
        { outcome: 'Information provided', count: 32 },
        { outcome: 'Escalated', count: 23 }
      ],
      minutesUsed: 752,
      minutesLimit: 1000,
      campaignStats: {
        totalCampaigns: 3,
        activeCampaigns: 1,
        totalLeads: 1250,
        leadsContacted: 456
      },
      successRate: 76.5,
      avgDuration: 447,
      costPerCall: 0.12,
      callVolumeData: [
        { date: '2024-01-08', calls: 32 },
        { date: '2024-01-09', calls: 28 },
        { date: '2024-01-10', calls: 35 }
      ],
      performanceData: [
        { date: '2024-01-08', success_rate: 75.2 },
        { date: '2024-01-09', success_rate: 78.1 },
        { date: '2024-01-10', success_rate: 72.8 }
      ],
      callOutcomeData: [
        { name: 'Success', value: 189, color: '#10B981' },
        { name: 'Failed', value: 32, color: '#EF4444' },
        { name: 'Abandoned', value: 26, color: '#F59E0B' }
      ],
      topScripts: [
        { name: 'Sales Script A', success_rate: 82.5, total_calls: 125 },
        { name: 'Support Script B', success_rate: 78.2, total_calls: 89 }
      ]
    };
  }

  private static getEmptyAnalytics(): AnalyticsData {
    return {
      totalCalls: 0,
      totalMinutes: 0,
      successfulCalls: 0,
      averageCallDuration: 0,
      callsByDay: [],
      callsByStatus: [],
      topOutcomes: [],
      minutesUsed: 0,
      minutesLimit: 50000, // Default Enterprise plan limit
      campaignStats: {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalLeads: 0,
        leadsContacted: 0
      },
      successRate: 0,
      avgDuration: 0,
      costPerCall: 0,
      callVolumeData: [],
      performanceData: [],
      callOutcomeData: [],
      topScripts: []
    };
  }

  // @ts-ignore
  private static getDemoSystemStatus(): SystemStatus[] {
    return [
      {
        id: 'status-1',
        service_name: 'api',
        status: 'operational',
        started_at: '2024-01-15T00:00:00Z',
        created_at: '2024-01-15T00:00:00Z'
      },
      {
        id: 'status-2',
        service_name: 'calls',
        status: 'operational',
        started_at: '2024-01-15T00:00:00Z',
        created_at: '2024-01-15T00:00:00Z'
      }
    ];
  }

  // @ts-ignore
  private static getDemoActiveCalls(): any[] {
    return [
      {
        id: 'active-call-1',
        agent_id: 'agent-1',
        agent_name: 'Customer Service Agent',
        phone_number_from: '+1 (555) 123-4567',
        phone_number_to: '+1 (555) 987-6543',
        direction: 'inbound',
        status: 'in_progress',
        started_at: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        duration_seconds: 120,
        customer_name: 'Sarah Johnson',
        call_quality: 'excellent'
      },
      {
        id: 'active-call-2',
        agent_id: 'agent-2',
        agent_name: 'Sales Agent',
        phone_number_from: '+1 (555) 987-6543',
        phone_number_to: '+1 (555) 456-7890',
        direction: 'outbound',
        status: 'in_progress',
        started_at: new Date(Date.now() - 45000).toISOString(), // 45 seconds ago
        duration_seconds: 45,
        customer_name: 'Mike Chen',
        call_quality: 'good'
      }
    ];
  }

  // Additional helper methods
  static async getAllCallLogs(profileId: string): Promise<CallLog[]> {
    return this.getCallLogs(profileId, 1000, 0);
  }

  static async getSubscription(profileId: string): Promise<Subscription | null> {

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('profile_id', profileId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data;
  }

  static async getUsageRecords(profileId: string): Promise<UsageRecord[]> {

    const { data, error } = await supabase
      .from('usage_records')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching usage records:', error);
      return [];
    }

    return data || [];
  }

  static async createCheckoutSession(profileId: string, planId: string): Promise<string> {
    // In a real implementation, this would call Stripe API
    return `https://checkout.stripe.com/pay/cs_test_${planId}_${profileId}`;
  }

  static async cancelSubscription(subscriptionId: string): Promise<boolean> {

    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);

    if (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }

    return true;
  }

  static async createWebhookEndpoint(webhook: Omit<WebhookEndpoint, 'id' | 'created_at' | 'updated_at' | 'success_count' | 'failure_count'>): Promise<WebhookEndpoint> {

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .insert({
        ...webhook,
        success_count: 0,
        failure_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating webhook endpoint:', error);
      throw error;
    }

    return data;
  }

  static async updateWebhookEndpoint(id: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating webhook endpoint:', error);
      throw error;
    }

    return data;
  }

  static async deleteWebhookEndpoint(id: string): Promise<boolean> {

    const { error } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting webhook endpoint:', error);
      throw error;
    }

    return true;
  }

  static async testWebhookEndpoint(id: string): Promise<boolean> {

    // In a real implementation, this would trigger a test webhook
    console.log('Testing webhook endpoint:', id);
    return true;
  }

  static async bulkAddDNCEntries(entries: Omit<DNCEntry, 'id' | 'created_at'>[]): Promise<DNCEntry[]> {

    const { data, error } = await supabase
      .from('dnc_lists')
      .insert(entries)
      .select();

    if (error) {
      console.error('Error bulk adding DNC entries:', error);
      throw error;
    }

    return data || [];
  }

  static async checkDNCStatus(phoneNumber: string, profileId: string): Promise<boolean> {

    const { data, error } = await supabase
      .from('dnc_lists')
      .select('id')
      .eq('profile_id', profileId)
      .eq('phone_number', phoneNumber)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking DNC status:', error);
      return false;
    }

    return !!data;
  }

  static async bulkCreateCampaignLeads(leads: Omit<CampaignLead, 'id' | 'created_at' | 'updated_at'>[]): Promise<CampaignLead[]> {

    const { data, error } = await supabase
      .from('campaign_leads')
      .insert(leads)
      .select();

    if (error) {
      console.error('Error bulk creating campaign leads:', error);
      throw error;
    }

    return data || [];
  }

  static async createCampaignLead(lead: Omit<CampaignLead, 'id' | 'created_at' | 'updated_at'>): Promise<CampaignLead | null> {

    const { data, error } = await supabase
      .from('campaign_leads')
      .insert(lead)
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign lead:', error);
      throw error;
    }

    return data;
  }

  static async updateCampaignLead(id: string, updates: Partial<CampaignLead>): Promise<CampaignLead | null> {

    const { data, error } = await supabase
      .from('campaign_leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating campaign lead:', error);
      throw error;
    }

    return data;
  }

  static async deleteCampaignLead(id: string): Promise<boolean> {

    const { error } = await supabase
      .from('campaign_leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting campaign lead:', error);
      throw error;
    }

    return true;
  }

  // New methods for the 5 enhanced features

  // Live call monitoring methods
  static async getLiveCalls(profileId: string): Promise<any[]> {

    const { data, error } = await supabase
      .from('live_calls')
      .select(`
        *,
        ai_agents!inner(name, agent_type, voice_name)
      `)
      .eq('profile_id', profileId)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching live calls:', error);
      return [];
    }

    return data || [];
  }

  static async updateLiveCallStatus(callId: string, status: string, metadata: any = {}): Promise<boolean> {

    const { error } = await supabase
      .from('live_calls')
      .update({ 
        status,
        last_updated: new Date().toISOString(),
        metadata
      })
      .eq('id', callId);

    if (error) {
      console.error('Error updating live call status:', error);
      return false;
    }

    return true;
  }

  // Webhook event methods
  static async logWebhookEvent(event: {
    profile_id?: string
    event_type: string
    call_id?: string
    agent_id?: string
    event_data: any
  }): Promise<boolean> {

    const { error } = await supabase
      .from('webhook_events')
      .insert(event);

    if (error) {
      console.error('Error logging webhook event:', error);
      return false;
    }

    return true;
  }

  static async getWebhookEvents(profileId: string, limit = 50): Promise<any[]> {

    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching webhook events:', error);
      return [];
    }

    return data || [];
  }

  // Auto-dialer queue methods
  static async addToDialerQueue(entry: {
    profile_id: string
    campaign_id: string
    lead_id: string
    agent_id?: string
    priority?: string
    scheduled_at?: string
  }): Promise<boolean> {

    const { error } = await supabase
      .from('dialer_queue')
      .insert(entry);

    if (error) {
      console.error('Error adding to dialer queue:', error);
      return false;
    }

    return true;
  }

  static async getDialerQueue(profileId: string, campaignId?: string): Promise<any[]> {

    let query = supabase
      .from('dialer_queue')
      .select(`
        *,
        campaign_leads!inner(phone_number, first_name, last_name, email, company),
        ai_agents(name)
      `)
      .eq('profile_id', profileId)
      .in('status', ['queued', 'dialing']);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching dialer queue:', error);
      return [];
    }

    return data || [];
  }

  static async updateDialerQueueStatus(queueId: string, status: string, metadata: any = {}): Promise<boolean> {

    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'dialing') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (Object.keys(metadata).length > 0) {
      updateData.metadata = metadata;
    }

    const { error } = await supabase
      .from('dialer_queue')
      .update(updateData)
      .eq('id', queueId);

    if (error) {
      console.error('Error updating dialer queue status:', error);
      return false;
    }

    return true;
  }

  // Campaign metrics methods
  static async getCampaignMetrics(profileId: string, campaignId?: string, days = 30): Promise<any[]> {

    let query = supabase
      .from('campaign_metrics')
      .select(`
        *,
        outbound_campaigns!inner(name)
      `)
      .eq('profile_id', profileId)
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('Error fetching campaign metrics:', error);
      return [];
    }

    return data || [];
  }

  static async updateCampaignMetrics(profileId: string, campaignId: string, date: string, metrics: any): Promise<boolean> {

    const { error } = await supabase
      .from('campaign_metrics')
      .upsert({
        profile_id: profileId,
        campaign_id: campaignId,
        date,
        ...metrics,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating campaign metrics:', error);
      return false;
    }

    return true;
  }

  // System metrics methods
  static async getSystemMetrics(profileId?: string): Promise<any[]> {

    let query = supabase
      .from('system_metrics')
      .select('*')
      .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (profileId) {
      query = query.eq('profile_id', profileId);
    }

    const { data, error } = await query.order('recorded_at', { ascending: false });

    if (error) {
      console.error('Error fetching system metrics:', error);
      return [];
    }

    return data || [];
  }

  static async recordSystemMetric(metric: {
    metric_name: string
    metric_value: number
    metric_unit?: string
    profile_id?: string
    agent_id?: string
    metadata?: any
  }): Promise<boolean> {

    const { error } = await supabase
      .from('system_metrics')
      .insert(metric);

    if (error) {
      console.error('Error recording system metric:', error);
      return false;
    }

    return true;
  }

  // Function call logging methods
  static async logFunctionCall(log: {
    profile_id?: string
    call_id: string
    function_name: string
    parameters: any
    result?: any
    execution_time_ms?: number
    success?: boolean
    error_message?: string
  }): Promise<boolean> {

    const { error } = await supabase
      .from('function_call_logs')
      .insert(log);

    if (error) {
      console.error('Error logging function call:', error);
      return false;
    }

    return true;
  }

  // Demo data methods for new features
  // @ts-ignore
  private static getDemoCampaignMetrics(): any[] {
    return [
      {
        id: 'metric-1',
        campaign_id: 'demo-campaign-1',
        date: new Date().toISOString().split('T')[0],
        leads_queued: 100,
        leads_dialed: 85,
        leads_connected: 42,
        leads_completed: 15,
        conversion_rate: 17.6,
        revenue_generated: 2500.00,
        outbound_campaigns: { name: 'Demo Sales Campaign' }
      },
      {
        id: 'metric-2',
        campaign_id: 'demo-campaign-1',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        leads_queued: 120,
        leads_dialed: 95,
        leads_connected: 48,
        leads_completed: 18,
        conversion_rate: 18.9,
        revenue_generated: 3200.00,
        outbound_campaigns: { name: 'Demo Sales Campaign' }
      }
    ];
  }

  // @ts-ignore
  private static getDemoSystemMetrics(): any[] {
    return [
      {
        id: 'sys-metric-1',
        metric_name: 'active_calls',
        metric_value: 3,
        metric_unit: 'count',
        recorded_at: new Date().toISOString()
      },
      {
        id: 'sys-metric-2',
        metric_name: 'api_response_time',
        metric_value: 145.5,
        metric_unit: 'milliseconds',
        recorded_at: new Date().toISOString()
      },
      {
        id: 'sys-metric-3',
        metric_name: 'system_load',
        metric_value: 65.2,
        metric_unit: 'percentage',
        recorded_at: new Date().toISOString()
      }
    ];
  }

  // Live calls operations
  static async getActiveCalls(profileId: string): Promise<ActiveCall[]> {

    const { data, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        ai_agents(name)
      `)
      .eq('profile_id', profileId)
      .eq('status', 'in_progress');

    if (error) {
      console.error('Error fetching active calls:', error);
      return [];
    }

    return (data || []).map(call => ({
      ...call,
      agent_name: call.ai_agents?.name || 'Unknown Agent',
      call_quality: 'good' as const
    }));
  }

  static async getAgentStatuses(profileId: string): Promise<AIAgent[]> {

    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('profile_id', profileId);

    if (error) {
      console.error('Error fetching agent statuses:', error);
      return [];
    }

    return data || [];
  }

  static async getCallQueue(profileId: string): Promise<CallLog[]> {

    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching call queue:', error);
      return [];
    }

    return data || [];
  }

  static async emergencyStopAllCalls(profileId: string): Promise<void> {

    const { error } = await supabase
      .from('call_logs')
      .update({ status: 'failed' })
      .eq('profile_id', profileId)
      .eq('status', 'in_progress');

    if (error) {
      console.error('Error stopping calls:', error);
      throw error;
    }
  }
}