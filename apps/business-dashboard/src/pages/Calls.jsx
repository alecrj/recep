import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../lib/api';

export default function Calls() {
  const [page, setPage] = useState(1);
  const [selectedCall, setSelectedCall] = useState(null);
  const [filters, setFilters] = useState({
    outcome: '',
    startDate: '',
    endDate: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['calls', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.outcome && { outcome: filters.outcome }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });
      const response = await api.get(`/business/calls?${params}`);
      return response.data;
    },
  });

  const { data: callDetails } = useQuery({
    queryKey: ['call', selectedCall],
    queryFn: async () => {
      const response = await api.get(`/business/calls/${selectedCall}`);
      return response.data;
    },
    enabled: !!selectedCall,
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">Calls</h1>
        <p className="text-zinc-400 text-sm">View and manage all incoming calls</p>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 rounded-xl shadow-sm p-6 border border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Outcome
            </label>
            <select
              value={filters.outcome}
              onChange={(e) => handleFilterChange('outcome', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Outcomes</option>
              <option value="APPOINTMENT_BOOKED">Appointment Booked</option>
              <option value="MESSAGE_TAKEN">Message Taken</option>
              <option value="INFORMATION_PROVIDED">Information Provided</option>
              <option value="EMERGENCY_FLAGGED">Emergency</option>
              <option value="CALL_ENDED">Call Ended</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-zinc-900 rounded-xl shadow-sm overflow-hidden border border-zinc-800">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800">
                <thead className="bg-zinc-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Outcome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {data?.calls?.map((call) => (
                    <tr key={call.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {new Date(call.startedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {call.customer?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-zinc-400">
                            {call.customer?.phone || call.callerPhone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {call.durationSeconds
                          ? `${Math.floor(call.durationSeconds / 60)}:${(call.durationSeconds % 60)
                              .toString()
                              .padStart(2, '0')}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            call.outcome === 'APPOINTMENT_BOOKED'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : call.outcome === 'MESSAGE_TAKEN'
                              ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
                              : call.outcome === 'EMERGENCY_FLAGGED'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {call.outcome?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedCall(call.id)}
                          className="text-green-400 hover:text-green-300 font-medium transition-colors"
                        >
                          View Transcript
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.pagination && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
                <div className="text-sm text-zinc-400">
                  Showing page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= data.pagination.totalPages}
                    className="px-4 py-2 text-sm font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transcript Modal */}
      {selectedCall && callDetails && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSelectedCall(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-zinc-800">
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-display font-semibold text-white">Call Transcript</h3>
                  <button
                    onClick={() => setSelectedCall(null)}
                    className="text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
                <p className="text-sm text-zinc-400 mt-1">
                  {new Date(callDetails.call.startedAt).toLocaleString()}
                </p>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-400">Customer</p>
                    <p className="text-white">{callDetails.call.customer?.name || 'Unknown'}</p>
                    <p className="text-sm text-zinc-400">{callDetails.call.customer?.phone || callDetails.call.callerPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-400">Outcome</p>
                    <p className="text-white">{callDetails.call.outcome?.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-400 mb-2">Transcript</p>
                    <div className="bg-zinc-900 rounded-lg p-4 text-sm text-white whitespace-pre-wrap border border-zinc-800">
                      {callDetails.call.transcript || 'No transcript available'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
