import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';

export default function Businesses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    ownerEmail: '',
    ownerName: '',
    ownerPhone: '',
    plan: 'STARTER',
    status: 'TRIAL',
    password: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['businesses'],
    queryFn: async () => {
      const response = await api.get('/admin/businesses');
      return response.data;
    },
  });

  const createBusinessMutation = useMutation({
    mutationFn: async (businessData) => {
      const response = await api.post('/admin/businesses', businessData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['businesses']);
      setShowOnboardingModal(false);
      resetForm();
    },
    onError: (error) => {
      setFormErrors({ submit: error.response?.data?.error || 'Failed to create business' });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      industry: '',
      ownerEmail: '',
      ownerName: '',
      ownerPhone: '',
      plan: 'STARTER',
      status: 'TRIAL',
      password: '',
    });
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Business name is required';
    if (!formData.ownerEmail.trim()) errors.ownerEmail = 'Owner email is required';
    if (!formData.ownerEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.ownerEmail = 'Invalid email format';
    }
    if (!formData.password || formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      createBusinessMutation.mutate(formData);
    }
  };

  const filteredBusinesses = data?.businesses?.filter((business) => {
    const matchesSearch =
      business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || business.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

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
        Error loading businesses: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Businesses</h2>
          <p className="text-zinc-400 mt-1">Manage all businesses on the platform</p>
        </div>
        <button
          onClick={() => setShowOnboardingModal(true)}
          className="btn-primary"
        >
          + Onboard New Business
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6 hover:shadow-lg hover:shadow-green-500/10 transition-all">
          <h3 className="text-sm font-medium text-zinc-400">Total</h3>
          <p className="text-3xl font-bold text-white mt-2">
            {data?.businesses?.length || 0}
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6 hover:shadow-lg hover:shadow-green-500/10 transition-all">
          <h3 className="text-sm font-medium text-zinc-400">Active</h3>
          <p className="text-3xl font-bold text-green-500 mt-2">
            {data?.businesses?.filter((b) => b.status === 'ACTIVE').length || 0}
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6 hover:shadow-lg hover:shadow-green-500/10 transition-all">
          <h3 className="text-sm font-medium text-zinc-400">Trial</h3>
          <p className="text-3xl font-bold text-cyan-500 mt-2">
            {data?.businesses?.filter((b) => b.status === 'TRIAL').length || 0}
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6 hover:shadow-lg hover:shadow-green-500/10 transition-all">
          <h3 className="text-sm font-medium text-zinc-400">Inactive</h3>
          <p className="text-3xl font-bold text-zinc-500 mt-2">
            {data?.businesses?.filter((b) => b.status === 'INACTIVE').length || 0}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search businesses by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Businesses Table */}
      <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 overflow-hidden">
        {filteredBusinesses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-zinc-950">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredBusinesses.map((business) => (
                  <tr key={business.id} className="hover:bg-zinc-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {business.name?.charAt(0)?.toUpperCase() || 'B'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {business.name}
                          </div>
                          <div className="text-sm text-zinc-500">
                            ID: {business.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {business.ownerName || 'N/A'}
                      </div>
                      <div className="text-sm text-zinc-500">
                        {business.ownerEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                          business.status === 'ACTIVE'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : business.status === 'TRIAL'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {business.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {business.plan || 'Standard'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {business.twilioNumber || 'Not set'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {business._count?.calls || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/businesses/${business.id}`}
                        className="text-green-500 hover:text-green-400 font-medium"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-zinc-500">
              {searchTerm || statusFilter !== 'all'
                ? 'No businesses found matching your filters'
                : 'No businesses yet'}
            </p>
          </div>
        )}
      </div>

      {/* Onboarding Modal */}
      {showOnboardingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-800">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white">Onboard New Business</h3>
                <p className="text-zinc-400 mt-1">Create a new client account in minutes</p>
              </div>
              <button
                onClick={() => {
                  setShowOnboardingModal(false);
                  resetForm();
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {formErrors.submit && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
                  {formErrors.submit}
                </div>
              )}

              {/* Business Information */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Business Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 bg-zinc-950 border ${formErrors.name ? 'border-red-500' : 'border-zinc-800'} rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                      placeholder="Acme HVAC Services"
                    />
                    {formErrors.name && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Industry
                    </label>
                    <select
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select Industry</option>
                      <option value="HVAC">HVAC</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Roofing">Roofing</option>
                      <option value="Landscaping">Landscaping</option>
                      <option value="General Contractor">General Contractor</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Owner Information */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Owner Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Owner Name
                    </label>
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Owner Email *
                    </label>
                    <input
                      type="email"
                      name="ownerEmail"
                      value={formData.ownerEmail}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 bg-zinc-950 border ${formErrors.ownerEmail ? 'border-red-500' : 'border-zinc-800'} rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                      placeholder="john@acmehvac.com"
                    />
                    {formErrors.ownerEmail && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.ownerEmail}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Owner Phone
                    </label>
                    <input
                      type="tel"
                      name="ownerPhone"
                      value={formData.ownerPhone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Dashboard Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 bg-zinc-950 border ${formErrors.password ? 'border-red-500' : 'border-zinc-800'} rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                      placeholder="Min. 8 characters"
                    />
                    {formErrors.password && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.password}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Settings */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Account Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Plan
                    </label>
                    <select
                      name="plan"
                      value={formData.plan}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="STARTER">Starter - $99/mo</option>
                      <option value="PROFESSIONAL">Professional - $199/mo</option>
                      <option value="ENTERPRISE">Enterprise - $499/mo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="TRIAL">Trial (14 days)</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowOnboardingModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBusinessMutation.isPending}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createBusinessMutation.isPending ? 'Creating...' : 'Create Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
