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
   * Stream MP3 audio and convert to μ-law in real-time
   * Processes chunks as they arrive for low-latency audio playback
   *
   * @param {ReadableStream} mp3Stream - Streaming MP3 audio from ElevenLabs
   * @returns {PassThrough} - Stream that emits μ-law audio chunks
   */
  convertMP3StreamToMulaw(mp3Stream) {
    const outputStream = new PassThrough();

    logger.info('Starting streaming MP3 to μ-law conversion');

    // Use FFmpeg to convert streaming MP3 to μ-law
    const ffmpegCommand = ffmpeg(mp3Stream)
      .inputFormat('mp3')
      .audioCodec('pcm_mulaw')
      .audioFrequency(8000)
      .audioChannels(1)
      .format('mulaw')
      .on('start', (cmd) => {
        logger.debug('FFmpeg streaming started', { command: cmd });
      })
      .on('error', (err) => {
        logger.error('FFmpeg streaming error', { error: err.message });
        outputStream.destroy(err);
      })
      .on('end', () => {
        logger.info('FFmpeg streaming conversion complete');
      });

    // Pipe to output stream
    ffmpegCommand.pipe(outputStream, { end: true });

    return outputStream;
  }

  /**
   * Stream PCM audio and convert to μ-law in real-time
   * For ElevenLabs PCM output
   *
   * @param {ReadableStream} pcmStream - Streaming PCM audio from ElevenLabs
   * @returns {PassThrough} - Stream that emits μ-law audio chunks
   */
  convertPCMStreamToMulaw(pcmStream) {
    const outputStream = new PassThrough();

    logger.info('Starting streaming PCM to μ-law conversion');

    // Use FFmpeg to convert streaming PCM to μ-law
    const ffmpegCommand = ffmpeg(pcmStream)
      .inputFormat('s16le') // PCM signed 16-bit little-endian
      .inputOptions(['-ar 16000', '-ac 1']) // 16kHz mono
      .audioCodec('pcm_mulaw')
      .audioFrequency(8000)
      .audioChannels(1)
      .format('mulaw')
      .on('start', (cmd) => {
        logger.debug('FFmpeg PCM streaming started', { command: cmd });
      })
      .on('error', (err) => {
        logger.error('FFmpeg PCM streaming error', { error: err.message });
        outputStream.destroy(err);
      })
      .on('end', () => {
        logger.info('FFmpeg PCM streaming conversion complete');
      });

    // Pipe to output stream
    ffmpegCommand.pipe(outputStream, { end: true });

    return outputStream;
  }

  /**
   * Send streaming audio to Twilio as it's converted
   * Dramatically reduces latency by sending first audio within ~200ms
   *
   * @param {WebSocket} ws - Twilio Media Stream WebSocket
   * @param {ReadableStream} mulawStream - Stream of μ-law audio chunks
   * @param {string} streamSid - Twilio stream SID
   * @returns {Promise<void>}
   */
  async sendStreamingAudioToTwilio(ws, mulawStream, streamSid) {
    return new Promise((resolve, reject) => {
      let firstChunkSent = false;
      let totalBytesSent = 0;
      const startTime = Date.now();

      mulawStream.on('data', (chunk) => {
        try {
          // Convert chunk to base64
          const payload = chunk.toString('base64');

          // Send to Twilio
          const message = {
            event: 'media',
            streamSid: streamSid,
            media: {
              payload: payload,
            },
          };

          ws.send(JSON.stringify(message));

          totalBytesSent += chunk.length;

          if (!firstChunkSent) {
            const timeToFirstAudio = Date.now() - startTime;
            logger.info('First audio chunk sent', {
              latency: timeToFirstAudio,
              chunkSize: chunk.length
            });
            firstChunkSent = true;
          }
        } catch (error) {
          logger.error('Error sending audio chunk', { error: error.message });
          mulawStream.destroy();
          reject(error);
        }
      });

      mulawStream.on('end', () => {
        const totalTime = Date.now() - startTime;
        logger.info('Streaming audio complete', {
          totalBytes: totalBytesSent,
          totalTime,
          estimatedDurationMs: (totalBytesSent / 8000) * 1000,
        });
        resolve();
      });

      mulawStream.on('error', (error) => {
        logger.error('Stream error', { error: error.message });
        reject(error);
      });
    });
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
