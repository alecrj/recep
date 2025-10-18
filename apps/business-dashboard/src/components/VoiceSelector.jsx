import { useState } from 'react';
import { SpeakerWaveIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const VOICE_OPTIONS = [
  {
    id: 'sarah',
    name: 'Sarah',
    gender: 'Female',
    tone: 'Professional & Warm',
    description: 'Our signature voice - warm, natural, and emotionally expressive. Perfect for making customers feel heard and valued.',
    available: true,
    isDefault: true,
  },
  {
    id: 'marcus',
    name: 'Marcus',
    gender: 'Male',
    tone: 'Deep & Authoritative',
    description: 'Professional male voice with a commanding presence. Ideal for businesses wanting a strong, confident tone.',
    available: false,
    comingSoon: true,
  },
  {
    id: 'emma',
    name: 'Emma',
    gender: 'Female',
    tone: 'Friendly & Upbeat',
    description: 'Energetic and conversational voice that puts customers at ease. Great for customer service and support.',
    available: false,
    comingSoon: true,
  },
];

export default function VoiceSelector({ selectedVoice = 'sarah', onChange }) {
  const [selected, setSelected] = useState(selectedVoice);

  const handleSelect = (voiceId) => {
    const voice = VOICE_OPTIONS.find(v => v.id === voiceId);
    if (!voice.available) return; // Don't allow selecting unavailable voices

    setSelected(voiceId);
    if (onChange) {
      onChange(voiceId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-display font-semibold text-white">
          AI Voice Selection
        </h3>
        <p className="text-sm text-zinc-400 mt-1">
          Choose the voice your customers will hear when they call
        </p>
      </div>

      {/* Voice Options */}
      <div className="space-y-3">
        {VOICE_OPTIONS.map((voice) => (
          <div
            key={voice.id}
            onClick={() => handleSelect(voice.id)}
            className={`relative border rounded-lg p-4 transition-all ${
              voice.available
                ? selected === voice.id
                  ? 'border-green-500 bg-green-900/20 cursor-pointer'
                  : 'border-zinc-800 bg-zinc-950 cursor-pointer hover:border-zinc-700'
                : 'border-zinc-800 bg-zinc-950 opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Voice Icon */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                voice.available && selected === voice.id
                  ? 'bg-green-500/20'
                  : 'bg-zinc-800'
              }`}>
                <SpeakerWaveIcon className={`w-6 h-6 ${
                  voice.available && selected === voice.id
                    ? 'text-green-400'
                    : 'text-zinc-500'
                }`} />
              </div>

              {/* Voice Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-base font-semibold text-white">
                    {voice.name}
                  </h4>
                  <span className="text-xs text-zinc-500">•</span>
                  <span className="text-sm text-zinc-400">{voice.gender}</span>

                  {voice.isDefault && voice.available && (
                    <>
                      <span className="text-xs text-zinc-500">•</span>
                      <span className="px-2 py-0.5 bg-cyan-900/30 text-cyan-400 border border-cyan-800/30 rounded text-xs font-medium">
                        Current
                      </span>
                    </>
                  )}

                  {voice.comingSoon && (
                    <>
                      <span className="text-xs text-zinc-500">•</span>
                      <span className="px-2 py-0.5 bg-amber-900/30 text-amber-400 border border-amber-800/30 rounded text-xs font-medium flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        Coming Soon
                      </span>
                    </>
                  )}
                </div>

                <p className="text-xs font-medium text-zinc-400 mb-2">
                  {voice.tone}
                </p>

                <p className="text-sm text-zinc-500 leading-relaxed">
                  {voice.description}
                </p>

                {/* Preview Button - Only for available voices */}
                {voice.available && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Add preview functionality when ready
                      alert('Voice preview coming soon!');
                    }}
                    className="mt-3 text-sm text-green-400 hover:text-green-300 font-medium transition-colors flex items-center gap-1"
                  >
                    <SpeakerWaveIcon className="w-4 h-4" />
                    Preview Voice
                  </button>
                )}
              </div>

              {/* Selection Indicator */}
              {voice.available && selected === voice.id && (
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="w-6 h-6 text-green-500" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-cyan-900/20 border border-cyan-800/30 rounded-lg p-4">
        <p className="text-sm text-cyan-300">
          <span className="font-semibold">💡 About Voice Selection:</span> Each voice is a custom-trained conversational AI agent optimized for phone calls. More voice options are being added soon!
        </p>
      </div>
    </div>
  );
}
