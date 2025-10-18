const express = require('express');
const expressWs = require('express-ws');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');

const config = require('./utils/config');
const logger = require('./utils/logger');

/**
 * AI Receptionist Backend Server
 *
 * Main Express application with:
 * - REST API routes
 * - WebSocket for call streaming
 * - Security middleware
 * - Rate limiting
 */

const app = express();
const server = http.createServer(app);

// Enable WebSocket support
expressWs(app, server);

// ============================================
// MIDDLEWARE
// ============================================

// Trust proxy (required for Railway/production environments)
if (config.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: [
    config.ADMIN_DASHBOARD_URL,
    config.BUSINESS_DASHBOARD_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'AI Receptionist API',
    version: '3.1.0-ULTRA-HUMAN',  // Sarah voice + Barge-in + Max expressiveness
    status: 'running',
    lastUpdate: '2025-10-16 23:30 UTC',
    optimizations: 'Sarah voice (stability 0.15, style 0.85) + Barge-in + 3-6 word responses',
    expectedLatency: 'Sub-500ms to first audio',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      calls: '/api/calls',
      admin: '/api/admin',
      business: '/api/business',
    },
  });
});

// ============================================
// ROUTES
// ============================================

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Self-serve signup routes
const { router: signupRoutes } = require('./routes/signup');
app.use('/api', signupRoutes);

// Admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Business owner routes
const businessRoutes = require('./routes/business');
app.use('/api/business', businessRoutes);

// Call handling routes (THE CRITICAL ONE)
const callRoutes = require('./routes/calls');
app.use('/api/calls', callRoutes);

// Twilio webhook routes (NO AUTH - called by Twilio)
const twilioRoutes = require('./routes/twilio');
app.use('/api/twilio', twilioRoutes);

// Test audio pipeline
const testAudioRoutes = require('./routes/test-audio');
app.use('/api/test-audio', testAudioRoutes);

// OpenAI Realtime API routes (NEW - voice-to-voice)
const { router: realtimeRoutes } = require('./routes/realtime-call');
app.use('/api', realtimeRoutes);

// ElevenLabs Conversational AI routes (THE BEST - human-like voice)
const { router: elevenLabsRoutes } = require('./routes/elevenlabs-call');
app.use('/api', elevenLabsRoutes);

// Tool webhook routes (called by ElevenLabs agent)
const { router: toolRoutes } = require('./routes/tools');
app.use('/api/tools', toolRoutes);

// Google Calendar integration routes
const { router: calendarRoutes } = require('./routes/calendar');
app.use('/api', calendarRoutes);

// Placeholder routes for now
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    testMode: true,
  });
});

// Diagnostic endpoint for ElevenLabs API key debugging
app.get('/api/diagnostic/elevenlabs', async (req, res) => {
  const axios = require('axios');

  try {
    const apiKey = config.ELEVENLABS_API_KEY;

    // Check if key exists
    if (!apiKey || apiKey === 'your_elevenlabs_api_key') {
      return res.json({
        status: 'error',
        message: 'ElevenLabs API key not configured',
        hasKey: false,
      });
    }

    // Show key info (masked)
    const keyPreview = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
    const keyLength = apiKey.length;

    // Try to fetch voices (simple API test)
    let apiTest = null;
    let voices = [];
    try {
      const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey },
        timeout: 5000,
      });
      apiTest = {
        success: true,
        voiceCount: response.data.voices?.length || 0,
      };
      // Get first 5 voices with their IDs
      voices = response.data.voices.slice(0, 5).map(v => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category
      }));
    } catch (apiError) {
      apiTest = {
        success: false,
        error: apiError.message,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
      };
    }

    // Test BOTH streaming and non-streaming TTS
    let ttsStreamTest = null;
    let ttsNonStreamTest = null;

    if (voices.length > 0) {
      const testVoiceId = voices[0].voice_id;

      // Test streaming TTS
      try {
        const ttsResponse = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${testVoiceId}/stream`,
          {
            text: 'Test',
            model_id: 'eleven_turbo_v2_5',
          },
          {
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
            responseType: 'arraybuffer'
          }
        );
        ttsStreamTest = {
          success: true,
          voiceId: testVoiceId,
          audioSize: ttsResponse.data.length
        };
      } catch (ttsError) {
        ttsStreamTest = {
          success: false,
          error: ttsError.message,
          status: ttsError.response?.status,
        };
      }

      // Test non-streaming TTS (without /stream endpoint)
      try {
        const ttsResponse = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${testVoiceId}`,
          {
            text: 'Test',
            model_id: 'eleven_monolingual_v1',  // Free tier model
          },
          {
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
            responseType: 'arraybuffer'
          }
        );
        ttsNonStreamTest = {
          success: true,
          voiceId: testVoiceId,
          audioSize: ttsResponse.data.length
        };
      } catch (ttsError) {
        ttsNonStreamTest = {
          success: false,
          error: ttsError.message,
          status: ttsError.response?.status,
        };
      }
    }

    res.json({
      status: 'success',
      hasKey: true,
      keyPreview,
      keyLength,
      apiTest,
      ttsStreamTest,
      ttsNonStreamTest,
      voices,
      environment: config.NODE_ENV,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// ============================================
// WEBSOCKET HANDLING
// ============================================

// OpenAI Realtime API WebSocket handler
const { handleRealtimeConnection } = require('./websocket/realtime-handler');

app.ws('/media-stream/:businessId', (ws, req) => {
  const { businessId } = req.params;
  logger.info('WebSocket connection for Realtime API', { businessId });
  handleRealtimeConnection(ws, businessId);
});

// ElevenLabs Conversational AI WebSocket handler (THE BEST)
const { handleElevenLabsConnection } = require('./websocket/elevenlabs-handler');

app.ws('/elevenlabs-stream/:businessId', (ws, req) => {
  const { businessId } = req.params;
  logger.info('WebSocket connection for ElevenLabs Conversational AI', { businessId });
  handleElevenLabsConnection(ws, businessId);
});

// Legacy WebSocket routes are handled by express-ws in the routes
// See routes/calls.js for the actual WebSocket implementation

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    error: config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = config.PORT || 3000;

server.listen(PORT, () => {
  logger.info('===========================================');
  logger.info('🚀 AI Receptionist Server Started');
  logger.info('===========================================');
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`Port: ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`WebSocket: ws://localhost:${PORT}`);
  logger.info('===========================================');

  // Log service status
  const services = [
    { name: 'Twilio', enabled: !!config.TWILIO_ACCOUNT_SID && config.TWILIO_ACCOUNT_SID !== 'your_twilio_account_sid' },
    { name: 'Deepgram', enabled: !!config.DEEPGRAM_API_KEY && config.DEEPGRAM_API_KEY !== 'your_deepgram_api_key' },
    { name: 'OpenAI', enabled: !!config.OPENAI_API_KEY && config.OPENAI_API_KEY !== 'your_openai_api_key' },
    { name: 'ElevenLabs', enabled: !!config.ELEVENLABS_API_KEY && config.ELEVENLABS_API_KEY !== 'your_elevenlabs_api_key' },
    { name: 'Google Calendar', enabled: !!config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_ID !== 'your_google_client_id' },
    { name: 'Stripe', enabled: !!config.STRIPE_SECRET_KEY && config.STRIPE_SECRET_KEY !== 'your_stripe_secret_key' },
  ];

  logger.info('Services Status:');
  services.forEach(service => {
    logger.info(`  ${service.name}: ${service.enabled ? '✅ ENABLED' : '⚠️  TEST MODE'}`);
  });
  logger.info('===========================================');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise,
  });
});

module.exports = { app, server };
