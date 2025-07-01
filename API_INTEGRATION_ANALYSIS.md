# API Integration and Database Schema Analysis

## CRITICAL ISSUES FOUND

### 1. INCONSISTENT SERVICE USAGE
**MAJOR PROBLEM**: Some pages use `DatabaseService` while others use `ApiService`

#### Pages Using ApiService (✅ CORRECT):
- **DashboardPage.tsx**: Uses `ApiService.getDashboardMetrics()`, `ApiService.getDashboardUpdates()`
- **LiveCallsPage.tsx**: Uses `ApiService.getLiveCallsData()`, `ApiService.emergencyStopAllCalls()`, `ApiService.toggleAgentStatus()`
- **AnalyticsPage.tsx**: Uses `ApiService.getAnalyticsData()`, `ApiService.getAnalyticsUpdates()`
- **CallsPage.tsx**: Uses `ApiService.getCallHistory()`, `ApiService.getCallRecording()`, `ApiService.getCallTranscript()`, `ApiService.exportCallHistory()`

#### Pages Using DatabaseService (❌ INCORRECT):
- **AppointmentsPage.tsx**: Uses `DatabaseService.getAppointments()`, `DatabaseService.createAppointment()`, `DatabaseService.updateAppointment()`, `DatabaseService.deleteAppointment()`
- **CampaignsPage.tsx**: Uses `DatabaseService.getCampaigns()`, `DatabaseService.createCampaign()`, `DatabaseService.updateCampaign()`, `DatabaseService.deleteCampaign()`, `DatabaseService.getCampaignLeads()`

### 2. DATABASE SCHEMA MISALIGNMENT

#### Campaign Tables Confusion:
- **Database has TWO campaign tables**: `campaigns` and `outbound_campaigns`
- **ApiService uses**: `outbound_campaigns` table
- **DatabaseService uses**: `campaigns` table (likely incorrect)
- **TypeScript interface**: Defined as `Campaign` but unclear which table it maps to

#### Field Mapping Issues:

##### CallLog Interface vs Database:
- ✅ **Correctly mapped fields**: `id`, `profile_id`, `agent_id`, `campaign_id`, `phone_number_from`, `phone_number_to`, `direction`, `status`, `started_at`, `ended_at`, `duration_seconds`, `recording_url`, `sentiment_score`, `outcome`, `priority`, `created_at`
- ⚠️ **Missing in interface**: `call_sid`, `ai_insights`, `call_metadata`, `customer_name`, `customer_satisfaction_score`, `follow_up_date`, `follow_up_required`, `lead_id`, `metadata`, `phone_number`, `routing_reason`, `summary`, `transcript`, `updated_at`
- ⚠️ **Interface has but DB doesn't**: `tags` (array), `outbound_campaigns` (relation)

##### Appointment Interface vs Database:
- ✅ **Correctly mapped**: `id`, `profile_id`, `customer_name`, `customer_phone`, `customer_email`, `appointment_date`, `duration_minutes`, `location`, `notes`, `status`, `created_at`, `updated_at`
- ❌ **Missing in interface**: `appointment_type`, `call_log_id`, `lead_id`, `reminder_sent`, `scheduled_date`
- ❌ **Interface has but DB doesn't**: `call_id`, `appointment_time`, `service_type`

##### Campaign Interface vs Database:
- ✅ **Correctly mapped**: `id`, `profile_id`, `agent_id`, `name`, `description`, `status`, `caller_id`, `max_concurrent_calls`, `call_timeout_seconds`, `retry_attempts`, `retry_delay_minutes`, `start_time`, `end_time`, `timezone`, `days_of_week`, `scheduled_start_date`, `scheduled_end_date`, `custom_system_instruction`, `custom_voice_name`, `priority`, `compliance_settings`, `created_at`, `updated_at`
- ❌ **Missing in interface**: `leads_answered`, `leads_called`, `leads_completed`, `script`, `target_audience`
- ❌ **Interface has but DB doesn't**: `total_leads` (interface has it, DB has separate lead counters)

### 3. API METHOD COMPLETENESS

#### Dashboard APIs (✅ COMPLETE):
- `getDashboardMetrics()` - ✅ Implemented, queries `call_logs`, `profiles`
- `getDashboardUpdates()` - ✅ Implemented

#### Live Calls APIs (✅ COMPLETE):
- `getLiveCallsData()` - ✅ Implemented, aggregates multiple data sources
- `getActiveCalls()` - ✅ Implemented
- `getAgentStatuses()` - ✅ Implemented
- `getCallQueue()` - ✅ Implemented
- `getSystemMetrics()` - ✅ Implemented
- `emergencyStopAllCalls()` - ✅ Implemented
- `toggleAgentStatus()` - ✅ Implemented

#### Analytics APIs (✅ COMPLETE):
- `getAnalyticsData()` - ✅ Implemented, queries `call_logs` with joins
- `getAnalyticsUpdates()` - ✅ Implemented

#### Call History APIs (✅ COMPLETE):
- `getCallHistory()` - ✅ Implemented with pagination and filters
- `getCallRecording()` - ✅ Implemented
- `getCallTranscript()` - ✅ Implemented
- `exportCallHistory()` - ✅ Implemented

#### Appointments APIs (✅ AVAILABLE BUT NOT USED):
- `getAppointments()` - ✅ Implemented in ApiService
- `createAppointment()` - ✅ Implemented in ApiService
- `updateAppointment()` - ✅ Implemented in ApiService
- `deleteAppointment()` - ✅ Implemented in ApiService
- **PROBLEM**: AppointmentsPage uses DatabaseService instead!

#### Campaigns APIs (✅ AVAILABLE BUT NOT USED):
- `getCampaigns()` - ✅ Implemented in ApiService (uses `outbound_campaigns`)
- `createCampaign()` - ✅ Implemented in ApiService
- `updateCampaign()` - ✅ Implemented in ApiService
- `deleteCampaign()` - ✅ Implemented in ApiService
- `getCampaignLeads()` - ✅ Implemented in ApiService
- `uploadCampaignLeads()` - ✅ Implemented in ApiService
- **PROBLEM**: CampaignsPage uses DatabaseService instead!

## REQUIRED FIXES

### 1. IMMEDIATE FIXES (High Priority):

1. **Fix AppointmentsPage.tsx**:
   - Replace all `DatabaseService` calls with `ApiService` calls
   - Update imports: `import { ApiService } from '../services/api'`
   - Remove `import { DatabaseService } from '../services/database'`

2. **Fix CampaignsPage.tsx**:
   - Replace all `DatabaseService` calls with `ApiService` calls
   - Update imports: `import { ApiService } from '../services/api'`
   - Remove `import { DatabaseService } from '../services/database'`

3. **Resolve Campaign Table Confusion**:
   - Determine if `campaigns` or `outbound_campaigns` is the correct table
   - Update either ApiService or DatabaseService to use the same table
   - Verify which table has the actual data

### 2. SCHEMA ALIGNMENT FIXES (Medium Priority):

1. **Update TypeScript Interfaces**:
   - Add missing fields to `CallLog` interface
   - Add missing fields to `Appointment` interface
   - Resolve `Campaign` interface field mismatches

2. **Database Field Verification**:
   - Verify all database fields are properly mapped
   - Ensure API queries select all necessary fields
   - Add missing field selections in API methods

### 3. TESTING REQUIREMENTS:

1. **Test Each Page**:
   - Verify data loads correctly
   - Test CRUD operations
   - Verify real-time updates work
   - Check error handling

2. **Database Integration**:
   - Verify all tables exist and have data
   - Test API endpoints return expected data structure
   - Validate field mappings

## CURRENT STATUS:

- ✅ **Dashboard**: Fully integrated with ApiService
- ✅ **Live Calls**: Fully integrated with ApiService  
- ✅ **Analytics**: Fully integrated with ApiService
- ✅ **Call History**: Fully integrated with ApiService
- ❌ **Appointments**: Using DatabaseService (needs migration to ApiService)
- ❌ **Campaigns**: Using DatabaseService (needs migration to ApiService)

## NEXT STEPS:

1. Fix AppointmentsPage to use ApiService
2. Fix CampaignsPage to use ApiService
3. Resolve campaign table confusion
4. Update TypeScript interfaces
5. Test all pages thoroughly
6. Verify database schema alignment