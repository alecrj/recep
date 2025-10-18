import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PhoneIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import api from '../lib/api';

export default function PhoneNumberManager({ currentNumber }) {
  const queryClient = useQueryClient();
  const [setupMode, setSetupMode] = useState(null); // 'new' or 'forward'
  const [searchAreaCode, setSearchAreaCode] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  // Search for available numbers
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchAreaCode || searchAreaCode.length < 3) {
      alert('Please enter at least 3 digits for area code');
      return;
    }

    setSearching(true);
    try {
      const response = await api.get(`/business/phone-numbers/search?areaCode=${searchAreaCode}`);
      setSearchResults(response.data.numbers);
    } catch (error) {
      console.error('Search failed:', error);
      alert(error.response?.data?.error || 'Failed to search for numbers');
    } finally {
      setSearching(false);
    }
  };

  // Claim number mutation
  const claimMutation = useMutation({
    mutationFn: async (phoneNumber) => {
      const response = await api.post('/business/phone-numbers/purchase', {
        phoneNumber: phoneNumber.phoneNumber,
        friendlyName: phoneNumber.friendlyName,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['profile']);
      queryClient.invalidateQueries(['config']);
      setSearchResults(null);
      setSearchAreaCode('');
      setSetupMode(null);
      alert('Phone number activated successfully! Your AI receptionist is ready to receive calls.');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to activate number');
    },
  });

  const handleClaimNumber = (number) => {
    if (!confirm(`Activate ${number.friendlyName}? This will be your AI receptionist's phone number.`)) {
      return;
    }
    claimMutation.mutate(number);
  };

  // If they already have a number, show it
  if (currentNumber) {
    return (
      <div className="space-y-6">
        {/* Active Number */}
        <div className="bg-gradient-to-br from-green-900/30 to-green-950/20 rounded-xl p-6 border border-green-800/30">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <PhoneIcon className="w-8 h-8 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-xl font-display font-bold text-green-300">Your AI Receptionist Number</h4>
                <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium border border-green-500/30 flex items-center gap-1">
                  <CheckCircleIcon className="w-4 h-4" />
                  Active
                </span>
              </div>
              <p className="text-3xl font-bold text-white mb-4">{currentNumber}</p>

              <div className="bg-cyan-900/20 border border-cyan-800/30 rounded-lg p-4">
                <p className="text-sm text-cyan-300 mb-2 font-medium">
                  📞 How Customers Can Reach You:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold mt-0.5">1.</span>
                    <p className="text-sm text-cyan-400">
                      <span className="font-semibold">Give customers this number</span> - they can call it directly
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold mt-0.5">2.</span>
                    <p className="text-sm text-cyan-400">
                      <span className="font-semibold">Forward your existing line</span> - keep your current number, forward calls here
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold mt-0.5">3.</span>
                    <p className="text-sm text-cyan-400">
                      Your AI receptionist answers automatically, books appointments, takes messages
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call Forwarding Instructions */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <ArrowPathIcon className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-lg font-display font-semibold text-white">
              Forward Your Existing Number (Optional)
            </h3>
          </div>

          <p className="text-zinc-400 mb-4">
            Want to keep your current business phone number? Just forward it to your AI receptionist number above.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">📱 For Mobile Phones:</h4>
              <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                <li>Open your phone's Settings</li>
                <li>Go to Phone → Call Forwarding</li>
                <li>Enable "Always Forward"</li>
                <li>Enter: <span className="font-mono text-green-400">{currentNumber}</span></li>
              </ol>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">☎️ For Landlines:</h4>
              <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                <li>Pick up your phone</li>
                <li>Dial: *72</li>
                <li>When you hear the tone, dial:</li>
                <li className="font-mono text-green-400 ml-4">{currentNumber}</li>
              </ol>
              <p className="text-xs text-zinc-500 mt-2">
                To disable: Dial *73
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
            <p className="text-sm text-blue-300">
              <span className="font-semibold">💡 Pro Tip:</span> Forwarding lets you keep your existing business number while using AI to answer calls. Your customers won't notice any change!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No number yet - show setup options
  if (!setupMode) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex p-4 bg-zinc-900 rounded-full mb-4">
            <PhoneIcon className="w-12 h-12 text-green-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-2">
            Set Up Your AI Receptionist
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Choose how you want to handle incoming calls. You can either get a new number or forward your existing business line.
          </p>
        </div>

        {/* Two Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Option 1: Get New Number */}
          <button
            onClick={() => setSetupMode('new')}
            className="group bg-gradient-to-br from-green-900/30 to-green-950/20 hover:from-green-900/40 hover:to-green-950/30 border border-green-800/30 hover:border-green-700/50 rounded-xl p-8 text-left transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-green-500/20 rounded-xl group-hover:bg-green-500/30 transition-colors">
                <SparklesIcon className="w-8 h-8 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-display font-bold text-green-300 mb-2">
                  Get a New Number (Free)
                </h3>
                <p className="text-sm text-green-400/80 mb-4">
                  Choose from thousands of available phone numbers in any area code
                </p>
              </div>
            </div>

            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="text-green-500">✓</span> Pick your preferred area code
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="text-green-500">✓</span> Voice + SMS enabled
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="text-green-500">✓</span> Instant activation
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="text-green-500">✓</span> No setup required
              </li>
            </ul>

            <div className="flex items-center justify-between pt-4 border-t border-green-800/30">
              <span className="text-2xl font-bold text-green-400">FREE</span>
              <span className="text-sm text-green-400 group-hover:translate-x-1 transition-transform">
                Choose Number →
              </span>
            </div>
          </button>

          {/* Option 2: Forward Existing */}
          <button
            onClick={() => setSetupMode('forward')}
            className="group bg-gradient-to-br from-cyan-900/30 to-cyan-950/20 hover:from-cyan-900/40 hover:to-cyan-950/30 border border-cyan-800/30 hover:border-cyan-700/50 rounded-xl p-8 text-left transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-cyan-500/20 rounded-xl group-hover:bg-cyan-500/30 transition-colors">
                <ArrowPathIcon className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-display font-bold text-cyan-300 mb-2">
                  Forward Existing Number
                </h3>
                <p className="text-sm text-cyan-400/80 mb-4">
                  Keep your current business number and forward calls to your AI receptionist
                </p>
              </div>
            </div>

            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="text-cyan-500">✓</span> Keep your existing number
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="text-cyan-500">✓</span> No customer disruption
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="text-cyan-500">✓</span> Simple call forwarding
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="text-cyan-500">✓</span> Works with any carrier
              </li>
            </ul>

            <div className="flex items-center justify-between pt-4 border-t border-cyan-800/30">
              <span className="text-sm text-cyan-400">Recommended for established businesses</span>
              <span className="text-sm text-cyan-400 group-hover:translate-x-1 transition-transform">
                See Instructions →
              </span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Get New Number Flow
  if (setupMode === 'new') {
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => {
            setSetupMode(null);
            setSearchResults(null);
            setSearchAreaCode('');
          }}
          className="text-sm text-zinc-400 hover:text-white flex items-center gap-2"
        >
          ← Back to options
        </button>

        {/* Search Interface */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-lg font-display font-semibold text-white mb-4">
            Choose Your Phone Number
          </h3>

          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Search by Area Code
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchAreaCode}
                    onChange={(e) => setSearchAreaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g., 415, 212, 310"
                    maxLength="3"
                    className="w-full pl-10 pr-4 py-3 border border-zinc-800 rounded-lg bg-zinc-950 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Enter your local area code to find available numbers
                </p>
              </div>
              <div className="pt-7">
                <button
                  type="submit"
                  disabled={searching || searchAreaCode.length < 3}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed h-12 whitespace-nowrap"
                >
                  {searching ? 'Searching...' : 'Search Numbers'}
                </button>
              </div>
            </div>
          </form>

          {/* Search Results */}
          {searchResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-white">
                  Available Numbers ({searchResults.length})
                </h4>
                <button
                  onClick={() => setSearchResults(null)}
                  className="text-sm text-zinc-400 hover:text-white"
                >
                  Clear Results
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                  {searchResults.map((number, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-green-500/50 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-green-500/20 transition-colors">
                          <PhoneIcon className="w-5 h-5 text-zinc-400 group-hover:text-green-400" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white font-mono">
                            {number.friendlyName}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-zinc-500">
                              {number.locality}, {number.region}
                            </span>
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                              Voice + SMS
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-400">FREE</p>
                          <p className="text-xs text-zinc-500">included in your plan</p>
                        </div>
                        <button
                          onClick={() => handleClaimNumber(number)}
                          disabled={claimMutation.isPending}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          {claimMutation.isPending ? 'Activating...' : 'Claim This Number'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-zinc-950 rounded-lg border border-zinc-800">
                  <XCircleIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500">No numbers available in area code {searchAreaCode}</p>
                  <p className="text-sm text-zinc-600 mt-1">Try a different area code</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Forward Existing Number Flow
  if (setupMode === 'forward') {
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => setSetupMode(null)}
          className="text-sm text-zinc-400 hover:text-white flex items-center gap-2"
        >
          ← Back to options
        </button>

        {/* Instructions */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-cyan-500/20 rounded-xl">
              <ArrowPathIcon className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xl font-display font-semibold text-white">
                Forward Your Existing Number
              </h3>
              <p className="text-sm text-zinc-400">
                First, you need a forwarding number. Choose one below, then forward your calls to it.
              </p>
            </div>
          </div>

          <div className="bg-cyan-900/20 border border-cyan-800/30 rounded-lg p-6 mb-6">
            <p className="text-cyan-300 font-medium mb-4">
              📞 Here's how it works:
            </p>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 text-cyan-300 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <p className="text-sm text-cyan-400">
                  <span className="font-semibold">Get a forwarding number</span> - Click "Choose Forwarding Number" below to pick one
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 text-cyan-300 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <p className="text-sm text-cyan-400">
                  <span className="font-semibold">Set up call forwarding</span> - Forward your existing business line to the new number
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 text-cyan-300 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <p className="text-sm text-cyan-400">
                  <span className="font-semibold">That's it!</span> - Your AI receptionist will answer all forwarded calls
                </p>
              </li>
            </ol>
          </div>

          <button
            onClick={() => setSetupMode('new')}
            className="w-full btn-primary"
          >
            Choose Forwarding Number →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
