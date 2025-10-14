require('dotenv').config();
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
    version: '1.0.0',
    status: 'running',
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

// Admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Business owner routes
const businessRoutes = require('./routes/business');
app.use('/api/business', businessRoutes);

// Call handling routes (THE CRITICAL ONE)
const callRoutes = require('./routes/calls');
app.use('/api/calls', callRoutes);

// Placeholder routes for now
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    testMode: true,
  });
});

// ============================================
// WEBSOCKET HANDLING
// ============================================
// WebSocket routes are handled by express-ws in the routes
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
