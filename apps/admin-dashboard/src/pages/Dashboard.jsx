import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  PhoneIcon,
  CalendarIcon,
  StarIcon,
  CheckCircleIcon,
  SignalIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
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

  const stats = data?.stats || {
    totalBusinesses: 0,
    activeBusinesses: 0,
    totalCalls: 0,
    callsThisMonth: 0,
    totalAppointments: 0,
    avgSuccessRate: 0,
    mrr: 0,
    arr: 0,
    growthRate: 0
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Manage your AI receptionist platform</p>
        </div>
        <Link to="/businesses" className="btn-primary">
          + Onboard New Business
        </Link>
      </div>

      {/* Platform Revenue Card */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 p-8 text-white shadow-lg shadow-green-500/10">
        <h2 className="text-2xl font-display font-bold mb-6">Platform Revenue</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-emerald-100 text-sm mb-2">Monthly Recurring Revenue</p>
            <p className="text-4xl font-bold">${(stats.mrr || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-emerald-100 text-sm mb-2">Annual Recurring Revenue</p>
            <p className="text-4xl font-bold">${(stats.arr || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border-2 border-white/30">
            <p className="text-white text-sm mb-2 font-semibold">Growth Rate</p>
            <p className="text-5xl font-bold">{(stats.growthRate || 0) > 0 ? '+' : ''}{stats.growthRate || 0}%</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6 hover:shadow-lg hover:shadow-green-500/10 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">Total Businesses</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {stats.totalBusinesses}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {stats.activeBusinesses} active
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <BuildingOfficeIcon className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6 hover:shadow-lg hover:shadow-green-500/10 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">Total Calls</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {stats.totalCalls}
              </p>
              <p className="mt-2 text-sm text-green-500">
                +{stats.callsThisMonth} this month
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <PhoneIcon className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6 hover:shadow-lg hover:shadow-green-500/10 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">Appointments</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {stats.totalAppointments}
              </p>
              <p className="mt-2 text-sm text-zinc-400">All time</p>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-lg">
              <CalendarIcon className="w-6 h-6 text-cyan-500" />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6 hover:shadow-lg hover:shadow-green-500/10 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-400">Avg Success Rate</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {stats.avgSuccessRate}%
              </p>
              <p className="mt-2 text-sm text-zinc-400">Platform average</p>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <StarIcon className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Businesses */}
      <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-semibold text-white">Recent Businesses</h3>
          <Link to="/businesses" className="text-sm text-green-500 hover:text-green-400 font-medium transition-colors">
            View all →
          </Link>
        </div>
        {data?.recentBusinesses && data.recentBusinesses.length > 0 ? (
          <div className="space-y-3">
            {data.recentBusinesses.slice(0, 5).map((business) => (
              <Link
                key={business.id}
                to={`/businesses`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg shadow-green-500/20">
                    {business.name?.charAt(0)?.toUpperCase() || 'B'}
                  </div>
                  <div>
                    <p className="font-medium text-white">{business.name}</p>
                    <p className="text-sm text-zinc-400">
                      {business.owner?.email || 'No email'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      business.status === 'ACTIVE'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : business.status === 'TRIAL'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {business.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 mb-4">No businesses onboarded yet</p>
            <Link to="/businesses" className="btn-primary inline-block">
              Onboard First Business
            </Link>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Calls */}
        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6">
          <h3 className="text-lg font-display font-semibold text-white mb-4">Recent Calls</h3>
          {data?.recentCalls && data.recentCalls.length > 0 ? (
            <div className="space-y-3">
              {data.recentCalls.slice(0, 5).map((call) => (
                <Link
                  key={call.id}
                  to="/calls"
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-white text-sm">
                      {call.business?.name || 'Unknown Business'}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {call.callerPhone} • {new Date(call.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      call.status === 'COMPLETED'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : call.status === 'IN_PROGRESS'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {call.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <PhoneIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500">No calls yet</p>
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6">
          <h3 className="text-lg font-display font-semibold text-white mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-6 h-6 text-green-500" />
                <div>
                  <p className="font-medium text-white text-sm">API Status</p>
                  <p className="text-xs text-zinc-400">All systems operational</p>
                </div>
              </div>
              <span className="text-xs text-green-500 font-medium">Online</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <div className="flex items-center gap-3">
                <SignalIcon className="w-6 h-6 text-cyan-500" />
                <div>
                  <p className="font-medium text-white text-sm">Phone System</p>
                  <p className="text-xs text-zinc-400">{data?.activePhoneNumbers || 0} active numbers</p>
                </div>
              </div>
              <span className="text-xs text-cyan-500 font-medium">Active</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-3">
                <CpuChipIcon className="w-6 h-6 text-purple-500" />
                <div>
                  <p className="font-medium text-white text-sm">AI Processing</p>
                  <p className="text-xs text-zinc-400">Ready for calls</p>
                </div>
              </div>
              <span className="text-xs text-purple-500 font-medium">Optimal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
