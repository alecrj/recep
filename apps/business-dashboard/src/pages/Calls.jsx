import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import Layout from '../components/Layout';

export default function Calls() {
  const [selectedCall, setSelectedCall] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: async () => {
      const response = await api.get('/business/calls');
      return response.data;
    },
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Call History</h2>
          <p className="text-gray-600 mt-1">View all calls handled by your AI receptionist</p>
        </div>

        <div className="card">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : data?.calls?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Caller
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Intent
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.calls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{call.callerPhone}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          call.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{call.intent || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {call.duration ? `${Math.round(call.duration)}s` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(call.startedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => setSelectedCall(call)}
                          className="text-primary-600 hover:text-primary-700 font-medium"
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
            <p className="text-gray-500 text-center py-8">No calls yet</p>
          )}
        </div>

        {selectedCall && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">Call Details</h3>
                <button onClick={() => setSelectedCall(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Caller:</span>
                  <p className="text-gray-900">{selectedCall.callerPhone}</p>
                </div>
                {selectedCall.transcript && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Transcript:</span>
                    <div className="mt-2 bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedCall.transcript}
                    </div>
                  </div>
                )}
                {selectedCall.summary && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Summary:</span>
                    <p className="text-gray-700 mt-1">{selectedCall.summary}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setSelectedCall(null)} className="btn-secondary">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
