const express = require('express');
const router = express.Router();
const elevenlabsService = require('../services/elevenlabs.service');
const audioService = require('../services/audio.service');
const logger = require('../utils/logger');

/**
 * Test Audio Endpoint
 * Direct test of ElevenLabs → Audio conversion → Response
 * Call this to verify the audio pipeline works
 */
router.get('/test-tts', async (req, res) => {
  try {
    const testText = req.query.text || "Hello, this is a test of the text to speech system.";
    const voiceId = req.query.voice || 'NDTYOmYEjbDIVCKB35i3'; // Your selected voice

    logger.info('Testing TTS pipeline', { text: testText, voiceId });

    // Test streaming TTS
    logger.info('Step 1: Calling ElevenLabs streaming TTS...');
    const startTime = Date.now();

    const mp3Stream = await elevenlabsService.textToSpeechStream(testText, voiceId);
    const step1Time = Date.now() - startTime;
    logger.info(`Step 1 complete: ${step1Time}ms`);

    // Convert to μ-law
    logger.info('Step 2: Converting MP3 to μ-law...');
    const step2Start = Date.now();
    const mulawStream = audioService.convertMP3StreamToMulaw(mp3Stream);

    // Collect the stream into a buffer for testing
    const chunks = [];
    mulawStream.on('data', (chunk) => chunks.push(chunk));
    mulawStream.on('end', () => {
      const step2Time = Date.now() - step2Start;
      const totalTime = Date.now() - startTime;
      const audioBuffer = Buffer.concat(chunks);

      logger.info(`Step 2 complete: ${step2Time}ms`);
      logger.info(`Total pipeline time: ${totalTime}ms`);
      logger.info(`Audio buffer size: ${audioBuffer.length} bytes`);

      res.json({
        success: true,
        text: testText,
        voiceId,
        timings: {
          elevenlabs: step1Time,
          conversion: step2Time,
          total: totalTime
        },
        audioSize: audioBuffer.length,
        estimatedDuration: audioService.getAudioDurationMs(audioBuffer)
      });
    });

    mulawStream.on('error', (error) => {
      logger.error('Stream error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    });

  } catch (error) {
    logger.error('TTS test failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      apiKeyPresent: !!process.env.ELEVENLABS_API_KEY,
      apiKeyLength: process.env.ELEVENLABS_API_KEY?.length
    });
  }
});

module.exports = router;
