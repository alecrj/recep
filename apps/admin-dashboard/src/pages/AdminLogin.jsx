import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/admin/login', { email, password });

      if (response.data.success) {
        // Store admin token
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('adminUser', JSON.stringify(response.data.user));
        navigate('/');
      } else {
        setError(response.data.error || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-full mb-4">
            <ShieldCheckIcon className="w-10 h-10 text-purple-500" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">
            Admin Portal
          </h1>
          <p className="text-zinc-400">Voxi AI Receptionist</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-800/30 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="admin@voxi.ai"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In as Admin'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-zinc-800">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs font-medium text-zinc-400 mb-2 text-center">🔐 Admin Credentials</p>
            <div className="space-y-1 text-center">
              <p className="text-sm font-mono text-purple-400">admin@voxi.ai</p>
              <p className="text-sm font-mono text-purple-400">admin123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
