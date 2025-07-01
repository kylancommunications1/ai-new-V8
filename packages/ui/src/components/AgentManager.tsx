import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useUser } from '../contexts/UserContext';
import type { AIAgent } from '../lib/supabase';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

const VOICE_OPTIONS = [
  { value: 'Puck', label: 'Puck (Male, Neutral)' },
  { value: 'Charon', label: 'Charon (Male, Deep)' },
  { value: 'Kore', label: 'Kore (Female, Warm)' },
  { value: 'Fenrir', label: 'Fenrir (Male, Authoritative)' },
  { value: 'Aoede', label: 'Aoede (Female, Melodic)' },
  { value: 'Leda', label: 'Leda (Female, Professional)' },
  { value: 'Orus', label: 'Orus (Male, Friendly)' },
  { value: 'Zephyr', label: 'Zephyr (Non-binary, Calm)' }
];

const AGENT_TYPES = [
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'sales', label: 'Sales' },
  { value: 'support', label: 'Technical Support' },
  { value: 'appointment_booking', label: 'Appointment Booking' },
  { value: 'survey', label: 'Survey & Feedback' },
  { value: 'after_hours', label: 'After Hours' },
  { value: 'general', label: 'General Purpose' }
];

const CALL_DIRECTION_OPTIONS = [
  { value: 'inbound', label: 'Inbound Only (Receives calls)' },
  { value: 'outbound', label: 'Outbound Only (Makes calls)' },
  { value: 'both', label: 'Both Inbound & Outbound' }
];

const ROUTING_TYPE_OPTIONS = [
  { value: 'direct', label: 'Direct Connection (Default)' },
  { value: 'ivr', label: 'Phone Menu (Interactive Voice Response)' },
  { value: 'forward', label: 'Forward to Phone Number' }
];

const LANGUAGE_OPTIONS = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' }
];

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' }
];

const DEFAULT_SYSTEM_INSTRUCTIONS = {
  customer_service: 'You are a professional customer service AI assistant. Be friendly, helpful, and efficient. Your goal is to provide excellent customer service by addressing customer inquiries, resolving issues, and ensuring customer satisfaction. Start with a warm greeting and always maintain a positive, professional tone throughout the conversation.',
  sales: 'You are a professional sales AI assistant. Be persuasive, knowledgeable, and helpful. Your goal is to understand customer needs and guide them toward making a purchase decision. Highlight product benefits, address objections professionally, and focus on value rather than just features. Start with an engaging greeting and maintain an enthusiastic tone.',
  support: 'You are a professional technical support AI assistant. Be clear, patient, and thorough. Your goal is to help customers resolve technical issues by providing step-by-step guidance. Ask clarifying questions when needed and confirm understanding before proceeding. Start with a supportive greeting and maintain a calm, reassuring tone throughout the conversation.',
  appointment_booking: 'You are a professional appointment scheduling AI assistant. Be efficient, organized, and helpful. Your goal is to help callers schedule, reschedule, or cancel appointments. Collect necessary information including name, contact details, preferred date/time, and reason for appointment. Confirm all details before finalizing. Start with a professional greeting and maintain a courteous tone.',
  survey: 'You are a professional survey AI assistant. Be friendly, neutral, and engaging. Your goal is to collect feedback by asking specific questions and recording responses. Avoid leading questions or influencing answers. Thank participants for their time and feedback. Start with a brief introduction explaining the purpose and length of the survey.',
  after_hours: 'You are an after-hours AI assistant. Be helpful but clear about limited availability. Your goal is to assist with basic inquiries, take messages, and set expectations for when the caller can receive full service. For urgent matters, provide emergency contact information if available. Start with a greeting that acknowledges it\'s outside normal business hours.',
  general: 'You are a professional AI assistant for phone calls. Be helpful, polite, and efficient. Your goal is to assist callers with their inquiries and direct them to the appropriate resources when needed. Start with a warm greeting like "Hello! Thank you for calling. How can I help you today?" Always maintain a friendly, professional tone throughout the call.'
};

const AgentManager: React.FC = () => {
  const { user } = useUser();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<Partial<AIAgent>>({
    name: '',
    description: '',
    agent_type: 'general',
    call_direction: 'inbound',
    routing_type: 'direct', // Default to direct connection
    voice_name: 'Puck',
    language_code: 'en-US',
    system_instruction: '',
    greeting: '',
    max_concurrent_calls: 5,
    timezone: 'America/New_York',
    business_hours_start: '09:00',
    business_hours_end: '17:00',
    business_days: [1, 2, 3, 4, 5], // Monday to Friday
    is_active: true,
    forward_number: '', // For forward routing type
    ivr_menu_id: null // For IVR routing type
  });

  useEffect(() => {
    if (user) {
      loadAgents();
    }
  }, [user]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      if (!user) {
        console.error('No user found');
        setLoading(false);
        return;
      }
      
      const agentData = await ApiService.getAgents(user.id);
      setAgents(agentData);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleAgentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const agentType = e.target.value as keyof typeof DEFAULT_SYSTEM_INSTRUCTIONS;
    setFormData(prev => ({
      ...prev,
      agent_type: agentType,
      system_instruction: DEFAULT_SYSTEM_INSTRUCTIONS[agentType] || prev.system_instruction
    }));
  };

  const handleBusinessDayToggle = (day: number) => {
    setFormData(prev => {
      const currentDays = prev.business_days || [1, 2, 3, 4, 5];
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day].sort();
      return { ...prev, business_days: newDays };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAgent) {
        // Update existing agent
        const updatedAgent = await ApiService.updateAgent(editingAgent.id, formData);
        if (updatedAgent) {
          toast.success('Agent updated successfully');
        }
      } else {
        // Create new agent
        if (!user) {
          console.error('No user found');
          return;
        }
        
        const newAgent = await ApiService.createAgent(user.id, formData);
        if (newAgent) {
          toast.success('Agent created successfully');
        }
      }
      
      // Reset form and reload agents
      setFormData({
        name: '',
        description: '',
        agent_type: 'general',
        call_direction: 'inbound',
        routing_type: 'direct',
        voice_name: 'Puck',
        language_code: 'en-US',
        system_instruction: DEFAULT_SYSTEM_INSTRUCTIONS.general,
        greeting: '',
        max_concurrent_calls: 5,
        timezone: 'America/New_York',
        business_hours_start: '09:00',
        business_hours_end: '17:00',
        business_days: [1, 2, 3, 4, 5],
        is_active: true,
        forward_number: '',
        ivr_menu_id: null
      });
      setEditingAgent(null);
      setShowForm(false);
      loadAgents();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast.error('Error saving agent. Please try again.');
    }
  };

  const handleEdit = (agent: AIAgent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description || '',
      agent_type: agent.agent_type,
      call_direction: agent.call_direction || 'inbound',
      routing_type: agent.routing_type || 'direct',
      voice_name: agent.voice_name,
      language_code: agent.language_code,
      system_instruction: agent.system_instruction || DEFAULT_SYSTEM_INSTRUCTIONS[agent.agent_type as keyof typeof DEFAULT_SYSTEM_INSTRUCTIONS] || '',
      greeting: agent.greeting || '',
      max_concurrent_calls: agent.max_concurrent_calls,
      timezone: agent.timezone,
      business_hours_start: agent.business_hours_start || '09:00',
      business_hours_end: agent.business_hours_end || '17:00',
      business_days: agent.business_days || [1, 2, 3, 4, 5],
      is_active: agent.is_active,
      forward_number: agent.forward_number || '',
      ivr_menu_id: agent.ivr_menu_id || null
    });
    setShowForm(true);
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) {
      return;
    }
    
    try {
      await ApiService.deleteAgent(agentId);
      toast.success('Agent deleted successfully');
      loadAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Error deleting agent. Please try again.');
    }
  };

  const handleToggleActive = async (agent: AIAgent) => {
    try {
      const updatedAgent = await ApiService.updateAgent(agent.id, {
        is_active: !agent.is_active
      });
      if (updatedAgent) {
        toast.success(`Agent ${updatedAgent.is_active ? 'activated' : 'deactivated'}`);
        loadAgents();
      }
    } catch (error) {
      console.error('Error toggling agent status:', error);
      toast.error('Error updating agent status. Please try again.');
    }
  };

  const handleNewAgent = () => {
    setEditingAgent(null);
    setFormData({
      name: '',
      description: '',
      agent_type: 'general',
      voice_name: 'Puck',
      language_code: 'en-US',
      system_instruction: DEFAULT_SYSTEM_INSTRUCTIONS.general,
      greeting: '',
      max_concurrent_calls: 5,
      timezone: 'America/New_York',
      business_hours_start: '09:00',
      business_hours_end: '17:00',
      business_days: [1, 2, 3, 4, 5],
      is_active: true
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAgent(null);
  };

  const getAgentTypeLabel = (type: string) => {
    return AGENT_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-600">Manage your AI agents and their configurations</p>
        </div>
        <button
          onClick={handleNewAgent}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Create Agent
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div key={agent.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      agent.is_active ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <UserGroupIcon className={`h-6 w-6 ${
                        agent.is_active ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                      <p className="text-sm text-gray-500">
                        {getAgentTypeLabel(agent.agent_type)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(agent)}
                      className={`p-1 rounded-full ${
                        agent.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {agent.is_active ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <XCircleIcon className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(agent)}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(agent.id)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{agent.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Voice: {agent.voice_name}</span>
                    <span>Language: {agent.language_code}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Direction: {agent.call_direction || 'inbound'}</span>
                    <span>Max Calls: {agent.max_concurrent_calls || 5}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-1 rounded-full ${
                      agent.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-gray-500">
                      Created {new Date(agent.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {agents.length === 0 && (
            <div className="text-center py-12">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first AI agent</p>
              <button
                onClick={handleNewAgent}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Agent
              </button>
            </div>
          )}

          {/* Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">
                  {editingAgent ? 'Edit Agent' : 'Create New Agent'}
                </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Agent Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Agent Type</label>
                    <select
                      name="agent_type"
                      value={formData.agent_type || 'general'}
                      onChange={handleAgentTypeChange}
                      className="w-full border rounded p-2"
                      required
                    >
                      {AGENT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Call Direction 
                      <span className="text-xs text-gray-500 ml-1">(Critical for smart routing)</span>
                    </label>
                    <select
                      name="call_direction"
                      value={formData.call_direction || 'inbound'}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    >
                      {CALL_DIRECTION_OPTIONS.map(direction => (
                        <option key={direction.value} value={direction.value}>
                          {direction.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-600 mt-1">
                      Inbound agents handle incoming calls. Outbound agents make calls. Choose "Both" for flexible agents.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Routing Type
                      <span className="text-xs text-gray-500 ml-1">(How calls are handled)</span>
                    </label>
                    <select
                      name="routing_type"
                      value={formData.routing_type || 'direct'}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    >
                      {ROUTING_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-600 mt-1">
                      Direct connects caller directly to this agent. IVR presents a menu. Forward routes to a phone number.
                    </p>
                  </div>
                  
                  {formData.routing_type === 'forward' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Forward Number
                        <span className="text-xs text-gray-500 ml-1">(Required for forwarding)</span>
                      </label>
                      <input
                        type="tel"
                        name="forward_number"
                        value={formData.forward_number || ''}
                        onChange={handleInputChange}
                        className="w-full border rounded p-2"
                        placeholder="+1234567890"
                        required={formData.routing_type === 'forward'}
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Enter the phone number to forward calls to, including country code.
                      </p>
                    </div>
                  )}
                  
                  {formData.routing_type === 'ivr' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Phone Menu
                        <span className="text-xs text-gray-500 ml-1">(Required for Phone Menu)</span>
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        Phone menus can be configured after creating the agent. Save this agent first, then use the phone menu editor.
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Voice</label>
                    <select
                      name="voice_name"
                      value={formData.voice_name || 'Puck'}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                    >
                      {VOICE_OPTIONS.map(voice => (
                        <option key={voice.value} value={voice.value}>
                          {voice.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Language</label>
                    <select
                      name="language_code"
                      value={formData.language_code || 'en-US'}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                    >
                      {LANGUAGE_OPTIONS.map(lang => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      name="description"
                      value={formData.description || ''}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Greeting Message</label>
                    <textarea
                      name="greeting"
                      value={formData.greeting || ''}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      rows={2}
                      placeholder="Hello! Thank you for calling. How can I help you today?"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">AI Personality & Goals</label>
                    <textarea
                      name="system_instruction"
                      value={formData.system_instruction || ''}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      rows={6}
                      placeholder="Describe how your AI should behave and what its goals are. For example: 'You are a friendly customer service representative who helps customers with their orders. Be helpful, patient, and always try to resolve their issues.'"
                    />
                  </div>

                  {/* Advanced Settings Toggle */}
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <span className="mr-2">
                        {showAdvanced ? '▼' : '▶'}
                      </span>
                      Advanced Settings
                    </button>
                  </div>

                  {showAdvanced && (
                    <>
                      <div>
                    <label className="block text-sm font-medium mb-1">Max Concurrent Calls</label>
                    <input
                      type="number"
                      name="max_concurrent_calls"
                      value={formData.max_concurrent_calls || 5}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      min="1"
                      max="20"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Timezone</label>
                    <select
                      name="timezone"
                      value={formData.timezone || 'America/New_York'}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                    >
                      {TIMEZONE_OPTIONS.map(tz => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Business Hours Start</label>
                    <input
                      type="time"
                      name="business_hours_start"
                      value={formData.business_hours_start || '09:00'}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Business Hours End</label>
                    <input
                      type="time"
                      name="business_hours_end"
                      value={formData.business_hours_end || '17:00'}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Business Days</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { day: 0, label: 'Sun' },
                        { day: 1, label: 'Mon' },
                        { day: 2, label: 'Tue' },
                        { day: 3, label: 'Wed' },
                        { day: 4, label: 'Thu' },
                        { day: 5, label: 'Fri' },
                        { day: 6, label: 'Sat' }
                      ].map(({ day, label }) => (
                        <label key={day} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={(formData.business_days || []).includes(day)}
                            onChange={() => handleBusinessDayToggle(day)}
                            className="form-checkbox h-5 w-5 text-blue-600"
                          />
                          <span className="ml-2">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                      <div className="md:col-span-2">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            name="is_active"
                            checked={formData.is_active || false}
                            onChange={handleCheckboxChange}
                            className="form-checkbox h-5 w-5 text-blue-600"
                          />
                          <span className="ml-2">Active</span>
                        </label>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingAgent ? 'Update Agent' : 'Create Agent'}
                  </button>
                </div>
              </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AgentManager;