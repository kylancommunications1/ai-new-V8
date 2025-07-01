import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowArrowTrendingUpIcon,
  ArrowArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { ApiService, type AnalyticsMetrics } from '../services/api';
import { RealtimeService } from '../services/realtime';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadAnalytics();
      setupRealtimeSubscriptions();
      
      // Set up periodic refresh
      const interval = setInterval(() => {
        refreshAnalytics();
      }, 60000); // Refresh every minute

      return () => {
        clearInterval(interval);
        RealtimeService.disconnect();
      };
    }
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const analyticsData = await ApiService.getAnalyticsData(user.id, timeRange);
      setAnalytics(analyticsData);
      setLastUpdate(new Date().toISOString());
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalytics = async () => {
    if (!user || refreshing) return;

    try {
      setRefreshing(true);
      const updates = await ApiService.getAnalyticsUpdates(user.id, lastUpdate);
      
      if (updates && Object.keys(updates).length > 0) {
        setAnalytics(prev => prev ? { ...prev, ...updates } : null);
        setLastUpdate(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error refreshing analytics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to call updates for real-time analytics
    const callSubscription = RealtimeService.subscribeToCallUpdates(
      user.id,
      () => {
        // Refresh analytics when calls are updated
        refreshAnalytics();
      },
      () => {
        // Refresh analytics when new calls are added
        refreshAnalytics();
      }
    );

    return () => {
      callSubscription.unsubscribe();
    };
  };

  const handleManualRefresh = async () => {
    await loadAnalytics();
    toast.success('Analytics refreshed');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data available</h3>
          <p className="mt-1 text-sm text-gray-500">Unable to load analytics data.</p>
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
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <div className="flex items-center mt-2 space-x-4">
            <p className="text-sm text-gray-700">
              Track your AI call center performance and insights.
            </p>
            <span className="text-xs text-gray-500">
              Last updated: {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📞</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Calls</dt>
                  <dd className="flex items-center">
                    <span className="text-lg font-medium text-gray-900">{analytics.totalCalls}</span>
                    {analytics.totalCalls > 0 && (
                      <ArrowTrendingUpIcon className="ml-2 h-4 w-4 text-green-500" />
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-green-600 font-medium">{analytics.successfulCalls}</span>
              <span className="text-gray-500"> successful</span>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">✅</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                  <dd className="flex items-center">
                    <span className="text-lg font-medium text-gray-900">{analytics.successRate.toFixed(1)}%</span>
                    {analytics.successRate >= 80 ? (
                      <ArrowTrendingUpIcon className="ml-2 h-4 w-4 text-green-500" />
                    ) : analytics.successRate >= 60 ? (
                      <span className="ml-2 h-4 w-4 text-yellow-500">→</span>
                    ) : (
                      <ArrowTrendingDownIcon className="ml-2 h-4 w-4 text-red-500" />
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className={`font-medium ${
                analytics.successRate >= 80 ? 'text-green-600' :
                analytics.successRate >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {analytics.successRate >= 80 ? 'Excellent' :
                 analytics.successRate >= 60 ? 'Good' : 'Needs improvement'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <ClockIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Duration</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {Math.floor(analytics.averageCallDuration / 60)}m {Math.round(analytics.averageCallDuration % 60)}s
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-500">
                {analytics.averageCallDuration > 180 ? 'Long calls' :
                 analytics.averageCallDuration > 60 ? 'Normal' : 'Quick calls'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">💰</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Cost per Call</dt>
                  <dd className="text-lg font-medium text-gray-900">${analytics.costPerCall.toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-500">
                ${(analytics.costPerCall * analytics.totalCalls).toFixed(2)} total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Volume Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Call Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.callVolumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="calls" fill="#3B82F6" name="Total Calls" />
              <Bar dataKey="successful" fill="#10B981" name="Successful" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Trend */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Success Rate Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="successRate" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.3}
                name="Success Rate %" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Call Outcomes */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Call Outcomes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.callOutcomeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.callOutcomeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Performing Scripts */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Agents</h3>
          <div className="space-y-4">
            {analytics.topScripts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No agent performance data available yet</p>
              </div>
            ) : (
              analytics.topScripts.map((script, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{script.name}</p>
                    <p className="text-sm text-gray-500">{script.total_calls} calls handled</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{script.success_rate.toFixed(1)}%</p>
                    <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${script.success_rate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Call Distribution by Hour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.hourlyDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="calls" fill="#8B5CF6" name="Calls" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Performance Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="calls" fill="#06B6D4" name="Calls" />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="success_rate" 
                stroke="#F59E0B" 
                strokeWidth={2}
                name="Success Rate %" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}