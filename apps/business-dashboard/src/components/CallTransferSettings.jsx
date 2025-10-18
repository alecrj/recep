import { useState, useEffect } from 'react';
import { PhoneIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function CallTransferSettings({
  transferEnabled: initialEnabled = false,
  transferNumber: initialNumber = '',
  transferKeywords: initialKeywords = [],
  onChange
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [phoneNumber, setPhoneNumber] = useState(initialNumber);
  const [keywords, setKeywords] = useState(
    Array.isArray(initialKeywords) ? initialKeywords.join(', ') : ''
  );

  // Default suggestions for different business types
  const defaultKeywords = 'urgent, leak, flooding, no heat, no cooling, broken, emergency';

  // Update parent whenever anything changes
  useEffect(() => {
    onChange({
      transferEnabled: enabled,
      transferNumber: phoneNumber,
      transferKeywords: keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
    });
  }, [enabled, phoneNumber, keywords, onChange]);

  const handleToggle = () => {
    setEnabled(!enabled);
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    } else {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-display font-semibold text-white mb-2">
            Call Transfer Settings
          </h3>
          <p className="text-sm text-zinc-400">
            Automatically transfer calls to a human when customers use urgent keywords
          </p>
        </div>
        <label className="relative inline-block w-14 h-8 flex-shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            className="sr-only peer"
          />
          <div className="w-full h-full bg-zinc-700 rounded-full peer-checked:bg-green-500 transition-colors cursor-pointer"></div>
          <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-6 cursor-pointer"></div>
        </label>
      </div>

      {/* Status Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
        enabled
          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
      }`}>
        <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-400' : 'bg-zinc-500'}`} />
        {enabled ? 'Call Transfer Enabled' : 'Call Transfer Disabled'}
      </div>

      {/* Configuration (only show when enabled) */}
      {enabled && (
        <div className="space-y-6 pt-4">
          {/* Transfer Phone Number */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Transfer To Phone Number <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                maxLength="14"
                className="w-full pl-10 pr-4 py-3 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Your personal phone or on-call staff number
            </p>
          </div>

          {/* Urgent Keywords */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Urgent Keywords
            </label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder={defaultKeywords}
              rows={4}
              className="w-full px-4 py-3 border border-zinc-800 rounded-lg bg-zinc-900 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Comma-separated. When customers say these words, the call will be transferred immediately.
            </p>
          </div>

          {/* How it Works */}
          <div className="bg-cyan-900/20 border border-cyan-800/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ArrowPathIcon className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-cyan-300 mb-2">
                  How Call Transfer Works
                </h4>
                <ol className="text-sm text-cyan-400 space-y-1.5 list-decimal list-inside">
                  <li>Customer calls your AI receptionist</li>
                  <li>They mention an urgent keyword (e.g., "leak", "broken")</li>
                  <li>AI immediately says "Let me transfer you to someone who can help"</li>
                  <li>Call is transferred to your phone number</li>
                  <li>You handle the urgent situation</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-white mb-3">
              Common Keywords by Industry
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-zinc-400 mb-1">HVAC:</p>
                <p className="text-xs text-zinc-500">
                  no heat, no cooling, leak, flooding, gas smell
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-400 mb-1">Plumbing:</p>
                <p className="text-xs text-zinc-500">
                  leak, flooding, burst pipe, no water, sewage
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-400 mb-1">Dental:</p>
                <p className="text-xs text-zinc-500">
                  severe pain, bleeding, broken tooth, swelling
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-400 mb-1">Legal:</p>
                <p className="text-xs text-zinc-500">
                  arrest, detained, court today, deadline today
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disabled State Message */}
      {!enabled && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 text-center">
          <p className="text-sm text-zinc-400">
            Call transfer is currently disabled. Toggle on to configure urgent call handling.
          </p>
        </div>
      )}
    </div>
  );
}
