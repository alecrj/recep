const axios = require('axios');
const config = require('../utils/config');
const logger = require('../utils/logger');

class ElevenLabsService {
  constructor() {
    this.testMode = !config.ELEVENLABS_API_KEY || config.ELEVENLABS_API_KEY === 'your_elevenlabs_api_key';
    this.baseUrl = 'https://api.elevenlabs.io/v1';

    if (this.testMode) {
      logger.warn('ElevenLabsService running in TEST MODE');
    } else {
      logger.info('ElevenLabsService initialized');
    }
  }

  async textToSpeech(text, voiceId = 'EXAVITQu4vr4xnSDxMaL') {
    // DEFAULT VOICE: Sarah (EXAVITQu4vr4xnSDxMaL) - Oct 2025 best practice
    // Most human-like voice for conversational AI phone calls
    //
    // Other premium options available:
    // - 'IKne3meq5aSn9XLyUdCD' = Charlie (friendly male, very natural)
    // - 'FGY2WhTYpPnrIDTdsKH5' = Laura (conversational female)
    // - 'pNInz6obpgDQGcFmaJgB' = Adam (professional male)

    if (this.testMode) {
      logger.info('[TEST MODE] Would convert to speech', { text: text.substring(0, 50) });
      return {
        audio: Buffer.from('MOCK_AUDIO_DATA'),
        duration: Math.max(2000, text.length * 50),
      };
    }

    const response = await axios.post(
      `${this.baseUrl}/text-to-speech/${voiceId}/stream`,
      {
        text,
        model_id: 'eleven_turbo_v2_5', // Latest model (Oct 2025)
        voice_settings: {
          stability: 0.15,           // ULTRA LOW for natural variation
          similarity_boost: 0.90,    // VERY HIGH for consistency
          style: 0.85,               // MAXIMUM expressiveness
          use_speaker_boost: true,   // Phone clarity
        },
        optimize_streaming_latency: 4, // Maximum speed
      },
      {
        headers: {
          'xi-api-key': config.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        responseType: 'arraybuffer',
      }
    );

    const audioBuffer = Buffer.from(response.data);
    logger.info('ElevenLabs audio generated', { size: audioBuffer.length });

    return {
      audio: audioBuffer,
      duration: Math.max(2000, text.length * 50),
    };
  }

  /**
   * Stream text-to-speech with real-time chunked audio delivery
   * Returns a stream that emits audio chunks as they're generated
   */
  async textToSpeechStream(text, voiceId = 'EXAVITQu4vr4xnSDxMaL') {
    // DEFAULT VOICE: Sarah (EXAVITQu4vr4xnSDxMaL)
    // Best for conversational AI as of Oct 2025 - warm, natural, emotionally expressive
    // Can be overridden per-business via voiceId parameter

    if (this.testMode) {
      logger.info('[TEST MODE] Would stream speech', { text: text.substring(0, 50) });
      // Return mock stream
      const { Readable } = require('stream');
      const mockStream = new Readable();
      mockStream.push(Buffer.from('MOCK_AUDIO_DATA'));
      mockStream.push(null);
      return mockStream;
    }

    const response = await axios.post(
      `${this.baseUrl}/text-to-speech/${voiceId}/stream`,
      {
        text,
        model_id: 'eleven_turbo_v2_5',  // Latest model (Oct 2025) - fastest + highest quality
        voice_settings: {
          stability: 0.15,           // ULTRA LOW = maximum human variation, breaths, natural pauses, sighs
          similarity_boost: 0.90,    // VERY HIGH = strong voice consistency and character
          style: 0.85,               // MAXIMUM = natural reactions, laughs, "mm-hmm", emotional inflection
          use_speaker_boost: true,   // Essential for phone call clarity
        },
        optimize_streaming_latency: 4, // Max speed (start sending ASAP for sub-500ms latency)
        output_format: 'mp3_44100_128', // MP3 44.1kHz (proven optimal for Twilio)
      },
      {
        headers: {
          'xi-api-key': config.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg', // MP3 audio
        },
        responseType: 'stream', // Get stream instead of buffer
      }
    );

    logger.info('ElevenLabs streaming started', { textLength: text.length });
    return response.data; // Return the readable stream
  }

  optimizeTextForSpeech(text) {
    return text
      .replace(/\$/g, 'dollars')
      .replace(/%/g, 'percent')
      .replace(/@/g, 'at')
      .replace(/&/g, 'and');
  }

  async getVoices() {
    if (this.testMode) {
      return [
        { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', category: 'premade' },
      ];
    }

    const response = await axios.get(`${this.baseUrl}/voices`, {
      headers: { 'xi-api-key': config.ELEVENLABS_API_KEY },
    });

    return response.data.voices;
  }
}

module.exports = new ElevenLabsService();
