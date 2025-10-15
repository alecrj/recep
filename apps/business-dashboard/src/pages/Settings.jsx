import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const TABS = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'ai', label: 'AI Configuration', icon: '🤖' },
  { id: 'integrations', label: 'Integrations', icon: '🔌' },
  { id: 'phone', label: 'Phone Settings', icon: '📞' },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
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
      queryClient.invalidateQueries({ queryKey: ['config'] });
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
      voiceModel: formData.get('voiceModel'),
      language: formData.get('language'),
      phoneNumber: formData.get('phoneNumber'),
    };
    mutation.mutate(config);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Configure your AI receptionist and business settings</p>
      </div>

      {saved && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-3">
          <span className="text-xl">✓</span>
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-600 text-green-600 dark:border-green-400 dark:text-green-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Business Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business Name
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      defaultValue={data?.businessName || ''}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Greeting Message
                    </label>
                    <textarea
                      name="greetingMessage"
                      defaultValue={data?.greetingMessage || ''}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows={3}
                      placeholder="Thank you for calling..."
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      This message will be played when customers call
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Business Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      name="businessHoursStart"
                      defaultValue={data?.businessHoursStart || '09:00'}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      name="businessHoursEnd"
                      defaultValue={data?.businessHoursEnd || '17:00'}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appointment Settings</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="appointmentDuration"
                    defaultValue={data?.appointmentDuration || 30}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="15"
                    step="15"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Default appointment duration for scheduling
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* AI Configuration Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Voice Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Voice Model
                    </label>
                    <select
                      name="voiceModel"
                      defaultValue={data?.voiceModel || 'alloy'}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="alloy">Alloy (Neutral)</option>
                      <option value="echo">Echo (Male)</option>
                      <option value="fable">Fable (British Male)</option>
                      <option value="onyx">Onyx (Deep Male)</option>
                      <option value="nova">Nova (Female)</option>
                      <option value="shimmer">Shimmer (Soft Female)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Language
                    </label>
                    <select
                      name="language"
                      defaultValue={data?.language || 'en'}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">AI Personality</h4>
                <p className="text-sm text-green-800 dark:text-green-400 mb-4">
                  Your AI receptionist is configured to be professional, friendly, and efficient. It can handle appointment scheduling, take messages, and provide information about your business.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                    Professional
                  </span>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                    Friendly
                  </span>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                    Efficient
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Google Calendar</h3>
                {data?.googleCalendarConnected ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">✓</span>
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-300">Calendar Connected</p>
                        <p className="text-sm text-green-700 dark:text-green-400">
                          Appointments are syncing with your Google Calendar
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                    <span className="text-4xl mb-3 block">📅</span>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Connect Google Calendar</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Automatically sync appointments with your Google Calendar
                    </p>
                    <button type="button" className="btn-primary">
                      Connect Google Calendar
                    </button>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Other Integrations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">📧</span>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Email Notifications</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Get email alerts for new appointments and messages
                    </p>
                    <button type="button" className="text-sm text-green-600 dark:text-green-400 font-medium">
                      Configure →
                    </button>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">💬</span>
                      <h4 className="font-semibold text-gray-900 dark:text-white">SMS Notifications</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Send appointment reminders via SMS
                    </p>
                    <button type="button" className="text-sm text-green-600 dark:text-green-400 font-medium">
                      Configure →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Phone Settings Tab */}
          {activeTab === 'phone' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Phone Number</h3>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">📞</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">Your AI Receptionist Number</h4>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-300 mb-2">
                        {data?.phoneNumber || '(555) 123-4567'}
                      </p>
                      <p className="text-sm text-green-800 dark:text-green-400">
                        This number is exclusively for your AI receptionist. Forward your business line to this number to activate.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Phone Number (optional)
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    defaultValue={data?.phoneNumber || ''}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    The number customers will see when they call
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Call Handling</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">After Hours Greeting</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Play a custom message when calling outside business hours
                      </p>
                    </div>
                    <label className="relative inline-block w-12 h-6">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-full h-full bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-green-500 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Call Recording</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Record all calls for quality assurance
                      </p>
                    </div>
                    <label className="relative inline-block w-12 h-6">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-full h-full bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-green-500 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
