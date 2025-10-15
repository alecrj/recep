import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';

export default function Dashboard() {
  const { data: dashboardData, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/business/dashboard');
      return response.data;
    },
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await api.get('/business/analytics');
      return response.data;
    },
  });

  const isLoading = dashLoading || analyticsLoading;
  const stats = dashboardData?.stats;
  const analytics = analyticsData?.analytics;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-zinc-400 text-sm">Welcome back! Here's your performance overview</p>
      </div>

      {/* Performance Summary Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-8 shadow-2xl shadow-green-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent"></div>
        <div className="relative">
          <h2 className="text-2xl font-display font-bold mb-8 text-white">Performance Overview</h2>
          <div className="grid grid-cols-1 gap-6">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-6">
              <p className="text-white/80 text-xs font-medium uppercase tracking-wider mb-2">Conversion Rate</p>
              <p className="text-5xl font-display font-bold text-white mt-1">{analytics?.conversionRate || '0%'}</p>
              <p className="text-sm text-white/70 mt-3">Calls converted to appointments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Total Calls</p>
          <p className="text-3xl font-display font-bold text-white mb-1">{stats?.totalCalls || 0}</p>
          <p className="text-sm text-green-500">+{stats?.callsLast30Days || 0} last 30 days</p>
        </div>

        <div className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Appointments</p>
          <p className="text-3xl font-display font-bold text-white mb-1">{stats?.upcomingAppointments || 0}</p>
          <p className="text-sm text-zinc-400">{stats?.appointmentsToday || 0} today</p>
        </div>

        <div className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Customers</p>
          <p className="text-3xl font-display font-bold text-white mb-1">{stats?.totalCustomers || 0}</p>
          <p className="text-sm text-zinc-400">Total contacts</p>
        </div>

        <div className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Messages</p>
          <p className="text-3xl font-display font-bold text-white mb-1">{stats?.unreadMessages || 0}</p>
          <p className="text-sm text-orange-500">Unread</p>
        </div>
      </div>

      {/* Recent Calls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-display font-semibold text-white">Recent Calls</h3>
          <Link to="/calls" className="text-sm text-green-500 hover:text-green-400 font-medium transition-colors flex items-center gap-1">
            View all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        {dashboardData?.recentCalls?.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.recentCalls.slice(0, 5).map((call) => (
              <div key={call.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-zinc-800/50 transition-all border border-transparent hover:border-zinc-700">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {call.customer?.name || call.customer?.phone || 'Unknown'}
                  </p>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {new Date(call.startedAt).toLocaleString()}
                  </p>
                </div>
                <span className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ml-4 ${
                  call.outcome === 'APPOINTMENT_BOOKED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                  call.outcome === 'MESSAGE_TAKEN' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                  'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}>
                  {call.outcome?.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-center py-12 text-sm">No recent calls</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link to="/calls" className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors flex-shrink-0">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white text-sm mb-0.5">View All Calls</p>
            <p className="text-xs text-zinc-500">Call history & transcripts</p>
          </div>
        </Link>

        <Link to="/appointments" className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors flex-shrink-0">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white text-sm mb-0.5">Manage Appointments</p>
            <p className="text-xs text-zinc-500">View & organize schedule</p>
          </div>
        </Link>

        <Link to="/settings" className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors flex-shrink-0">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white text-sm mb-0.5">Configure AI</p>
            <p className="text-xs text-zinc-500">Update AI settings</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
