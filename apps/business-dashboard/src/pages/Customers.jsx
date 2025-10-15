import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { MagnifyingGlassIcon, PhoneIcon, EnvelopeIcon, CalendarIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/business/customers');
      return response.data;
    },
  });

  const { data: customerDetails } = useQuery({
    queryKey: ['customer', selectedCustomer],
    queryFn: async () => {
      const response = await api.get(`/business/customers/${selectedCustomer}`);
      return response.data;
    },
    enabled: !!selectedCustomer,
  });

  const filteredCustomers = data?.customers?.filter((customer) => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">Customers</h1>
        <p className="text-zinc-400 text-sm">Manage your customer relationships</p>
      </div>

      {/* Search Bar */}
      <div className="bg-zinc-900 rounded-xl shadow-sm p-6 border border-zinc-800">
        <div className="relative">
          <input
            type="text"
            placeholder="Search customers by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 text-xl"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-zinc-900 rounded-xl shadow-sm overflow-hidden border border-zinc-800">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : filteredCustomers?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Total Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Appointments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Last Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {customer.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {customer.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-zinc-400">
                            ID: {customer.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {customer.phone || 'N/A'}
                      </div>
                      <div className="text-sm text-zinc-400">
                        {customer.email || 'No email'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl text-white font-semibold">
                          {customer._count?.calls || 0}
                        </span>
                        <span className="text-xs text-zinc-400">calls</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl text-white font-semibold">
                          {customer._count?.appointments || 0}
                        </span>
                        <span className="text-xs text-zinc-400">appts</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {customer.lastContactedAt
                        ? new Date(customer.lastContactedAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedCustomer(customer.id)}
                        className="text-green-400 hover:text-green-300 font-medium transition-colors"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-zinc-500">
              {searchQuery ? 'No customers found matching your search' : 'No customers yet'}
            </p>
          </div>
        )}
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && customerDetails && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setSelectedCustomer(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-zinc-800">
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-800 bg-gradient-to-r from-green-600 to-emerald-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-2xl">
                      {customerDetails.customer.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="text-2xl font-display font-bold text-white">
                        {customerDetails.customer.name || 'Unknown Customer'}
                      </h3>
                      <p className="text-green-100 mt-1">
                        Customer since {new Date(customerDetails.customer.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <span className="text-3xl">×</span>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Stats Cards */}
                  <div className="bg-cyan-900/20 rounded-lg p-4 border border-cyan-800/30">
                    <p className="text-sm text-cyan-400 mb-1">Total Calls</p>
                    <p className="text-3xl font-bold text-white">
                      {customerDetails.customer._count?.calls || 0}
                    </p>
                  </div>
                  <div className="bg-green-900/20 rounded-lg p-4 border border-green-800/30">
                    <p className="text-sm text-green-400 mb-1">Appointments</p>
                    <p className="text-3xl font-bold text-white">
                      {customerDetails.customer._count?.appointments || 0}
                    </p>
                  </div>
                  <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-800/30">
                    <p className="text-sm text-purple-400 mb-1">Last Contact</p>
                    <p className="text-lg font-bold text-white">
                      {customerDetails.customer.lastContactedAt
                        ? new Date(customerDetails.customer.lastContactedAt).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-zinc-900 rounded-lg p-6 mb-6 border border-zinc-800">
                  <h4 className="font-display font-semibold text-white mb-4">Contact Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <PhoneIcon className="w-5 h-5 text-zinc-400" />
                      <div>
                        <p className="text-xs text-zinc-500">Phone</p>
                        <p className="text-white font-medium">
                          {customerDetails.customer.phone || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <EnvelopeIcon className="w-5 h-5 text-zinc-400" />
                      <div>
                        <p className="text-xs text-zinc-500">Email</p>
                        <p className="text-white font-medium">
                          {customerDetails.customer.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Calls */}
                {customerDetails.recentCalls && customerDetails.recentCalls.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-display font-semibold text-white mb-3">Recent Calls</h4>
                    <div className="space-y-3">
                      {customerDetails.recentCalls.map((call) => (
                        <div
                          key={call.id}
                          className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-zinc-400">
                              {new Date(call.startedAt).toLocaleString()}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                call.outcome === 'APPOINTMENT_BOOKED'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : call.outcome === 'MESSAGE_TAKEN'
                                  ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
                                  : 'bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              {call.outcome?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-white">
                            Duration: {call.durationSeconds ? `${Math.floor(call.durationSeconds / 60)}:${(call.durationSeconds % 60).toString().padStart(2, '0')}` : 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Appointments */}
                {customerDetails.upcomingAppointments && customerDetails.upcomingAppointments.length > 0 && (
                  <div>
                    <h4 className="font-display font-semibold text-white mb-3">Upcoming Appointments</h4>
                    <div className="space-y-3">
                      {customerDetails.upcomingAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">
                              {appointment.serviceType || 'Appointment'}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                appointment.status === 'CONFIRMED'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}
                            >
                              {appointment.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-zinc-400">
                            <span className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5" />
                              {new Date(appointment.scheduledTime).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <ClockIcon className="w-3.5 h-3.5" />
                              {new Date(appointment.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {appointment.price && (
                              <span className="flex items-center gap-1.5">
                                <CurrencyDollarIcon className="w-3.5 h-3.5" />
                                ${appointment.price}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-zinc-800 flex gap-3">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition-colors"
                >
                  Close
                </button>
                <button className="flex-1 btn-primary">
                  Edit Customer
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
