import { ChartBarIcon } from '@heroicons/react/24/outline';

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Analytics</h2>
        <p className="text-zinc-400 mt-1">Platform metrics and insights</p>
      </div>

      <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 p-6">
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-green-500/10 rounded-xl">
              <ChartBarIcon className="w-16 h-16 text-green-500" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Coming Soon</h3>
          <p className="text-zinc-400">
            Advanced analytics and reporting features will be available here
          </p>
        </div>
      </div>
    </div>
  );
}
