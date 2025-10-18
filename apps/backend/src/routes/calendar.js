const express = require('express');
const logger = require('../utils/logger');
const calendarService = require('../services/calendar.service');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * Google Calendar Integration Routes
 * Used by business owners to connect their Google Calendar
 */

/**
 * Get OAuth authorization URL
 * Business owner clicks "Connect Google Calendar" in settings
 */
router.get('/calendar/auth-url', authMiddleware.requireBusiness, (req, res) => {
  try {
    const authUrl = calendarService.getAuthorizationUrl(req.user.id);

    logger.info('Calendar auth URL generated', { businessId: req.user.id });

    res.json({
      success: true,
      authUrl: authUrl
    });
  } catch (error) {
    logger.error('Error generating calendar auth URL', {
      businessId: req.user.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL'
    });
  }
});

/**
 * OAuth callback - Exchange code for tokens
 * Google redirects here after user authorizes
 */
router.get('/calendar/oauth/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send('Missing authorization code or business ID');
  }

  try {
    // state contains the businessId
    await calendarService.handleOAuthCallback(code, state);

    logger.info('Calendar connected successfully', { businessId: state });

    // Redirect to dashboard with success message
    res.send(`
      <html>
        <body>
          <h1>Calendar Connected!</h1>
          <p>Your Google Calendar has been connected successfully.</p>
          <script>
            window.opener.postMessage({ type: 'calendar_connected' }, '*');
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    logger.error('Error in OAuth callback', {
      error: error.message,
      state
    });
    res.status(500).send('Failed to connect calendar. Please try again.');
  }
});

/**
 * Disconnect Google Calendar
 */
router.post('/calendar/disconnect', authMiddleware.requireBusiness, async (req, res) => {
  try {
    const { prisma } = require('@ai-receptionist/database');

    await prisma.businessConfig.update({
      where: { businessId: req.user.id },
      data: {
        googleCalendarAccessToken: null,
        googleCalendarRefreshToken: null,
        googleCalendarTokenExpiry: null
      }
    });

    logger.info('Calendar disconnected', { businessId: req.user.id });

    res.json({
      success: true,
      message: 'Google Calendar disconnected'
    });
  } catch (error) {
    logger.error('Error disconnecting calendar', {
      businessId: req.user.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect calendar'
    });
  }
});

/**
 * Get upcoming appointments from Google Calendar
 */
router.get('/calendar/upcoming', authMiddleware.requireBusiness, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const appointments = await calendarService.getUpcomingAppointments(
      req.user.id,
      parseInt(days)
    );

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    logger.error('Error fetching upcoming appointments', {
      businessId: req.user.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming appointments'
    });
  }
});

module.exports = { router };
