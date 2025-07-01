import { useState, useEffect, useCallback } from 'react';
import { 
  PhoneIcon, 
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  StopIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import { useUser, usePermissions } from '../contexts/UserContext';
import { ApiService, type DashboardMetrics } from '../services/api';
import { RealtimeService } from '../services/realtime';
import UsageTracker from '../components/UsageTracker';
import type { CallLog, ActiveCall } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useUser();
  const { canUseInbound } = usePermissions();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  useEffect(() => {
    if (user) {
      loadDashboardData();
      setupRealtimeSubscriptions();
      
      // Set up periodic refresh for real-time updates
      const interval = setInterval(() => {
        refreshDashboardData();
      }, 30000); // Refresh every 30 seconds

      return () => {
        clearInterval(interval);
        RealtimeService.disconnect();
      };
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const dashboardMetrics = await ApiService.getDashboardMetrics(user.id);
      setMetrics(dashboardMetrics);
      setLastUpdate(new Date().toISOString());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboardData = async () => {
    if (!user || refreshing) return;

    try {
      setRefreshing(true);
      const updates = await ApiService.getDashboardUpdates(user.id, lastUpdate);
      
      if (updates && Object.keys(updates).length > 0) {
        setMetrics(prev => prev ? { ...prev, ...updates } : null);
        setLastUpdate(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
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
        setMetrics(prev => {
          if (!prev) return prev;
          
          // Update recent calls
          const updatedRecentCalls = prev.recentCalls.map(call => 
            call.id === updatedCall.id ? updatedCall : call
          );
          
          // Update active calls
          let updatedActiveCalls = [...prev.activeCallsList];
          if (updatedCall.status === 'in_progress') {
            const existingIndex = updatedActiveCalls.findIndex(call => call.id === updatedCall.id);
            if (existingIndex >= 0) {
              updatedActiveCalls[existingIndex] = updatedCall as ActiveCall;
            } else {
              updatedActiveCalls.push(updatedCall as ActiveCall);
            }
          } else {
            updatedActiveCalls = updatedActiveCalls.filter(call => call.id !== updatedCall.id);
          }

          return {
            ...prev,
            recentCalls: updatedRecentCalls,
            activeCallsList: updatedActiveCalls,
            activeCalls: updatedActiveCalls.length
          };
        });
      },
      (newCall) => {
        setMetrics(prev => {
          if (!prev) return prev;
          
          const updatedRecentCalls = [newCall, ...prev.recentCalls.slice(0, 9)];
          let updatedActiveCalls = [...prev.activeCallsList];
          
          if (newCall.status === 'in_progress') {
            updatedActiveCalls.push(newCall as ActiveCall);
          }

          return {
            ...prev,
            recentCalls: updatedRecentCalls,
            activeCallsList: updatedActiveCalls,
            activeCalls: updatedActiveCalls.length
          };
        });
      },
      (callId) => {
        setMetrics(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            recentCalls: prev.recentCalls.filter(call => call.id !== callId),
            activeCallsList: prev.activeCallsList.filter(call => call.id !== callId),
            activeCalls: prev.activeCallsList.filter(call => call.id !== callId).length
          };
        });
      }
    );

    // Subscribe to system events
    const systemSubscription = RealtimeService.subscribeToSystemEvents(
      user.id,
      (event) => {
        if (event.type === 'system_alert') {
          toast.error(event.data.message);
        }
        setConnectionStatus('connected');
      }
    );

    setConnectionStatus('connected');

    return () => {
      callSubscription.unsubscribe();
      systemSubscription.unsubscribe();
      setConnectionStatus('disconnected');
    };
  }, [user]);



  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
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
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'abandoned':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-3 w-3 mr-1" />;
      case 'in_progress':
        return <PlayIcon className="h-3 w-3 mr-1" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  const handleManualRefresh = async () => {
    await loadDashboardData();
    toast.success('Dashboard refreshed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
          <p className="mt-1 text-sm text-gray-500">Unable to load dashboard metrics.</p>
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

  const stats = [
    { 
      name: 'Active Calls', 
      value: metrics.activeCalls.toString(), 
      icon: PhoneIcon, 
      color: 'text-green-500',
      trend: metrics.activeCalls > 0 ? 'up' : 'stable'
    },
    { 
      name: 'Total Calls Today', 
      value: metrics.totalCallsToday.toString(), 
      icon: UserGroupIcon, 
      color: 'text-blue-500',
      trend: 'stable'
    },
    { 
      name: 'Success Rate', 
      value: `${metrics.successRate}%`, 
      icon: CheckCircleIcon, 
      color: 'text-emerald-500',
      trend: metrics.successRate >= 80 ? 'up' : metrics.successRate >= 60 ? 'stable' : 'down'
    },
    { 
      name: 'Avg Duration', 
      value: formatDuration(metrics.avgDuration), 
      icon: ClockIcon, 
      color: 'text-purple-500',
      trend: 'stable'
    },
  ];

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
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

  return (
    <div className="space-y-8">
      {/* Header with real-time status */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center mt-1 space-x-4">
            <div className="flex items-center">
              <SignalIcon className={`h-4 w-4 mr-1 ${getConnectionStatusColor(connectionStatus)}`} />
              <span className={`text-sm ${getConnectionStatusColor(connectionStatus)}`}>
                {connectionStatus === 'connected' ? 'Live' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
              </span>
            </div>
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSystemHealthColor(metrics.systemHealth)}`}>
              System: {metrics.systemHealth}
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-slate-600">{stat.name}</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  {stat.trend && (
                    <span className={`ml-2 text-xs ${
                      stat.trend === 'up' ? 'text-green-600' : 
                      stat.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {stat.trend === 'up' ? '↗' : stat.trend === 'down' ? '↘' : '→'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Tracker */}
      <UsageTracker />

      {/* Active Calls */}
      {canUseInbound && metrics.activeCallsList.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Active Calls</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {metrics.activeCallsList.length} active
            </span>
          </div>
          <div className="space-y-4">
            {metrics.activeCallsList.map((call) => (
              <div key={call.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        call.direction === 'inbound' ? 'bg-blue-500' : 'bg-green-500'
                      } animate-pulse`}></div>
                      <p className="font-medium text-slate-900">
                        {call.direction === 'inbound' ? call.phone_number_from : call.phone_number_to}
                      </p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-slate-500">
                      <div>
                        <span className="font-medium">Duration:</span> {formatDuration(call.duration_seconds)}
                      </div>
                      <div>
                        <span className="font-medium">Agent:</span> {call.agent_name || 'Unknown'}
                      </div>
                      <div>
                        <span className="font-medium">Quality:</span> 
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                          call.call_quality === 'excellent' ? 'bg-green-100 text-green-800' :
                          call.call_quality === 'good' ? 'bg-blue-100 text-blue-800' :
                          call.call_quality === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {call.call_quality}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Direction:</span> {call.direction}
                      </div>
                    </div>
                    {call.call_summary && (
                      <p className="mt-2 text-sm text-slate-600 italic">
                        "{call.call_summary}"
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <PlayIcon className="h-3 w-3 mr-1" />
                      Live
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Calls */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Recent Calls</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-500">
              Last updated: {new Date(lastUpdate).toLocaleTimeString()}
            </span>
            <ChartBarIcon className="h-5 w-5 text-slate-400" />
          </div>
        </div>
        <div className="overflow-hidden">
          {metrics.recentCalls.length > 0 ? (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Summary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {metrics.recentCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${
                          call.direction === 'inbound' ? 'bg-blue-500' : 'bg-green-500'
                        }`}></div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 font-mono">
                            {call.direction === 'inbound' ? call.phone_number_from : call.phone_number_to}
                          </div>
                          {(call as any).ai_agents?.name && (
                            <div className="text-xs text-slate-500">
                              Agent: {(call as any).ai_agents.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        call.direction === 'inbound' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatDuration(call.duration_seconds)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs">
                      <div className="truncate">
                        {call.call_summary || call.outcome || 'No summary available'}
                      </div>
                      {call.sentiment_score && (
                        <div className="text-xs mt-1">
                          Sentiment: {(call.sentiment_score * 100).toFixed(0)}%
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div>{new Date(call.started_at).toLocaleDateString()}</div>
                      <div className="text-xs">{formatTimeAgo(call.started_at)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <PhoneIcon className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No calls yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Start your AI server to begin receiving calls.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}