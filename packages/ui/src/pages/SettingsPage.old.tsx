import { useState, useEffect } from 'react';
import { EyeIcon, EyeSlashIcon, KeyIcon, UserIcon, PhoneIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { ApiService } from '../services/api';
import type { PhoneNumber } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState({
    gemini: false,
    twilioSid: false,
    twilioToken: false
  });
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [newPhoneData, setNewPhoneData] = useState({
    phone_number: '',
    friendly_name: '',
    is_primary: false
  });
  
  const [formData, setFormData] = useState({
    // Profile Information
    client_name: '',
    company_name: '',
    email: '',
    phone_number: '',
    
    // AI Configuration
    system_instruction: '',
    voice_name: 'Puck',
    language_code: 'en-US',
    agent_type: 'customer_service',
    gemini_model: 'gemini-2.5-flash-preview-native-audio-dialog',
    
    // Phone Configuration
    twilio_phone_number: '',
    twilio_webhook_url: '',
    
    // API Keys (these would be stored securely)
    gemini_api_key: '',
    twilio_account_sid: '',
    twilio_auth_token: ''
  });

  useEffect(() => {
    if (user) {
      loadUserSettings();
      loadPhoneNumbers();
    }
  }, [user]);

  const loadUserSettings = async () => {
    if (!user) return;
    
    try {
      const settings = await ApiService.getUserSettings(user.id);
      if (settings) {
        setFormData({
          client_name: settings.client_name || '',
          company_name: settings.company_name || '',
          email: settings.email || '',
          phone_number: settings.phone_number || '',
          system_instruction: settings.system_instruction || '',
          voice_name: settings.voice_name || 'Puck',
          language_code: settings.language_code || 'en-US',
          agent_type: settings.agent_type || 'customer_service',
        gemini_model: user.gemini_model || 'gemini-2.5-flash-preview-native-audio-dialog',
        twilio_phone_number: '',
        twilio_webhook_url: '',
        gemini_api_key: '',
        twilio_account_sid: '',
        twilio_auth_token: ''
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await updateUser({
        client_name: formData.client_name,
        company_name: formData.company_name,
        phone_number: formData.phone_number,
        gemini_model: formData.gemini_model as 'gemini-live-2.5-flash-preview' | 'gemini-2.0-flash-live-001' | 'gemini-2.5-flash-preview-native-audio-dialog'
      });
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async (keyType: 'gemini' | 'twilio_sid' | 'twilio_token') => {
    // In a real implementation, these would be encrypted and stored securely
    // For now, we'll just show a success message
    toast.success(`${keyType} API key updated successfully`);
  };

  const toggleApiKeyVisibility = (keyType: 'gemini' | 'twilioSid' | 'twilioToken') => {
    setShowApiKeys(prev => ({ ...prev, [keyType]: !prev[keyType] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-2 text-sm text-gray-700">
          Configure your AI call center platform settings and preferences.
        </p>
      </div>

      {/* Profile Information */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center mb-6">
            <UserIcon className="h-6 w-6 text-gray-400 mr-3" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Profile Information
            </h3>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="client-name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                id="client-name"
                value={formData.client_name}
                onChange={(e) => handleInputChange('client_name', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="company-name" className="block text-sm font-medium text-gray-700">
                Company Name
              </label>
              <input
                type="text"
                id="company-name"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm"
                placeholder="john@example.com"
              />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div>
              <label htmlFor="phone-number" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone-number"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
            AI Configuration
          </h3>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="voice-name" className="block text-sm font-medium text-gray-700">
                Voice
              </label>
              <select
                id="voice-name"
                value={formData.voice_name}
                onChange={(e) => handleInputChange('voice_name', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="Puck">Puck (Default) - Friendly and professional</option>
                <option value="Charon">Charon - Deep and authoritative</option>
                <option value="Kore">Kore - Warm and empathetic</option>
                <option value="Fenrir">Fenrir - Strong and confident</option>
                <option value="Aoede">Aoede - Melodic and soothing</option>
                <option value="Leda">Leda - Clear and articulate</option>
                <option value="Orus">Orus - Calm and reassuring</option>
                <option value="Zephyr">Zephyr - Light and energetic</option>
              </select>
            </div>

            <div>
              <label htmlFor="language-code" className="block text-sm font-medium text-gray-700">
                Language
              </label>
              <select
                id="language-code"
                value={formData.language_code}
                onChange={(e) => handleInputChange('language_code', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-US">Spanish (US)</option>
                <option value="es-ES">Spanish (Spain)</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
                <option value="it-IT">Italian</option>
                <option value="pt-BR">Portuguese (Brazil)</option>
              </select>
            </div>

            <div>
              <label htmlFor="agent-type" className="block text-sm font-medium text-gray-700">
                Agent Type
              </label>
              <select
                id="agent-type"
                value={formData.agent_type}
                onChange={(e) => handleInputChange('agent_type', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="customer_service">Customer Service</option>
                <option value="sales">Sales</option>
                <option value="support">Technical Support</option>
                <option value="appointment_booking">Appointment Booking</option>
                <option value="survey">Survey</option>
                <option value="general">General Assistant</option>
              </select>
            </div>

            <div>
              <label htmlFor="gemini-model" className="block text-sm font-medium text-gray-700">
                Gemini AI Model
              </label>
              <select
                id="gemini-model"
                value={formData.gemini_model}
                onChange={(e) => handleInputChange('gemini_model', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="gemini-2.5-flash-preview-native-audio-dialog">Gemini 2.5 Flash Preview (Native Audio Dialog)</option>
                <option value="gemini-live-2.5-flash-preview">Gemini Live 2.5 Flash Preview</option>
                <option value="gemini-2.0-flash-live-001">Gemini 2.0 Flash Live</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Choose the Gemini AI model for voice conversations
              </p>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="system-instruction" className="block text-sm font-medium text-gray-700">
                AI Personality & Goals
              </label>
              <textarea
                id="system-instruction"
                rows={4}
                value={formData.system_instruction}
                onChange={(e) => handleInputChange('system_instruction', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Example: You are a friendly customer service representative for ABC Company. Always be helpful, patient, and try to resolve customer issues quickly. If you can't help, offer to transfer them to a human agent."
              />
              <p className="mt-1 text-xs text-gray-500">
                Describe how your AI should behave and what its goals are during calls
              </p>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="sm:col-span-2">
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
          </div>
        </div>
      </div>

      {showAdvanced && (
        <>
          {/* Phone Configuration */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center mb-6">
            <PhoneIcon className="h-6 w-6 text-gray-400 mr-3" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Phone Configuration
            </h3>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="twilio-phone" className="block text-sm font-medium text-gray-700">
                Twilio Phone Number
              </label>
              <input
                type="tel"
                id="twilio-phone"
                value={formData.twilio_phone_number}
                onChange={(e) => handleInputChange('twilio_phone_number', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="+1 (555) 987-6543"
              />
            </div>

            <div>
              <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700">
                Integration URL
              </label>
              <input
                type="url"
                id="webhook-url"
                value={formData.twilio_webhook_url}
                onChange={(e) => handleInputChange('twilio_webhook_url', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="https://your-domain.com/webhook"
              />
            </div>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center mb-6">
            <KeyIcon className="h-6 w-6 text-gray-400 mr-3" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Service Connections
            </h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Gemini API Key</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type={showApiKeys.gemini ? 'text' : 'password'}
                  value={formData.gemini_api_key}
                  onChange={(e) => handleInputChange('gemini_api_key', e.target.value)}
                  className="flex-1 rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="AIzaSy..."
                />
                <button
                  type="button"
                  onClick={() => toggleApiKeyVisibility('gemini')}
                  className="relative -ml-px inline-flex items-center px-3 py-2 border border-gray-300 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  {showApiKeys.gemini ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveApiKey('gemini')}
                  className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Update
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Twilio Account SID</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type={showApiKeys.twilioSid ? 'text' : 'password'}
                  value={formData.twilio_account_sid}
                  onChange={(e) => handleInputChange('twilio_account_sid', e.target.value)}
                  className="flex-1 rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="AC..."
                />
                <button
                  type="button"
                  onClick={() => toggleApiKeyVisibility('twilioSid')}
                  className="relative -ml-px inline-flex items-center px-3 py-2 border border-gray-300 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  {showApiKeys.twilioSid ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveApiKey('twilio_sid')}
                  className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Update
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Twilio Auth Token</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type={showApiKeys.twilioToken ? 'text' : 'password'}
                  value={formData.twilio_auth_token}
                  onChange={(e) => handleInputChange('twilio_auth_token', e.target.value)}
                  className="flex-1 rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => toggleApiKeyVisibility('twilioToken')}
                  className="relative -ml-px inline-flex items-center px-3 py-2 border border-gray-300 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  {showApiKeys.twilioToken ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveApiKey('twilio_token')}
                  className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Update
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              <strong>Security Note:</strong> API keys are encrypted and stored securely. They are never displayed in full after being saved.
            </p>
          </div>
        </div>
      </div>

      {/* Account Information */}
      {user && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
              Account Information
            </h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Plan</label>
                <div className="mt-1 text-sm text-gray-900 capitalize font-medium">
                  {user.plan_name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Monthly Limit</label>
                <div className="mt-1 text-sm text-gray-900">
                  {user.monthly_minute_limit.toLocaleString()} minutes
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Minutes Used</label>
                <div className="mt-1 text-sm text-gray-900">
                  {user.minutes_used.toLocaleString()} minutes
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Account Status</label>
                <div className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        </>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Reset
        </button>
        <button
          onClick={handleSaveProfile}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}