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

  async textToSpeech(text, voiceId = 'pNInz6obpgDQGcFmaJgB') {
    // Using Adam (professional, energetic, warm male voice)
    // Other good options:
    // - 'EXAVITQu4vr4xnSDxMaL' = Sarah (warm female)
    // - 'ThT5KcBeYPX3keUQqHPh' = Dorothy (friendly female)
    // - 'pNInz6obpgDQGcFmaJgB' = Adam (friendly male) <- USING THIS

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
        model_id: 'eleven_turbo_v2_5', // Fastest model
        voice_settings: {
          stability: 0.65, // Higher for phone clarity
          similarity_boost: 0.8, // Higher for natural sound
          style: 0.3, // Lower for more consistent delivery
          use_speaker_boost: true,
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
  async textToSpeechStream(text, voiceId = 'pNInz6obpgDQGcFmaJgB') {
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
        model_id: 'eleven_turbo_v2_5',  // Fastest model with high quality
        voice_settings: {
          stability: 0.50,           // Lower = more expressive, human-like variation
          similarity_boost: 0.75,    // High = maintains voice character
          style: 0.45,               // Higher = more expressive/emotional (KEY for human-like)
          use_speaker_boost: true,   // Enhances clarity for phone calls
        },
        optimize_streaming_latency: 4, // Max speed = 4 (start sending ASAP)
      },
      {
        headers: {
          'xi-api-key': config.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
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
