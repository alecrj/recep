import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PhoneIcon, CheckCircleIcon, Cog6ToothIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';

export default function Welcome() {
  const location = useLocation();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const signupData = location.state?.signupData;

  useEffect(() => {
    // Store auth token
    if (signupData?.token) {
      login(signupData.token, signupData.business);
    }
  }, [signupData, login]);

  if (!signupData) {
    navigate('/login');
    return null;
  }

  const { business } = signupData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-full mb-6">
            <CheckCircleIcon className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-2">
            Welcome to Voxi, {business.name}! 🎉
          </h1>
          <p className="text-xl text-zinc-400">
            Your AI receptionist is ready to answer calls!
          </p>
        </div>

        {/* Phone Number Card */}
        {business.phoneNumber && (
          <div className="bg-gradient-to-br from-green-900/20 to-green-950/20 border border-green-800/30 rounded-xl p-8 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center">
                  <PhoneIcon className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-display font-semibold text-white mb-1">
                  Your AI Phone Number
                </h2>
                <p className="text-3xl font-bold text-green-400 tracking-wider">
                  {business.phoneNumber}
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(business.phoneNumber);
                  alert('Phone number copied!');
                }}
                className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 transition-colors"
              >
                Copy Number
              </button>
            </div>
            <p className="text-sm text-green-300/80">
              Forward your business line to this number, or update your Google listing. Calls will be answered 24/7 by your AI receptionist!
            </p>
          </div>
        )}

        {/* Trial Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <SparklesIcon className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-white mb-1">
                14-Day Free Trial Active
              </h3>
              <p className="text-sm text-zinc-400">
                Your trial ends on {new Date(business.trialEndsAt).toLocaleDateString()}.
                No charges until then. Cancel anytime before the trial ends.
              </p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-display font-semibold text-white mb-4">
            Next Steps to Get Started
          </h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  1
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">
                  Forward Your Business Line
                </h3>
                <p className="text-sm text-zinc-400 mb-2">
                  Set up call forwarding from your current business number to your new AI number,
                  or update your Google Business listing with this number.
                </p>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/settings');
                  }}
                  className="text-sm text-green-400 hover:text-green-300"
                >
                  View Forwarding Instructions →
                </a>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">
                  Customize Your AI
                </h3>
                <p className="text-sm text-zinc-400 mb-2">
                  Personalize your greeting, set business hours, add services, and configure your AI's personality.
                </p>
                <button
                  onClick={() => navigate('/settings')}
                  className="text-sm text-green-400 hover:text-green-300"
                >
                  Go to Settings →
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  3
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">
                  Test Your AI
                </h3>
                <p className="text-sm text-zinc-400">
                  Call your AI number and test it out! Try booking an appointment, asking questions, or leaving a message.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  4
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">
                  Connect Google Calendar (Optional)
                </h3>
                <p className="text-sm text-zinc-400 mb-2">
                  Automatically sync appointments to your Google Calendar for easy schedule management.
                </p>
                <button
                  onClick={() => navigate('/settings')}
                  className="text-sm text-green-400 hover:text-green-300"
                >
                  Connect Calendar →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex-1 btn-primary"
          >
            <Cog6ToothIcon className="w-5 h-5 mr-2 inline" />
            Go to Dashboard
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors border border-zinc-700"
          >
            Customize AI Settings
          </button>
        </div>

        {/* Help Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            Need help? <a href="mailto:support@voxi.ai" className="text-green-400 hover:text-green-300">Contact Support</a> or visit our <a href="#" className="text-green-400 hover:text-green-300">Help Center</a>
          </p>
        </div>
      </div>
    </div>
  );
}
