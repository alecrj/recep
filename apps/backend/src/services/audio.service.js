const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { Readable, PassThrough } = require('stream');
const logger = require('../utils/logger');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * AudioService - Handles audio format conversions for Twilio
 *
 * Key conversions:
 * - MP3 (from ElevenLabs) → μ-law (for Twilio Media Streams)
 * - Streaming conversion with low latency
 */

class AudioService {
  constructor() {
    logger.info('AudioService initialized');
  }

  /**
   * Convert MP3 audio buffer to μ-law PCM format for Twilio
   *
   * Twilio Media Streams expect:
   * - Encoding: G.711 μ-law
   * - Sample rate: 8000 Hz
   * - Channels: 1 (mono)
   * - No headers (raw PCM)
   *
   * @param {Buffer} mp3Buffer - MP3 audio from ElevenLabs
   * @returns {Promise<Buffer>} - μ-law encoded audio buffer
   */
  async convertMP3ToMulaw(mp3Buffer) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const chunks = [];

      // Create readable stream from buffer
      const inputStream = new Readable();
      inputStream.push(mp3Buffer);
      inputStream.push(null);

      // Create output stream to collect chunks
      const outputStream = new PassThrough();

      outputStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      outputStream.on('end', () => {
        const result = Buffer.concat(chunks);
        const conversionTime = Date.now() - startTime;

        logger.debug('Audio conversion completed', {
          inputSize: mp3Buffer.length,
          outputSize: result.length,
          conversionTime,
        });

        resolve(result);
      });

      outputStream.on('error', (error) => {
        logger.error('Audio conversion error', {
          error: error.message,
        });
        reject(error);
      });

      // Use FFmpeg to convert
      ffmpeg(inputStream)
        .inputFormat('mp3')
        .audioCodec('pcm_mulaw')
        .audioFrequency(8000)
        .audioChannels(1)
        .format('mulaw')
        .on('error', (err) => {
          logger.error('FFmpeg error', {
            error: err.message,
          });
          reject(err);
        })
        .pipe(outputStream, { end: true });
    });
  }

  /**
   * Chunk μ-law audio into Twilio-compatible payloads
   *
   * Twilio expects audio in small chunks (20ms = 160 bytes for 8kHz μ-law)
   * Each chunk needs to be base64 encoded
   *
   * @param {Buffer} mulawBuffer - Raw μ-law audio
   * @param {number} chunkSizeBytes - Size of each chunk (default 160 bytes = 20ms)
   * @returns {Array<string>} - Array of base64-encoded audio chunks
   */
  chunkAudioForTwilio(mulawBuffer, chunkSizeBytes = 160) {
    const chunks = [];

    for (let i = 0; i < mulawBuffer.length; i += chunkSizeBytes) {
      const chunk = mulawBuffer.slice(i, i + chunkSizeBytes);
      const base64 = chunk.toString('base64');
      chunks.push(base64);
    }

    logger.debug('Audio chunked for Twilio', {
      totalBytes: mulawBuffer.length,
      chunkSize: chunkSizeBytes,
      numChunks: chunks.length,
      estimatedDurationMs: (mulawBuffer.length / 8000) * 1000, // 8000 bytes per second at 8kHz
    });

    return chunks;
  }

  /**
   * Complete conversion pipeline: MP3 → μ-law
   *
   * @param {Buffer} mp3Buffer - MP3 audio from ElevenLabs
   * @returns {Promise<Buffer>} - μ-law audio buffer ready for Twilio
   */
  async convertMP3ForTwilio(mp3Buffer) {
    try {
      const startTime = Date.now();

      // Convert MP3 to μ-law
      const mulawBuffer = await this.convertMP3ToMulaw(mp3Buffer);

      const totalTime = Date.now() - startTime;

      logger.info('Audio conversion completed', {
        mp3Size: mp3Buffer.length,
        mulawSize: mulawBuffer.length,
        conversionTime: totalTime,
      });

      return mulawBuffer;
    } catch (error) {
      logger.error('Audio conversion pipeline failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Send audio to Twilio via WebSocket
   *
   * Twilio accepts audio of ANY size - send it all at once for best results
   *
   * @param {WebSocket} ws - Twilio Media Stream WebSocket
   * @param {Buffer} mulawBuffer - Raw μ-law audio buffer
   * @param {string} streamSid - Twilio stream SID
   * @returns {Promise<void>}
   */
  async sendAudioToTwilio(ws, mulawBuffer, streamSid) {
    return new Promise((resolve, reject) => {
      try {
        // Convert entire buffer to base64
        const payload = mulawBuffer.toString('base64');

        // Send as single media message
        const message = {
          event: 'media',
          streamSid: streamSid,
          media: {
            payload: payload,
          },
        };

        logger.info('Sending audio to Twilio', {
          audioSize: mulawBuffer.length,
          payloadSize: payload.length,
          estimatedDurationMs: (mulawBuffer.length / 8000) * 1000,
        });

        ws.send(JSON.stringify(message));

        logger.info('Audio sent successfully');
        resolve();
      } catch (error) {
        logger.error('Error sending audio to Twilio', {
          error: error.message,
        });
        reject(error);
      }
    });
  }

  /**
   * Get estimated audio duration from μ-law buffer
   *
   * @param {Buffer} mulawBuffer - Raw μ-law audio
   * @returns {number} - Duration in milliseconds
   */
  getAudioDurationMs(mulawBuffer) {
    // μ-law at 8kHz = 8000 bytes per second
    const durationSeconds = mulawBuffer.length / 8000;
    return durationSeconds * 1000;
  }

  /**
   * Convert Buffer to base64 string
   *
   * @param {Buffer} buffer - Audio buffer
   * @returns {string} - Base64 encoded string
   */
  bufferToBase64(buffer) {
    return buffer.toString('base64');
  }

  /**
   * Convert base64 string to Buffer
   *
   * @param {string} base64 - Base64 encoded audio
   * @returns {Buffer} - Audio buffer
   */
  base64ToBuffer(base64) {
    return Buffer.from(base64, 'base64');
  }
}

// Export singleton instance
module.exports = new AudioService();
