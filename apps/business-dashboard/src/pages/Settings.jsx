import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import Layout from '../components/Layout';

export default function Settings() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const response = await api.get('/business/config');
      return response.data.config;
    },
  });

  const mutation = useMutation({
    mutationFn: async (configData) => {
      const response = await api.put('/business/config', configData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['config']);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const config = {
      businessName: formData.get('businessName'),
      greetingMessage: formData.get('greetingMessage'),
      businessHoursStart: formData.get('businessHoursStart'),
      businessHoursEnd: formData.get('businessHoursEnd'),
      appointmentDuration: parseInt(formData.get('appointmentDuration')),
    };
    mutation.mutate(config);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-1">Configure your AI receptionist</p>
        </div>

        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            Settings saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Business Name</label>
                <input
                  type="text"
                  name="businessName"
                  defaultValue={data?.businessName || ''}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Greeting Message</label>
                <textarea
                  name="greetingMessage"
                  defaultValue={data?.greetingMessage || ''}
                  className="input"
                  rows={3}
                  placeholder="Thank you for calling..."
                />
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Hours</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Start Time</label>
                <input
                  type="time"
                  name="businessHoursStart"
                  defaultValue={data?.businessHoursStart || '09:00'}
                  className="input"
                />
              </div>
              <div>
                <label className="label">End Time</label>
                <input
                  type="time"
                  name="businessHoursEnd"
                  defaultValue={data?.businessHoursEnd || '17:00'}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Appointment Settings */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Settings</h3>
            <div>
              <label className="label">Default Duration (minutes)</label>
              <input
                type="number"
                name="appointmentDuration"
                defaultValue={data?.appointmentDuration || 30}
                className="input"
                min="15"
                step="15"
              />
            </div>
          </div>

          {/* Google Calendar */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Google Calendar Integration</h3>
            {data?.googleCalendarConnected ? (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                ✓ Calendar connected
              </div>
            ) : (
              <button type="button" className="btn-primary">Connect Google Calendar</button>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
