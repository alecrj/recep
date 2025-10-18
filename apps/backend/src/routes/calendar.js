const express = require('express');
const logger = require('../utils/logger');
const {
  getAuthUrl,
  connectCalendar,
  disconnectCalendar,
  syncEventsFromCalendar
} = require('../services/google-calendar');
const { verifyBusinessToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Google Calendar Integration Routes
 */

/**
 * Get OAuth authorization URL
 * Business owner clicks "Connect Google Calendar" in settings
 */
router.get('/calendar/auth-url', verifyBusinessToken, (req, res) => {
  try {
    const authUrl = getAuthUrl();

    res.json({
      success: true,
      authUrl: authUrl
    });
  } catch (error) {
    logger.error('Error generating calendar auth URL', {
      businessId: req.user.id,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * OAuth callback - Exchange code for tokens
 */
router.get('/calendar/callback', verifyBusinessToken, async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code required' });
  }

  try {
    await connectCalendar(req.user.id, code);

    res.json({
      success: true,
      message: 'Google Calendar connected successfully'
    });
  } catch (error) {
    logger.error('Error connecting calendar', {
      businessId: req.user.id,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to connect calendar' });
  }
});

/**
 * Disconnect Google Calendar
 */
router.post('/calendar/disconnect', verifyBusinessToken, async (req, res) => {
  try {
    await disconnectCalendar(req.user.id);

    res.json({
      success: true,
      message: 'Google Calendar disconnected'
    });
  } catch (error) {
    logger.error('Error disconnecting calendar', {
      businessId: req.user.id,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to disconnect calendar' });
  }
});

/**
 * Manually trigger calendar sync
 */
router.post('/calendar/sync', verifyBusinessToken, async (req, res) => {
  try {
    const result = await syncEventsFromCalendar(req.user.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      syncedCount: result.syncedCount
    });
  } catch (error) {
    logger.error('Error syncing calendar', {
      businessId: req.user.id,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to sync calendar' });
  }
});

module.exports = { router };
