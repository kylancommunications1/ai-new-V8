import { useState, useEffect } from 'react';
import { 
  CreditCardIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { ApiService, type BillingData } from '../services/api';
import toast from 'react-hot-toast';

const PLANS = [
  {
    id: 'starter',
    name: '🚀 Starter',
    price: 29,
    interval: 'month',
    features: [
      '100 minutes of AI Voice Calling',
      'Inbound Call Handling',
      'Up to 5 Team Members',
      'Basic CRM (Contacts & Notes)',
      'SMS & Email Templates',
      'Community Access',
      '💬 Extra Voice Minutes: $0.18/min',
      '📨 SMS Credits (~1,200 msgs): $10'
    ],
    limits: {
      minutes: 100,
      agents: 5,
      concurrent_calls: 5
    },
    description: 'Built for solopreneurs and new teams.'
  },
  {
    id: 'grow',
    name: '🌱 Grow',
    price: 79,
    interval: 'month',
    features: [
      '250 minutes of AI Voice Calling',
      'Inbound & Outbound Calling',
      'Up to 10 Team Members',
      'Shared Call Logs & CRM',
      'SMS & Email Templates',
      'Affiliate Program Access (15%)',
      '💬 Extra Voice Minutes: $0.18/min',
      '📨 SMS Credits (~1,200 msgs): $10'
    ],
    limits: {
      minutes: 250,
      agents: 10,
      concurrent_calls: 10
    },
    description: 'For small teams starting to scale.',
    popular: true
  },
  {
    id: 'pro',
    name: '⚡️ Pro',
    price: 249,
    interval: 'month',
    features: [
      '600 minutes of AI Voice Calling',
      'Inbound & Outbound Calling',
      'Up to 25 Team Members',
      'Smart CRM',
      'SMS & Email Templates',
      'Light Workflow Automation',
      'Affiliate Boost (20%)',
      '💬 Extra Voice Minutes: $0.18/min',
      '📨 SMS Credits (~1,200 msgs): $10'
    ],
    limits: {
      minutes: 600,
      agents: 25,
      concurrent_calls: 25
    },
    description: 'Great for fast-growing service businesses.'
  },
  {
    id: 'scale',
    name: '🏆 Scale',
    price: 449,
    interval: 'month',
    features: [
      '1800 minutes of AI Voice Calling',
      'Inbound & Outbound Calling',
      'Up to 50 Team Members',
      'CRM + Tags & Pipelines',
      'Email Broadcasts (Basic)',
      'Affiliate Boost (25%)',
      'Priority Support',
      '💬 Extra Voice Minutes: $0.18/min',
      '📨 SMS Credits (~1,200 msgs): $10'
    ],
    limits: {
      minutes: 1800,
      agents: 50,
      concurrent_calls: 50
    },
    description: 'Designed for agencies and teams with high call volume.'
  }
];

export default function BillingPage() {
  const { user } = useUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [, ] = useState<string | null>(null);

  // Debug user data
  console.log('BillingPage - User data:', user);

  useEffect(() => {
    if (user) {
      loadBillingData();
    }
  }, [user]);

  const loadBillingData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [subscriptionData, usageData] = await Promise.all([
        DatabaseService.getSubscription(user.id),
        DatabaseService.getUsageRecords(user.id)
      ]);
      setSubscription(subscriptionData);
      setUsageRecords(usageData);
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (!user) return;

    setUpgradeLoading(planId);
    try {
      // In a real implementation, this would create a Stripe checkout session
      const checkoutUrl = await DatabaseService.createCheckoutSession(user.id, planId);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start upgrade process');
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription || !confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    try {
      await DatabaseService.cancelSubscription(subscription.id);
      toast.success('Subscription cancelled successfully');
      loadBillingData();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription');
    }
  };

  const getCurrentPlan = () => {
    const planName = subscription?.plan_name || user?.plan_name || 'free';
    console.log('BillingPage Debug:', {
      subscription: subscription,
      user: user,
      planName: planName,
      availablePlans: PLANS.map(p => p.id)
    });
    return PLANS.find(plan => plan.id === planName);
  };

  const calculateUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const currentPlan = getCurrentPlan();
  const currentUsage = user?.minutes_used || 0;
  const usagePercentage = currentPlan ? calculateUsagePercentage(currentUsage, currentPlan.limits.minutes) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Billing & Subscription</h1>
        <p className="mt-2 text-sm text-gray-700">
          Manage your subscription, view usage, and billing history.
        </p>
      </div>

      {/* Current Plan & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Current Plan</h3>
            {subscription?.status === 'active' && (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                Active
              </span>
            )}
          </div>
          
          {currentPlan ? (
            <div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">{currentPlan.name}</span>
                {currentPlan.price > 0 && (
                  <span className="ml-2 text-lg text-gray-500">
                    {formatCurrency(currentPlan.price)}/{currentPlan.interval}
                  </span>
                )}
              </div>
              
              {subscription?.current_period_end && (
                <p className="text-sm text-gray-500 mt-2">
                  {subscription.cancel_at_period_end ? 'Cancels' : 'Renews'} on{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}

              <div className="mt-4 space-y-2">
                {currentPlan.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    {feature}
                  </div>
                ))}
              </div>

              {currentPlan.id !== 'scale' && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowUpIcon className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No active plan found</p>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Choose a Plan
              </button>
            </div>
          )}
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Usage This Month</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Minutes Used</span>
                <span className="font-medium">
                  {currentUsage.toLocaleString()} / {currentPlan?.limits.minutes === -1 ? '∞' : currentPlan?.limits.minutes.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                ></div>
              </div>
              {usagePercentage > 90 && (
                <p className="text-xs text-red-600 mt-1">
                  <ExclamationTriangleIcon className="h-3 w-3 inline mr-1" />
                  Approaching usage limit
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <div className="text-2xl font-bold text-gray-900">{user?.minutes_used || 0}</div>
                <div className="text-xs text-gray-500">Total Calls</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round((user?.minutes_used || 0) / 60 * 100) / 100}h
                </div>
                <div className="text-xs text-gray-500">Total Hours</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Billing History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usageRecords.length > 0 ? (
                usageRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {currentPlan?.name} Plan - {record.usage_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(record.total_cost || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Paid
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">
                        <DocumentTextIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No billing history available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Method */}
      {subscription && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Payment Method</h3>
            <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
              Update
            </button>
          </div>
          
          <div className="flex items-center">
            <CreditCardIcon className="h-8 w-8 text-gray-400 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-900">•••• •••• •••• 4242</div>
              <div className="text-sm text-gray-500">Expires 12/25</div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Management */}
      {subscription && subscription.status === 'active' && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Management</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Cancel Subscription</h4>
                <p className="text-sm text-gray-500">
                  Your subscription will remain active until the end of the current billing period.
                </p>
              </div>
              <button
                onClick={handleCancelSubscription}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Choose Your Plan</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative rounded-lg border-2 p-6 ${
                      plan.popular
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-500 text-white">
                          Most Popular
                        </span>
                      </div>
                    )}
                    
                    <div className="text-center">
                      <h4 className="text-lg font-medium text-gray-900">{plan.name}</h4>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-gray-900">
                          {plan.price === 0 ? 'Free' : formatCurrency(plan.price)}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-gray-500">/{plan.interval}</span>
                        )}
                      </div>
                    </div>

                    <ul className="mt-4 space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgradeLoading === plan.id || currentPlan?.id === plan.id}
                      className={`mt-6 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium ${
                        currentPlan?.id === plan.id
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : plan.popular
                          ? 'text-white bg-blue-600 hover:bg-blue-700'
                          : 'text-blue-600 bg-white border-blue-600 hover:bg-blue-50'
                      } disabled:opacity-50`}
                    >
                      {upgradeLoading === plan.id ? (
                        'Processing...'
                      ) : currentPlan?.id === plan.id ? (
                        'Current Plan'
                      ) : (
                        `Choose ${plan.name}`
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}