const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const config = require('../utils/config');
const logger = require('../utils/logger');

/**
 * DeepgramService - Real-time speech-to-text transcription
 *
 * Features:
 * - Streaming transcription from audio
 * - Automatic silence detection
 * - Speaker recognition
 * - Test mode for development
 */

class DeepgramService {
  constructor() {
    this.testMode = !config.DEEPGRAM_API_KEY || config.DEEPGRAM_API_KEY === 'your_deepgram_api_key';

    if (this.testMode) {
      logger.warn('DeepgramService running in TEST MODE - using mock transcription');
      this.client = null;
    } else {
      this.client = createClient(config.DEEPGRAM_API_KEY);
      logger.info('DeepgramService initialized with real Deepgram API');
    }

    // Mock responses for testing
    this.mockResponses = [
      "Hi, I need to schedule an appointment",
      "I need my AC fixed",
      "What are your hours?",
      "How much does it cost?",
      "Can I book for tomorrow at 2pm?",
    ];
    this.mockIndex = 0;
  }

  /**
   * Create live transcription connection
   */
  createLiveTranscription(options = {}) {
    if (this.testMode) {
      return this.createMockLiveTranscription();
    }

    try {
      const connection = this.client.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        endpointing: 300, // ms of silence to detect end of speech
        punctuate: true,
        ...options,
      });

      logger.info('Deepgram live transcription connection created');
      return connection;
    } catch (error) {
      logger.error('Failed to create Deepgram connection', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create mock transcription for testing
   */
  createMockLiveTranscription() {
    const EventEmitter = require('events');
    const mockConnection = new EventEmitter();

    mockConnection.send = (audio) => {
      // Simulate transcription after receiving audio
      setTimeout(() => {
        const mockText = this.mockResponses[this.mockIndex % this.mockResponses.length];
        this.mockIndex++;

        // Emit interim result
        mockConnection.emit(LiveTranscriptionEvents.Transcript, {
          is_final: false,
          speech_final: false,
          channel: {
            alternatives: [{
              transcript: mockText.substring(0, Math.floor(mockText.length / 2)),
              confidence: 0.85,
            }],
          },
        });

        // Emit final result
        setTimeout(() => {
          mockConnection.emit(LiveTranscriptionEvents.Transcript, {
            is_final: true,
            speech_final: true,
            channel: {
              alternatives: [{
                transcript: mockText,
                confidence: 0.95,
              }],
            },
          });
        }, 500);
      }, 1000);
    };

    mockConnection.finish = () => {
      mockConnection.emit(LiveTranscriptionEvents.Close);
    };

    logger.info('[TEST MODE] Mock Deepgram transcription connection created');
    return mockConnection;
  }

  /**
   * Setup event handlers for live transcription
   */
  setupTranscriptionHandlers(connection, callbacks) {
    const {
      onTranscript,
      onSpeechStarted,
      onUtteranceEnd,
      onError,
      onClose,
    } = callbacks;

    // Transcript received
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      const isFinal = data.is_final;
      const speechFinal = data.speech_final;
      const confidence = data.channel?.alternatives?.[0]?.confidence;

      if (transcript && transcript.trim().length > 0) {
        if (onTranscript) {
          onTranscript({
            text: transcript,
            isFinal,
            speechFinal,
            confidence,
          });
        }

        logger.debug('Transcript received', {
          text: transcript.substring(0, 50),
          isFinal,
          speechFinal,
          confidence,
        });
      }
    });

    // Speech started
    connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
      if (onSpeechStarted) {
        onSpeechStarted();
      }
      logger.debug('Speech started');
    });

    // Utterance end (user finished speaking)
    connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      if (onUtteranceEnd) {
        onUtteranceEnd();
      }
      logger.debug('Utterance ended');
    });

    // Errors
    connection.on(LiveTranscriptionEvents.Error, (error) => {
      logger.error('Deepgram error', { error: error.message });
      if (onError) {
        onError(error);
      }
    });

    // Connection closed
    connection.on(LiveTranscriptionEvents.Close, () => {
      logger.info('Deepgram connection closed');
      if (onClose) {
        onClose();
      }
    });

    // Metadata (connection info)
    connection.on(LiveTranscriptionEvents.Metadata, (metadata) => {
      logger.debug('Deepgram metadata received', { metadata });
    });

    logger.info('Deepgram transcription handlers set up');
  }

  /**
   * Process audio chunk and send to Deepgram
   */
  async processAudioChunk(connection, audioData) {
    if (this.testMode) {
      // In test mode, just trigger mock transcription
      connection.send(audioData);
      return;
    }

    try {
      if (connection && connection.getReadyState() === 1) {
        connection.send(audioData);
      } else {
        logger.warn('Deepgram connection not ready, dropping audio chunk');
      }
    } catch (error) {
      logger.error('Failed to send audio to Deepgram', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Close transcription connection
   */
  closeConnection(connection) {
    try {
      if (connection) {
        connection.finish();
        logger.info('Deepgram connection closed');
      }
    } catch (error) {
      logger.error('Error closing Deepgram connection', {
        error: error.message,
      });
    }
  }

  /**
   * Transcribe audio file (non-streaming)
   */
  async transcribeAudioFile(audioBuffer, options = {}) {
    if (this.testMode) {
      logger.info('[TEST MODE] Mock file transcription');
      return {
        transcript: "This is a mock transcription of an audio file.",
        confidence: 0.95,
        duration: 10.5,
        testMode: true,
      };
    }

    try {
      const { result } = await this.client.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-2',
          smart_format: true,
          punctuate: true,
          ...options,
        }
      );

      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      const confidence = result.results?.channels?.[0]?.alternatives?.[0]?.confidence;

      logger.info('Audio file transcribed', {
        duration: result.metadata?.duration,
        confidence,
      });

      return {
        transcript,
        confidence,
        duration: result.metadata?.duration,
      };
    } catch (error) {
      logger.error('Failed to transcribe audio file', {
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new DeepgramService();
