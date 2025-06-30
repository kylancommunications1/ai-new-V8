import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - running in demo mode');
}

export const supabase = createClient(
  supabaseUrl || 'https://demo.supabase.co', 
  supabaseAnonKey || 'demo-key'
);

// Admin client with service role key for privileged operations
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://demo.supabase.co',
  supabaseServiceKey || 'demo-key'
);

// Database types
export interface Profile {
  id: string
  email: string
  client_name?: string
  company_name?: string
  phone_number?: string
  plan_name: 'starter' | 'grow' | 'pro' | 'scale'
  monthly_minute_limit: number
  minutes_used: number
  is_active: boolean
  can_use_inbound: boolean
  can_use_outbound_dialer: boolean
  max_concurrent_calls: number
  twilio_phone_number?: string
  twilio_account_sid?: string
  twilio_auth_token?: string
  gemini_api_key?: string
  gemini_model?: 'gemini-live-2.5-flash-preview' | 'gemini-2.0-flash-live-001' | 'gemini-2.5-flash-preview-native-audio-dialog'
  routing_strategy?: string
  call_recording_enabled?: boolean
  transcription_enabled?: boolean
  created_at: string
  updated_at: string
}

export interface AIAgent {
  id: string
  profile_id: string
  name: string
  description?: string
  greeting?: string
  agent_type: 'customer_service' | 'sales' | 'support' | 'appointment_booking' | 'survey' | 'after_hours' | 'general'
  call_direction: 'inbound' | 'outbound' | 'both'
  routing_type?: 'direct' | 'ivr' | 'forward'
  voice_name: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede' | 'Leda' | 'Orus' | 'Zephyr'
  language_code: string
  system_instruction?: string
  twilio_phone_number?: string
  business_hours_start?: string
  business_hours_end?: string
  business_days?: number[]
  twilio_webhook_url?: string
  is_active: boolean
  max_concurrent_calls: number
  timezone?: string
  escalation_enabled?: boolean
  escalation_type?: 'human_agent' | 'supervisor' | 'voicemail' | 'callback'
  escalation_phone_number?: string
  escalation_email?: string
  status?: 'available' | 'busy' | 'offline'
  forward_number?: string
  ivr_menu_id?: string | null
  created_at: string
  updated_at: string
}

export interface IVRMenu {
  id: string
  profile_id: string
  name: string
  greeting_text: string
  timeout_seconds: number
  max_attempts: number
  is_active: boolean
  created_at: string
  updated_at: string
  ivr_options?: IVROption[]
}

export interface IVROption {
  id: string
  ivr_menu_id: string
  digit: string
  description: string
  agent_id?: string
  action_type: string
  action_data?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface PhoneNumber {
  id: string
  profile_id: string
  phone_number: string
  friendly_name?: string
  agent_id?: string
  is_primary: boolean
  is_active: boolean
  twilio_sid?: string
  created_at: string
  updated_at: string
}

export interface ExternalIntegration {
  id: string
  profile_id: string
  integration_type: string
  configuration: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CallLog {
  id: string
  profile_id: string
  agent_id?: string
  campaign_id?: string
  lead_id?: string
  phone_number_from: string
  phone_number_to: string
  direction: 'inbound' | 'outbound'
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'abandoned'
  started_at: string
  ended_at?: string
  duration_seconds: number
  call_summary?: string
  transcript?: string
  recording_url?: string
  sentiment_score?: number
  outcome?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  customer_satisfaction_score?: number
  follow_up_required: boolean
  follow_up_date?: string
  tags?: string[]
  metadata?: Record<string, any>
  created_at: string
  outbound_campaigns?: {
    name: string
  }
}

export interface Campaign {
  id: string
  profile_id: string
  agent_id?: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  caller_id: string
  max_concurrent_calls: number
  call_timeout_seconds: number
  retry_attempts: number
  retry_delay_minutes: number
  start_time?: string
  end_time?: string
  timezone: string
  days_of_week: number[]
  scheduled_start_date?: string
  scheduled_end_date?: string
  custom_system_instruction?: string
  custom_voice_name?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede' | 'Leda' | 'Orus' | 'Zephyr'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  compliance_settings?: Record<string, any>
  total_leads: number
  leads_called: number
  leads_answered: number
  leads_completed: number
  created_at: string
  updated_at: string
}

export interface CampaignLead {
  id: string
  campaign_id: string
  phone_number: string
  first_name?: string
  last_name?: string
  email?: string
  company?: string
  title?: string
  status: 'pending' | 'called' | 'answered' | 'no_answer' | 'busy' | 'failed' | 'completed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  call_attempts: number
  last_call_at?: string
  next_call_at?: string
  outcome?: string
  notes?: string
  custom_fields?: Record<string, any>
  do_not_call: boolean
  preferred_call_time?: string
  timezone?: string
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  profile_id: string
  call_id?: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  appointment_date: string
  appointment_time: string
  scheduled_date?: string
  service_type?: string
  duration_minutes?: number
  location?: string
  notes?: string
  status: string
  created_at: string
  updated_at: string
}

export interface FunctionCallLog {
  id: string
  profile_id: string
  call_id?: string
  function_name: string
  parameters: Record<string, any>
  result: Record<string, any>
  execution_time_ms: number
  success: boolean
  error_message?: string
  created_at: string
}



export interface AnalyticsData {
  totalCalls: number
  totalMinutes: number
  successfulCalls: number
  averageCallDuration: number
  successRate: number
  avgDuration: number
  costPerCall: number
  callsByDay: Array<{ date: string; count: number }>
  callsByStatus: Array<{ status: string; count: number }>
  topOutcomes: Array<{ outcome: string; count: number }>
  callVolumeData: Array<{ date: string; calls: number }>
  performanceData: Array<{ date: string; success_rate: number }>
  callOutcomeData: Array<{ name: string; value: number; color: string }>
  topScripts: Array<{ name: string; success_rate: number; total_calls: number }>
  minutesUsed: number
  minutesLimit: number
  campaignStats: {
    totalCampaigns: number
    activeCampaigns: number
    totalLeads: number
    leadsContacted: number
  }
  // Enhanced dashboard properties
  callsThisMonth?: number
  answeredCalls?: number
  answerRate?: number
  avgCallDuration?: number
  totalAppointments?: number
  appointmentsThisMonth?: number
  appointmentConversionRate?: number
  appointmentsScheduled?: number
  salesCompleted?: number
  customerSatisfactionAvg?: number
  activeCampaigns?: number
  totalLeads?: number
  contactedLeads?: number
  convertedLeads?: number
  leadConversionRate?: number
  totalAgents?: number
  activeAgents?: number
  agentUtilization?: number
  avgSatisfactionScore?: number
}

export interface DNCEntry {
  id: string
  profile_id: string
  phone_number: string
  added_date: string
  source: 'customer_request' | 'legal_requirement' | 'manual' | 'complaint'
  notes?: string
  expiry_date?: string
  is_active: boolean
  created_at: string
}

export interface WebhookEndpoint {
  id: string
  profile_id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  secret_key?: string
  retry_attempts: number
  last_triggered_at?: string
  success_count: number
  failure_count: number
  created_at: string
  updated_at: string
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  event_type: string
  payload: Record<string, any>
  response_status?: number
  response_body?: string
  delivered_at: string
  success: boolean
}

export interface Subscription {
  id: string
  profile_id: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  plan_name: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid'
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface UsageRecord {
  id: string
  profile_id: string
  subscription_id?: string
  usage_type: 'minutes' | 'calls' | 'agents'
  quantity: number
  unit_price?: number
  total_cost?: number
  billing_period_start: string
  billing_period_end: string
  created_at: string
}

export interface ComplianceReport {
  id: string
  profile_id: string
  report_type: 'dnc_compliance' | 'tcpa_compliance' | 'call_recording_consent'
  report_period_start: string
  report_period_end: string
  report_data: Record<string, any>
  generated_at: string
  generated_by?: string
}

export interface SystemStatus {
  id: string
  service_name: 'api' | 'calls' | 'webhooks' | 'database' | 'ai' | 'analytics'
  status: 'operational' | 'degraded' | 'outage'
  message?: string
  started_at: string
  resolved_at?: string
  created_at: string
}

export interface ActiveCall extends CallLog {
  agent_name?: string
  call_quality?: 'excellent' | 'good' | 'fair' | 'poor'
}

export interface SystemMetrics {
  total_active_calls: number
  total_queued_calls: number
  average_wait_time: number
  system_health: 'healthy' | 'warning' | 'critical'
  uptime_percentage: number
}

export interface AgentStatus {
  id: string
  name: string
  status: 'available' | 'busy' | 'offline'
  current_calls: number
  calls_today: number
  avg_call_duration: number
}

export interface CallQueueItem {
  id: string
  phone_number: string
  customer_name?: string
  priority: number
  wait_time_seconds: number
  estimated_wait: number
}

export interface LeadToCall {
  id: string
  phoneNumber: string
  callAttempts: number
  lastCallAt?: string
  [key: string]: any
}