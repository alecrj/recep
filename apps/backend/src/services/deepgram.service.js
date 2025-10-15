const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const config = require('../utils/config');
const logger = require('../utils/logger');

/**
 * DeepgramService - Real-time Speech-to-Text
 *
 * Features:
 * - Live audio transcription
 * - 80ms latency with Nova-2 model
 * - Support for G.711 μ-law (Twilio format)
 * - Utterance detection
 */

class DeepgramService {
  constructor() {
    this.testMode = !config.DEEPGRAM_API_KEY || config.DEEPGRAM_API_KEY === 'your_deepgram_api_key';

    if (this.testMode) {
      logger.warn('DeepgramService running in TEST MODE - using mock transcription');
      this.client = null;
    } else {
      this.client = createClient(config.DEEPGRAM_API_KEY);
      logger.info('DeepgramService initialized with real API key');
    }
  }

  /**
   * Create live transcription connection
   */
  createLiveTranscription() {
    if (this.testMode) {
      logger.info('[TEST MODE] Would create Deepgram live transcription');

      // Return mock connection
      return {
        testMode: true,
        mockHandlers: {},
        send: (data) => {
          // Mock transcription with random delay
          setTimeout(() => {
            if (this.mockHandlers.onTranscript) {
              this.mockHandlers.onTranscript({
                text: 'Test transcription',
                isFinal: true,
                speechFinal: true,
              });
            }
          }, 100);
        },
        finish: () => {
          logger.info('[TEST MODE] Mock Deepgram connection finished');
        },
      };
    }

    try {
      const dgConnection = this.client.listen.live({
        model: 'nova-2',
        language: 'en',
        smart_format: true,
        encoding: 'mulaw',
        sample_rate: 8000,
        channels: 1,
        interim_results: true,
        utterance_end_ms: 1000,
        endpointing: 300,
        vad_events: true,
      });

      logger.info('Deepgram live transcription connection created');
      return dgConnection;
    } catch (error) {
      logger.error('Failed to create Deepgram connection', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Setup event handlers for transcription connection
   */
  setupTranscriptionHandlers(dgConnection, handlers) {
    const { onTranscript, onUtteranceEnd, onError, onClose } = handlers;

    if (dgConnection.testMode) {
      dgConnection.mockHandlers = { onTranscript, onUtteranceEnd, onError, onClose };
      return;
    }

    dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (!transcript || transcript.trim().length === 0) return;

      const isFinal = data.is_final;
      const speechFinal = data.speech_final;

      if (onTranscript) {
        onTranscript({
          text: transcript,
          isFinal,
          speechFinal,
          confidence: data.channel?.alternatives?.[0]?.confidence,
        });
      }
    });

    dgConnection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      if (onUtteranceEnd) onUtteranceEnd();
    });

    dgConnection.on(LiveTranscriptionEvents.Error, (error) => {
      logger.error('Deepgram error', { error: error.message || error });
      if (onError) onError(error);
    });

    dgConnection.on(LiveTranscriptionEvents.Close, () => {
      logger.info('Deepgram connection closed');
      if (onClose) onClose();
    });

    dgConnection.on(LiveTranscriptionEvents.Open, () => {
      logger.info('Deepgram connection opened');
    });
  }

  /**
   * Process audio chunk and send to Deepgram
   */
  async processAudioChunk(dgConnection, audioBuffer) {
    if (dgConnection.testMode) {
      dgConnection.send(audioBuffer);
      return;
    }

    try {
      if (dgConnection.getReadyState() === 1) {
        dgConnection.send(audioBuffer);
      }
    } catch (error) {
      logger.error('Error sending audio to Deepgram', { error: error.message });
      throw error;
    }
  }

  /**
   * Close Deepgram connection
   */
  closeConnection(dgConnection) {
    if (dgConnection.testMode) {
      logger.info('[TEST MODE] Would close Deepgram connection');
      if (dgConnection.mockHandlers?.onClose) {
        dgConnection.mockHandlers.onClose();
      }
      return;
    }

    try {
      dgConnection.finish();
      logger.info('Deepgram connection closed');
    } catch (error) {
      logger.error('Error closing Deepgram connection', { error: error.message });
    }
  }
}

module.exports = new DeepgramService();
