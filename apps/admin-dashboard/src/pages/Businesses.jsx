import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Layout from '../components/Layout';

export default function Businesses() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['businesses'],
    queryFn: async () => {
      const response = await api.get('/admin/businesses');
      return response.data;
    },
  });

  const filteredBusinesses = data?.businesses?.filter((business) =>
    business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    business.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
          Error loading businesses: {error.message}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Businesses</h2>
            <p className="text-gray-600 mt-1">Manage all businesses on the platform</p>
          </div>
          <button className="btn-primary">Add Business</button>
        </div>

        {/* Search */}
        <div className="card">
          <input
            type="text"
            placeholder="Search businesses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
          />
        </div>

        {/* Businesses Table */}
        <div className="card">
          {filteredBusinesses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBusinesses.map((business) => (
                    <tr key={business.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {business.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div>{business.ownerName || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{business.ownerEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            business.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : business.status === 'TRIAL'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {business.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{business.plan}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {business.twilioNumber || 'Not set'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          to={`/businesses/${business.id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              {searchTerm ? 'No businesses found matching your search' : 'No businesses yet'}
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500">Total Businesses</h3>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {data?.businesses?.length || 0}
            </p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500">Active</h3>
            <p className="text-2xl font-semibold text-green-600 mt-2">
              {data?.businesses?.filter((b) => b.status === 'ACTIVE').length || 0}
            </p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500">Trial</h3>
            <p className="text-2xl font-semibold text-blue-600 mt-2">
              {data?.businesses?.filter((b) => b.status === 'TRIAL').length || 0}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
