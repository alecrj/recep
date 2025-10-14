const stripe = require('stripe');
const config = require('../utils/config');
const logger = require('../utils/logger');
const { prisma } = require('@ai-receptionist/database');

/**
 * StripeService - Payment processing with Stripe Connect
 *
 * Features:
 * - Connect business Stripe accounts
 * - Create payment links for appointments
 * - Handle webhooks
 * - Track payment status
 * - Test mode with mock payments
 */

class StripeService {
  constructor() {
    this.testMode = !config.STRIPE_SECRET_KEY || config.STRIPE_SECRET_KEY === 'your_stripe_secret_key';

    if (this.testMode) {
      logger.warn('StripeService running in TEST MODE - no real payments');
      this.stripe = null;
    } else {
      this.stripe = stripe(config.STRIPE_SECRET_KEY);
      logger.info('StripeService initialized with real Stripe API');
    }
  }

  /**
   * Create Stripe Connect account for business
   */
  async createConnectAccount(businessId, email, businessName) {
    if (this.testMode) {
      const mockAccountId = `acct_test_${Date.now()}`;
      logger.info('[TEST MODE] Mock Stripe Connect account created', {
        accountId: mockAccountId,
        businessId,
      });
      return {
        accountId: mockAccountId,
        onboardingUrl: `https://connect.stripe.com/test/onboarding/${mockAccountId}`,
      };
    }

    try {
      // Create connected account
      const account = await this.stripe.accounts.create({
        type: 'standard',
        email,
        metadata: {
          businessId,
          businessName,
        },
      });

      // Create account link for onboarding
      const accountLink = await this.stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${config.BACKEND_URL}/api/business/stripe/reauth`,
        return_url: `${config.BUSINESS_DASHBOARD_URL}/settings/payments?success=true`,
        type: 'account_onboarding',
      });

      logger.info('Stripe Connect account created', {
        accountId: account.id,
        businessId,
      });

      return {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      };
    } catch (error) {
      logger.error('Failed to create Stripe account', {
        error: error.message,
        businessId,
      });
      throw error;
    }
  }

  /**
   * Get account status
   */
  async getAccountStatus(accountId) {
    if (this.testMode) {
      return {
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
      };
    }

    try {
      const account = await this.stripe.accounts.retrieve(accountId);

      return {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      };
    } catch (error) {
      logger.error('Failed to get account status', {
        error: error.message,
        accountId,
      });
      throw error;
    }
  }

  /**
   * Create payment link for appointment
   */
  async createPaymentLink(appointmentId, amount, description, businessId) {
    if (this.testMode) {
      const mockPaymentId = `pay_test_${Date.now()}`;
      const mockUrl = `https://stripe.com/test/payment/${mockPaymentId}`;

      logger.info('[TEST MODE] Mock payment link created', {
        paymentId: mockPaymentId,
        amount,
        appointmentId,
      });

      return {
        paymentId: mockPaymentId,
        paymentUrl: mockUrl,
        status: 'PENDING',
      };
    }

    try {
      // Get business Stripe account
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: { config: true },
      });

      if (!business.config?.stripeAccountId) {
        throw new Error('Stripe not connected for this business');
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        description,
        metadata: {
          appointmentId,
          businessId,
        },
        application_fee_amount: Math.round(amount * 100 * 0.10), // 10% platform fee
      }, {
        stripeAccount: business.config.stripeAccountId,
      });

      // Create payment link
      const paymentLink = await this.stripe.paymentLinks.create({
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: description,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        }],
        metadata: {
          appointmentId,
          businessId,
          paymentIntentId: paymentIntent.id,
        },
      }, {
        stripeAccount: business.config.stripeAccountId,
      });

      logger.info('Payment link created', {
        paymentId: paymentIntent.id,
        amount,
        appointmentId,
      });

      return {
        paymentId: paymentIntent.id,
        paymentUrl: paymentLink.url,
        status: 'PENDING',
      };
    } catch (error) {
      logger.error('Failed to create payment link', {
        error: error.message,
        appointmentId,
      });
      throw error;
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentId, stripeAccountId) {
    if (this.testMode) {
      // Randomly return paid or pending for testing
      const isPaid = Math.random() > 0.5;
      return {
        status: isPaid ? 'COMPLETED' : 'PENDING',
        amount: 150.00,
        paidAt: isPaid ? new Date() : null,
      };
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentId,
        { stripeAccount: stripeAccountId }
      );

      let status = 'PENDING';
      if (paymentIntent.status === 'succeeded') status = 'COMPLETED';
      if (paymentIntent.status === 'canceled') status = 'CANCELLED';
      if (paymentIntent.status === 'requires_payment_method') status = 'FAILED';

      return {
        status,
        amount: paymentIntent.amount / 100,
        paidAt: paymentIntent.status === 'succeeded' ? new Date(paymentIntent.created * 1000) : null,
      };
    } catch (error) {
      logger.error('Failed to check payment status', {
        error: error.message,
        paymentId,
      });
      throw error;
    }
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(payload, signature) {
    if (this.testMode) {
      logger.info('[TEST MODE] Mock webhook received');
      return { received: true };
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        config.STRIPE_WEBHOOK_SECRET
      );

      logger.info('Stripe webhook received', {
        type: event.type,
        id: event.id,
      });

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'account.updated':
          await this.handleAccountUpdated(event.data.object);
          break;

        default:
          logger.debug('Unhandled webhook event', { type: event.type });
      }

      return { received: true };
    } catch (error) {
      logger.error('Webhook error', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(paymentIntent) {
    const { appointmentId, businessId } = paymentIntent.metadata;

    try {
      // Update payment record
      await prisma.payment.updateMany({
        where: {
          stripePaymentId: paymentIntent.id,
          businessId,
        },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      });

      // Update appointment
      if (appointmentId) {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: 'CONFIRMED' },
        });
      }

      logger.info('Payment succeeded', {
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        appointmentId,
      });
    } catch (error) {
      logger.error('Failed to handle payment success', {
        error: error.message,
        paymentId: paymentIntent.id,
      });
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(paymentIntent) {
    const { appointmentId, businessId } = paymentIntent.metadata;

    try {
      await prisma.payment.updateMany({
        where: {
          stripePaymentId: paymentIntent.id,
          businessId,
        },
        data: {
          status: 'FAILED',
        },
      });

      logger.warn('Payment failed', {
        paymentId: paymentIntent.id,
        appointmentId,
      });
    } catch (error) {
      logger.error('Failed to handle payment failure', {
        error: error.message,
        paymentId: paymentIntent.id,
      });
    }
  }

  /**
   * Handle account update
   */
  async handleAccountUpdated(account) {
    try {
      const businessId = account.metadata?.businessId;

      if (businessId) {
        await prisma.businessConfig.update({
          where: { businessId },
          data: {
            // Update payment status based on account
            paymentEnabled: account.charges_enabled && account.payouts_enabled,
          },
        });

        logger.info('Stripe account updated', {
          accountId: account.id,
          businessId,
          enabled: account.charges_enabled,
        });
      }
    } catch (error) {
      logger.error('Failed to handle account update', {
        error: error.message,
        accountId: account.id,
      });
    }
  }

  /**
   * Create refund
   */
  async createRefund(paymentId, amount, stripeAccountId) {
    if (this.testMode) {
      const mockRefundId = `re_test_${Date.now()}`;
      logger.info('[TEST MODE] Mock refund created', {
        refundId: mockRefundId,
        paymentId,
        amount,
      });
      return {
        refundId: mockRefundId,
        status: 'succeeded',
      };
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      }, {
        stripeAccount: stripeAccountId,
      });

      logger.info('Refund created', {
        refundId: refund.id,
        paymentId,
        amount: refund.amount / 100,
      });

      return {
        refundId: refund.id,
        status: refund.status,
      };
    } catch (error) {
      logger.error('Failed to create refund', {
        error: error.message,
        paymentId,
      });
      throw error;
    }
  }

  /**
   * Get dashboard link for connected account
   */
  async getDashboardLink(stripeAccountId) {
    if (this.testMode) {
      return `https://dashboard.stripe.com/test/connect/accounts/${stripeAccountId}`;
    }

    try {
      const link = await this.stripe.accounts.createLoginLink(stripeAccountId);

      logger.info('Dashboard link created', {
        accountId: stripeAccountId,
      });

      return link.url;
    } catch (error) {
      logger.error('Failed to create dashboard link', {
        error: error.message,
        accountId: stripeAccountId,
      });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new StripeService();
