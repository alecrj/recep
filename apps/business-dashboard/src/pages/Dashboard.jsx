import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import Layout from '../components/Layout';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/business/dashboard');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Error loading dashboard: {error.message}
        </div>
      </Layout>
    );
  }

  const stats = [
    { name: 'Total Calls', value: data?.stats?.totalCalls || 0, color: 'blue' },
    { name: 'Upcoming Appointments', value: data?.stats?.upcomingAppointments || 0, color: 'green' },
    { name: 'Total Customers', value: data?.stats?.totalCustomers || 0, color: 'purple' },
    { name: 'Unread Messages', value: data?.stats?.unreadMessages || 0, color: 'red' },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back!</h2>
          <p className="text-gray-600 mt-1">Here's what's happening with your AI receptionist</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.name} className="card">
              <h3 className="text-sm font-medium text-gray-500">{stat.name}</h3>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Today's Appointments */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Appointments</h3>
          {data?.todayAppointments?.length > 0 ? (
            <div className="space-y-3">
              {data.todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {apt.customer?.name || 'Unknown Customer'}
                    </p>
                    <p className="text-sm text-gray-600">{apt.serviceType || 'Service'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {new Date(apt.scheduledTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-sm text-gray-600">{apt.duration} min</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No appointments today</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Calls</h3>
            {data?.recentCalls?.length > 0 ? (
              <div className="space-y-3">
                {data.recentCalls.slice(0, 5).map((call) => (
                  <div key={call.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{call.callerPhone}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(call.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        call.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {call.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent calls</p>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full btn-primary text-left">View All Calls</button>
              <button className="w-full btn-secondary text-left">Manage Appointments</button>
              <button className="w-full btn-secondary text-left">Configure AI Settings</button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
