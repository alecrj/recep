const { google } = require('googleapis');
const config = require('../utils/config');
const logger = require('../utils/logger');
const { prisma } = require('@ai-receptionist/database');

/**
 * CalendarService - Google Calendar Integration
 *
 * Features:
 * - OAuth2 authentication per business
 * - Check availability
 * - Book appointments
 * - Send calendar invites
 * - Handle recurring appointments
 * - Test mode with mock availability
 */

class CalendarService {
  constructor() {
    this.testMode = !config.GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID === 'your_google_client_id';

    if (this.testMode) {
      logger.warn('CalendarService running in TEST MODE - using mock calendar');
      this.oauth2Client = null;
    } else {
      this.oauth2Client = new google.auth.OAuth2(
        config.GOOGLE_CLIENT_ID,
        config.GOOGLE_CLIENT_SECRET,
        config.GOOGLE_REDIRECT_URI
      );
      logger.info('CalendarService initialized with real Google Calendar API');
    }

    // Mock availability for testing
    this.mockAvailability = this.generateMockAvailability();
  }

  /**
   * Generate OAuth2 authorization URL for business to connect calendar
   */
  getAuthorizationUrl(businessId) {
    if (this.testMode) {
      return `https://example.com/mock-auth?businessId=${businessId}`;
    }

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      state: businessId, // Pass businessId to know which business is connecting
    });

    logger.info('Generated OAuth URL', { businessId });
    return authUrl;
  }

  /**
   * Handle OAuth2 callback and store tokens
   */
  async handleOAuthCallback(code, businessId) {
    if (this.testMode) {
      logger.info('[TEST MODE] Mock OAuth callback', { businessId });
      return {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expiry_date: Date.now() + 3600000,
      };
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      // Store tokens in database
      await prisma.businessConfig.update({
        where: { businessId },
        data: {
          googleCalendarAccessToken: tokens.access_token,
          googleCalendarRefreshToken: tokens.refresh_token,
          googleCalendarTokenExpiry: new Date(tokens.expiry_date),
        },
      });

      logger.info('OAuth tokens stored', { businessId });
      return tokens;
    } catch (error) {
      logger.error('OAuth callback failed', {
        error: error.message,
        businessId,
      });
      throw error;
    }
  }

  /**
   * Get authenticated calendar client for a business
   */
  async getCalendarClient(businessId) {
    if (this.testMode) {
      return { mockClient: true };
    }

    // Get tokens from database
    const config = await prisma.businessConfig.findUnique({
      where: { businessId },
      select: {
        googleCalendarAccessToken: true,
        googleCalendarRefreshToken: true,
        googleCalendarTokenExpiry: true,
      },
    });

    if (!config?.googleCalendarAccessToken) {
      throw new Error('Calendar not connected for this business');
    }

    // Check if token expired and refresh if needed
    const now = new Date();
    if (config.googleCalendarTokenExpiry && config.googleCalendarTokenExpiry < now) {
      await this.refreshAccessToken(businessId, config.googleCalendarRefreshToken);
      return this.getCalendarClient(businessId); // Retry with new token
    }

    // Set credentials
    this.oauth2Client.setCredentials({
      access_token: config.googleCalendarAccessToken,
      refresh_token: config.googleCalendarRefreshToken,
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Refresh expired access token
   */
  async refreshAccessToken(businessId, refreshToken) {
    if (this.testMode) {
      return;
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      // Update tokens in database
      await prisma.businessConfig.update({
        where: { businessId },
        data: {
          googleCalendarAccessToken: credentials.access_token,
          googleCalendarTokenExpiry: new Date(credentials.expiry_date),
        },
      });

      logger.info('Access token refreshed', { businessId });
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error.message,
        businessId,
      });
      throw error;
    }
  }

  /**
   * Check availability for a date range
   */
  async checkAvailability(businessId, startDate, endDate, serviceType = null) {
    if (this.testMode) {
      return this.getMockAvailability(startDate, endDate);
    }

    try {
      const calendar = await this.getCalendarClient(businessId);

      // Get busy times from Google Calendar
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const busySlots = response.data.calendars.primary.busy || [];

      // Get business hours and service duration
      const businessConfig = await prisma.businessConfig.findUnique({
        where: { businessId },
        select: {
          businessHoursStart: true,
          businessHoursEnd: true,
          appointmentDuration: true,
        },
      });

      // Generate available slots based on business hours and busy times
      const availableSlots = this.generateAvailableSlots(
        startDate,
        endDate,
        busySlots,
        businessConfig
      );

      logger.info('Availability checked', {
        businessId,
        availableSlots: availableSlots.length,
      });

      return availableSlots;
    } catch (error) {
      logger.error('Failed to check availability', {
        error: error.message,
        businessId,
      });
      throw error;
    }
  }

  /**
   * Book an appointment in Google Calendar
   */
  async bookAppointment(businessId, appointmentData) {
    const { customerName, customerEmail, customerPhone, scheduledTime, durationMinutes, serviceType, notes } = appointmentData;

    if (this.testMode) {
      return this.createMockCalendarEvent(appointmentData);
    }

    try {
      const calendar = await this.getCalendarClient(businessId);

      // Get business info for event details
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true },
      });

      // Create event
      const event = {
        summary: `${serviceType || 'Appointment'} - ${customerName}`,
        description: `${serviceType || 'Appointment'} for ${customerName}\nPhone: ${customerPhone}${notes ? `\n\nNotes: ${notes}` : ''}`,
        start: {
          dateTime: new Date(scheduledTime).toISOString(),
          timeZone: 'America/New_York', // TODO: Make this configurable per business
        },
        end: {
          dateTime: new Date(new Date(scheduledTime).getTime() + durationMinutes * 60000).toISOString(),
          timeZone: 'America/New_York',
        },
        attendees: customerEmail ? [{ email: customerEmail }] : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: customerEmail ? 'all' : 'none', // Send invite if email provided
      });

      logger.info('Appointment booked in calendar', {
        businessId,
        eventId: response.data.id,
        customerName,
      });

      return {
        success: true,
        calendarEventId: response.data.id,
        eventLink: response.data.htmlLink,
      };
    } catch (error) {
      logger.error('Failed to book appointment', {
        error: error.message,
        businessId,
        customerName,
      });
      throw error;
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(businessId, calendarEventId) {
    if (this.testMode) {
      logger.info('[TEST MODE] Mock appointment cancelled', { calendarEventId });
      return { success: true };
    }

    try {
      const calendar = await this.getCalendarClient(businessId);

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: calendarEventId,
        sendUpdates: 'all', // Notify attendees
      });

      logger.info('Appointment cancelled', {
        businessId,
        eventId: calendarEventId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to cancel appointment', {
        error: error.message,
        businessId,
        calendarEventId,
      });
      throw error;
    }
  }

  /**
   * Update an appointment
   */
  async updateAppointment(businessId, calendarEventId, updates) {
    if (this.testMode) {
      logger.info('[TEST MODE] Mock appointment updated', { calendarEventId, updates });
      return { success: true };
    }

    try {
      const calendar = await this.getCalendarClient(businessId);

      // Get existing event
      const existingEvent = await calendar.events.get({
        calendarId: 'primary',
        eventId: calendarEventId,
      });

      // Merge updates
      const updatedEvent = {
        ...existingEvent.data,
        ...updates,
      };

      await calendar.events.update({
        calendarId: 'primary',
        eventId: calendarEventId,
        requestBody: updatedEvent,
        sendUpdates: 'all',
      });

      logger.info('Appointment updated', {
        businessId,
        eventId: calendarEventId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to update appointment', {
        error: error.message,
        businessId,
        calendarEventId,
      });
      throw error;
    }
  }

  /**
   * Get upcoming appointments
   */
  async getUpcomingAppointments(businessId, daysAhead = 7) {
    if (this.testMode) {
      return this.getMockUpcomingAppointments(daysAhead);
    }

    try {
      const calendar = await this.getCalendarClient(businessId);

      const now = new Date();
      const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      logger.info('Upcoming appointments fetched', {
        businessId,
        count: response.data.items?.length || 0,
      });

      return response.data.items || [];
    } catch (error) {
      logger.error('Failed to fetch upcoming appointments', {
        error: error.message,
        businessId,
      });
      throw error;
    }
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Generate available time slots based on business hours and busy times
   */
  generateAvailableSlots(startDate, endDate, busySlots, businessConfig) {
    const slots = [];
    const slotDuration = businessConfig.appointmentDuration || 60; // minutes
    const businessStart = parseInt(businessConfig.businessHoursStart?.split(':')[0] || '9');
    const businessEnd = parseInt(businessConfig.businessHoursEnd?.split(':')[0] || '17');

    let currentDate = new Date(startDate);

    while (currentDate < endDate) {
      // Skip weekends (TODO: Make configurable)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Generate slots for this day
        for (let hour = businessStart; hour < businessEnd; hour++) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, 0, 0, 0);

          const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

          // Check if slot conflicts with busy times
          const isAvailable = !busySlots.some((busy) => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            return slotStart < busyEnd && slotEnd > busyStart;
          });

          if (isAvailable) {
            slots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              available: true,
            });
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  /**
   * Generate mock availability for testing
   */
  generateMockAvailability() {
    const slots = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate 7 days of availability
    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);

      // Skip weekends
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Generate slots from 9am to 5pm
      for (let hour = 9; hour < 17; hour++) {
        // Randomly mark some as unavailable
        const available = Math.random() > 0.3;

        slots.push({
          date: date.toISOString().split('T')[0],
          start: `${date.toISOString().split('T')[0]}T${hour.toString().padStart(2, '0')}:00:00`,
          end: `${date.toISOString().split('T')[0]}T${(hour + 1).toString().padStart(2, '0')}:00:00`,
          available,
        });
      }
    }

    return slots;
  }

  /**
   * Get mock availability for testing
   */
  getMockAvailability(startDate, endDate) {
    const filtered = this.mockAvailability.filter((slot) => {
      const slotDate = new Date(slot.start);
      return slotDate >= startDate && slotDate <= endDate && slot.available;
    });

    logger.info('[TEST MODE] Mock availability checked', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      availableSlots: filtered.length,
    });

    return filtered;
  }

  /**
   * Create mock calendar event for testing
   */
  createMockCalendarEvent(appointmentData) {
    const eventId = `mock_event_${Date.now()}`;

    logger.info('[TEST MODE] Mock calendar event created', {
      eventId,
      customer: appointmentData.customerName,
      time: appointmentData.scheduledTime,
    });

    return {
      success: true,
      calendarEventId: eventId,
      eventLink: `https://calendar.google.com/event?eid=${eventId}`,
      testMode: true,
    };
  }

  /**
   * Get mock upcoming appointments for testing
   */
  getMockUpcomingAppointments(daysAhead) {
    const appointments = [
      {
        id: 'mock_appt_1',
        summary: 'HVAC Maintenance - John Smith',
        start: { dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
        end: { dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString() },
      },
      {
        id: 'mock_appt_2',
        summary: 'Emergency Repair - Jane Doe',
        start: { dateTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() },
        end: { dateTime: new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString() },
      },
    ];

    logger.info('[TEST MODE] Mock upcoming appointments', { count: appointments.length });
    return appointments;
  }
}

// Export singleton instance
module.exports = new CalendarService();
