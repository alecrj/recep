import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  StarIcon,
  LightBulbIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import api from '../lib/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('30d');

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: async () => {
      const response = await api.get(`/business/analytics?range=${timeRange}`);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const analytics = analyticsData?.analytics || {};

  // Sample data for charts (would come from API in production)
  const callVolumeData = analytics?.callVolumeData || [
    { date: 'Mon', calls: 12 },
    { date: 'Tue', calls: 19 },
    { date: 'Wed', calls: 15 },
    { date: 'Thu', calls: 22 },
    { date: 'Fri', calls: 28 },
    { date: 'Sat', calls: 8 },
    { date: 'Sun', calls: 5 },
  ];

  const outcomeData = analytics?.outcomeData || [
    { name: 'Appointments Booked', value: 45 },
    { name: 'Messages Taken', value: 30 },
    { name: 'Information Provided', value: 15 },
    { name: 'Emergency Flagged', value: 5 },
    { name: 'Call Ended', value: 5 },
  ];

  const revenueData = analytics?.revenueData || [
    { month: 'Jan', revenue: 4500 },
    { month: 'Feb', revenue: 5200 },
    { month: 'Mar', revenue: 6100 },
    { month: 'Apr', revenue: 5800 },
    { month: 'May', revenue: 7200 },
    { month: 'Jun', revenue: 8500 },
  ];

  const peakHoursData = analytics?.peakHoursData || [
    { hour: '9am', calls: 8 },
    { hour: '10am', calls: 15 },
    { hour: '11am', calls: 22 },
    { hour: '12pm', calls: 18 },
    { hour: '1pm', calls: 12 },
    { hour: '2pm', calls: 20 },
    { hour: '3pm', calls: 25 },
    { hour: '4pm', calls: 16 },
    { hour: '5pm', calls: 10 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Analytics</h1>
          <p className="text-zinc-400 text-sm">Track your performance and insights</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900 rounded-xl shadow-sm p-6 border border-zinc-800 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-zinc-400">Conversion Rate</p>
            <ChartBarIcon className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-white">{analytics?.conversionRate || '45%'}</p>
          <p className="text-sm text-green-400 mt-2">+5.3% from last period</p>
        </div>

        <div className="bg-zinc-900 rounded-xl shadow-sm p-6 border border-zinc-800 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-zinc-400">Avg Call Duration</p>
            <ClockIcon className="w-6 h-6 text-cyan-500" />
          </div>
          <p className="text-3xl font-bold text-white">{analytics?.avgCallDuration || '3:42'}</p>
          <p className="text-sm text-zinc-400 mt-2">minutes</p>
        </div>

        <div className="bg-zinc-900 rounded-xl shadow-sm p-6 border border-zinc-800 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-zinc-400">Est. Revenue</p>
            <CurrencyDollarIcon className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-white">${analytics?.estimatedRevenue || '8,500'}</p>
          <p className="text-sm text-green-400 mt-2">+12.8% from last period</p>
        </div>

        <div className="bg-zinc-900 rounded-xl shadow-sm p-6 border border-zinc-800 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-zinc-400">Customer Satisfaction</p>
            <StarIcon className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-white">{analytics?.satisfaction || '4.8'}/5</p>
          <p className="text-sm text-zinc-400 mt-2">from 156 responses</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Volume Chart */}
        <div className="bg-zinc-900 rounded-xl shadow-sm p-6 border border-zinc-800">
          <h3 className="text-lg font-display font-semibold text-white mb-4">Call Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={callVolumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="calls"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Call Outcomes Pie Chart */}
        <div className="bg-zinc-900 rounded-xl shadow-sm p-6 border border-zinc-800">
          <h3 className="text-lg font-display font-semibold text-white mb-4">Call Outcomes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={outcomeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {outcomeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="bg-zinc-900 rounded-xl shadow-sm p-6 border border-zinc-800">
          <h3 className="text-lg font-display font-semibold text-white mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Hours */}
        <div className="bg-zinc-900 rounded-xl shadow-sm p-6 border border-zinc-800">
          <h3 className="text-lg font-display font-semibold text-white mb-4">Peak Call Hours</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={peakHoursData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis dataKey="hour" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="calls" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-sm p-6 text-white border border-green-500/20">
        <h3 className="text-xl font-display font-bold mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <CalendarDaysIcon className="w-8 h-8 mb-2 text-white" />
            <p className="font-display font-semibold mb-1">Best Day for Calls</p>
            <p className="text-sm text-green-100">Friday with 28 calls on average</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <ClockIcon className="w-8 h-8 mb-2 text-white" />
            <p className="font-display font-semibold mb-1">Peak Call Time</p>
            <p className="text-sm text-green-100">3pm - 4pm receives most calls</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <LightBulbIcon className="w-8 h-8 mb-2 text-white" />
            <p className="font-display font-semibold mb-1">Recommendation</p>
            <p className="text-sm text-green-100">Staff availability during peak hours increases conversions</p>
          </div>
        </div>
      </div>

      {/* Top Performing Services */}
      <div className="bg-zinc-900 rounded-xl shadow-sm p-6 border border-zinc-800">
        <h3 className="text-lg font-display font-semibold text-white mb-4">Top Performing Services</h3>
        <div className="space-y-4">
          {[
            { name: 'Consultation', bookings: 45, revenue: 4500 },
            { name: 'Follow-up Appointment', bookings: 38, revenue: 3800 },
            { name: 'New Patient Intake', bookings: 28, revenue: 2800 },
            { name: 'Treatment Session', bookings: 22, revenue: 2200 },
          ].map((service, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-zinc-800 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 bg-green-900/20 rounded-lg text-green-400 font-bold border border-green-800/30">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-white">{service.name}</p>
                  <p className="text-sm text-zinc-400">{service.bookings} bookings</p>
                </div>
              </div>
              <p className="text-lg font-semibold text-white">${service.revenue}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
