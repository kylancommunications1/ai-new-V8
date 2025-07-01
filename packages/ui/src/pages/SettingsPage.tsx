import { useState, useEffect } from 'react';
import { EyeIcon, EyeSlashIcon, KeyIcon, UserIcon, PhoneIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { ApiService } from '../services/api';
import type { PhoneNumber } from '../lib/supabase';
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
    gemini_model: 'gemini-2.0-flash-live-001',
    
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
        setFormData(prev => ({
          ...prev,
          client_name: settings.client_name || '',
          company_name: settings.company_name || '',
          email: settings.email || '',
          phone_number: settings.phone_number || '',
          system_instruction: settings.system_instruction || '',
          voice_name: settings.voice_name || 'Puck',
          language_code: settings.language_code || 'en-US',
          agent_type: settings.agent_type || 'customer_service',
          gemini_model: settings.gemini_model || 'gemini-2.0-flash-live-001',
          twilio_phone_number: settings.twilio_phone_number || '',
          twilio_webhook_url: settings.twilio_webhook_url || ''
        }));
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const loadPhoneNumbers = async () => {
    if (!user) return;
    
    try {
      const numbers = await ApiService.getPhoneNumbers(user.id);
      setPhoneNumbers(numbers);
    } catch (error) {
      console.error('Error loading phone numbers:', error);
      toast.error('Failed to load phone numbers');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      const updatedSettings = await ApiService.updateUserSettings(user.id, formData);
      if (updatedSettings) {
        await updateUser(updatedSettings);
        toast.success('Settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoneNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const newPhone = await ApiService.addPhoneNumber(user.id, {
        ...newPhoneData,
        is_active: true
      });
      if (newPhone) {
        setPhoneNumbers(prev => [newPhone, ...prev]);
        setNewPhoneData({ phone_number: '', friendly_name: '', is_primary: false });
        setShowAddPhone(false);
        toast.success('Phone number added successfully');
      }
    } catch (error) {
      console.error('Error adding phone number:', error);
      toast.error('Failed to add phone number');
    }
  };

  const toggleApiKeyVisibility = (key: keyof typeof showApiKeys) => {
    setShowApiKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings and configurations</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* Profile Information */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <UserIcon className="h-6 w-6 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name
              </label>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <KeyIcon className="h-6 w-6 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">AI Configuration</h2>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Voice
                </label>
                <select
                  value={formData.voice_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, voice_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {VOICE_OPTIONS.map(voice => (
                    <option key={voice.value} value={voice.value}>{voice.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Language
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Agent Type
                </label>
                <select
                  value={formData.agent_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, agent_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {AGENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default System Instructions
              </label>
              <textarea
                value={formData.system_instruction}
                onChange={(e) => setFormData(prev => ({ ...prev, system_instruction: e.target.value }))}
                rows={4}
                placeholder="Enter default instructions for your AI agents..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Phone Numbers */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <PhoneIcon className="h-6 w-6 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Phone Numbers</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAddPhone(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add Number
            </button>
          </div>

          <div className="space-y-3">
            {phoneNumbers.map((phone) => (
              <div key={phone.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{phone.phone_number}</div>
                  <div className="text-sm text-gray-500">{phone.friendly_name}</div>
                  {phone.is_primary && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Primary
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    phone.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {phone.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}

            {phoneNumbers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No phone numbers configured. Add your first number to get started.
              </div>
            )}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-lg font-semibold text-gray-900">Advanced Settings</h2>
            <span className="text-gray-400">{showAdvanced ? '−' : '+'}</span>
          </button>

          {showAdvanced && (
            <div className="mt-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gemini Model
                </label>
                <select
                  value={formData.gemini_model}
                  onChange={(e) => setFormData(prev => ({ ...prev, gemini_model: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="gemini-2.0-flash-live-001">Gemini 2.0 Flash Live (Recommended)</option>
                  <option value="gemini-live-2.5-flash-preview">Gemini Live 2.5 Flash Preview</option>
                  <option value="gemini-2.5-flash-preview-native-audio-dialog">Gemini 2.5 Flash Native Audio</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Twilio Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.twilio_phone_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, twilio_phone_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={formData.twilio_webhook_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, twilio_webhook_url: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* API Keys */}
              <div className="space-y-4">
                <h3 className="text-md font-medium text-gray-900">API Keys</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gemini API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKeys.gemini ? 'text' : 'password'}
                      value={formData.gemini_api_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, gemini_api_key: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => toggleApiKeyVisibility('gemini')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showApiKeys.gemini ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Twilio Account SID
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKeys.twilioSid ? 'text' : 'password'}
                        value={formData.twilio_account_sid}
                        onChange={(e) => setFormData(prev => ({ ...prev, twilio_account_sid: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => toggleApiKeyVisibility('twilioSid')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showApiKeys.twilioSid ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Twilio Auth Token
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKeys.twilioToken ? 'text' : 'password'}
                        value={formData.twilio_auth_token}
                        onChange={(e) => setFormData(prev => ({ ...prev, twilio_auth_token: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => toggleApiKeyVisibility('twilioToken')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showApiKeys.twilioToken ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            Save Settings
          </button>
        </div>
      </form>

      {/* Add Phone Number Modal */}
      {showAddPhone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Phone Number</h2>
            
            <form onSubmit={handleAddPhoneNumber} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={newPhoneData.phone_number}
                  onChange={(e) => setNewPhoneData(prev => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Friendly Name
                </label>
                <input
                  type="text"
                  value={newPhoneData.friendly_name}
                  onChange={(e) => setNewPhoneData(prev => ({ ...prev, friendly_name: e.target.value }))}
                  placeholder="Main Business Line"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={newPhoneData.is_primary}
                  onChange={(e) => setNewPhoneData(prev => ({ ...prev, is_primary: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_primary" className="ml-2 text-sm text-gray-700">
                  Set as primary number
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPhone(false);
                    setNewPhoneData({ phone_number: '', friendly_name: '', is_primary: false });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Number
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}