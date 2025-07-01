import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { ApiService, type AgentFilters } from '../services/api';
import { RealtimeService } from '../services/realtime';
import type { AIAgent } from '../lib/supabase';
import toast from 'react-hot-toast';

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

export default function AgentsPage() {
  const { user } = useUser();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [filters, setFilters] = useState<AgentFilters>({
    status: 'all',
    type: 'all',
    searchTerm: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    agent_type: 'customer_service',
    voice_name: 'Puck',
    language_code: 'en-US',
    system_instruction: '',
    is_active: true
  });

  useEffect(() => {
    if (user) {
      loadAgents();
      
      // Subscribe to real-time updates
      const unsubscribe = RealtimeService.subscribeToCallUpdates(() => {
        loadAgents();
      });

      return () => unsubscribe();
    }
  }, [user, filters]);

  const loadAgents = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const agentsData = await ApiService.getAgents(user.id, filters);
      setAgents(agentsData);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const newAgent = await ApiService.createAgent(user.id, formData);
      if (newAgent) {
        setAgents(prev => [newAgent, ...prev]);
        setShowCreateModal(false);
        resetForm();
        toast.success('Agent created successfully');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Failed to create agent');
    }
  };

  const handleUpdateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    try {
      const updatedAgent = await ApiService.updateAgent(editingAgent.id, formData);
      if (updatedAgent) {
        setAgents(prev => prev.map(agent => 
          agent.id === editingAgent.id ? updatedAgent : agent
        ));
        setEditingAgent(null);
        resetForm();
        toast.success('Agent updated successfully');
      }
    } catch (error) {
      console.error('Error updating agent:', error);
      toast.error('Failed to update agent');
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      await ApiService.deleteAgent(agentId);
      setAgents(prev => prev.filter(agent => agent.id !== agentId));
      toast.success('Agent deleted successfully');
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
    }
  };

  const handleToggleStatus = async (agent: AIAgent) => {
    try {
      const updatedAgent = await ApiService.updateAgent(agent.id, {
        is_active: !agent.is_active
      });
      if (updatedAgent) {
        setAgents(prev => prev.map(a => 
          a.id === agent.id ? updatedAgent : a
        ));
        toast.success(`Agent ${updatedAgent.is_active ? 'activated' : 'deactivated'}`);
      }
    } catch (error) {
      console.error('Error toggling agent status:', error);
      toast.error('Failed to update agent status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      agent_type: 'customer_service',
      voice_name: 'Puck',
      language_code: 'en-US',
      system_instruction: '',
      is_active: true
    });
  };

  const openEditModal = (agent: AIAgent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description || '',
      agent_type: agent.agent_type,
      voice_name: agent.voice_name,
      language_code: agent.language_code,
      system_instruction: agent.system_instruction || '',
      is_active: agent.is_active
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-600">Manage your AI agents and their configurations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Create Agent
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents..."
                value={filters.searchTerm || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={filters.status || 'all'}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={filters.type || 'all'}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {AGENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

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
                    {AGENT_TYPES.find(t => t.value === agent.agent_type)?.label}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleStatus(agent)}
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
                  onClick={() => openEditModal(agent)}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteAgent(agent.id)}
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
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Agent
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingAgent) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingAgent ? 'Edit Agent' : 'Create New Agent'}
            </h2>
            
            <form onSubmit={editingAgent ? handleUpdateAgent : handleCreateAgent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Type
                  </label>
                  <select
                    value={formData.agent_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, agent_type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {AGENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Voice
                  </label>
                  <select
                    value={formData.voice_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, voice_name: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {VOICE_OPTIONS.map(voice => (
                      <option key={voice.value} value={voice.value}>{voice.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    value={formData.language_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, language_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="en-AU">English (Australia)</option>
                    <option value="en-IN">English (India)</option>
                    <option value="es-US">Spanish (US)</option>
                    <option value="es-ES">Spanish (Spain)</option>
                    <option value="fr-FR">French (France)</option>
                    <option value="fr-CA">French (Canada)</option>
                    <option value="de-DE">German (Germany)</option>
                    <option value="pt-BR">Portuguese (Brazil)</option>
                    <option value="it-IT">Italian (Italy)</option>
                    <option value="ja-JP">Japanese (Japan)</option>
                    <option value="ko-KR">Korean (South Korea)</option>
                    <option value="cmn-CN">Mandarin Chinese (China)</option>
                    <option value="hi-IN">Hindi (India)</option>
                    <option value="ar-XA">Arabic (Generic)</option>
                    <option value="id-ID">Indonesian (Indonesia)</option>
                    <option value="tr-TR">Turkish (Turkey)</option>
                    <option value="vi-VN">Vietnamese (Vietnam)</option>
                    <option value="bn-IN">Bengali (India)</option>
                    <option value="gu-IN">Gujarati (India)</option>
                    <option value="kn-IN">Kannada (India)</option>
                    <option value="mr-IN">Marathi (India)</option>
                    <option value="ml-IN">Malayalam (India)</option>
                    <option value="ta-IN">Tamil (India)</option>
                    <option value="te-IN">Telugu (India)</option>
                    <option value="nl-NL">Dutch (Netherlands)</option>
                    <option value="pl-PL">Polish (Poland)</option>
                    <option value="ru-RU">Russian (Russia)</option>
                    <option value="th-TH">Thai (Thailand)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Instructions
                </label>
                <textarea
                  value={formData.system_instruction}
                  onChange={(e) => setFormData(prev => ({ ...prev, system_instruction: e.target.value }))}
                  rows={4}
                  placeholder="Enter detailed instructions for how this agent should behave..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Agent is active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingAgent(null);
                    resetForm();
                  }}
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
    </div>
  );
}