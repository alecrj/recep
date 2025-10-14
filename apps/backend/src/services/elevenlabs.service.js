const axios = require('axios');
const config = require('../utils/config');
const logger = require('../utils/logger');

/**
 * ElevenLabsService - Natural text-to-speech
 *
 * Features:
 * - Convert text to natural speech
 * - Multiple voices
 * - Streaming audio output
 * - Test mode with mock audio
 */

class ElevenLabsService {
  constructor() {
    this.testMode = !config.ELEVENLABS_API_KEY || config.ELEVENLABS_API_KEY === 'your_elevenlabs_api_key';

    if (this.testMode) {
      logger.warn('ElevenLabsService running in TEST MODE - using mock audio');
      this.apiKey = null;
    } else {
      this.apiKey = config.ELEVENLABS_API_KEY;
      this.baseUrl = 'https://api.elevenlabs.io/v1';
      logger.info('ElevenLabsService initialized with real ElevenLabs API');
    }

    // Default voice IDs (Rachel - professional female voice)
    this.defaultVoiceId = '21m00Tcm4TlvDq8ikWAM';
  }

  /**
   * Convert text to speech
   */
  async textToSpeech(text, voiceId = null, options = {}) {
    if (this.testMode) {
      return this.generateMockAudio(text);
    }

    const voice = voiceId || this.defaultVoiceId;

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voice}`,
        {
          text,
          model_id: options.model || 'eleven_monolingual_v1',
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarityBoost || 0.75,
          },
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      logger.info('Text-to-speech generated', {
        textLength: text.length,
        voiceId: voice,
        audioSize: response.data.length,
      });

      return {
        audio: Buffer.from(response.data),
        contentType: 'audio/mpeg',
      };
    } catch (error) {
      logger.error('ElevenLabs API error', {
        error: error.message,
        text: text.substring(0, 50),
      });
      throw error;
    }
  }

  /**
   * Stream text-to-speech (for real-time response)
   */
  async streamTextToSpeech(text, voiceId = null, onChunk, options = {}) {
    if (this.testMode) {
      return this.streamMockAudio(text, onChunk);
    }

    const voice = voiceId || this.defaultVoiceId;

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voice}/stream`,
        {
          text,
          model_id: options.model || 'eleven_monolingual_v1',
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarityBoost || 0.75,
          },
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        }
      );

      return new Promise((resolve, reject) => {
        let audioChunks = [];

        response.data.on('data', (chunk) => {
          audioChunks.push(chunk);
          onChunk(chunk);
        });

        response.data.on('end', () => {
          logger.info('Streaming TTS completed', {
            textLength: text.length,
            totalChunks: audioChunks.length,
          });
          resolve({
            audio: Buffer.concat(audioChunks),
            contentType: 'audio/mpeg',
          });
        });

        response.data.on('error', (error) => {
          logger.error('Streaming TTS error', { error: error.message });
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Streaming TTS error', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate mock audio for testing
   */
  generateMockAudio(text) {
    // Generate a simple mock audio buffer (silence)
    const durationSeconds = Math.max(2, text.length / 15); // Rough estimate: 15 chars per second
    const sampleRate = 8000; // 8kHz for phone audio
    const samples = Math.floor(durationSeconds * sampleRate);

    // Generate mock audio (just silence for testing)
    const buffer = Buffer.alloc(samples * 2); // 16-bit audio

    logger.info('[TEST MODE] Mock audio generated', {
      text: text.substring(0, 50),
      duration: durationSeconds,
      bufferSize: buffer.length,
    });

    return {
      audio: buffer,
      contentType: 'audio/wav',
      testMode: true,
    };
  }

  /**
   * Stream mock audio for testing
   */
  async streamMockAudio(text, onChunk) {
    const mockAudio = this.generateMockAudio(text);

    // Split into chunks and stream
    const chunkSize = 1024;
    for (let i = 0; i < mockAudio.audio.length; i += chunkSize) {
      const chunk = mockAudio.audio.slice(i, i + chunkSize);
      onChunk(chunk);
      await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate network delay
    }

    logger.info('[TEST MODE] Mock audio streaming completed');
    return mockAudio;
  }

  /**
   * Get available voices
   */
  async getVoices() {
    if (this.testMode) {
      return this.getMockVoices();
    }

    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      logger.info('Voices fetched', {
        count: response.data.voices?.length,
      });

      return response.data.voices;
    } catch (error) {
      logger.error('Failed to fetch voices', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get mock voices for testing
   */
  getMockVoices() {
    return [
      {
        voice_id: '21m00Tcm4TlvDq8ikWAM',
        name: 'Rachel',
        category: 'generated',
        description: 'Professional female voice',
      },
      {
        voice_id: 'pNInz6obpgDQGcFmaJgB',
        name: 'Adam',
        category: 'generated',
        description: 'Professional male voice',
      },
      {
        voice_id: 'EXAVITQu4vr4xnSDxMaL',
        name: 'Sarah',
        category: 'generated',
        description: 'Friendly female voice',
      },
    ];
  }

  /**
   * Convert text to phonemes (for pronunciation control)
   */
  async textToPhonemes(text) {
    if (this.testMode) {
      return { phonemes: text, testMode: true };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-phonemes`,
        { text },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Text-to-phonemes error', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process text for optimal speech (clean up, add pauses)
   */
  optimizeTextForSpeech(text) {
    let optimized = text;

    // Add natural pauses
    optimized = optimized.replace(/\./g, '... '); // Longer pause after sentences
    optimized = optimized.replace(/,/g, ', '); // Short pause after commas

    // Remove multiple spaces
    optimized = optimized.replace(/\s+/g, ' ');

    // Trim
    optimized = optimized.trim();

    logger.debug('Text optimized for speech', {
      original: text.substring(0, 50),
      optimized: optimized.substring(0, 50),
    });

    return optimized;
  }

  /**
   * Estimate cost for text-to-speech
   */
  estimateCost(text, pricePerThousandChars = 0.18) {
    const chars = text.length;
    const cost = (chars / 1000) * pricePerThousandChars;

    return {
      characters: chars,
      estimatedCost: cost.toFixed(4),
      currency: 'USD',
    };
  }
}

// Export singleton instance
module.exports = new ElevenLabsService();
