import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PhoneIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';

export default function PhoneNumbers() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const [newNumber, setNewNumber] = useState({
    phoneNumber: '',
    twilioSid: '',
    friendlyName: '',
    region: 'US',
  });

  const queryClient = useQueryClient();

  // Fetch phone numbers
  const { data, isLoading, error } = useQuery({
    queryKey: ['phone-numbers', filterStatus],
    queryFn: async () => {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const response = await api.get(`/admin/phone-numbers${params}`);
      return response.data;
    },
  });

  // Fetch businesses for assignment
  const { data: businessesData } = useQuery({
    queryKey: ['businesses-for-assignment'],
    queryFn: async () => {
      const response = await api.get('/admin/businesses');
      return response.data;
    },
    enabled: showAssignModal,
  });

  // Add phone number mutation
  const addNumberMutation = useMutation({
    mutationFn: async (numberData) => {
      const response = await api.post('/admin/phone-numbers', numberData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['phone-numbers']);
      setShowAddModal(false);
      setNewNumber({
        phoneNumber: '',
        twilioSid: '',
        friendlyName: '',
        region: 'US',
      });
    },
  });

  // Assign number mutation
  const assignNumberMutation = useMutation({
    mutationFn: async ({ numberId, businessId }) => {
      const response = await api.post(`/admin/phone-numbers/${numberId}/assign`, {
        businessId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['phone-numbers']);
      queryClient.invalidateQueries(['businesses']);
      setShowAssignModal(false);
      setSelectedNumber(null);
    },
  });

  // Unassign number mutation
  const unassignNumberMutation = useMutation({
    mutationFn: async (numberId) => {
      const response = await api.post(`/admin/phone-numbers/${numberId}/unassign`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['phone-numbers']);
      queryClient.invalidateQueries(['businesses']);
    },
  });

  const handleAddNumber = (e) => {
    e.preventDefault();
    addNumberMutation.mutate(newNumber);
  };

  const handleAssignNumber = (businessId) => {
    if (selectedNumber && businessId) {
      assignNumberMutation.mutate({
        numberId: selectedNumber.id,
        businessId,
      });
    }
  };

  const handleUnassignNumber = (numberId) => {
    if (confirm('Are you sure you want to unassign this phone number?')) {
      unassignNumberMutation.mutate(numberId);
    }
  };

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
        Error loading phone numbers: {error.message}
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Phone Number Pool</h2>
          <p className="text-zinc-400 mt-1">Manage Twilio phone numbers for businesses</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          <PlusIcon className="w-5 h-5 inline mr-2" />
          Add Phone Number
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6">
          <h3 className="text-sm font-medium text-zinc-400">Total Numbers</h3>
          <p className="text-3xl font-bold text-white mt-2">
            {stats.total || 0}
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6">
          <h3 className="text-sm font-medium text-zinc-400">Available</h3>
          <p className="text-3xl font-bold text-green-500 mt-2">
            {stats.byStatus?.AVAILABLE || 0}
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6">
          <h3 className="text-sm font-medium text-zinc-400">Assigned</h3>
          <p className="text-3xl font-bold text-cyan-500 mt-2">
            {stats.byStatus?.ASSIGNED || 0}
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6">
          <h3 className="text-sm font-medium text-zinc-400">Reserved</h3>
          <p className="text-3xl font-bold text-yellow-500 mt-2">
            {stats.byStatus?.RESERVED || 0}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="all">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="RESERVED">Reserved</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      {/* Phone Numbers Table */}
      <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 overflow-hidden">
        {data?.phoneNumbers && data.phoneNumbers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-zinc-950">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Friendly Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.phoneNumbers.map((number) => (
                  <tr key={number.id} className="hover:bg-zinc-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <PhoneIcon className="w-5 h-5 text-green-500 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {number.phoneNumber}
                          </div>
                          <div className="text-sm text-zinc-500">
                            {number.twilioSid?.slice(0, 20)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {number.friendlyName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {number.region}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                          number.status === 'AVAILABLE'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : number.status === 'ASSIGNED'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : number.status === 'RESERVED'
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {number.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {number.businessId ? (
                        <span className="text-green-500">Business #{number.businessId.slice(0, 8)}...</span>
                      ) : (
                        <span className="text-zinc-500">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {number.status === 'AVAILABLE' && (
                        <button
                          onClick={() => {
                            setSelectedNumber(number);
                            setShowAssignModal(true);
                          }}
                          className="text-green-500 hover:text-green-400 font-medium"
                        >
                          Assign
                        </button>
                      )}
                      {number.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleUnassignNumber(number.id)}
                          className="text-yellow-500 hover:text-yellow-400 font-medium"
                        >
                          Unassign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <PhoneIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 mb-4">No phone numbers in pool yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary inline-block"
            >
              Add First Number
            </button>
          </div>
        )}
      </div>

      {/* Add Number Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-xl shadow-xl max-w-md w-full border border-zinc-800">
            <div className="border-b border-zinc-800 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Add Phone Number</h3>
                <p className="text-zinc-400 mt-1 text-sm">Add a Twilio number to the pool</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddNumber} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="text"
                  value={newNumber.phoneNumber}
                  onChange={(e) => setNewNumber({ ...newNumber, phoneNumber: e.target.value })}
                  placeholder="+15551234567"
                  required
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Twilio SID
                </label>
                <input
                  type="text"
                  value={newNumber.twilioSid}
                  onChange={(e) => setNewNumber({ ...newNumber, twilioSid: e.target.value })}
                  placeholder="PNxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Friendly Name
                </label>
                <input
                  type="text"
                  value={newNumber.friendlyName}
                  onChange={(e) => setNewNumber({ ...newNumber, friendlyName: e.target.value })}
                  placeholder="New York Number"
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Region
                </label>
                <input
                  type="text"
                  value={newNumber.region}
                  onChange={(e) => setNewNumber({ ...newNumber, region: e.target.value })}
                  placeholder="US"
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addNumberMutation.isPending}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addNumberMutation.isPending ? 'Adding...' : 'Add Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Number Modal */}
      {showAssignModal && selectedNumber && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-xl shadow-xl max-w-md w-full border border-zinc-800">
            <div className="border-b border-zinc-800 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Assign Phone Number</h3>
                <p className="text-zinc-400 mt-1 text-sm">
                  {selectedNumber.phoneNumber}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedNumber(null);
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Select Business
                </label>
                <select
                  onChange={(e) => handleAssignNumber(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  defaultValue=""
                >
                  <option value="" disabled>Choose a business...</option>
                  {businessesData?.businesses?.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name} ({business.ownerEmail})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedNumber(null);
                  }}
                  className="px-6 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
