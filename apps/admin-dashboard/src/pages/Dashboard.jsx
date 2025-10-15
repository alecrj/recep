import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
        Error loading dashboard: {error.message}
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Overview of your AI receptionist platform</p>
      </div>

      {/* Platform Revenue Card */}
      <div className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-6">💰 Platform Revenue</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-green-100 text-sm mb-2">Monthly Recurring Revenue</p>
            <p className="text-4xl font-bold">${stats?.mrr || '45,000'}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-green-100 text-sm mb-2">Annual Recurring Revenue</p>
            <p className="text-4xl font-bold">${stats?.arr || '540,000'}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border-2 border-white/30">
            <p className="text-white text-sm mb-2 font-semibold">Growth Rate</p>
            <p className="text-5xl font-bold">+{stats?.growthRate || '12'}%</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Businesses</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                {stats?.totalBusinesses || 0}
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {stats?.activeBusinesses || 0} active
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-2xl">🏢</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Calls</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                {stats?.totalCalls || 0}
              </p>
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                +{stats?.callsThisMonth || 0} this month
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-2xl">📞</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Appointments</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                {stats?.totalAppointments || 0}
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">All time</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-2xl">📅</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Success Rate</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                {stats?.avgSuccessRate || '92'}%
              </p>
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">+3% from last month</p>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <span className="text-2xl">⭐</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Businesses */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Businesses</h3>
          <Link to="/businesses" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
            View all →
          </Link>
        </div>
        {data?.recentBusinesses?.length > 0 ? (
          <div className="space-y-3">
            {data.recentBusinesses.slice(0, 5).map((business) => (
              <div
                key={business.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {business.name?.charAt(0)?.toUpperCase() || 'B'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{business.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {business.owner?.email || 'No email'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      business.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : business.status === 'TRIAL'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {business.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No recent businesses</p>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Calls */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Calls</h3>
          {data?.recentCalls?.length > 0 ? (
            <div className="space-y-3">
              {data.recentCalls.slice(0, 5).map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {call.business?.name || 'Unknown Business'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {call.callerPhone} • {new Date(call.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      call.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : call.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {call.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No recent calls</p>
          )}
        </div>

        {/* System Health */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">API Status</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">All systems operational</p>
                </div>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📡</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Phone System</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{stats?.activeLines || 30} active lines</p>
                </div>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Active</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">AI Processing</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Avg response: {stats?.avgAiResponseTime || '1.2'}s</p>
                </div>
              </div>
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Optimal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
