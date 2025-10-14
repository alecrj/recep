import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import Layout from '../components/Layout';

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
    { name: 'Total Businesses', value: data?.stats?.totalBusinesses || 0, change: null },
    { name: 'Active Businesses', value: data?.stats?.activeBusinesses || 0, change: '+2 this week' },
    { name: 'Total Calls', value: data?.stats?.totalCalls || 0, change: null },
    { name: 'Total Appointments', value: data?.stats?.totalAppointments || 0, change: null },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Platform Dashboard</h2>
          <p className="text-gray-600 mt-1">Overview of your AI receptionist platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.name} className="card">
              <h3 className="text-sm font-medium text-gray-500">{stat.name}</h3>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
                {stat.change && (
                  <span className="text-sm text-green-600">{stat.change}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Calls */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Calls</h3>
          {data?.recentCalls?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Caller
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.recentCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {call.business?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{call.callerPhone}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            call.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : call.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {call.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(call.startedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent calls</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
