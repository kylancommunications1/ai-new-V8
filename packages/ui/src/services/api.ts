/**
 * Centralized API Service for TW2GEM AI Call Center
 * Provides comprehensive API integration for all features
 */

import { supabase, supabaseAdmin } from '../lib/supabase';
import type { 
  Profile, 
  CallLog, 
  Campaign, 
  CampaignLead, 
  AnalyticsData,
  AIAgent,
  ActiveCall,
  SystemMetrics,
  AgentStatus,
  DNCEntry,
  WebhookEndpoint,
  WebhookDelivery
} from '../lib/supabase';

export interface DashboardMetrics {
  activeCalls: number;
  totalCallsToday: number;
  successRate: number;
  avgDuration: number;
  minutesUsed: number;
  minutesLimit: number;
  recentCalls: CallLog[];
  activeCallsList: ActiveCall[];
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export interface LiveCallsData {
  activeCalls: ActiveCall[];
  agentStatuses: AgentStatus[];
  callQueue: CallLog[];
  systemMetrics: SystemMetrics;
}

export interface AnalyticsMetrics {
  totalCalls: number;
  successfulCalls: number;
  averageCallDuration: number;
  successRate: number;
  costPerCall: number;
  callVolumeData: Array<{ date: string; calls: number; successful: number }>;
  performanceData: Array<{ date: string; successRate: number }>;
  callOutcomeData: Array<{ name: string; value: number; color: string }>;
  topScripts: Array<{ name: string; success_rate: number; total_calls: number }>;
  hourlyDistribution: Array<{ hour: number; calls: number }>;
  weeklyTrends: Array<{ week: string; calls: number; success_rate: number }>;
}

export interface CallHistoryFilters {
  direction?: 'all' | 'inbound' | 'outbound';
  status?: 'all' | 'completed' | 'failed' | 'in_progress' | 'abandoned';
  dateRange?: { start: string; end: string };
  agentId?: string;
  campaignId?: string;
  searchTerm?: string;
}

export interface PaginatedCallHistory {
  calls: CallLog[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface AgentFilters {
  status?: 'all' | 'active' | 'inactive';
  type?: 'all' | 'customer_service' | 'sales' | 'support' | 'appointment_booking' | 'survey' | 'after_hours' | 'general';
  searchTerm?: string;
}

export interface CampaignFilters {
  status?: 'all' | 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  searchTerm?: string;
  dateRange?: { start: string; end: string };
}

export interface AppointmentFilters {
  status?: 'all' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  dateRange?: { start: string; end: string };
  searchTerm?: string;
}

export interface BillingData {
  currentPlan: string;
  minutesUsed: number;
  minutesLimit: number;
  currentCost: number;
  billingCycle: string;
  nextBillingDate: string;
  paymentMethod?: string;
  invoices: Array<{
    id: string;
    date: string;
    amount: number;
    status: string;
    downloadUrl?: string;
  }>;
  usage: Array<{
    date: string;
    minutes: number;
    cost: number;
  }>;
}

export interface WebhookData {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggered?: string;
  createdAt: string;
}

export interface DNCSetting {
  id: string;
  phoneNumber: string;
  reason: string;
  addedAt: string;
  expiresAt?: string;
}

export class ApiService {
  private static baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:12001';

  // ============================================================================
  // DASHBOARD APIs
  // ============================================================================

  /**
   * Get comprehensive dashboard metrics
   */
  static async getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
    try {
      // Get active calls
      const activeCalls = await this.getActiveCalls(userId);
      
      // Get today's call statistics
      const today = new Date().toISOString().split('T')[0];
      const { data: todayCalls, error: todayError } = await supabase
        .from('call_logs')
        .select('*')
        .eq('profile_id', userId)
        .gte('started_at', `${today}T00:00:00.000Z`)
        .lte('started_at', `${today}T23:59:59.999Z`);

      if (todayError) throw todayError;

      // Calculate metrics
      const totalCallsToday = todayCalls?.length || 0;
      const successfulCalls = todayCalls?.filter(call => call.status === 'completed').length || 0;
      const successRate = totalCallsToday > 0 ? (successfulCalls / totalCallsToday) * 100 : 0;
      
      const totalDuration = todayCalls?.reduce((sum, call) => sum + call.duration_seconds, 0) || 0;
      const avgDuration = totalCallsToday > 0 ? totalDuration / totalCallsToday : 0;

      // Get user profile for limits
      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_minute_limit, minutes_used')
        .eq('id', userId)
        .single();

      // Get recent calls
      const { data: recentCalls } = await supabase
        .from('call_logs')
        .select(`
          *,
          outbound_campaigns(name),
          ai_agents(name)
        `)
        .eq('profile_id', userId)
        .order('started_at', { ascending: false })
        .limit(10);

      // Determine system health
      const systemHealth: 'healthy' | 'warning' | 'critical' = 
        activeCalls.length > 20 ? 'critical' :
        activeCalls.length > 10 ? 'warning' : 'healthy';

      return {
        activeCalls: activeCalls.length,
        totalCallsToday,
        successRate: Math.round(successRate),
        avgDuration: Math.round(avgDuration),
        minutesUsed: profile?.minutes_used || 0,
        minutesLimit: profile?.monthly_minute_limit || 1000,
        recentCalls: recentCalls || [],
        activeCallsList: activeCalls,
        systemHealth
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Get real-time dashboard updates
   */
  static async getDashboardUpdates(userId: string, lastUpdate?: string): Promise<Partial<DashboardMetrics>> {
    try {
      const since = lastUpdate || new Date(Date.now() - 30000).toISOString(); // Last 30 seconds
      
      // Get recent call updates
      const { data: recentUpdates } = await supabase
        .from('call_logs')
        .select('*')
        .eq('profile_id', userId)
        .gte('updated_at', since)
        .order('updated_at', { ascending: false });

      // Get current active calls
      const activeCalls = await this.getActiveCalls(userId);

      return {
        activeCalls: activeCalls.length,
        activeCallsList: activeCalls,
        recentCalls: recentUpdates || []
      };
    } catch (error) {
      console.error('Error fetching dashboard updates:', error);
      throw error;
    }
  }

  // ============================================================================
  // LIVE CALLS APIs
  // ============================================================================

  /**
   * Get comprehensive live calls data
   */
  static async getLiveCallsData(userId: string): Promise<LiveCallsData> {
    try {
      const [activeCalls, agentStatuses, callQueue, systemMetrics] = await Promise.all([
        this.getActiveCalls(userId),
        this.getAgentStatuses(userId),
        this.getCallQueue(userId),
        this.getSystemMetrics(userId)
      ]);

      return {
        activeCalls,
        agentStatuses,
        callQueue,
        systemMetrics
      };
    } catch (error) {
      console.error('Error fetching live calls data:', error);
      throw error;
    }
  }

  /**
   * Get active calls with enhanced details
   */
  static async getActiveCalls(userId: string): Promise<ActiveCall[]> {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select(`
          *,
          ai_agents(name, voice_name),
          outbound_campaigns(name)
        `)
        .eq('profile_id', userId)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(call => ({
        ...call,
        agent_name: call.ai_agents?.name || 'Unknown Agent',
        call_quality: this.calculateCallQuality(call),
        duration_seconds: Math.floor((new Date().getTime() - new Date(call.started_at).getTime()) / 1000)
      }));
    } catch (error) {
      console.error('Error fetching active calls:', error);
      return [];
    }
  }

  /**
   * Get agent statuses with current call counts
   */
  static async getAgentStatuses(userId: string): Promise<AgentStatus[]> {
    try {
      // Get agents
      const { data: agents, error: agentsError } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('profile_id', userId);

      if (agentsError) throw agentsError;

      // Get current call counts for each agent
      const agentStatuses: AgentStatus[] = [];
      
      for (const agent of agents || []) {
        const { data: activeCalls } = await supabase
          .from('call_logs')
          .select('id')
          .eq('agent_id', agent.id)
          .eq('status', 'in_progress');

        const { data: todayCalls } = await supabase
          .from('call_logs')
          .select('duration_seconds')
          .eq('agent_id', agent.id)
          .gte('started_at', new Date().toISOString().split('T')[0] + 'T00:00:00.000Z');

        const currentCalls = activeCalls?.length || 0;
        const callsToday = todayCalls?.length || 0;
        const totalDuration = todayCalls?.reduce((sum, call) => sum + call.duration_seconds, 0) || 0;
        const avgCallDuration = callsToday > 0 ? totalDuration / callsToday : 0;

        agentStatuses.push({
          id: agent.id,
          name: agent.name,
          status: currentCalls > 0 ? 'busy' : (agent.is_active ? 'available' : 'offline'),
          current_calls: currentCalls,
          calls_today: callsToday,
          avg_call_duration: avgCallDuration
        });
      }

      return agentStatuses;
    } catch (error) {
      console.error('Error fetching agent statuses:', error);
      return [];
    }
  }

  /**
   * Get call queue
   */
  static async getCallQueue(userId: string): Promise<CallLog[]> {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select(`
          *,
          outbound_campaigns(name)
        `)
        .eq('profile_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching call queue:', error);
      return [];
    }
  }

  /**
   * Get system metrics
   */
  static async getSystemMetrics(userId: string): Promise<SystemMetrics> {
    try {
      const [activeCalls, queuedCalls] = await Promise.all([
        this.getActiveCalls(userId),
        this.getCallQueue(userId)
      ]);

      // Calculate average wait time (simplified)
      const avgWaitTime = queuedCalls.length > 0 ? 
        queuedCalls.reduce((sum, call) => {
          const waitTime = Math.floor((new Date().getTime() - new Date(call.created_at).getTime()) / 1000);
          return sum + waitTime;
        }, 0) / queuedCalls.length : 0;

      const systemHealth: 'healthy' | 'warning' | 'critical' = 
        activeCalls.length > 20 ? 'critical' :
        activeCalls.length > 10 ? 'warning' : 'healthy';

      return {
        total_active_calls: activeCalls.length,
        total_queued_calls: queuedCalls.length,
        average_wait_time: avgWaitTime,
        system_health: systemHealth,
        uptime_percentage: 99.9 // This would come from monitoring service
      };
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      return {
        total_active_calls: 0,
        total_queued_calls: 0,
        average_wait_time: 0,
        system_health: 'healthy',
        uptime_percentage: 99.9
      };
    }
  }

  /**
   * Emergency stop all calls
   */
  static async emergencyStopAllCalls(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('call_logs')
        .update({ 
          status: 'failed',
          ended_at: new Date().toISOString(),
          outcome: 'Emergency stop'
        })
        .eq('profile_id', userId)
        .eq('status', 'in_progress');

      if (error) throw error;
    } catch (error) {
      console.error('Error stopping all calls:', error);
      throw error;
    }
  }

  /**
   * Toggle agent status
   */
  static async toggleAgentStatus(agentId: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_agents')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling agent status:', error);
      throw error;
    }
  }

  // ============================================================================
  // ANALYTICS APIs
  // ============================================================================

  /**
   * Get comprehensive analytics data
   */
  static async getAnalyticsData(userId: string, timeRange: string = '7d'): Promise<AnalyticsMetrics> {
    try {
      const days = this.getTimeRangeDays(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get calls within time range
      const { data: calls, error } = await supabase
        .from('call_logs')
        .select(`
          *,
          ai_agents(name),
          outbound_campaigns(name)
        `)
        .eq('profile_id', userId)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: false });

      if (error) throw error;

      const callsData = calls || [];
      const totalCalls = callsData.length;
      const successfulCalls = callsData.filter(call => call.status === 'completed').length;
      const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
      
      const totalDuration = callsData.reduce((sum, call) => sum + call.duration_seconds, 0);
      const averageCallDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

      // Generate call volume data
      const callVolumeData = this.generateCallVolumeData(callsData, days);
      
      // Generate performance data
      const performanceData = this.generatePerformanceData(callsData, days);
      
      // Generate call outcome data
      const callOutcomeData = this.generateCallOutcomeData(callsData);
      
      // Generate top scripts data
      const topScripts = this.generateTopScriptsData(callsData);
      
      // Generate hourly distribution
      const hourlyDistribution = this.generateHourlyDistribution(callsData);
      
      // Generate weekly trends
      const weeklyTrends = this.generateWeeklyTrends(callsData);

      return {
        totalCalls,
        successfulCalls,
        averageCallDuration,
        successRate,
        costPerCall: 0.15, // This would be calculated based on actual costs
        callVolumeData,
        performanceData,
        callOutcomeData,
        topScripts,
        hourlyDistribution,
        weeklyTrends
      };
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      throw error;
    }
  }

  /**
   * Get real-time analytics updates
   */
  static async getAnalyticsUpdates(userId: string, lastUpdate?: string): Promise<Partial<AnalyticsMetrics>> {
    try {
      const since = lastUpdate || new Date(Date.now() - 60000).toISOString(); // Last minute
      
      const { data: recentCalls } = await supabase
        .from('call_logs')
        .select('*')
        .eq('profile_id', userId)
        .gte('updated_at', since);

      if (!recentCalls || recentCalls.length === 0) {
        return {};
      }

      // Recalculate metrics with recent data
      const totalCalls = recentCalls.length;
      const successfulCalls = recentCalls.filter(call => call.status === 'completed').length;
      const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

      return {
        totalCalls,
        successfulCalls,
        successRate
      };
    } catch (error) {
      console.error('Error fetching analytics updates:', error);
      return {};
    }
  }

  // ============================================================================
  // CALL HISTORY APIs
  // ============================================================================

  /**
   * Get paginated call history with filters
   */
  static async getCallHistory(
    userId: string, 
    page: number = 1, 
    pageSize: number = 20, 
    filters: CallHistoryFilters = {}
  ): Promise<PaginatedCallHistory> {
    try {
      let query = supabase
        .from('call_logs')
        .select(`
          *,
          ai_agents(name),
          outbound_campaigns(name)
        `, { count: 'exact' })
        .eq('profile_id', userId);

      // Apply filters
      if (filters.direction && filters.direction !== 'all') {
        query = query.eq('direction', filters.direction);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.dateRange) {
        query = query
          .gte('started_at', filters.dateRange.start)
          .lte('started_at', filters.dateRange.end);
      }

      if (filters.agentId) {
        query = query.eq('agent_id', filters.agentId);
      }

      if (filters.campaignId) {
        query = query.eq('campaign_id', filters.campaignId);
      }

      if (filters.searchTerm) {
        query = query.or(`
          phone_number_from.ilike.%${filters.searchTerm}%,
          phone_number_to.ilike.%${filters.searchTerm}%,
          call_summary.ilike.%${filters.searchTerm}%,
          outcome.ilike.%${filters.searchTerm}%
        `);
      }

      // Apply pagination
      const offset = (page - 1) * pageSize;
      query = query
        .order('started_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const total = count || 0;
      const hasMore = offset + pageSize < total;

      return {
        calls: data || [],
        total,
        page,
        pageSize,
        hasMore
      };
    } catch (error) {
      console.error('Error fetching call history:', error);
      throw error;
    }
  }

  /**
   * Get call recording URL
   */
  static async getCallRecording(callId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('recording_url')
        .eq('id', callId)
        .single();

      if (error) throw error;
      return data?.recording_url || null;
    } catch (error) {
      console.error('Error fetching call recording:', error);
      return null;
    }
  }

  /**
   * Get call transcript
   */
  static async getCallTranscript(callId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('transcript')
        .eq('id', callId)
        .single();

      if (error) throw error;
      return data?.transcript || null;
    } catch (error) {
      console.error('Error fetching call transcript:', error);
      return null;
    }
  }

  /**
   * Export call history to CSV
   */
  static async exportCallHistory(userId: string, filters: CallHistoryFilters = {}): Promise<Blob> {
    try {
      // Get all calls matching filters (no pagination)
      const { calls } = await this.getCallHistory(userId, 1, 10000, filters);

      // Convert to CSV
      const csvContent = this.convertCallsToCSV(calls);
      return new Blob([csvContent], { type: 'text/csv' });
    } catch (error) {
      console.error('Error exporting call history:', error);
      throw error;
    }
  }



  // ============================================================================
  // AGENTS MANAGEMENT APIs
  // ============================================================================

  /**
   * Get all AI agents with filtering
   */
  static async getAgents(userId: string, filters: AgentFilters = {}): Promise<AIAgent[]> {
    try {
      let query = supabase
        .from('ai_agents')
        .select('*')
        .eq('profile_id', userId);

      if (filters.status && filters.status !== 'all') {
        query = query.eq('is_active', filters.status === 'active');
      }

      if (filters.type && filters.type !== 'all') {
        query = query.eq('agent_type', filters.type);
      }

      if (filters.searchTerm) {
        query = query.or(`name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching agents:', error);
      return [];
    }
  }

  /**
   * Create a new AI agent
   */
  static async createAgent(userId: string, agentData: Partial<AIAgent>): Promise<AIAgent | null> {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .insert([{
          profile_id: userId,
          ...agentData
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  /**
   * Update an AI agent
   */
  static async updateAgent(agentId: string, agentData: Partial<AIAgent>): Promise<AIAgent | null> {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .update(agentData)
        .eq('id', agentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating agent:', error);
      throw error;
    }
  }

  /**
   * Delete an AI agent
   */
  static async deleteAgent(agentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  }

  // ============================================================================
  // CAMPAIGNS MANAGEMENT APIs
  // ============================================================================

  /**
   * Get all campaigns with filtering
   */
  static async getCampaigns(userId: string, filters: CampaignFilters = {}): Promise<Campaign[]> {
    try {
      let query = supabase
        .from('outbound_campaigns')
        .select('*')
        .eq('profile_id', userId);

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.searchTerm) {
        query = query.or(`name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
      }

      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
  }

  /**
   * Create a new campaign
   */
  static async createCampaign(userId: string, campaignData: Partial<Campaign>): Promise<Campaign | null> {
    try {
      const { data, error } = await supabase
        .from('outbound_campaigns')
        .insert([{
          profile_id: userId,
          ...campaignData
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Update a campaign
   */
  static async updateCampaign(campaignId: string, campaignData: Partial<Campaign>): Promise<Campaign | null> {
    try {
      const { data, error } = await supabase
        .from('outbound_campaigns')
        .update(campaignData)
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  }

  /**
   * Delete a campaign
   */
  static async deleteCampaign(campaignId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('outbound_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaign leads
   */
  static async getCampaignLeads(campaignId: string): Promise<CampaignLead[]> {
    try {
      const { data, error } = await supabase
        .from('campaign_leads')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching campaign leads:', error);
      return [];
    }
  }

  /**
   * Upload campaign leads
   */
  static async uploadCampaignLeads(campaignId: string, leads: Partial<CampaignLead>[]): Promise<void> {
    try {
      const leadsWithCampaignId = leads.map(lead => ({
        ...lead,
        campaign_id: campaignId
      }));

      const { error } = await supabase
        .from('campaign_leads')
        .insert(leadsWithCampaignId);

      if (error) throw error;
    } catch (error) {
      console.error('Error uploading campaign leads:', error);
      throw error;
    }
  }

  // ============================================================================
  // APPOINTMENTS MANAGEMENT APIs
  // ============================================================================

  /**
   * Get appointments with filtering
   */
  static async getAppointments(userId: string, filters: AppointmentFilters = {}): Promise<any[]> {
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('profile_id', userId);

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.searchTerm) {
        query = query.or(`customer_name.ilike.%${filters.searchTerm}%,customer_phone.ilike.%${filters.searchTerm}%`);
      }

      if (filters.dateRange) {
        query = query
          .gte('scheduled_at', filters.dateRange.start)
          .lte('scheduled_at', filters.dateRange.end);
      }

      const { data, error } = await query.order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  }

  /**
   * Create a new appointment
   */
  static async createAppointment(userId: string, appointmentData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          profile_id: userId,
          ...appointmentData
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  /**
   * Update an appointment
   */
  static async updateAppointment(appointmentId: string, appointmentData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update(appointmentData)
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  }

  /**
   * Delete an appointment
   */
  static async deleteAppointment(appointmentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  }

  // ============================================================================
  // BILLING MANAGEMENT APIs
  // ============================================================================

  /**
   * Get billing data
   */
  static async getBillingData(userId: string): Promise<BillingData> {
    try {
      // Get user profile for billing info
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Get usage data from call logs
      const { data: callLogs } = await supabase
        .from('call_logs')
        .select('duration_seconds, started_at')
        .eq('profile_id', userId)
        .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const totalMinutes = callLogs?.reduce((sum, call) => sum + (call.duration_seconds / 60), 0) || 0;

      return {
        currentPlan: profile?.subscription_tier || 'starter',
        minutesUsed: Math.round(totalMinutes),
        minutesLimit: 1000, // This would come from subscription data
        currentCost: totalMinutes * 0.05, // Mock pricing
        billingCycle: 'monthly',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'Credit Card ending in 1234',
        invoices: [], // Would fetch from billing system
        usage: this.generateUsageData(callLogs || [])
      };
    } catch (error) {
      console.error('Error fetching billing data:', error);
      return {
        currentPlan: 'starter',
        minutesUsed: 0,
        minutesLimit: 1000,
        currentCost: 0,
        billingCycle: 'monthly',
        nextBillingDate: new Date().toISOString(),
        invoices: [],
        usage: []
      };
    }
  }

  // ============================================================================
  // WEBHOOKS MANAGEMENT APIs
  // ============================================================================

  /**
   * Get webhooks
   */
  static async getWebhookEndpoints(userId: string): Promise<WebhookEndpoint[]> {
    try {
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching webhook endpoints:', error);
      return [];
    }
  }

  /**
   * Create a webhook endpoint
   */
  static async createWebhookEndpoint(webhookData: Partial<WebhookEndpoint>): Promise<WebhookEndpoint | null> {
    try {
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .insert([webhookData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating webhook endpoint:', error);
      throw error;
    }
  }

  /**
   * Update a webhook endpoint
   */
  static async updateWebhookEndpoint(webhookId: string, webhookData: Partial<WebhookEndpoint>): Promise<WebhookEndpoint | null> {
    try {
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .update(webhookData)
        .eq('id', webhookId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating webhook endpoint:', error);
      throw error;
    }
  }

  /**
   * Delete a webhook endpoint
   */
  static async deleteWebhookEndpoint(webhookId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', webhookId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting webhook endpoint:', error);
      throw error;
    }
  }

  /**
   * Test a webhook endpoint
   */
  static async testWebhookEndpoint(webhookId: string, testPayload?: any): Promise<boolean> {
    try {
      // This would typically make a test HTTP request to the webhook URL
      // For now, we'll simulate a test by creating a test delivery record
      const { data: webhook } = await supabase
        .from('webhook_endpoints')
        .select('url')
        .eq('id', webhookId)
        .single();

      if (!webhook) throw new Error('Webhook not found');

      // In a real implementation, you'd make an HTTP request to webhook.url
      // For now, we'll just return true to indicate the test passed
      return true;
    } catch (error) {
      console.error('Error testing webhook endpoint:', error);
      return false;
    }
  }

  /**
   * Get webhook deliveries
   */
  static async getWebhookDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
    try {
      const { data, error } = await supabase
        .from('webhook_deliveries')
        .select('*')
        .eq('webhook_endpoint_id', webhookId)
        .order('delivered_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching webhook deliveries:', error);
      return [];
    }
  }

  // ============================================================================
  // DNC (DO NOT CALL) MANAGEMENT APIs
  // ============================================================================

  /**
   * Get DNC entries
   */
  static async getDNCList(userId: string): Promise<DNCEntry[]> {
    try {
      const { data, error } = await supabase
        .from('dnc_entries')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching DNC entries:', error);
      return [];
    }
  }

  /**
   * Add DNC entry
   */
  static async addDNCEntry(dncData: Partial<DNCEntry>): Promise<DNCEntry | null> {
    try {
      const { data, error } = await supabase
        .from('dnc_entries')
        .insert([dncData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding DNC entry:', error);
      throw error;
    }
  }

  /**
   * Delete DNC entry
   */
  static async deleteDNCEntry(dncId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('dnc_entries')
        .delete()
        .eq('id', dncId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting DNC entry:', error);
      throw error;
    }
  }

  /**
   * Bulk add DNC entries
   */
  static async bulkAddDNCEntries(dncEntries: Partial<DNCEntry>[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('dnc_entries')
        .insert(dncEntries);

      if (error) throw error;
    } catch (error) {
      console.error('Error bulk adding DNC entries:', error);
      throw error;
    }
  }

  // ============================================================================
  // SETTINGS MANAGEMENT APIs
  // ============================================================================

  /**
   * Get user settings
   */
  static async getUserSettings(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user settings:', error);
      return null;
    }
  }

  /**
   * Update user settings
   */
  static async updateUserSettings(userId: string, settings: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(settings)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  /**
   * Get phone numbers
   */
  static async getPhoneNumbers(userId: string): Promise<PhoneNumber[]> {
    try {
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      return [];
    }
  }

  /**
   * Add phone number
   */
  static async addPhoneNumber(userId: string, phoneData: Partial<PhoneNumber>): Promise<PhoneNumber | null> {
    try {
      const { data, error } = await supabase
        .from('phone_numbers')
        .insert([{
          profile_id: userId,
          ...phoneData
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding phone number:', error);
      throw error;
    }
  }

  // ============================================================================
  // ROUTING MANAGEMENT APIs
  // ============================================================================

  /**
   * Get routing rules
   */
  static async getRoutingRules(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('routing_rules')
        .select('*')
        .eq('profile_id', userId)
        .order('priority', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching routing rules:', error);
      return [];
    }
  }

  /**
   * Create routing rule
   */
  static async createRoutingRule(userId: string, ruleData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('routing_rules')
        .insert([{
          profile_id: userId,
          ...ruleData
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating routing rule:', error);
      throw error;
    }
  }

  /**
   * Update routing rule
   */
  static async updateRoutingRule(ruleId: string, ruleData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('routing_rules')
        .update(ruleData)
        .eq('id', ruleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating routing rule:', error);
      throw error;
    }
  }

  /**
   * Delete routing rule
   */
  static async deleteRoutingRule(ruleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('routing_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting routing rule:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private static calculateCallQuality(call: CallLog): 'excellent' | 'good' | 'fair' | 'poor' {
    // Simple quality calculation based on duration and outcome
    if (call.duration_seconds > 300 && call.status === 'completed') return 'excellent';
    if (call.duration_seconds > 120 && call.status === 'completed') return 'good';
    if (call.duration_seconds > 60) return 'fair';
    return 'poor';
  }

  private static getTimeRangeDays(timeRange: string): number {
    switch (timeRange) {
      case '1d': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 7;
    }
  }

  private static generateCallVolumeData(calls: CallLog[], days: number): Array<{ date: string; calls: number; successful: number }> {
    const data: { [key: string]: { calls: number; successful: number } } = {};
    
    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      data[dateStr] = { calls: 0, successful: 0 };
    }

    // Count calls by date
    calls.forEach(call => {
      const date = call.started_at.split('T')[0];
      if (data[date]) {
        data[date].calls++;
        if (call.status === 'completed') {
          data[date].successful++;
        }
      }
    });

    return Object.entries(data)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private static generatePerformanceData(calls: CallLog[], days: number): Array<{ date: string; successRate: number }> {
    const volumeData = this.generateCallVolumeData(calls, days);
    return volumeData.map(day => ({
      date: day.date,
      successRate: day.calls > 0 ? (day.successful / day.calls) * 100 : 0
    }));
  }

  private static generateCallOutcomeData(calls: CallLog[]): Array<{ name: string; value: number; color: string }> {
    const outcomes: { [key: string]: number } = {};
    
    calls.forEach(call => {
      const outcome = call.outcome || call.status;
      outcomes[outcome] = (outcomes[outcome] || 0) + 1;
    });

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    
    return Object.entries(outcomes)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value);
  }

  private static generateTopScriptsData(calls: CallLog[]): Array<{ name: string; success_rate: number; total_calls: number }> {
    // This would be enhanced with actual script tracking
    const agents: { [key: string]: { total: number; successful: number } } = {};
    
    calls.forEach(call => {
      const agentName = (call as any).ai_agents?.name || 'Unknown';
      if (!agents[agentName]) {
        agents[agentName] = { total: 0, successful: 0 };
      }
      agents[agentName].total++;
      if (call.status === 'completed') {
        agents[agentName].successful++;
      }
    });

    return Object.entries(agents)
      .map(([name, stats]) => ({
        name,
        success_rate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
        total_calls: stats.total
      }))
      .sort((a, b) => b.success_rate - a.success_rate)
      .slice(0, 5);
  }

  private static generateHourlyDistribution(calls: CallLog[]): Array<{ hour: number; calls: number }> {
    const hourly: { [key: number]: number } = {};
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourly[i] = 0;
    }

    calls.forEach(call => {
      const hour = new Date(call.started_at).getHours();
      hourly[hour]++;
    });

    return Object.entries(hourly).map(([hour, calls]) => ({
      hour: parseInt(hour),
      calls
    }));
  }

  private static generateWeeklyTrends(calls: CallLog[]): Array<{ week: string; calls: number; success_rate: number }> {
    const weeks: { [key: string]: { calls: number; successful: number } } = {};
    
    calls.forEach(call => {
      const date = new Date(call.started_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekStr = weekStart.toISOString().split('T')[0];
      
      if (!weeks[weekStr]) {
        weeks[weekStr] = { calls: 0, successful: 0 };
      }
      weeks[weekStr].calls++;
      if (call.status === 'completed') {
        weeks[weekStr].successful++;
      }
    });

    return Object.entries(weeks)
      .map(([week, stats]) => ({
        week,
        calls: stats.calls,
        success_rate: stats.calls > 0 ? (stats.successful / stats.calls) * 100 : 0
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  /**
   * Generate usage data for billing
   */
  private static generateUsageData(callLogs: any[]): Array<{ date: string; minutes: number; cost: number }> {
    const usageMap = new Map<string, { minutes: number; cost: number }>();
    
    callLogs.forEach(call => {
      const date = call.started_at.split('T')[0];
      const minutes = call.duration_seconds / 60;
      const cost = minutes * 0.05; // Mock pricing
      
      if (usageMap.has(date)) {
        const existing = usageMap.get(date)!;
        usageMap.set(date, {
          minutes: existing.minutes + minutes,
          cost: existing.cost + cost
        });
      } else {
        usageMap.set(date, { minutes, cost });
      }
    });
    
    return Array.from(usageMap.entries()).map(([date, data]) => ({
      date,
      minutes: Math.round(data.minutes),
      cost: Math.round(data.cost * 100) / 100
    }));
  }

  private static convertCallsToCSV(calls: CallLog[]): string {
    const headers = [
      'ID', 'Date', 'Time', 'Direction', 'From', 'To', 'Status', 'Duration (seconds)', 
      'Agent', 'Campaign', 'Summary', 'Outcome', 'Sentiment Score'
    ];

    const rows = calls.map(call => [
      call.id,
      new Date(call.started_at).toLocaleDateString(),
      new Date(call.started_at).toLocaleTimeString(),
      call.direction,
      call.phone_number_from,
      call.phone_number_to,
      call.status,
      call.duration_seconds,
      (call as any).ai_agents?.name || '',
      (call as any).outbound_campaigns?.name || '',
      call.call_summary || '',
      call.outcome || '',
      call.sentiment_score || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}