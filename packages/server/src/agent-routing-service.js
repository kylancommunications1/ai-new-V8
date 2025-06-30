import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export class AgentRoutingService {
    constructor() {
        this.supabase = supabase; // Add supabase client as instance property
        this.defaultAgent = {
            id: 'default',
            name: process.env.DEFAULT_AGENT_NAME || 'Default AI Agent',
            agent_type: process.env.DEFAULT_AGENT_TYPE || 'general',
            voice_name: process.env.DEFAULT_AGENT_VOICE || 'Puck',
            language_code: process.env.LANGUAGE_CODE || 'en-US',
            system_instruction: process.env.DEFAULT_SYSTEM_INSTRUCTION || 
                'You are a professional AI assistant for customer service calls. Wait for the caller to speak first, then respond naturally and professionally. Be helpful, polite, and efficient. Listen actively and respond appropriately to what the caller says.',
            greeting: process.env.DEFAULT_AGENT_GREETING || 'Hello! Thank you for calling. How can I help you today?',
            is_active: true,
            max_concurrent_calls: parseInt(process.env.DEFAULT_MAX_CONCURRENT_CALLS) || 10,
            call_direction: 'inbound',
            timezone: process.env.DEFAULT_TIMEZONE || 'America/New_York',
            business_hours_start: process.env.DEFAULT_BUSINESS_HOURS_START || '09:00',
            business_hours_end: process.env.DEFAULT_BUSINESS_HOURS_END || '17:00',
            business_days: JSON.parse(process.env.DEFAULT_BUSINESS_DAYS || '[1,2,3,4,5]'),
            routing_type: 'direct', // direct, ivr, forward
            ivr_enabled: false,
            forward_number: null,
            ivr_menu: null
        };
    }

    /**
     * Enhance agent data with default values for missing routing fields
     */
    enhanceAgentWithDefaults(agent) {
        if (!agent) return null;
        
        return {
            ...agent,
            call_direction: agent.call_direction || 'inbound',
            timezone: agent.timezone || 'America/New_York',
            business_hours_start: agent.business_hours_start || '09:00',
            business_hours_end: agent.business_hours_end || '17:00',
            business_days: agent.business_days || [1, 2, 3, 4, 5],
            routing_type: agent.routing_type || 'direct',
            ivr_enabled: agent.ivr_enabled || false,
            forward_number: agent.forward_number || null,
            ivr_menu: agent.ivr_menu || null,
            voice_name: agent.voice_name || 'Puck'
        };
    }

    /**
     * Route incoming call to appropriate agent
     * @param {Object} callData - Twilio call data
     * @returns {Object} Selected agent configuration with routing instructions
     */
    async routeIncomingCall(callData) {
        try {
            const { From: callerNumber, To: calledNumber, CallSid } = callData;
            
            console.log(`🔀 Routing call ${CallSid} from ${callerNumber} to ${calledNumber}`);
            
            // Proper agent routing logic
            let agent = null;
            
            // 1. Try to find agent by phone number assignment
            agent = await this.getAgentByPhoneNumber(calledNumber);
            console.log(`📞 Agent by phone number (${calledNumber}):`, agent ? agent.name : 'None found');
            
            if (!agent) {
                // 2. Try to find agent by business hours and availability
                agent = await this.getAgentByBusinessHours('inbound');
                console.log('⏰ Agent by business hours:', agent ? agent.name : 'None found');
            }
            
            if (!agent) {
                // 3. Try to find any active inbound agent
                agent = await this.getActiveInboundAgent();
                console.log('📥 Any active inbound agent:', agent ? agent.name : 'None found');
            }
            
            if (!agent) {
                // 4. Fall back to default agent ONLY if no user agents exist
                console.log('⚠️ No user agents found, using default agent');
                agent = this.defaultAgent;
            }
            
            // Enhance agent with defaults and determine routing action
            agent = this.enhanceAgentWithDefaults(agent);
            const routingAction = await this.determineRoutingAction(agent, callData);
            
            console.log(`✅ Selected agent: ${agent.name} (${agent.agent_type}) - Routing: ${routingAction.type}`);
            
            return {
                agent,
                routing: routingAction
            };
            
        } catch (error) {
            console.error('❌ Error in agent routing:', error);
            return {
                agent: this.defaultAgent,
                routing: { type: 'direct', action: 'connect_ai' }
            };
        }
    }

    /**
     * Determine routing action based on agent configuration
     * @param {Object} agent - Agent configuration
     * @param {Object} callData - Call data
     * @returns {Object} Routing action
     */
    async determineRoutingAction(agent, callData) {
        const routingType = agent.routing_type || 'direct';
        
        switch (routingType) {
            case 'forward':
                if (agent.forward_number) {
                    return {
                        type: 'forward',
                        action: 'forward_call',
                        target: agent.forward_number,
                        message: `Forwarding call to ${agent.forward_number}`
                    };
                }
                // Fall through to direct if no forward number
                
            case 'ivr':
                // Check if agent has an IVR menu ID
                if (agent.ivr_menu_id) {
                    try {
                        // Fetch the IVR menu
                        const { data: ivrMenu, error } = await this.supabase
                            .from('ivr_menus')
                            .select('*, ivr_options(*)')
                            .eq('id', agent.ivr_menu_id)
                            .single();
                            
                        if (error) {
                            console.error('❌ Error fetching IVR menu:', error);
                            // Fall through to direct connection
                        } else if (ivrMenu) {
                            return {
                                type: 'ivr',
                                action: 'play_ivr',
                                menu: ivrMenu,
                                message: `Playing IVR menu: ${ivrMenu.name}`
                            };
                        }
                    } catch (error) {
                        console.error('❌ Error in IVR menu lookup:', error);
                        // Fall through to direct connection
                    }
                }
                // Fall through to direct if IVR not configured or error
                
            case 'direct':
            default:
                return {
                    type: 'direct',
                    action: 'connect_ai',
                    message: 'Connecting directly to AI agent'
                };
        }
    }
    
    /**
     * Get IVR menu for an agent
     * @param {string} agentId - Agent ID
     * @returns {Promise<Object>} IVR menu with options
     */
    async getIVRMenu(agentId) {
        try {
            // Get the agent
            const { data: agent, error: agentError } = await this.supabase
                .from('ai_agents')
                .select('*')
                .eq('id', agentId)
                .single();
                
            if (agentError) {
                console.error('❌ Error fetching agent:', agentError);
                return null;
            }
            
            if (!agent.ivr_menu_id) {
                console.log('⚠️ Agent does not have an IVR menu');
                return null;
            }
            
            // Get the IVR menu
            const { data: ivrMenu, error: ivrMenuError } = await this.supabase
                .from('ivr_menus')
                .select('*, ivr_options(*)')
                .eq('id', agent.ivr_menu_id)
                .single();
                
            if (ivrMenuError) {
                console.error('❌ Error fetching IVR menu:', ivrMenuError);
                return null;
            }
            
            return ivrMenu;
        } catch (error) {
            console.error('❌ Error in getIVRMenu:', error);
            return null;
        }
    }

    /**
     * Route outbound call to appropriate agent
     * @param {string} agentId - Specific agent ID for outbound call
     * @param {Object} callData - Call data
     * @returns {Object} Selected agent configuration
     */
    async routeOutboundCall(agentId, callData) {
        try {
            if (agentId) {
                const agent = await this.getAgentById(agentId);
                if (agent && agent.is_active && 
                    (agent.call_direction === 'outbound' || agent.call_direction === 'both')) {
                    return agent;
                }
            }
            
            // Find any available outbound agent
            const agent = await this.getActiveOutboundAgent();
            return agent || this.defaultAgent;
            
        } catch (error) {
            console.error('❌ Error in outbound agent routing:', error);
            return this.defaultAgent;
        }
    }

    /**
     * Get agent assigned to specific phone number
     */
    async getAgentByPhoneNumber(phoneNumber) {
        try {
            // First check if there's a phone number assignment
            const { data: phoneData, error: phoneError } = await this.supabase
                .from('phone_numbers')
                .select(`
                    *,
                    ai_agents (*)
                `)
                .eq('phone_number', phoneNumber)
                .eq('is_active', true)
                .single();

            if (!phoneError && phoneData?.ai_agents?.is_active) {
                console.log(`📞 Found agent assigned to phone number ${phoneNumber}: ${phoneData.ai_agents.name}`);
                return this.enhanceAgentWithDefaults(phoneData.ai_agents);
            }

            // If no specific assignment, check if any agent has this as their primary number
            const { data: agentData, error: agentError } = await this.supabase
                .from('ai_agents')
                .select('*')
                .eq('twilio_phone_number', phoneNumber)
                .eq('is_active', true)
                .single();

            if (!agentError && agentData) {
                console.log(`📞 Found agent with primary number ${phoneNumber}: ${agentData.name}`);
                return this.enhanceAgentWithDefaults(agentData);
            }

            return null;
        } catch (error) {
            console.error('Error getting agent by phone number:', error);
            return null;
        }
    }

    /**
     * Get agent based on business hours and current time
     */
    async getAgentByBusinessHours(callDirection = 'inbound') {
        try {
            const now = new Date();
            const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

            const { data: agents, error } = await this.supabase
                .from('ai_agents')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching agents for business hours:', error);
                return null;
            }

            // Enhance agents with defaults and filter by call direction
            const enhancedAgents = agents
                .map(agent => this.enhanceAgentWithDefaults(agent))
                .filter(agent => 
                    agent.call_direction === callDirection || 
                    agent.call_direction === 'both'
                );

            // Find agent that matches current business hours
            for (const agent of enhancedAgents) {
                if (this.isAgentAvailable(agent, currentDay, currentTime)) {
                    console.log(`🕐 Found agent available during business hours: ${agent.name}`);
                    return agent;
                }
            }

            // If no agent is in business hours, look for after-hours agent
            const afterHoursAgent = enhancedAgents.find(agent => agent.agent_type === 'after_hours');
            if (afterHoursAgent) {
                console.log(`🌙 Using after-hours agent: ${afterHoursAgent.name}`);
                return afterHoursAgent;
            }

            return null;
        } catch (error) {
            console.error('Error getting agent by business hours:', error);
            return null;
        }
    }

    /**
     * Check if agent is available based on business hours
     */
    isAgentAvailable(agent, currentDay, currentTime) {
        // Check if today is a business day
        const businessDays = agent.business_days || [1, 2, 3, 4, 5]; // Default Mon-Fri
        if (!businessDays.includes(currentDay)) {
            return false;
        }

        // Check if current time is within business hours
        const startTime = agent.business_hours_start || '09:00';
        const endTime = agent.business_hours_end || '17:00';
        
        return currentTime >= startTime && currentTime <= endTime;
    }

    /**
     * Get any active inbound agent
     */
    async getActiveInboundAgent() {
        try {
            const { data: agents, error } = await this.supabase
                .from('ai_agents')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error getting active inbound agent:', error);
                return null;
            }

            // Find first agent that can handle inbound calls
            const inboundAgent = agents
                .map(agent => this.enhanceAgentWithDefaults(agent))
                .find(agent => 
                    agent.call_direction === 'inbound' || 
                    agent.call_direction === 'both'
                );

            if (inboundAgent) {
                console.log(`📥 Found active inbound agent: ${inboundAgent.name}`);
                return inboundAgent;
            }

            return null;
        } catch (error) {
            console.error('Error getting active inbound agent:', error);
            return null;
        }
    }

    /**
     * Get any active outbound agent
     */
    async getActiveOutboundAgent() {
        try {
            const { data: agents, error } = await this.supabase
                .from('ai_agents')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error getting active outbound agent:', error);
                return null;
            }

            // Find first agent that can handle outbound calls
            const outboundAgent = agents
                .map(agent => this.enhanceAgentWithDefaults(agent))
                .find(agent => 
                    agent.call_direction === 'outbound' || 
                    agent.call_direction === 'both'
                );

            if (outboundAgent) {
                console.log(`📤 Found active outbound agent: ${outboundAgent.name}`);
                return outboundAgent;
            }

            return null;
        } catch (error) {
            console.error('Error getting active outbound agent:', error);
            return null;
        }
    }

    /**
     * Get agent by ID
     */
    async getAgentById(agentId) {
        try {
            const { data: agent, error } = await this.supabase
                .from('ai_agents')
                .select('*')
                .eq('id', agentId)
                .eq('is_active', true)
                .single();

            if (!error && agent) {
                console.log(`🆔 Found agent by ID: ${agent.name}`);
                return this.enhanceAgentWithDefaults(agent);
            }

            return null;
        } catch (error) {
            console.error('Error getting agent by ID:', error);
            return null;
        }
    }

    /**
     * Get agent by type (customer_service, sales, support, etc.)
     */
    async getAgentByType(agentType, callDirection = 'inbound') {
        try {
            const { data: agents, error } = await this.supabase
                .from('ai_agents')
                .select('*')
                .eq('agent_type', agentType)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error getting agent by type:', error);
                return null;
            }

            // Find first agent of this type that can handle the call direction
            const matchingAgent = agents
                .map(agent => this.enhanceAgentWithDefaults(agent))
                .find(agent => 
                    agent.call_direction === callDirection || 
                    agent.call_direction === 'both'
                );

            if (matchingAgent) {
                console.log(`🎯 Found agent by type ${agentType}: ${matchingAgent.name}`);
                return matchingAgent;
            }

            return null;
        } catch (error) {
            console.error('Error getting agent by type:', error);
            return null;
        }
    }

    /**
     * Check if agent can handle more concurrent calls
     */
    async canAgentHandleCall(agentId) {
        try {
            // Get agent's max concurrent calls limit
            const { data: agent, error: agentError } = await this.supabase
                .from('ai_agents')
                .select('max_concurrent_calls')
                .eq('id', agentId)
                .single();

            if (agentError || !agent) {
                return false;
            }

            // Count current active calls for this agent
            const { data: activeCalls, error: callsError } = await this.supabase
                .from('call_logs')
                .select('id')
                .eq('agent_id', agentId)
                .eq('status', 'in-progress');

            if (callsError) {
                console.error('Error checking active calls:', callsError);
                return true; // Allow call if we can't check
            }

            const currentCalls = activeCalls?.length || 0;
            const maxCalls = agent.max_concurrent_calls || 5;

            console.log(`📊 Agent ${agentId}: ${currentCalls}/${maxCalls} concurrent calls`);
            return currentCalls < maxCalls;

        } catch (error) {
            console.error('Error checking agent capacity:', error);
            return true; // Allow call if we can't check
        }
    }

    /**
     * Log call routing decision
     */
    async logCallRouting(callSid, agentId, routingReason, callData = {}) {
        try {
            // Use the default profile ID from the CSV file
            const defaultProfileId = '5d5f69d3-0cb7-42db-9b10-1246da9c4c22';
            
            const { error } = await this.supabase
                .from('call_logs')
                .insert({
                    call_sid: callSid,
                    agent_id: agentId,
                    profile_id: defaultProfileId, // Add the profile ID
                    phone_number_from: callData.From || '+15133007212', // Default phone number
                    phone_number_to: callData.To || '+18186006909', // Default phone number
                    direction: callData.Direction || 'inbound', // Default direction
                    status: 'pending', // Use status instead of call_status
                    routing_reason: routingReason,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('Error logging call routing:', error);
            }
        } catch (error) {
            console.error('Error logging call routing:', error);
        }
    }

    /**
     * Get routing statistics
     */
    async getRoutingStats() {
        try {
            const { data: stats, error } = await this.supabase
                .from('call_logs')
                .select(`
                    agent_id,
                    routing_reason,
                    ai_agents (name, agent_type)
                `)
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

            if (error) {
                console.error('Error getting routing stats:', error);
                return {};
            }

            return stats;
        } catch (error) {
            console.error('Error getting routing stats:', error);
            return {};
        }
    }
}

export default AgentRoutingService;