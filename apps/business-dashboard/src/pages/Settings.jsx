import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarIcon, EnvelopeIcon, ChatBubbleLeftIcon, PhoneIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';
import PhoneNumberManager from '../components/PhoneNumberManager';
import ServicesManager from '../components/ServicesManager';
import CallTransferSettings from '../components/CallTransferSettings';
import FAQsManager from '../components/FAQsManager';
import VoiceSelector from '../components/VoiceSelector';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'ai', label: 'AI Configuration' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'phone', label: 'Phone Settings' },
  { id: 'billing', label: 'Billing & Plan' },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [services, setServices] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('sarah');
  const [transferSettings, setTransferSettings] = useState({
    transferEnabled: false,
    transferNumber: '',
    transferKeywords: []
  });

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const response = await api.get('/business/config');
      const configData = response.data.config;

      // Initialize services from config
      if (configData?.services) {
        setServices(Array.isArray(configData.services) ? configData.services : []);
      }

      // Initialize FAQs from config
      if (configData?.faqs) {
        setFaqs(Array.isArray(configData.faqs) ? configData.faqs : []);
      }

      // Initialize voice selection from config
      if (configData?.aiVoice) {
        setSelectedVoice(configData.aiVoice);
      }

      // Initialize transfer settings from config
      if (configData?.transferEnabled !== undefined) {
        setTransferSettings({
          transferEnabled: configData.transferEnabled || false,
          transferNumber: configData.transferNumber || '',
          transferKeywords: Array.isArray(configData.transferKeywords) ? configData.transferKeywords : []
        });
      }

      return configData;
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get('/business/profile');
      return response.data.business;
    },
  });

  const data = { ...config, ...profile };
  const isLoading = configLoading || profileLoading;

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
      afterHoursMessage: formData.get('afterHoursMessage'),
      businessHoursStart: formData.get('businessHoursStart'),
      businessHoursEnd: formData.get('businessHoursEnd'),
      appointmentDuration: parseInt(formData.get('appointmentDuration')),
      voiceModel: formData.get('voiceModel'),
      language: formData.get('language'),
      phoneNumber: formData.get('phoneNumber'),
      services: services, // Include services array
      faqs: faqs, // Include FAQs array
      aiVoice: selectedVoice, // Include selected voice
      ...transferSettings, // Include transfer settings
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
                      This message will be played when customers call during business hours
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      After-Hours Message
                    </label>
                    <textarea
                      name="afterHoursMessage"
                      defaultValue={data?.afterHoursMessage || ''}
                      className="w-full px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows={3}
                      placeholder="Thank you for calling. We're currently closed. Please call back during business hours or leave a message..."
                    />
                    <p className="text-sm text-zinc-500 mt-1">
                      This message will be played when customers call outside business hours
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

              {/* Services Manager */}
              <div>
                <ServicesManager
                  services={services}
                  onChange={setServices}
                />
              </div>
            </div>
          )}

          {/* AI Configuration Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* Voice Selector */}
              <div>
                <VoiceSelector
                  selectedVoice={selectedVoice}
                  onChange={setSelectedVoice}
                />
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

              {/* Call Transfer Settings */}
              <div>
                <CallTransferSettings
                  transferEnabled={transferSettings.transferEnabled}
                  transferNumber={transferSettings.transferNumber}
                  transferKeywords={transferSettings.transferKeywords}
                  onChange={setTransferSettings}
                />
              </div>

              {/* FAQs Manager */}
              <div>
                <FAQsManager
                  faqs={faqs}
                  onChange={setFaqs}
                />
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

          {/* Billing & Plan Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-display font-semibold text-white mb-4">Current Plan</h3>
                <div className="bg-gradient-to-br from-green-900/30 to-green-950/20 border border-green-800/30 rounded-xl p-6 mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-2xl font-display font-bold text-green-300 mb-1">
                        {data?.plan || 'Starter'} Plan
                      </h4>
                      <p className="text-sm text-green-400">
                        {data?.status === 'TRIAL' ? 'Trial Period' : 'Active Subscription'}
                      </p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                      data?.status === 'ACTIVE'
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : data?.status === 'TRIAL'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {data?.status || 'TRIAL'}
                    </span>
                  </div>

                  {data?.trialEndsAt && data?.status === 'TRIAL' && (
                    <div className="bg-cyan-900/20 border border-cyan-800/30 rounded-lg p-4 mb-4">
                      <p className="text-sm text-cyan-300">
                        Your trial ends on {new Date(data.trialEndsAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-cyan-400 mt-1">
                        You will not be charged until your trial period ends
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-green-900/20 rounded-lg">
                      <p className="text-xs text-green-400 mb-1">Minutes/month</p>
                      <p className="text-lg font-bold text-green-300">Unlimited</p>
                    </div>
                    <div className="text-center p-3 bg-green-900/20 rounded-lg">
                      <p className="text-xs text-green-400 mb-1">AI Voice</p>
                      <p className="text-lg font-bold text-green-300">Premium</p>
                    </div>
                    <div className="text-center p-3 bg-green-900/20 rounded-lg">
                      <p className="text-xs text-green-400 mb-1">Support</p>
                      <p className="text-lg font-bold text-green-300">24/7</p>
                    </div>
                    <div className="text-center p-3 bg-green-900/20 rounded-lg">
                      <p className="text-xs text-green-400 mb-1">Integrations</p>
                      <p className="text-lg font-bold text-green-300">All</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-display font-semibold text-white mb-4">Upgrade Your Plan</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Starter Plan */}
                  <div className={`border ${data?.plan === 'STARTER' ? 'border-green-500' : 'border-zinc-800'} rounded-xl p-6 bg-zinc-900 hover:shadow-lg hover:shadow-green-500/10 transition-all`}>
                    <div className="text-center mb-4">
                      <h4 className="text-xl font-display font-bold text-white mb-2">Starter</h4>
                      <p className="text-3xl font-bold text-green-400 mb-1">$299</p>
                      <p className="text-sm text-zinc-400">per month</p>
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="text-green-500">✓</span> Unlimited calls
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="text-green-500">✓</span> AI appointment booking
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="text-green-500">✓</span> Calendar integration
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="text-green-500">✓</span> Email notifications
                      </li>
                    </ul>
                    {data?.plan === 'STARTER' ? (
                      <button disabled className="w-full py-2 bg-zinc-800 text-zinc-500 rounded-lg cursor-not-allowed">
                        Current Plan
                      </button>
                    ) : (
                      <button type="button" className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                        Downgrade
                      </button>
                    )}
                  </div>

                  {/* Professional Plan */}
                  <div className={`border ${data?.plan === 'PROFESSIONAL' ? 'border-green-500' : 'border-zinc-800'} rounded-xl p-6 bg-zinc-900 hover:shadow-lg hover:shadow-green-500/10 transition-all relative`}>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                      POPULAR
                    </div>
                    <div className="text-center mb-4">
                      <h4 className="text-xl font-display font-bold text-white mb-2">Professional</h4>
                      <p className="text-3xl font-bold text-green-400 mb-1">$799</p>
                      <p className="text-sm text-zinc-400">per month</p>
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="text-green-500">✓</span> Everything in Starter
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="text-green-500">✓</span> Priority AI processing
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="text-green-500">✓</span> SMS notifications
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="text-green-500">✓</span> Advanced analytics
                      </li>
                    </ul>
                    {data?.plan === 'PROFESSIONAL' ? (
                      <button disabled className="w-full py-2 bg-zinc-800 text-zinc-500 rounded-lg cursor-not-allowed">
                        Current Plan
                      </button>
                    ) : (
                      <button type="button" className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                        Upgrade
                      </button>
                    )}
                  </div>

                  {/* Enterprise Plan */}
                  <div className={`border ${data?.plan === 'ENTERPRISE' ? 'border-green-500' : 'border-zinc-800'} rounded-xl p-6 bg-zinc-900 hover:shadow-lg hover:shadow-green-500/10 transition-all`}>
                    <div className="text-center mb-4">
                      <h4 className="text-xl font-display font-bold text-white mb-2">Enterprise</h4>
                      <p className="text-3xl font-bold text-green-400 mb-1">$1,499</p>
                      <p className="text-sm text-zinc-400">per month</p>
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="text-green-500">✓</span> Everything in Professional
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="text-green-500">✓</span> Dedicated support
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="text-green-500">✓</span> Custom integrations
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="text-green-500">✓</span> White-label options
                      </li>
                    </ul>
                    {data?.plan === 'ENTERPRISE' ? (
                      <button disabled className="w-full py-2 bg-zinc-800 text-zinc-500 rounded-lg cursor-not-allowed">
                        Current Plan
                      </button>
                    ) : (
                      <button type="button" className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                        Upgrade
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-display font-semibold text-white mb-4">Payment Method</h3>
                <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">VISA</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">•••• •••• •••• 4242</p>
                        <p className="text-sm text-zinc-400">Expires 12/25</p>
                      </div>
                    </div>
                    <button type="button" className="text-sm text-green-400 hover:text-green-300 font-medium">
                      Update
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Your payment method is securely stored by Stripe
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-display font-semibold text-white mb-4">Billing History</h3>
                <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900">
                  <table className="w-full">
                    <thead className="bg-zinc-950 border-b border-zinc-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      <tr className="hover:bg-zinc-800 transition-colors">
                        <td className="px-6 py-4 text-sm text-white">Dec 1, 2024</td>
                        <td className="px-6 py-4 text-sm text-white">Starter Plan - December 2024</td>
                        <td className="px-6 py-4 text-sm text-white">$299.00</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-300 rounded-full border border-green-500/30">
                            Paid
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-sm text-green-400 hover:text-green-300 font-medium">
                            Download
                          </button>
                        </td>
                      </tr>
                      <tr className="hover:bg-zinc-800 transition-colors">
                        <td className="px-6 py-4 text-sm text-white">Nov 1, 2024</td>
                        <td className="px-6 py-4 text-sm text-white">Starter Plan - November 2024</td>
                        <td className="px-6 py-4 text-sm text-white">$299.00</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-300 rounded-full border border-green-500/30">
                            Paid
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-sm text-green-400 hover:text-green-300 font-medium">
                            Download
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-display font-semibold text-white mb-4">Cancel Subscription</h3>
                <div className="border border-red-800/30 rounded-lg p-6 bg-red-900/10">
                  <p className="text-sm text-red-300 mb-4">
                    If you cancel your subscription, you will lose access to all features at the end of your billing period.
                  </p>
                  <button type="button" className="px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-800/30 rounded-lg font-medium transition-colors">
                    Cancel Subscription
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Phone Settings Tab */}
          {activeTab === 'phone' && (
            <PhoneNumberManager currentNumber={data?.twilioNumber} />
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
