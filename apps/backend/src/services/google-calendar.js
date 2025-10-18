const { google } = require('googleapis');
const { prisma } = require('@ai-receptionist/database');
const logger = require('../utils/logger');
const config = require('../utils/config');

/**
 * Google Calendar Integration Service
 *
 * Handles bidirectional sync between appointments and Google Calendar
 */

/**
 * Initialize OAuth2 client with business's refresh token
 */
function getOAuth2Client(refreshToken) {
  const oauth2Client = new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  return oauth2Client;
}

/**
 * Get authorization URL for Google Calendar OAuth
 */
function getAuthUrl() {
  const oauth2Client = new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI
  );

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Force to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
async function getTokensFromCode(code) {
  const oauth2Client = new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: new Date(tokens.expiry_date)
    };
  } catch (error) {
    logger.error('Error exchanging code for tokens', { error: error.message });
    throw error;
  }
}

/**
 * Save Google Calendar tokens to business config
 */
async function connectCalendar(businessId, code) {
  try {
    const tokens = await getTokensFromCode(code);

    await prisma.businessConfig.update({
      where: { businessId: businessId },
      data: {
        googleCalendarRefreshToken: tokens.refreshToken,
        googleCalendarAccessToken: tokens.accessToken,
        googleCalendarTokenExpiry: tokens.tokenExpiry
      }
    });

    logger.info('Google Calendar connected', { businessId });
    return { success: true };
  } catch (error) {
    logger.error('Error connecting Google Calendar', {
      businessId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Disconnect Google Calendar
 */
async function disconnectCalendar(businessId) {
  try {
    await prisma.businessConfig.update({
      where: { businessId: businessId },
      data: {
        googleCalendarRefreshToken: null,
        googleCalendarAccessToken: null,
        googleCalendarTokenExpiry: null,
        googleCalendarId: null
      }
    });

    logger.info('Google Calendar disconnected', { businessId });
    return { success: true };
  } catch (error) {
    logger.error('Error disconnecting Google Calendar', {
      businessId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Create event in Google Calendar
 * Called when AI books an appointment
 */
async function createCalendarEvent(businessId, appointment) {
  try {
    // Get business config with calendar tokens
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { config: true }
    });

    if (!business?.config?.googleCalendarRefreshToken) {
      logger.warn('No Google Calendar connected for business', { businessId });
      return { success: false, error: 'Calendar not connected' };
    }

    // Initialize OAuth2 client
    const oauth2Client = getOAuth2Client(business.config.googleCalendarRefreshToken);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Calculate end time
    const startTime = new Date(appointment.scheduledTime);
    const endTime = new Date(startTime.getTime() + appointment.durationMinutes * 60000);

    // Create event
    const event = await calendar.events.insert({
      calendarId: business.config.googleCalendarId || 'primary',
      requestBody: {
        summary: `${appointment.serviceType} - ${appointment.customerName}`,
        description: `Customer: ${appointment.customerName}\nPhone: ${appointment.customerPhone}\n\nBooked via AI Receptionist\n\nAppointment ID: ${appointment.id}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'America/Los_Angeles' // TODO: Make timezone configurable per business
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        location: appointment.customerAddress || business.config.businessAddress,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 24 * 60 } // 1 day before
          ]
        }
      }
    });

    // Save Google event ID to appointment
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { googleCalendarEventId: event.data.id }
    });

    logger.info('Calendar event created', {
      businessId,
      appointmentId: appointment.id,
      googleEventId: event.data.id
    });

    return { success: true, eventId: event.data.id };
  } catch (error) {
    logger.error('Error creating calendar event', {
      businessId,
      appointmentId: appointment.id,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

/**
 * Update event in Google Calendar
 */
async function updateCalendarEvent(businessId, appointment) {
  try {
    if (!appointment.googleCalendarEventId) {
      // No Google event exists, create one
      return await createCalendarEvent(businessId, appointment);
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { config: true }
    });

    if (!business?.config?.googleCalendarRefreshToken) {
      logger.warn('No Google Calendar connected', { businessId });
      return { success: false, error: 'Calendar not connected' };
    }

    const oauth2Client = getOAuth2Client(business.config.googleCalendarRefreshToken);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const startTime = new Date(appointment.scheduledTime);
    const endTime = new Date(startTime.getTime() + appointment.durationMinutes * 60000);

    await calendar.events.update({
      calendarId: business.config.googleCalendarId || 'primary',
      eventId: appointment.googleCalendarEventId,
      requestBody: {
        summary: `${appointment.serviceType} - ${appointment.customerName}`,
        description: `Customer: ${appointment.customerName}\nPhone: ${appointment.customerPhone}\n\nAppointment ID: ${appointment.id}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/Los_Angeles'
        }
      }
    });

    logger.info('Calendar event updated', {
      businessId,
      appointmentId: appointment.id,
      googleEventId: appointment.googleCalendarEventId
    });

    return { success: true };
  } catch (error) {
    logger.error('Error updating calendar event', {
      businessId,
      appointmentId: appointment.id,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

/**
 * Delete event from Google Calendar
 */
async function deleteCalendarEvent(businessId, googleEventId) {
  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { config: true }
    });

    if (!business?.config?.googleCalendarRefreshToken) {
      return { success: false, error: 'Calendar not connected' };
    }

    const oauth2Client = getOAuth2Client(business.config.googleCalendarRefreshToken);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: business.config.googleCalendarId || 'primary',
      eventId: googleEventId
    });

    logger.info('Calendar event deleted', {
      businessId,
      googleEventId
    });

    return { success: true };
  } catch (error) {
    logger.error('Error deleting calendar event', {
      businessId,
      googleEventId,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

/**
 * Sync events from Google Calendar to database
 * Run this periodically (e.g., every 15 minutes via cron)
 */
async function syncEventsFromCalendar(businessId) {
  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { config: true }
    });

    if (!business?.config?.googleCalendarRefreshToken) {
      return { success: false, error: 'Calendar not connected' };
    }

    const oauth2Client = getOAuth2Client(business.config.googleCalendarRefreshToken);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get events from the last 7 days to 3 months in future
    const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: business.config.googleCalendarId || 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];
    let syncedCount = 0;

    for (const event of events) {
      // Skip events already in our system
      const existingAppointment = await prisma.appointment.findFirst({
        where: { googleCalendarEventId: event.id }
      });

      if (existingAppointment) {
        continue;
      }

      // Skip all-day events
      if (!event.start.dateTime) {
        continue;
      }

      // Create appointment from calendar event
      // Extract customer info from description if possible
      const description = event.description || '';
      const phoneMatch = description.match(/Phone:\s*([+\d\s()-]+)/);
      const customerPhone = phoneMatch ? phoneMatch[1].trim() : 'Unknown';

      await prisma.appointment.create({
        data: {
          businessId: businessId,
          scheduledTime: new Date(event.start.dateTime),
          durationMinutes: 60, // Default
          serviceType: event.summary || 'Appointment',
          customerName: event.summary?.split(' - ')[1] || 'Unknown',
          customerPhone: customerPhone,
          status: 'SCHEDULED',
          googleCalendarEventId: event.id,
          createdBy: 'calendar_sync',
          notes: description
        }
      });

      syncedCount++;
    }

    logger.info('Calendar sync completed', {
      businessId,
      eventsFound: events.length,
      newEventsSynced: syncedCount
    });

    return { success: true, syncedCount };
  } catch (error) {
    logger.error('Error syncing from calendar', {
      businessId,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

module.exports = {
  getAuthUrl,
  getTokensFromCode,
  connectCalendar,
  disconnectCalendar,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  syncEventsFromCalendar
};
