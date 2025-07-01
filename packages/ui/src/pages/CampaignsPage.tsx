import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  TrashIcon,
  DocumentArrowUpIcon,
  EyeIcon,
  PencilIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline';
import { useUser, usePermissions } from '../contexts/UserContext';
import { ApiService } from '../services/api';
import { RealtimeService } from '../services/realtime';
import type { Campaign, CampaignLead, AIAgent } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function CampaignsPage() {
  const { user } = useUser();
  const { canUseOutboundDialer } = usePermissions();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([]);

  useEffect(() => {
    if (user && canUseOutboundDialer) {
      loadCampaigns();
      setupRealtimeSubscriptions();
    }
  }, [user, canUseOutboundDialer]);

  const loadCampaigns = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const campaignsData = await ApiService.getCampaigns(user.id);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    const subscription = RealtimeService.subscribeToCampaignUpdates(
      user.id,
      (updatedCampaign) => {
        setCampaigns(prev => 
          prev.map(campaign => 
            campaign.id === updatedCampaign.id ? updatedCampaign : campaign
          )
        );
      },
      (newCampaign) => {
        setCampaigns(prev => [newCampaign, ...prev]);
      },
      (campaignId) => {
        setCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
      }
    );

    return () => {
      RealtimeService.unsubscribe(subscription);
    };
  };

  const handleStatusChange = async (campaignId: string, newStatus: Campaign['status']) => {
    try {
      await ApiService.updateCampaign(campaignId, { status: newStatus });
      toast.success(`Campaign ${newStatus}`);
    } catch (error) {
      console.error('Error updating campaign status:', error);
      toast.error('Failed to update campaign status');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      await ApiService.deleteCampaign(campaignId);
      toast.success('Campaign deleted successfully');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  const handleViewLeads = async (campaign: Campaign) => {
    try {
      setSelectedCampaign(campaign);
      const leads = await ApiService.getCampaignLeads(campaign.id);
      setCampaignLeads(leads);
      setShowLeadsModal(true);
    } catch (error) {
      console.error('Error loading campaign leads:', error);
      toast.error('Failed to load campaign leads');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'draft': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayIcon className="h-4 w-4" />;
      case 'paused': return <PauseIcon className="h-4 w-4" />;
      case 'completed': return <StopIcon className="h-4 w-4" />;
      case 'cancelled': return <StopIcon className="h-4 w-4" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateSuccessRate = (campaign: Campaign) => {
    if (campaign.leads_called === 0) return 0;
    return Math.round((campaign.leads_completed / campaign.leads_called) * 100);
  };

  if (!canUseOutboundDialer) {
    return (
      <div className="text-center py-12">
        <MegaphoneIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Outbound Campaigns Not Available</h3>
        <p className="mt-1 text-sm text-gray-500">
          Your current plan doesn't include outbound campaign features. Please upgrade your plan to access this functionality.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Outbound Campaigns</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your AI calling campaigns and track their performance.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            New Campaign
          </button>
        </div>
      </div>

      {campaigns.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {campaign.name}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                    {getStatusIcon(campaign.status)}
                    <span className="ml-1 capitalize">{campaign.status}</span>
                  </span>
                </div>
                
                {campaign.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {campaign.description}
                  </p>
                )}

                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Progress</span>
                    <span>{campaign.leads_called}/{campaign.total_leads}</span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: campaign.total_leads > 0 
                          ? `${(campaign.leads_called / campaign.total_leads) * 100}%` 
                          : '0%' 
                      }}
                    ></div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Success Rate</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {calculateSuccessRate(campaign)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="text-sm text-gray-900">{formatDate(campaign.created_at)}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-500">Caller ID</p>
                  <p className="text-sm text-gray-900 font-mono">{campaign.caller_id}</p>
                </div>

                <div className="mt-6 flex space-x-2">
                  <button 
                    onClick={() => handleViewLeads(campaign)}
                    className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    <EyeIcon className="h-4 w-4 inline mr-1" />
                    View Leads
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 px-3 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors">
                    <PencilIcon className="h-4 w-4 inline mr-1" />
                    Edit
                  </button>
                </div>

                <div className="mt-3 flex space-x-2">
                  {campaign.status === 'draft' && (
                    <button 
                      onClick={() => handleStatusChange(campaign.id, 'active')}
                      className="flex-1 bg-green-100 text-green-700 text-sm font-medium py-2 px-3 rounded-md hover:bg-green-200 transition-colors"
                    >
                      <PlayIcon className="h-4 w-4 inline mr-1" />
                      Start
                    </button>
                  )}
                  {campaign.status === 'active' && (
                    <button 
                      onClick={() => handleStatusChange(campaign.id, 'paused')}
                      className="flex-1 bg-yellow-100 text-yellow-700 text-sm font-medium py-2 px-3 rounded-md hover:bg-yellow-200 transition-colors"
                    >
                      <PauseIcon className="h-4 w-4 inline mr-1" />
                      Pause
                    </button>
                  )}
                  {campaign.status === 'paused' && (
                    <button 
                      onClick={() => handleStatusChange(campaign.id, 'active')}
                      className="flex-1 bg-green-100 text-green-700 text-sm font-medium py-2 px-3 rounded-md hover:bg-green-200 transition-colors"
                    >
                      <PlayIcon className="h-4 w-4 inline mr-1" />
                      Resume
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    className="flex-1 bg-red-100 text-red-700 text-sm font-medium py-2 px-3 rounded-md hover:bg-red-200 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4 inline mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <MegaphoneIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first AI calling campaign.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Create Campaign
            </button>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadCampaigns}
        />
      )}

      {/* Campaign Leads Modal */}
      {showLeadsModal && selectedCampaign && (
        <CampaignLeadsModal
          campaign={selectedCampaign}
          leads={campaignLeads}
          onClose={() => {
            setShowLeadsModal(false);
            setSelectedCampaign(null);
            setCampaignLeads([]);
          }}
        />
      )}
    </div>
  );
}

// Create Campaign Modal Component
function CreateCampaignModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [leads, setLeads] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    agent_id: '',
    caller_id: '+18553947135', // Default from Twilio settings
    max_concurrent_calls: 1,
    call_timeout_seconds: 30,
    retry_attempts: 3,
    retry_delay_minutes: 60,
    start_time: '09:00',
    end_time: '17:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    days_of_week: [1, 2, 3, 4, 5], // Monday to Friday
    scheduled_start_date: '',
    scheduled_end_date: '',
    custom_system_instruction: '',
    custom_voice_name: 'Puck'
  });

  useEffect(() => {
    loadAgents();
    loadDefaultSettings();
  }, []);

  const loadAgents = async () => {
    if (!user) return;
    try {
      const agentsData = await ApiService.getAgents(user.id);
      setAgents(agentsData.filter(agent => agent.is_active));
      
      // Auto-select first agent if only one available
      if (agentsData.length === 1) {
        setFormData(prev => ({ ...prev, agent_id: agentsData[0].id }));
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadDefaultSettings = async () => {
    if (!user) return;
    try {
      const settings = await ApiService.getUserSettings(user.id);
      if (settings?.twilio_phone_number) {
        setFormData(prev => ({ ...prev, caller_id: settings.twilio_phone_number }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const campaignTemplates = [
    {
      name: 'Sales Outreach',
      description: 'Cold calling for lead generation and sales',
      agent_type: 'sales',
      max_concurrent_calls: 3,
      call_timeout_seconds: 45,
      retry_attempts: 2
    },
    {
      name: 'Customer Service Follow-up',
      description: 'Follow up with existing customers',
      agent_type: 'customer_service',
      max_concurrent_calls: 2,
      call_timeout_seconds: 60,
      retry_attempts: 1
    },
    {
      name: 'Appointment Reminders',
      description: 'Automated appointment reminder calls',
      agent_type: 'appointment_booking',
      max_concurrent_calls: 5,
      call_timeout_seconds: 30,
      retry_attempts: 3
    },
    {
      name: 'Survey Campaign',
      description: 'Customer satisfaction surveys',
      agent_type: 'survey',
      max_concurrent_calls: 2,
      call_timeout_seconds: 90,
      retry_attempts: 1
    }
  ];

  const applyTemplate = (template: typeof campaignTemplates[0]) => {
    const matchingAgent = agents.find(agent => agent.agent_type === template.agent_type);
    setFormData(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      agent_id: matchingAgent?.id || prev.agent_id,
      max_concurrent_calls: template.max_concurrent_calls,
      call_timeout_seconds: template.call_timeout_seconds,
      retry_attempts: template.retry_attempts
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('number'));
        const firstNameIndex = headers.findIndex(h => h.includes('first') || h.includes('fname'));
        const lastNameIndex = headers.findIndex(h => h.includes('last') || h.includes('lname'));
        const emailIndex = headers.findIndex(h => h.includes('email'));
        const companyIndex = headers.findIndex(h => h.includes('company') || h.includes('business'));

        const parsedLeads = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          return {
            id: `temp-${index}`,
            phone_number: values[phoneIndex] || '',
            first_name: values[firstNameIndex] || '',
            last_name: values[lastNameIndex] || '',
            email: values[emailIndex] || '',
            company: values[companyIndex] || '',
            status: 'pending'
          };
        }).filter(lead => lead.phone_number);

        setLeads(parsedLeads);
        toast.success(`Loaded ${parsedLeads.length} leads from CSV`);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Error parsing CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Campaign name is required');
      return false;
    }
    if (!formData.agent_id) {
      toast.error('Please select an AI agent');
      return false;
    }
    if (!formData.caller_id.trim()) {
      toast.error('Caller ID is required');
      return false;
    }
    if (currentStep === 2 && leads.length === 0) {
      toast.error('Please upload leads or add them manually');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateForm()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateForm()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !validateForm()) return;

    setLoading(true);
    try {
      // Create campaign
      const campaign = await ApiService.createCampaign(user.id, {
        ...formData,
        status: 'draft',
        priority: 'normal' as const,
        custom_voice_name: formData.custom_voice_name as Campaign['custom_voice_name'],
        // Convert empty strings to null for timestamp fields
        scheduled_start_date: formData.scheduled_start_date || undefined,
        scheduled_end_date: formData.scheduled_end_date || undefined,
        // Initialize lead counters
        total_leads: 0,
        leads_called: 0,
        leads_answered: 0,
        leads_completed: 0
      });

      // Add leads to campaign
      if (campaign && leads.length > 0) {
        const campaignLeads = leads.map(lead => ({
          phone_number: lead.phone_number,
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          company: lead.company,
          status: 'pending' as const,
          priority: 'normal' as const,
          call_attempts: 0,
          do_not_call: false
        }));
        
        await ApiService.uploadCampaignLeads(campaign.id, campaignLeads);
      }
      
      toast.success(`Campaign created successfully with ${leads.length} leads`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  // Removed unused function

  const downloadCSVTemplate = () => {
    const csvContent = [
      'phone_number,first_name,last_name,email,company',
      '+1234567890,John,Doe,john.doe@example.com,Acme Corp',
      '+1234567891,Jane,Smith,jane.smith@example.com,Tech Solutions',
      '+1234567892,Bob,Johnson,bob.johnson@example.com,Marketing Inc'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'campaign_leads_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV template downloaded!');
  };

  // Removed unused function

  // Removed unused function

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border max-w-4xl shadow-lg rounded-lg bg-white">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Create New Campaign</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                <div className={`ml-2 text-sm font-medium ${
                  step <= currentStep ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step === 1 && 'Campaign Details'}
                  {step === 2 && 'Add Leads'}
                  {step === 3 && 'Review & Create'}
                </div>
                {step < 3 && (
                  <div className={`mx-4 h-0.5 w-16 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={currentStep === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          {/* Step 1: Campaign Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Campaign Templates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Quick Start Templates</label>
                <div className="grid grid-cols-2 gap-3">
                  {campaignTemplates.map((template) => (
                    <button
                      key={template.name}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{template.name}</div>
                      <div className="text-sm text-gray-500">{template.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Campaign Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Q1 Sales Outreach"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">AI Agent *</label>
                  <select
                    required
                    value={formData.agent_id}
                    onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an AI Agent</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} - {agent.agent_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ({agent.voice_name})
                      </option>
                    ))}
                  </select>
                  {agents.length === 0 && (
                    <p className="mt-1 text-sm text-red-500">
                      No active agents available. Please create and activate an AI agent first.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Brief description of the campaign..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Caller ID *</label>
                  <input
                    type="tel"
                    required
                    value={formData.caller_id}
                    onChange={(e) => setFormData({ ...formData, caller_id: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
                  <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <label key={day} className="flex flex-col items-center">
                        <input
                          type="checkbox"
                          checked={formData.days_of_week.includes(index)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                days_of_week: [...formData.days_of_week, index].sort()
                              });
                            } else {
                              setFormData({
                                ...formData,
                                days_of_week: formData.days_of_week.filter(d => d !== index)
                              });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="mt-1 text-xs text-gray-700">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Concurrent Calls</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_concurrent_calls}
                    onChange={(e) => setFormData({ ...formData, max_concurrent_calls: parseInt(e.target.value) })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Call Timeout (seconds)</label>
                  <input
                    type="number"
                    min="15"
                    max="120"
                    value={formData.call_timeout_seconds}
                    onChange={(e) => setFormData({ ...formData, call_timeout_seconds: parseInt(e.target.value) })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Retry Attempts</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={formData.retry_attempts}
                    onChange={(e) => setFormData({ ...formData, retry_attempts: parseInt(e.target.value) })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Add Leads */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Add Leads to Campaign</h4>
                
                {/* CSV Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload CSV file with leads
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        CSV should include columns: phone_number, first_name, last_name, email, company
                      </span>
                    </label>
                    <input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="mt-3 flex items-center justify-center space-x-3">
                      <button
                        type="button"
                        onClick={() => document.getElementById('csv-upload')?.click()}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Choose File
                      </button>
                      <span className="text-gray-400">or</span>
                      <button
                        type="button"
                        onClick={downloadCSVTemplate}
                        className="inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Template
                      </button>
                    </div>
                  </div>
                </div>

                {/* Leads Preview */}
                {leads.length > 0 && (
                  <div className="mt-6">
                    <h5 className="text-md font-medium text-gray-900 mb-3">
                      Loaded Leads ({leads.length})
                    </h5>
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {leads.slice(0, 10).map((lead, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 text-sm text-gray-900">{lead.phone_number}</td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {lead.first_name} {lead.last_name}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">{lead.email}</td>
                              <td className="px-3 py-2 text-sm text-gray-900">{lead.company}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {leads.length > 10 && (
                        <div className="px-3 py-2 text-sm text-gray-500 bg-gray-50">
                          ... and {leads.length - 10} more leads
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Review & Create */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Review Campaign</h4>
              
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900">Campaign Details</h5>
                    <dl className="mt-2 space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Name:</dt>
                        <dd className="text-sm text-gray-900">{formData.name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Agent:</dt>
                        <dd className="text-sm text-gray-900">
                          {agents.find(a => a.id === formData.agent_id)?.name}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Caller ID:</dt>
                        <dd className="text-sm text-gray-900">{formData.caller_id}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Schedule:</dt>
                        <dd className="text-sm text-gray-900">
                          {formData.start_time} - {formData.end_time}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900">Call Settings</h5>
                    <dl className="mt-2 space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Max Concurrent:</dt>
                        <dd className="text-sm text-gray-900">{formData.max_concurrent_calls}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Timeout:</dt>
                        <dd className="text-sm text-gray-900">{formData.call_timeout_seconds}s</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Retry Attempts:</dt>
                        <dd className="text-sm text-gray-900">{formData.retry_attempts}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Total Leads:</dt>
                        <dd className="text-sm text-gray-900">{leads.length}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Back
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              
              {currentStep < 3 ? (
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Campaign'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Campaign Leads Modal Component
function CampaignLeadsModal({ 
  campaign, 
  leads, 
  onClose 
}: { 
  campaign: Campaign; 
  leads: CampaignLead[]; 
  onClose: () => void 
}) {
  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'answered': return 'text-blue-600 bg-blue-100';
      case 'called': return 'text-yellow-600 bg-yellow-100';
      case 'no_answer': return 'text-orange-600 bg-orange-100';
      case 'busy': return 'text-purple-600 bg-purple-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Campaign Leads: {campaign.name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attempts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Call
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outcome
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lead.first_name} {lead.last_name}
                        </div>
                        {lead.email && (
                          <div className="text-sm text-gray-500">{lead.email}</div>
                        )}
                        {lead.company && (
                          <div className="text-sm text-gray-500">{lead.company}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {lead.phone_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLeadStatusColor(lead.status)}`}>
                        {lead.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.call_attempts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.last_call_at ? new Date(lead.last_call_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.outcome || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {leads.length === 0 && (
            <div className="text-center py-8">
              <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No leads uploaded</h3>
              <p className="mt-1 text-sm text-gray-500">
                Upload a CSV file with leads to start this campaign.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}