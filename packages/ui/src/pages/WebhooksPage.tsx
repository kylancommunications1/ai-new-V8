import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  TrashIcon,
  PencilIcon,
  PlayIcon,
  PauseIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  LinkIcon,
  BoltIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { ApiService } from '../services/api';
import { RealtimeService } from '../services/realtime';
import type { WebhookEndpoint, WebhookDelivery } from '../lib/supabase';
import toast from 'react-hot-toast';
import ZapierIntegration from '../components/ZapierIntegration';
import GoHighLevelIntegration from '../components/GoHighLevelIntegration';

const WEBHOOK_EVENTS = [
  { value: 'call.started', label: 'Call Started', description: 'When a call begins' },
  { value: 'call.completed', label: 'Call Completed', description: 'When a call ends' },
  { value: 'call.failed', label: 'Call Failed', description: 'When a call fails' },
  { value: 'campaign.started', label: 'Campaign Started', description: 'When a campaign begins' },
  { value: 'campaign.completed', label: 'Campaign Completed', description: 'When a campaign finishes' },
  { value: 'campaign.paused', label: 'Campaign Paused', description: 'When a campaign is paused' },
  { value: 'appointment.scheduled', label: 'Appointment Scheduled', description: 'When an appointment is booked' },
  { value: 'appointment.cancelled', label: 'Appointment Cancelled', description: 'When an appointment is cancelled' },
  { value: 'lead.updated', label: 'Lead Updated', description: 'When a lead status changes' },
  { value: 'agent.status_changed', label: 'Agent Status Changed', description: 'When an agent goes online/offline' }
];

const ZAPIER_TEMPLATES = [
  {
    name: 'Call to Slack',
    description: 'Send call notifications to Slack channel',
    events: ['call.completed'],
    zapierUrl: 'https://zapier.com/apps/slack/integrations'
  },
  {
    name: 'Appointment to Google Calendar',
    description: 'Add appointments to Google Calendar',
    events: ['appointment.scheduled'],
    zapierUrl: 'https://zapier.com/apps/google-calendar/integrations'
  },
  {
    name: 'Lead to CRM',
    description: 'Update leads in your CRM system',
    events: ['lead.updated', 'call.completed'],
    zapierUrl: 'https://zapier.com/apps/salesforce/integrations'
  },
  {
    name: 'Campaign to Email',
    description: 'Send campaign reports via email',
    events: ['campaign.completed'],
    zapierUrl: 'https://zapier.com/apps/email/integrations'
  }
];

export default function WebhooksPage() {
  const { user } = useUser();
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEndpoint | null>(null);
  const [activeTab, setActiveTab] = useState<'webhooks' | 'deliveries' | 'marketplace' | 'zapier' | 'ghl'>('webhooks');

  useEffect(() => {
    if (user) {
      loadWebhooks();
      loadDeliveries();
      setupRealtimeSubscriptions();
    }
  }, [user]);

  const loadWebhooks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const webhooksData = await ApiService.getWebhookEndpoints(user.id);
      setWebhooks(webhooksData);
    } catch (error) {
      console.error('Error loading webhooks:', error);
      toast.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async () => {
    if (!user) return;

    try {
      const deliveriesData = await ApiService.getWebhookDeliveries(user.id);
      setDeliveries(deliveriesData);
    } catch (error) {
      console.error('Error loading webhook deliveries:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    const subscription = RealtimeService.subscribeToWebhookUpdates(
      user.id,
      (updatedWebhook) => {
        setWebhooks(prev => 
          prev.map(webhook => 
            webhook.id === updatedWebhook.id ? updatedWebhook : webhook
          )
        );
      },
      (newWebhook) => {
        setWebhooks(prev => [newWebhook, ...prev]);
      },
      (webhookId) => {
        setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId));
      }
    );

    return () => {
      RealtimeService.unsubscribe(subscription);
    };
  };

  const handleToggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      await ApiService.updateWebhookEndpoint(webhookId, { is_active: !isActive });
      toast.success(`Webhook ${!isActive ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling webhook:', error);
      toast.error('Failed to update webhook status');
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) {
      return;
    }

    try {
      await ApiService.deleteWebhookEndpoint(webhookId);
      toast.success('Webhook deleted successfully');
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error('Failed to delete webhook');
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    try {
      await ApiService.testWebhookEndpoint(webhookId);
      toast.success('Test webhook sent successfully');
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error('Failed to send test webhook');
    }
  };

  const handleEditWebhook = (webhook: WebhookEndpoint) => {
    setSelectedWebhook(webhook);
    setShowEditModal(true);
  };

  const formatDeliveryTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Webhooks & Integrations</h1>
          <p className="mt-2 text-sm text-gray-700">
            Connect your AI call center with external services and automation tools.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Create Webhook
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'webhooks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <LinkIcon className="h-5 w-5 inline mr-2" />
            Webhooks ({webhooks.length})
          </button>
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'deliveries'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClockIcon className="h-5 w-5 inline mr-2" />
            Delivery Log ({deliveries.length})
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'marketplace'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BoltIcon className="h-5 w-5 inline mr-2" />
            Zapier Templates
          </button>
          <button
            onClick={() => setActiveTab('zapier')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'zapier'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CogIcon className="h-5 w-5 inline mr-2" />
            Zapier Integration
          </button>
          <button
            onClick={() => setActiveTab('ghl')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ghl'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CogIcon className="h-5 w-5 inline mr-2" />
            Go High Level
          </button>
        </nav>
      </div>

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <>
          {webhooks.length > 0 ? (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name & URL
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Events
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Success Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Triggered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {webhooks.map((webhook) => {
                      const successRate = webhook.success_count + webhook.failure_count > 0 
                        ? (webhook.success_count / (webhook.success_count + webhook.failure_count) * 100).toFixed(1)
                        : 'N/A';
                      
                      return (
                        <tr key={webhook.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {webhook.name}
                              </div>
                              <div className="text-sm text-gray-500 font-mono truncate max-w-xs">
                                {webhook.url}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {webhook.events.slice(0, 3).map(event => (
                                <span key={event} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {event}
                                </span>
                              ))}
                              {webhook.events.length > 3 && (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  +{webhook.events.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              webhook.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {webhook.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              {successRate !== 'N/A' && (
                                <>
                                  {parseFloat(successRate) >= 95 ? (
                                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                                  ) : parseFloat(successRate) >= 80 ? (
                                    <ClockIcon className="h-4 w-4 text-yellow-500 mr-1" />
                                  ) : (
                                    <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                                  )}
                                </>
                              )}
                              {successRate}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {webhook.last_triggered_at 
                              ? formatDeliveryTime(webhook.last_triggered_at)
                              : 'Never'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleToggleWebhook(webhook.id, webhook.is_active)}
                                className={`${
                                  webhook.is_active 
                                    ? 'text-yellow-600 hover:text-yellow-900' 
                                    : 'text-green-600 hover:text-green-900'
                                }`}
                                title={webhook.is_active ? 'Disable' : 'Enable'}
                              >
                                {webhook.is_active ? (
                                  <PauseIcon className="h-4 w-4" />
                                ) : (
                                  <PlayIcon className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleTestWebhook(webhook.id)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Test webhook"
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEditWebhook(webhook)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteWebhook(webhook.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No webhooks configured</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create your first webhook to start receiving real-time notifications.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Create Webhook
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Deliveries Tab */}
      {activeTab === 'deliveries' && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Webhook
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivered At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deliveries.slice(0, 50).map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {webhooks.find(w => w.id === delivery.webhook_id)?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {delivery.event_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {delivery.success ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />
                        )}
                        <span className={`text-sm ${delivery.success ? 'text-green-800' : 'text-red-800'}`}>
                          {delivery.response_status || 'Failed'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {delivery.response_body || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDeliveryTime(delivery.delivered_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Zapier Marketplace Tab */}
      {activeTab === 'marketplace' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ZAPIER_TEMPLATES.map((template, index) => (
            <div key={index} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.events.map(event => (
                      <span key={event} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
                <BoltIcon className="h-8 w-8 text-orange-500 flex-shrink-0" />
              </div>
              <div className="flex space-x-3">
                <a
                  href={template.zapierUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Open in Zapier
                </a>
                <button
                  onClick={() => {
                    setShowCreateModal(true);
                    // Pre-fill with template events
                  }}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Webhook
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zapier Integration Tab */}
      {activeTab === 'zapier' && (
        <ZapierIntegration />
      )}

      {/* Go High Level Integration Tab */}
      {activeTab === 'ghl' && (
        <GoHighLevelIntegration />
      )}

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <CreateWebhookModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadWebhooks}
        />
      )}

      {/* Edit Webhook Modal */}
      {showEditModal && selectedWebhook && (
        <EditWebhookModal
          webhook={selectedWebhook}
          onClose={() => {
            setShowEditModal(false);
            setSelectedWebhook(null);
          }}
          onSuccess={loadWebhooks}
        />
      )}
    </div>
  );
}

// Create Webhook Modal Component
function CreateWebhookModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret_key: '',
    retry_attempts: 3
  });

  const handleEventToggle = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (formData.events.length === 0) {
      toast.error('Please select at least one event');
      return;
    }

    setLoading(true);
    try {
      await ApiService.createWebhookEndpoint({
        ...formData,
        profile_id: user.id,
        is_active: true
      });
      
      toast.success('Webhook created successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating webhook:', error);
      toast.error('Failed to create webhook');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create Webhook</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="My Webhook"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">URL</label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://your-app.com/webhook"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                {WEBHOOK_EVENTS.map(event => (
                  <label key={event.value} className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event.value)}
                      onChange={() => handleEventToggle(event.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                    />
                    <div className="ml-2">
                      <div className="text-sm font-medium text-gray-900">{event.label}</div>
                      <div className="text-xs text-gray-500">{event.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Secret Key (Optional)</label>
              <input
                type="text"
                value={formData.secret_key}
                onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Used for webhook signature verification"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Retry Attempts</label>
              <select
                value={formData.retry_attempts}
                onChange={(e) => setFormData({ ...formData, retry_attempts: parseInt(e.target.value) })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0}>No retries</option>
                <option value={1}>1 retry</option>
                <option value={3}>3 retries</option>
                <option value={5}>5 retries</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Webhook'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Edit Webhook Modal Component (similar structure to Create)
function EditWebhookModal({ 
  webhook, 
  onClose, 
  onSuccess 
}: { 
  webhook: WebhookEndpoint; 
  onClose: () => void; 
  onSuccess: () => void 
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: webhook.name,
    url: webhook.url,
    events: webhook.events,
    secret_key: webhook.secret_key || '',
    retry_attempts: webhook.retry_attempts
  });

  const handleEventToggle = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.events.length === 0) {
      toast.error('Please select at least one event');
      return;
    }

    setLoading(true);
    try {
      await ApiService.updateWebhookEndpoint(webhook.id, formData);
      
      toast.success('Webhook updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating webhook:', error);
      toast.error('Failed to update webhook');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Webhook</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Same form fields as CreateWebhookModal */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">URL</label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                {WEBHOOK_EVENTS.map(event => (
                  <label key={event.value} className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event.value)}
                      onChange={() => handleEventToggle(event.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                    />
                    <div className="ml-2">
                      <div className="text-sm font-medium text-gray-900">{event.label}</div>
                      <div className="text-xs text-gray-500">{event.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Webhook'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}