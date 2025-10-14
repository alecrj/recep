import Layout from '../components/Layout';

export default function Analytics() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600 mt-1">Platform metrics and insights</p>
        </div>

        <div className="card">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h3>
            <p className="text-gray-600">
              Advanced analytics and reporting features will be available here
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
