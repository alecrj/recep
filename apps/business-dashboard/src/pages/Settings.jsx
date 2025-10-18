import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarIcon, EnvelopeIcon, ChatBubbleLeftIcon, PhoneIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'ai', label: 'AI Configuration' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'phone', label: 'Phone Settings' },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [calendarConnecting, setCalendarConnecting] = useState(false);

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

  const handleConnectCalendar = async () => {
    try {
      setCalendarConnecting(true);
      const response = await api.get('/calendar/auth-url');
      // Open Google OAuth in new window
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Failed to connect calendar:', error);
      alert('Failed to connect Google Calendar. Please try again.');
    } finally {
      setCalendarConnecting(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) {
      return;
    }

    try {
      await api.post('/calendar/disconnect');
      queryClient.invalidateQueries({ queryKey: ['config'] });
      alert('Google Calendar disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
      alert('Failed to disconnect calendar. Please try again.');
    }
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
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">Settings</h1>
        <p className="text-zinc-400 text-sm">Configure your AI receptionist and business settings</p>
      </div>

      {saved && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-3">
          <span className="text-xl">✓</span>
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800">
        <div className="border-b border-zinc-800">
          <nav className="flex -mb-px overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-display font-semibold text-white mb-4">Business Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Business Name
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      defaultValue={data?.businessName || ''}
                      className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Greeting Message
                    </label>
                    <textarea
                      name="greetingMessage"
                      defaultValue={data?.greetingMessage || ''}
                      className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows={3}
                      placeholder="Thank you for calling..."
                    />
                    <p className="text-sm text-zinc-500 mt-1">
                      This message will be played when customers call
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-display font-semibold text-white mb-4">Business Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      name="businessHoursStart"
                      defaultValue={data?.businessHoursStart || '09:00'}
                      className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      name="businessHoursEnd"
                      defaultValue={data?.businessHoursEnd || '17:00'}
                      className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-display font-semibold text-white mb-4">Appointment Settings</h3>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Default Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="appointmentDuration"
                    defaultValue={data?.appointmentDuration || 30}
                    className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="15"
                    step="15"
                  />
                  <p className="text-sm text-zinc-500 mt-1">
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
                <h3 className="text-lg font-display font-semibold text-white mb-4">Voice Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Voice Model
                    </label>
                    <select
                      name="voiceModel"
                      defaultValue={data?.voiceModel || 'alloy'}
                      className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Language
                    </label>
                    <select
                      name="language"
                      defaultValue={data?.language || 'en'}
                      className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

              <div className="bg-green-900/20 rounded-lg p-6 border border-green-800/30">
                <h4 className="font-display font-semibold text-green-300 mb-2">AI Personality</h4>
                <p className="text-sm text-green-400 mb-4">
                  Your AI receptionist is configured to be professional, friendly, and efficient. It can handle appointment scheduling, take messages, and provide information about your business.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-green-900/40 text-green-300 rounded-full text-xs font-medium border border-green-800/30">
                    Professional
                  </span>
                  <span className="px-3 py-1 bg-green-900/40 text-green-300 rounded-full text-xs font-medium border border-green-800/30">
                    Friendly
                  </span>
                  <span className="px-3 py-1 bg-green-900/40 text-green-300 rounded-full text-xs font-medium border border-green-800/30">
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
                <h3 className="text-lg font-display font-semibold text-white mb-4">Google Calendar</h3>
                {data?.googleCalendarConnected ? (
                  <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="w-6 h-6 text-green-400" />
                      <div>
                        <p className="font-medium text-green-300">Calendar Connected</p>
                        <p className="text-sm text-green-400">
                          Appointments are syncing with your Google Calendar
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDisconnectCalendar}
                      className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div className="border border-zinc-800 rounded-lg p-6 text-center bg-zinc-900">
                    <CalendarIcon className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
                    <h4 className="font-display font-semibold text-white mb-2">Connect Google Calendar</h4>
                    <p className="text-sm text-zinc-400 mb-4">
                      Automatically sync appointments with your Google Calendar
                    </p>
                    <button
                      type="button"
                      onClick={handleConnectCalendar}
                      disabled={calendarConnecting}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {calendarConnecting ? 'Connecting...' : 'Connect Google Calendar'}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-display font-semibold text-white mb-4">Other Integrations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-2">
                      <EnvelopeIcon className="w-6 h-6 text-zinc-400" />
                      <h4 className="font-semibold text-white">Email Notifications</h4>
                    </div>
                    <p className="text-sm text-zinc-400 mb-3">
                      Get email alerts for new appointments and messages
                    </p>
                    <button type="button" className="text-sm text-green-400 hover:text-green-300 font-medium transition-colors">
                      Configure →
                    </button>
                  </div>

                  <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-2">
                      <ChatBubbleLeftIcon className="w-6 h-6 text-zinc-400" />
                      <h4 className="font-semibold text-white">SMS Notifications</h4>
                    </div>
                    <p className="text-sm text-zinc-400 mb-3">
                      Send appointment reminders via SMS
                    </p>
                    <button type="button" className="text-sm text-green-400 hover:text-green-300 font-medium transition-colors">
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
                <h3 className="text-lg font-display font-semibold text-white mb-4">Phone Number</h3>
                <div className="bg-green-900/20 rounded-lg p-6 mb-4 border border-green-800/30">
                  <div className="flex items-start gap-3">
                    <PhoneIcon className="w-8 h-8 text-green-400" />
                    <div className="flex-1">
                      <h4 className="font-display font-semibold text-green-300 mb-2">Your AI Receptionist Number</h4>
                      <p className="text-2xl font-bold text-green-300 mb-2">
                        {data?.phoneNumber || '(555) 123-4567'}
                      </p>
                      <p className="text-sm text-green-400">
                        This number is exclusively for your AI receptionist. Forward your business line to this number to activate.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Display Phone Number (optional)
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    defaultValue={data?.phoneNumber || ''}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-sm text-zinc-500 mt-1">
                    The number customers will see when they call
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-display font-semibold text-white mb-4">Call Handling</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                    <div>
                      <p className="font-medium text-white">After Hours Greeting</p>
                      <p className="text-sm text-zinc-400">
                        Play a custom message when calling outside business hours
                      </p>
                    </div>
                    <label className="relative inline-block w-12 h-6">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-full h-full bg-zinc-600 rounded-full peer-checked:bg-green-500 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                    <div>
                      <p className="font-medium text-white">Call Recording</p>
                      <p className="text-sm text-zinc-400">
                        Record all calls for quality assurance
                      </p>
                    </div>
                    <label className="relative inline-block w-12 h-6">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-full h-full bg-zinc-600 rounded-full peer-checked:bg-green-500 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-zinc-800 mt-6">
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
