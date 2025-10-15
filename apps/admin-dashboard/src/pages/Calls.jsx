import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';
import Layout from '../components/Layout';

export default function Calls() {
  const [selectedCall, setSelectedCall] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['all-calls'],
    queryFn: async () => {
      const response = await api.get('/admin/calls');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          Error loading calls: {error.message}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">All Calls</h2>
          <p className="text-zinc-400 mt-1">View all calls across the platform</p>
        </div>

        {/* Calls Table */}
        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 overflow-hidden">
          {data?.calls?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800">
                <thead className="bg-zinc-950">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Business
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Caller
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Intent
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {data.calls.map((call) => (
                    <tr key={call.id} className="hover:bg-zinc-800 transition-colors">
                      <td className="px-4 py-3 text-sm text-white">
                        {call.business?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{call.callerPhone}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            call.status === 'COMPLETED'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : call.status === 'IN_PROGRESS'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {call.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {call.intent || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {call.duration ? `${Math.round(call.duration)}s` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {new Date(call.startedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => setSelectedCall(call)}
                          className="text-green-500 hover:text-green-400 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-8">No calls yet</p>
          )}
        </div>

        {/* Call Detail Modal */}
        {selectedCall && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white">Call Details</h3>
                  <button
                    onClick={() => setSelectedCall(null)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-zinc-400">Business:</span>
                    <p className="text-white">{selectedCall.business?.name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-zinc-400">Caller:</span>
                    <p className="text-white">{selectedCall.callerPhone}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-zinc-400">Status:</span>
                    <p className="text-white">{selectedCall.status}</p>
                  </div>
                  {selectedCall.transcript && (
                    <div>
                      <span className="text-sm font-medium text-zinc-400">Transcript:</span>
                      <div className="mt-2 bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 whitespace-pre-wrap">
                        {selectedCall.transcript}
                      </div>
                    </div>
                  )}
                  {selectedCall.summary && (
                    <div>
                      <span className="text-sm font-medium text-zinc-400">Summary:</span>
                      <p className="text-zinc-300 mt-1">{selectedCall.summary}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button onClick={() => setSelectedCall(null)} className="btn-secondary">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
