import { useState, useEffect } from 'react';
import { 
  PhoneIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  PlayIcon,
  DocumentTextIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { ApiService, type CallHistoryFilters, type PaginatedCallHistory } from '../services/api';
import { RealtimeService } from '../services/realtime';
import type { CallLog } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function CallsPage() {
  const { user } = useUser();
  const [callHistory, setCallHistory] = useState<PaginatedCallHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CallHistoryFilters>({
    direction: 'all',
    status: 'all',
    searchTerm: ''
  });
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showRecordingPlayer, setShowRecordingPlayer] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<CallLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [transcript, setTranscript] = useState<string>('');
  const [recordingUrl, setRecordingUrl] = useState<string>('');
  const callsPerPage = 20;

  useEffect(() => {
    if (user) {
      loadCalls();
      setupRealtimeSubscriptions();
    }
  }, [user, currentPage, filters]);

  const loadCalls = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const history = await ApiService.getCallHistory(user.id, currentPage, callsPerPage, filters);
      setCallHistory(history);
    } catch (error) {
      console.error('Error loading calls:', error);
      toast.error('Failed to load call history');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    const subscription = RealtimeService.subscribeToCallUpdates(
      user.id,
      (updatedCall) => {
        setCallHistory(prev => {
          if (!prev) return prev;
          
          const updatedCalls = prev.calls.map(call => 
            call.id === updatedCall.id ? updatedCall : call
          );
          
          return { ...prev, calls: updatedCalls };
        });
      },
      (newCall) => {
        // Refresh the current page to show new calls
        if (currentPage === 1) {
          loadCalls();
        }
      },
      (callId) => {
        setCallHistory(prev => {
          if (!prev) return prev;
          
          const filteredCalls = prev.calls.filter(call => call.id !== callId);
          
          return { ...prev, calls: filteredCalls, total: prev.total - 1 };
        });
      }
    );

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  };

  const handleExportCalls = async () => {
    try {
      const blob = await ApiService.exportCallHistory(user!.id, filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `call-history-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Call history exported successfully');
    } catch (error) {
      console.error('Error exporting calls:', error);
      toast.error('Failed to export call history');
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'abandoned': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="h-4 w-4" />;
      case 'failed': return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'in_progress': return <PlayIcon className="h-4 w-4" />;
      case 'abandoned': return <ClockIcon className="h-4 w-4" />;
      default: return null;
    }
  };

  const handleViewTranscript = async (call: CallLog) => {
    try {
      const callTranscript = await ApiService.getCallTranscript(call.id);
      if (callTranscript) {
        setTranscript(callTranscript);
        setSelectedCall(call);
        setShowTranscript(true);
      } else {
        toast.error('No transcript available for this call');
      }
    } catch (error) {
      console.error('Error loading transcript:', error);
      toast.error('Failed to load transcript');
    }
  };

  const handlePlayRecording = async (call: CallLog) => {
    try {
      const recording = await ApiService.getCallRecording(call.id);
      if (recording) {
        setRecordingUrl(recording);
        setCurrentRecording(call);
        setShowRecordingPlayer(true);
      } else {
        toast.error('No recording available for this call');
      }
    } catch (error) {
      console.error('Error loading recording:', error);
      toast.error('Failed to load recording');
    }
  };

  const handleDownloadRecording = async (call: CallLog) => {
    try {
      const recording = await ApiService.getCallRecording(call.id);
      if (!recording) {
        toast.error('No recording available for this call');
        return;
      }

      // Create a temporary link to download the recording
      const link = document.createElement('a');
      link.href = recording;
      link.download = `call-recording-${call.id}-${new Date(call.started_at).toISOString().split('T')[0]}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Recording download started');
    } catch (error) {
      console.error('Error downloading recording:', error);
      toast.error('Failed to download recording');
    }
  };

  const handleFilterChange = (key: keyof CallHistoryFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setFilters({
      direction: 'all',
      status: 'all',
      searchTerm: ''
    });
    setCurrentPage(1);
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!callHistory) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <PhoneIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No call history available</h3>
          <p className="mt-1 text-sm text-gray-500">Unable to load call history data.</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(callHistory.total / callsPerPage);

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Call History</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and manage all your AI call center interactions. 
            <span className="font-medium text-gray-900"> {callHistory.total} total calls</span>
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <XMarkIcon className="h-4 w-4 mr-2" />
            Clear Filters
          </button>
          <button
            onClick={handleExportCalls}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                placeholder="Search phone numbers, summaries..."
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
            <select
              value={filters.direction}
              onChange={(e) => handleFilterChange('direction', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Directions</option>
              <option value="inbound">Inbound Only</option>
              <option value="outbound">Outbound Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="failed">Failed</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={filters.dateRange || 'all'}
              onChange={(e) => handleFilterChange('dateRange', e.target.value === 'all' ? undefined : e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Direction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Summary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {callHistory.calls.map((call) => (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 font-mono">
                          {call.direction === 'inbound' ? call.phone_number_from : call.phone_number_to}
                        </div>
                        {call.direction === 'outbound' && call.outbound_campaigns && (
                          <div className="text-sm text-gray-500">
                            Campaign: {call.outbound_campaigns.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      call.direction === 'inbound' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {call.direction}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                      {getStatusIcon(call.status)}
                      <span className="ml-1">{call.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDuration(call.duration_seconds)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{new Date(call.started_at).toLocaleDateString()}</div>
                    <div className="text-xs">{formatTimeAgo(call.started_at)}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    <div className="truncate">
                      {call.call_summary || call.outcome || 'No summary available'}
                    </div>
                    {call.sentiment_score && (
                      <div className="text-xs mt-1">
                        Sentiment: {(call.sentiment_score * 100).toFixed(0)}%
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {call.transcript && (
                        <button
                          onClick={() => handleViewTranscript(call)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                        </button>
                      )}
                      {call.recording_url && (
                        <>
                          <button 
                            onClick={() => handlePlayRecording(call)}
                            className="text-green-600 hover:text-green-900"
                            title="Play recording"
                          >
                            <PlayIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDownloadRecording(call)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Download recording"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {callHistory.calls.length === 0 && (
        <div className="text-center py-12">
          <PhoneIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No calls found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.searchTerm || filters.direction !== 'all' || filters.status !== 'all'
              ? 'No calls match your current filters.'
              : 'No calls have been made yet.'
            }
          </p>
        </div>
      )}

      {/* Pagination */}
      {callHistory.total > callsPerPage && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{(currentPage - 1) * callsPerPage + 1}</span>
                {' '}to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * callsPerPage, callHistory.total)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{callHistory.total}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  <span className="sr-only">Previous</span>
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        pageNum === currentPage
                          ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Modal */}
      {showTranscript && selectedCall && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Call Transcript - {selectedCall.phone_number_from}
                </h3>
                <button
                  onClick={() => setShowTranscript(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Duration:</span> {formatDuration(selectedCall.duration_seconds)}
                  </div>
                  <div>
                    <span className="font-medium">Started:</span> {new Date(selectedCall.started_at).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {selectedCall.status}
                  </div>
                  <div>
                    <span className="font-medium">Direction:</span> {selectedCall.direction}
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <div className="prose max-w-none">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Transcript:</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-4 border rounded-lg">
                    {transcript || 'No transcript available for this call.'}
                  </div>
                  
                  {selectedCall.call_summary && (
                    <>
                      <h4 className="text-sm font-medium text-gray-900 mb-2 mt-4">Summary:</h4>
                      <div className="text-sm text-gray-700 bg-blue-50 p-4 border border-blue-200 rounded-lg">
                        {selectedCall.call_summary}
                      </div>
                    </>
                  )}

                  {selectedCall.outcome && (
                    <>
                      <h4 className="text-sm font-medium text-gray-900 mb-2 mt-4">Outcome:</h4>
                      <div className="text-sm text-gray-700 bg-green-50 p-4 border border-green-200 rounded-lg">
                        {selectedCall.outcome}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recording Player Modal */}
      {showRecordingPlayer && currentRecording && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Call Recording - {currentRecording.phone_number_from}
                </h3>
                <button
                  onClick={() => setShowRecordingPlayer(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Duration:</span> {formatDuration(currentRecording.duration_seconds)}
                  </div>
                  <div>
                    <span className="font-medium">Started:</span> {new Date(currentRecording.started_at).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Direction:</span> {currentRecording.direction}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {currentRecording.status}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white p-4 border rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Audio Player:</h4>
                  {recordingUrl ? (
                    <div className="space-y-3">
                      <audio 
                        controls 
                        className="w-full"
                        preload="metadata"
                      >
                        <source src={recordingUrl} type="audio/mpeg" />
                        <source src={recordingUrl} type="audio/wav" />
                        <source src={recordingUrl} type="audio/mp3" />
                        Your browser does not support the audio element.
                      </audio>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDownloadRecording(currentRecording)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                          Download Recording
                        </button>
                        
                        <a
                          href={recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Open in New Tab
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No recording available for this call.
                    </div>
                  )}
                </div>

                {currentRecording.call_summary && (
                  <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Call Summary:</h4>
                    <div className="text-sm text-gray-700">
                      {currentRecording.call_summary}
                    </div>
                  </div>
                )}

                {currentRecording.outcome && (
                  <div className="bg-green-50 p-4 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Call Outcome:</h4>
                    <div className="text-sm text-gray-700">
                      {currentRecording.outcome}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}