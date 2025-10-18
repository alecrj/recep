import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import api from '../lib/api';

export default function UsageAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['usage-analytics'],
    queryFn: async () => {
      const response = await api.get('/admin/usage-analytics');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="animate-pulse bg-zinc-900 rounded-xl border border-zinc-800 p-6 h-64"></div>
    );
  }

  const usage = data?.usage || {};
  const costs = data?.costs || {};
  const trends = data?.trends || {};

  return (
    <div className="space-y-6">
      {/* Real-Time Usage Metrics */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-8 text-white shadow-lg shadow-purple-500/10">
        <h2 className="text-2xl font-display font-bold mb-6">⚡ Real-Time Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="w-5 h-5 text-purple-100" />
              <p className="text-purple-100 text-sm">Today</p>
            </div>
            <p className="text-3xl font-bold">{usage.today?.minutes || 0} min</p>
            <p className="text-sm text-purple-200 mt-1">${usage.today?.cost || 0} cost</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ChartBarIcon className="w-5 h-5 text-purple-100" />
              <p className="text-purple-100 text-sm">This Week</p>
            </div>
            <p className="text-3xl font-bold">{usage.week?.minutes || 0} min</p>
            <p className="text-sm text-purple-200 mt-1">${usage.week?.cost || 0} cost</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CurrencyDollarIcon className="w-5 h-5 text-purple-100" />
              <p className="text-purple-100 text-sm">This Month</p>
            </div>
            <p className="text-3xl font-bold">{usage.month?.minutes || 0} min</p>
            <p className="text-sm text-purple-200 mt-1">${usage.month?.cost || 0} cost</p>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border-2 border-white/30">
            <div className="flex items-center gap-2 mb-2">
              <FireIcon className="w-5 h-5 text-white" />
              <p className="text-white text-sm font-semibold">Burn Rate</p>
            </div>
            <p className="text-3xl font-bold">${costs.dailyBurnRate || 0}/day</p>
            <p className="text-sm text-purple-100 mt-1">${(costs.dailyBurnRate * 30).toFixed(0)}/mo projected</p>
          </div>
        </div>
      </div>

      {/* Cost Breakdown by Time Period */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Trends */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h3 className="text-lg font-display font-semibold text-white mb-4">
            💰 Cost Trends (Last 7 Days)
          </h3>
          {trends.daily && trends.daily.length > 0 ? (
            <div className="space-y-3">
              {trends.daily.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-zinc-400 w-20">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1">
                      <div className="h-8 bg-zinc-950 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
                          style={{
                            width: `${Math.min((day.cost / (costs.dailyBurnRate || 1)) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-medium text-white">${day.cost}</p>
                    <p className="text-xs text-zinc-500">{day.minutes} min</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-8">No usage data yet</p>
          )}
        </div>

        {/* Usage Distribution */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h3 className="text-lg font-display font-semibold text-white mb-4">
            📊 Usage Distribution
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-400">AI Processing</span>
                <span className="text-sm font-medium text-white">
                  ${costs.breakdown?.ai || 0} ({((costs.breakdown?.ai / costs.total * 100) || 0).toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                  style={{ width: `${((costs.breakdown?.ai / costs.total) * 100) || 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-400">Phone Calls</span>
                <span className="text-sm font-medium text-white">
                  ${costs.breakdown?.phone || 0} ({((costs.breakdown?.phone / costs.total * 100) || 0).toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                  style={{ width: `${((costs.breakdown?.phone / costs.total) * 100) || 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-400">Infrastructure</span>
                <span className="text-sm font-medium text-white">
                  ${costs.breakdown?.infrastructure || 0} ({((costs.breakdown?.infrastructure / costs.total * 100) || 0).toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                  style={{ width: `${((costs.breakdown?.infrastructure / costs.total) * 100) || 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-400">Other (SMS, Stripe)</span>
                <span className="text-sm font-medium text-white">
                  ${costs.breakdown?.other || 0} ({((costs.breakdown?.other / costs.total * 100) || 0).toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{ width: `${((costs.breakdown?.other / costs.total) * 100) || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Cost Businesses */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="text-lg font-display font-semibold text-white mb-4">
          🏢 Top Cost Businesses (This Month)
        </h3>
        {data?.topBusinesses && data.topBusinesses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Business</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Calls</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Minutes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Revenue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.topBusinesses.map((business, index) => (
                  <tr key={business.id} className="hover:bg-zinc-800 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{business.name}</p>
                          <p className="text-xs text-zinc-500">{business.plan}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{business.calls}</td>
                    <td className="px-4 py-3 text-sm text-white">{business.minutes.toFixed(0)}</td>
                    <td className="px-4 py-3 text-sm text-red-400 font-medium">${business.cost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-green-400 font-medium">${business.revenue.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {business.margin >= 0 ? (
                          <>
                            <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-500 font-medium">{business.margin.toFixed(1)}%</span>
                          </>
                        ) : (
                          <>
                            <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-500 font-medium">{business.margin.toFixed(1)}%</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-500 text-center py-8">No business usage data yet</p>
        )}
      </div>
    </div>
  );
}
