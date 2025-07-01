import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  TrashIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  CalendarIcon,

} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { ApiService } from '../services/api';
import { RealtimeService } from '../services/realtime';
import type { DNCEntry } from '../lib/supabase';
import toast from 'react-hot-toast';

const DNC_SOURCES = [
  { value: 'customer_request', label: 'Customer Request', color: 'bg-blue-100 text-blue-800' },
  { value: 'legal_requirement', label: 'Legal Requirement', color: 'bg-red-100 text-red-800' },
  { value: 'manual', label: 'Manual Entry', color: 'bg-gray-100 text-gray-800' },
  { value: 'complaint', label: 'Complaint', color: 'bg-yellow-100 text-yellow-800' }
];

export default function DNCPage() {
  const { user } = useUser();
  const [dncEntries, setDncEntries] = useState<DNCEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      loadDNCEntries();
      setupRealtimeSubscriptions();
    }
  }, [user]);

  const loadDNCEntries = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const entries = await ApiService.getDNCList(user.id);
      setDncEntries(entries);
    } catch (error) {
      console.error('Error loading DNC entries:', error);
      toast.error('Failed to load DNC list');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    const subscription = RealtimeService.subscribeToDNCUpdates(
      user.id,
      (updatedEntry) => {
        setDncEntries(prev => 
          prev.map(entry => 
            entry.id === updatedEntry.id ? updatedEntry : entry
          )
        );
      },
      (newEntry) => {
        setDncEntries(prev => [newEntry, ...prev]);
      },
      (entryId) => {
        setDncEntries(prev => prev.filter(entry => entry.id !== entryId));
      }
    );

    return () => {
      RealtimeService.unsubscribe(subscription);
    };
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to remove this number from the DNC list?')) {
      return;
    }

    try {
      // Optimistically update UI
      setDncEntries(prev => prev.filter(entry => entry.id !== entryId));
      
      // Make API call
      await ApiService.deleteDNCEntry(entryId);
      toast.success('Number removed from DNC list');
    } catch (error) {
      console.error('Error deleting DNC entry:', error);
      toast.error('Failed to remove number from DNC list');
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Phone Number', 'Source', 'Added Date', 'Notes', 'Expiry Date'],
      ...dncEntries.map(entry => [
        entry.phone_number,
        entry.source,
        new Date(entry.added_date).toLocaleDateString(),
        entry.notes || '',
        entry.expiry_date ? new Date(entry.expiry_date).toLocaleDateString() : ''
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dnc-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getSourceInfo = (source: string) => {
    return DNC_SOURCES.find(s => s.value === source) || DNC_SOURCES[0];
  };

  const filteredEntries = dncEntries.filter(entry =>
    entry.phone_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          <h1 className="text-2xl font-semibold text-gray-900">Do Not Call List</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage phone numbers that should not be contacted for compliance.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowBulkUpload(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <DocumentArrowUpIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Bulk Upload
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add Number
          </button>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search DNC List
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search by phone number or notes..."
            />
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{dncEntries.length}</div>
            <div className="text-sm text-gray-500">Total Numbers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {dncEntries.filter(e => e.source === 'legal_requirement').length}
            </div>
            <div className="text-sm text-gray-500">Legal Requirements</div>
          </div>
        </div>
      </div>

      {/* DNC List Table */}
      {filteredEntries.length > 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.map((entry) => {
                  const sourceInfo = getSourceInfo(entry.source);
                  const isExpired = entry.expiry_date && new Date(entry.expiry_date) < new Date();
                  
                  return (
                    <tr key={entry.id} className={`hover:bg-gray-50 ${isExpired ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <div className="text-sm font-medium text-gray-900 font-mono">
                            {entry.phone_number}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sourceInfo.color}`}>
                          {sourceInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {new Date(entry.added_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.expiry_date ? (
                          <div className={`flex items-center ${isExpired ? 'text-red-600' : ''}`}>
                            <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                            {new Date(entry.expiry_date).toLocaleDateString()}
                            {isExpired && <ExclamationTriangleIcon className="h-4 w-4 text-red-500 ml-2" />}
                          </div>
                        ) : (
                          <span className="text-gray-500">Never</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {entry.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Remove from DNC list"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
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
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm ? 'No matching numbers found' : 'No DNC entries yet'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? 'Try adjusting your search terms.' 
              : 'Add phone numbers to ensure compliance with do-not-call regulations.'
            }
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Add First Number
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add DNC Entry Modal */}
      {showAddModal && (
        <AddDNCModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={loadDNCEntries}
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onSuccess={loadDNCEntries}
        />
      )}
    </div>
  );
}

// Add DNC Entry Modal
function AddDNCModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: '',
    source: 'manual',
    notes: '',
    expiry_date: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await ApiService.addDNCEntry({
        ...formData,
        profile_id: user.id,
        is_active: true,
        added_date: new Date().toISOString(),
        expiry_date: formData.expiry_date || undefined,
        source: formData.source as DNCEntry['source']
      });
      
      toast.success('Number added to DNC list');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding DNC entry:', error);
      toast.error('Failed to add number to DNC list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add to DNC List</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                required
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {DNC_SOURCES.map(source => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Expiry Date (Optional)</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty for permanent DNC entry
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Reason for DNC entry..."
              />
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
                {loading ? 'Adding...' : 'Add to DNC List'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Bulk Upload Modal
function BulkUploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Preview first few lines
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').slice(0, 5).filter(line => line.trim());
        setPreview(lines);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        const entries = lines.map(line => {
          const phoneNumber = line.split(',')[0].replace(/[^+\d]/g, '');
          return {
            profile_id: user.id,
            phone_number: phoneNumber,
            source: 'manual',
            notes: 'Bulk upload'
          };
        }).filter(entry => entry.phone_number);

        const entriesWithDefaults = entries.map(entry => ({
          ...entry,
          is_active: true,
          added_date: new Date().toISOString(),
          source: entry.source as DNCEntry['source']
        }));
        await ApiService.bulkAddDNCEntries(entriesWithDefaults);
        toast.success(`Added ${entries.length} numbers to DNC list`);
        onSuccess();
        onClose();
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error uploading DNC entries:', error);
      toast.error('Failed to upload DNC entries');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Upload DNC Numbers</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">CSV File</label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                Upload a CSV file with phone numbers (one per line)
              </p>
            </div>

            {preview.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Preview</label>
                <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50">
                  {preview.map((line, index) => (
                    <div key={index} className="text-sm font-mono text-gray-700">
                      {line.split(',')[0]}
                    </div>
                  ))}
                  {preview.length === 5 && <div className="text-xs text-gray-500">...</div>}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}