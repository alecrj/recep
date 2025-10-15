const nodemailer = require('nodemailer');
const config = require('../utils/config');
const logger = require('../utils/logger');

/**
 * EmailService - Send email notifications to business owners
 *
 * Features:
 * - Appointment booked notifications
 * - Urgent message alerts
 * - Daily digest reports
 * - Emergency alerts
 */

class EmailService {
  constructor() {
    this.testMode = !config.EMAIL_HOST || config.EMAIL_HOST === 'smtp.example.com';

    if (this.testMode) {
      logger.warn('EmailService running in TEST MODE - no real emails will be sent');
      this.transporter = null;
    } else {
      this.transporter = nodemailer.createTransporter({
        host: config.EMAIL_HOST,
        port: config.EMAIL_PORT || 587,
        secure: config.EMAIL_SECURE || false,
        auth: {
          user: config.EMAIL_USER,
          pass: config.EMAIL_PASS,
        },
      });
      logger.info('EmailService initialized');
    }

    this.fromEmail = config.EMAIL_FROM || 'noreply@aireceptionist.com';
    this.fromName = config.EMAIL_FROM_NAME || 'AI Receptionist';
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, html, text) {
    if (this.testMode) {
      logger.info('[TEST MODE] Would send email', {
        to,
        subject,
        textPreview: text?.substring(0, 100),
      });
      return {
        messageId: 'TEST_EMAIL_' + Date.now(),
        testMode: true,
      };
    }

    try {
      const result = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        text,
        html,
      });

      logger.info('Email sent successfully', {
        messageId: result.messageId,
        to,
        subject,
      });

      return {
        messageId: result.messageId,
      };
    } catch (error) {
      logger.error('Failed to send email', {
        error: error.message,
        to,
        subject,
      });
      throw error;
    }
  }

  /**
   * Send appointment booked notification
   */
  async sendAppointmentBooked(ownerEmail, appointment) {
    const subject = `New Appointment Booked - ${appointment.customerName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">✅ New Appointment Booked</h2>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong>Customer:</strong> ${appointment.customerName}</p>
          <p style="margin: 8px 0;"><strong>Phone:</strong> ${appointment.customerPhone}</p>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${appointment.customerEmail || 'Not provided'}</p>
          <p style="margin: 8px 0;"><strong>Service:</strong> ${appointment.serviceType}</p>
          <p style="margin: 8px 0;"><strong>Date & Time:</strong> ${new Date(appointment.scheduledTime).toLocaleString()}</p>
          <p style="margin: 8px 0;"><strong>Duration:</strong> ${appointment.duration} minutes</p>
        </div>

        ${appointment.notes ? `
          <div style="margin: 20px 0;">
            <strong>Notes:</strong>
            <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              ${appointment.notes}
            </p>
          </div>
        ` : ''}

        <p style="margin-top: 30px; color: #6b7280;">
          This appointment has been automatically added to your Google Calendar.
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

        <p style="font-size: 12px; color: #9ca3af;">
          AI Receptionist - Never miss a call again<br>
          <a href="https://yourdashboard.com" style="color: #2563eb;">View in Dashboard</a>
        </p>
      </div>
    `;

    const text = `
New Appointment Booked

Customer: ${appointment.customerName}
Phone: ${appointment.customerPhone}
Email: ${appointment.customerEmail || 'Not provided'}
Service: ${appointment.serviceType}
Date & Time: ${new Date(appointment.scheduledTime).toLocaleString()}
Duration: ${appointment.duration} minutes

${appointment.notes ? `Notes: ${appointment.notes}` : ''}

This appointment has been automatically added to your Google Calendar.
    `;

    return this.sendEmail(ownerEmail, subject, html, text);
  }

  /**
   * Send urgent message alert
   */
  async sendUrgentMessageAlert(ownerEmail, message) {
    const subject = `🚨 URGENT Message - ${message.customerName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px;">
          <h2 style="color: #dc2626; margin: 0;">🚨 URGENT MESSAGE</h2>
        </div>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong>From:</strong> ${message.customerName}</p>
          <p style="margin: 8px 0;"><strong>Phone:</strong> ${message.customerPhone}</p>
          <p style="margin: 8px 0;"><strong>Time:</strong> ${new Date(message.createdAt).toLocaleString()}</p>
        </div>

        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <strong>Message:</strong>
          <p style="margin: 10px 0 0 0;">${message.content}</p>
        </div>

        <div style="margin-top: 30px; text-align: center;">
          <a href="tel:${message.customerPhone}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Call Back Now
          </a>
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

        <p style="font-size: 12px; color: #9ca3af;">
          AI Receptionist - Never miss a call again<br>
          <a href="https://yourdashboard.com/messages" style="color: #2563eb;">View in Dashboard</a>
        </p>
      </div>
    `;

    const text = `
🚨 URGENT MESSAGE

From: ${message.customerName}
Phone: ${message.customerPhone}
Time: ${new Date(message.createdAt).toLocaleString()}

Message:
${message.content}

Call back: ${message.customerPhone}
    `;

    return this.sendEmail(ownerEmail, subject, html, text);
  }

  /**
   * Send daily digest
   */
  async sendDailyDigest(ownerEmail, businessName, stats) {
    const subject = `Daily Summary - ${businessName} - ${new Date().toLocaleDateString()}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📊 Daily Summary - ${businessName}</h2>
        <p style="color: #6b7280;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 30px 0;">
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0; font-size: 32px; color: #1e40af;">${stats.totalCalls}</h3>
            <p style="margin: 5px 0 0 0; color: #1e3a8a;">Total Calls</p>
          </div>

          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0; font-size: 32px; color: #065f46;">${stats.appointmentsBooked}</h3>
            <p style="margin: 5px 0 0 0; color: #064e3b;">Appointments Booked</p>
          </div>

          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0; font-size: 32px; color: #92400e;">${stats.messagesTaken}</h3>
            <p style="margin: 5px 0 0 0; color: #78350f;">Messages Taken</p>
          </div>

          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0; font-size: 32px; color: #991b1b;">${stats.emergencies}</h3>
            <p style="margin: 5px 0 0 0; color: #7f1d1d;">Emergency Calls</p>
          </div>
        </div>

        ${stats.estimatedRevenue ? `
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #22c55e;">
            <p style="margin: 0; font-size: 14px; color: #15803d;">Estimated Revenue from Today's Appointments</p>
            <h3 style="margin: 10px 0 0 0; font-size: 36px; color: #15803d;">$${stats.estimatedRevenue.toLocaleString()}</h3>
          </div>
        ` : ''}

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

        <p style="font-size: 12px; color: #9ca3af;">
          AI Receptionist - Never miss a call again<br>
          <a href="https://yourdashboard.com" style="color: #2563eb;">View Full Dashboard</a>
        </p>
      </div>
    `;

    const text = `
Daily Summary - ${businessName}
${new Date().toLocaleDateString()}

Total Calls: ${stats.totalCalls}
Appointments Booked: ${stats.appointmentsBooked}
Messages Taken: ${stats.messagesTaken}
Emergency Calls: ${stats.emergencies}

${stats.estimatedRevenue ? `Estimated Revenue: $${stats.estimatedRevenue.toLocaleString()}` : ''}

View full dashboard: https://yourdashboard.com
    `;

    return this.sendEmail(ownerEmail, subject, html, text);
  }

  /**
   * Send emergency alert
   */
  async sendEmergencyAlert(ownerEmail, emergency) {
    const subject = `🚨 EMERGENCY CALL - ${emergency.customerName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 30px; border-radius: 8px; text-align: center;">
          <h1 style="margin: 0; font-size: 48px;">🚨</h1>
          <h2 style="margin: 10px 0 0 0;">EMERGENCY CALL</h2>
        </div>

        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p style="margin: 8px 0;"><strong>Customer:</strong> ${emergency.customerName}</p>
          <p style="margin: 8px 0;"><strong>Phone:</strong> ${emergency.customerPhone}</p>
          <p style="margin: 8px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p style="margin: 8px 0;"><strong>Issue:</strong> ${emergency.description}</p>
        </div>

        <div style="margin: 30px 0; text-align: center;">
          <a href="tel:${emergency.customerPhone}" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 18px; font-weight: bold;">
            🚨 CALL BACK IMMEDIATELY
          </a>
        </div>

        <p style="color: #dc2626; font-weight: bold; text-align: center;">
          This customer needs immediate assistance!
        </p>
      </div>
    `;

    const text = `
🚨 EMERGENCY CALL 🚨

Customer: ${emergency.customerName}
Phone: ${emergency.customerPhone}
Time: ${new Date().toLocaleString()}
Issue: ${emergency.description}

CALL BACK IMMEDIATELY: ${emergency.customerPhone}
    `;

    return this.sendEmail(ownerEmail, subject, html, text);
  }
}

// Export singleton instance
module.exports = new EmailService();
