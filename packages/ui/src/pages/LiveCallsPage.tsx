import { useState, useEffect, useCallback } from 'react';
import { 
  PhoneIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  SignalIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { ApiService, type LiveCallsData } from '../services/api';
import { RealtimeService } from '../services/realtime';
import type { AIAgent, CallLog, ActiveCall, SystemMetrics, AgentStatus } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function LiveCallsPage() {
  const { user } = useUser();
  const [liveData, setLiveData] = useState<LiveCallsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [selectedCall, setSelectedCall] = useState<ActiveCall | null>(null);
  const [showCallDetails, setShowCallDetails] = useState(false);

  useEffect(() => {
    if (user) {
      loadLiveData();
      setupRealtimeSubscriptions();
      
      // Set up periodic refresh for real-time updates
      const interval = setInterval(() => {
        refreshLiveData();
      }, 10000); // Refresh every 10 seconds for live calls

      return () => {
        clearInterval(interval);
        RealtimeService.disconnect();
      };
    }
  }, [user]);

  const loadLiveData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await ApiService.getLiveCallsData(user.id);
      setLiveData(data);
    } catch (error) {
      console.error('Error loading live data:', error);
      toast.error('Failed to load live call data');
    } finally {
      setLoading(false);
    }
  };

  const refreshLiveData = async () => {
    if (!user || refreshing) return;

    try {
      setRefreshing(true);
      const data = await ApiService.getLiveCallsData(user.id);
      setLiveData(data);
    } catch (error) {
      console.error('Error refreshing live data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const setupRealtimeSubscriptions = useCallback(() => {
    if (!user) return;

    setConnectionStatus('connecting');

    // Subscribe to call updates
    const callSubscription = RealtimeService.subscribeToCallUpdates(
      user.id,
      (updatedCall) => {
        setLiveData(prev => {
          if (!prev) return prev;
          
          const updatedActiveCalls = prev.activeCalls.map(call => 
            call.id === updatedCall.id ? { ...call, ...updatedCall } as ActiveCall : call
          );
          
          return {
            ...prev,
            activeCalls: updatedActiveCalls,
            systemMetrics: {
              ...prev.systemMetrics,
              total_active_calls: updatedActiveCalls.length
            }
          };
        });
      },
      (newCall) => {
        if (newCall.status === 'in_progress') {
          setLiveData(prev => {
            if (!prev) return prev;
            
            const newActiveCall = newCall as ActiveCall;
            const updatedActiveCalls = [...prev.activeCalls, newActiveCall];
            
            return {
              ...prev,
              activeCalls: updatedActiveCalls,
              systemMetrics: {
                ...prev.systemMetrics,
                total_active_calls: updatedActiveCalls.length
              }
            };
          });
        }
      },
      (callId) => {
        setLiveData(prev => {
          if (!prev) return prev;
          
          const updatedActiveCalls = prev.activeCalls.filter(call => call.id !== callId);
          const updatedCallQueue = prev.callQueue.filter(call => call.id !== callId);
          
          return {
            ...prev,
            activeCalls: updatedActiveCalls,
            callQueue: updatedCallQueue,
            systemMetrics: {
              ...prev.systemMetrics,
              total_active_calls: updatedActiveCalls.length,
              total_queued_calls: updatedCallQueue.length
            }
          };
        });
      }
    );

    // Subscribe to agent status updates
    const agentSubscription = RealtimeService.subscribeToAgentUpdates(
      user.id,
      (updatedAgent) => {
        setLiveData(prev => {
          if (!prev) return prev;
          
          const updatedAgentStatuses = prev.agentStatuses.map(agent => 
            agent.id === updatedAgent.id ? { ...agent, ...updatedAgent } : agent
          );
          
          return {
            ...prev,
            agentStatuses: updatedAgentStatuses
          };
        });
      },
      (newAgent) => {
        setLiveData(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            agentStatuses: [...prev.agentStatuses, newAgent as AgentStatus]
          };
        });
      },
      (agentId) => {
        setLiveData(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            agentStatuses: prev.agentStatuses.filter(agent => agent.id !== agentId)
          };
        });
      }
    );

    // Subscribe to system events
    const systemSubscription = RealtimeService.subscribeToSystemEvents(
      user.id,
      (event) => {
        if (event.type === 'emergency_stop') {
          toast.error('Emergency stop activated - all calls terminated');
          refreshLiveData();
        }
        setConnectionStatus('connected');
      }
    );

    setConnectionStatus('connected');

    return () => {
      callSubscription.unsubscribe();
      agentSubscription.unsubscribe();
      systemSubscription.unsubscribe();
      setConnectionStatus('disconnected');
    };
  }, [user]);

  const handleEmergencyStop = async () => {
    if (!confirm('Are you sure you want to stop ALL active calls? This action cannot be undone.')) {
      return;
    }

    try {
      await ApiService.emergencyStopAllCalls(user!.id);
      toast.success('All calls stopped successfully');
      await refreshLiveData();
    } catch (error) {
      console.error('Error stopping calls:', error);
      toast.error('Failed to stop calls');
    }
  };

  const handleToggleAgent = async (agentId: string, isActive: boolean) => {
    try {
      await ApiService.toggleAgentStatus(agentId, !isActive);
      toast.success(`Agent ${!isActive ? 'activated' : 'deactivated'} successfully`);
      await refreshLiveData();
    } catch (error) {
      console.error('Error toggling agent:', error);
      toast.error('Failed to toggle agent');
    }
  };

  const handleViewCallDetails = (call: ActiveCall) => {
    setSelectedCall(call);
    setShowCallDetails(true);
  };

  const handleManualRefresh = async () => {
    await loadLiveData();
    toast.success('Live data refreshed');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ${seconds % 60}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'busy': return 'text-yellow-600 bg-yellow-100';
      case 'offline': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'normal': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!liveData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No live data available</h3>
          <p className="mt-1 text-sm text-gray-500">Unable to load live call monitoring data.</p>
          <button
            onClick={handleManualRefresh}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Call Monitoring</h1>
          <div className="flex items-center mt-1 space-x-4">
            <p className="text-gray-600">Real-time view of active calls and system status</p>
            <div className="flex items-center">
              <SignalIcon className={`h-4 w-4 mr-1 ${getConnectionStatusColor(connectionStatus)}`} />
              <span className={`text-sm ${getConnectionStatusColor(connectionStatus)}`}>
                {connectionStatus === 'connected' ? 'Live' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 inline mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleEmergencyStop}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <StopIcon className="h-5 w-5 inline mr-2" />
            Emergency Stop
          </button>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <PhoneIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Calls</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-gray-900">{liveData.systemMetrics.total_active_calls}</p>
                {liveData.systemMetrics.total_active_calls > 0 && (
                  <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Queued Calls</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-gray-900">{liveData.systemMetrics.total_queued_calls}</p>
                {liveData.systemMetrics.total_queued_calls > 0 && (
                  <span className="ml-2 text-xs text-yellow-600">waiting</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <SignalIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
              <p className="text-2xl font-bold text-gray-900">{formatWaitTime(Math.round(liveData.systemMetrics.average_wait_time))}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              liveData.systemMetrics.system_health === 'healthy' ? 'bg-green-100' :
              liveData.systemMetrics.system_health === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              {liveData.systemMetrics.system_health === 'healthy' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">System Health</p>
              <div className="flex items-center">
                <p className={`text-lg font-bold capitalize ${getHealthColor(liveData.systemMetrics.system_health)}`}>
                  {liveData.systemMetrics.system_health}
                </p>
                <span className="ml-2 text-xs text-gray-500">
                  {liveData.systemMetrics.uptime_percentage}% uptime
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Calls */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Active Calls ({liveData.activeCalls.length})</h2>
            {liveData.activeCalls.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                Live
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {liveData.activeCalls.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <PhoneIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p>No active calls</p>
              </div>
            ) : (
              liveData.activeCalls.map((call) => (
                <div key={call.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-3 h-3 rounded-full animate-pulse ${
                        call.direction === 'inbound' ? 'bg-blue-500' : 'bg-green-500'
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 font-mono">
                            {call.direction === 'inbound' ? call.phone_number_from : call.phone_number_to}
                          </p>
                          <button
                            onClick={() => handleViewCallDetails(call)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="View call details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span>{call.direction === 'inbound' ? 'Inbound' : 'Outbound'}</span>
                          <span>•</span>
                          <span>{call.agent_name || 'Unknown Agent'}</span>
                          <span>•</span>
                          <span className="font-medium">{formatDuration(call.duration_seconds)}</span>
                        </div>
                        {call.call_summary && (
                          <p className="text-xs text-gray-600 mt-1 italic truncate">
                            "{call.call_summary}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1 ml-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        call.call_quality === 'excellent' ? 'text-green-600 bg-green-100' :
                        call.call_quality === 'good' ? 'text-blue-600 bg-blue-100' :
                        call.call_quality === 'fair' ? 'text-yellow-600 bg-yellow-100' :
                        'text-red-600 bg-red-100'
                      }`}>
                        {call.call_quality}
                      </span>
                      <button
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Listen to call"
                      >
                        <SpeakerWaveIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agent Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Agent Status ({liveData.agentStatuses.length})</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {liveData.agentStatuses.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <UserIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p>No agents configured</p>
              </div>
            ) : (
              liveData.agentStatuses.map((agent) => (
                <div key={agent.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="relative">
                        <UserIcon className="h-8 w-8 text-gray-400" />
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                          agent.status === 'available' ? 'bg-green-500' :
                          agent.status === 'busy' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(agent.status)}`}>
                            {agent.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span>{agent.agent_type}</span>
                          <span>•</span>
                          <span>{agent.voice_name}</span>
                          <span>•</span>
                          <span>{agent.current_calls}/{agent.max_concurrent_calls} calls</span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span>Today: {agent.calls_today} calls</span>
                          <span>•</span>
                          <span>Avg: {Math.round(agent.avg_call_duration)}s</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      <button
                        onClick={() => handleToggleAgent(agent.id, agent.is_active)}
                        className={`p-2 rounded-lg transition-colors ${
                          agent.is_active 
                            ? 'text-red-600 hover:bg-red-100' 
                            : 'text-green-600 hover:bg-green-100'
                        }`}
                        title={agent.is_active ? 'Deactivate agent' : 'Activate agent'}
                      >
                        {agent.is_active ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Call Queue */}
      {liveData.callQueue.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Call Queue ({liveData.callQueue.length})</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {liveData.callQueue.map((queueItem) => (
              <div key={queueItem.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ClockIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 font-mono">
                        {queueItem.phone_number_to}
                      </p>
                      <p className="text-xs text-gray-500">
                        {queueItem.agent_id ? `Assigned to agent` : 'Any available agent'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(queueItem.priority)}`}>
                      {queueItem.priority}
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Waiting: {formatWaitTime(Math.floor((new Date().getTime() - new Date(queueItem.created_at).getTime()) / 1000))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call Details Modal */}
      {showCallDetails && selectedCall && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Call Details</h3>
                <button
                  onClick={() => setShowCallDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  <p className="text-sm text-gray-900 font-mono">
                    {selectedCall.direction === 'inbound' ? selectedCall.phone_number_from : selectedCall.phone_number_to}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Direction</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedCall.direction}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Duration</label>
                  <p className="text-sm text-gray-900">{formatDuration(selectedCall.duration_seconds)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Agent</label>
                  <p className="text-sm text-gray-900">{selectedCall.agent_name || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Quality</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedCall.call_quality}</p>
                </div>
                {selectedCall.call_summary && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Summary</label>
                    <p className="text-sm text-gray-900">{selectedCall.call_summary}</p>
                  </div>
                )}
                {selectedCall.sentiment_score && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Sentiment</label>
                    <p className="text-sm text-gray-900">{(selectedCall.sentiment_score * 100).toFixed(0)}%</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowCallDetails(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}