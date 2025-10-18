const express = require('express');
const stripe = require('stripe')(require('../utils/config').STRIPE_SECRET_KEY);
const { prisma } = require('@ai-receptionist/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Stripe Webhooks & Utilities
 */

/**
 * Create setup intent for signup (collect payment method)
 */
router.post('/stripe/create-setup-intent', async (req, res) => {
  try {
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      usage: 'off_session' // For recurring payments
    });

    res.json({
      clientSecret: setupIntent.client_secret
    });
  } catch (error) {
    logger.error('Error creating setup intent', { error: error.message });
    res.status(500).json({ error: 'Failed to create setup intent' });
  }
});

/**
 * Stripe webhook handler for payment events
 * CRITICAL: This handles subscription updates, payment failures, etc.
 */
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  logger.info('Stripe webhook received', { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;

      default:
        logger.info('Unhandled webhook event', { type: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook', {
      type: event.type,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription) {
  logger.info('Subscription created', {
    subscriptionId: subscription.id,
    customerId: subscription.customer
  });

  // Find business by Stripe customer ID
  const business = await prisma.business.findFirst({
    where: {
      // TODO: Add stripeCustomerId field to Business model
      ownerEmail: subscription.customer_email
    }
  });

  if (business) {
    await prisma.business.update({
      where: { id: business.id },
      data: {
        status: subscription.status === 'active' ? 'ACTIVE' : 'TRIAL'
      }
    });

    logger.info('Business subscription status updated', {
      businessId: business.id,
      status: subscription.status
    });
  }
}

/**
 * Handle subscription updated (plan change, status change)
 */
async function handleSubscriptionUpdated(subscription) {
  logger.info('Subscription updated', {
    subscriptionId: subscription.id,
    status: subscription.status
  });

  const business = await prisma.business.findFirst({
    where: {
      ownerEmail: subscription.customer_email
    }
  });

  if (business) {
    let businessStatus = 'ACTIVE';

    if (subscription.status === 'trialing') {
      businessStatus = 'TRIAL';
    } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
      businessStatus = 'SUSPENDED';
    } else if (subscription.status === 'canceled') {
      businessStatus = 'CANCELLED';
    }

    await prisma.business.update({
      where: { id: business.id },
      data: {
        status: businessStatus
      }
    });

    logger.info('Business status updated from subscription', {
      businessId: business.id,
      status: businessStatus
    });
  }
}

/**
 * Handle subscription deleted (cancellation)
 */
async function handleSubscriptionDeleted(subscription) {
  logger.info('Subscription deleted', {
    subscriptionId: subscription.id
  });

  const business = await prisma.business.findFirst({
    where: {
      ownerEmail: subscription.customer_email
    }
  });

  if (business) {
    await prisma.business.update({
      where: { id: business.id },
      data: {
        status: 'CANCELLED'
      }
    });

    logger.info('Business marked as cancelled', {
      businessId: business.id
    });

    // TODO: Send cancellation email
    // TODO: Consider releasing phone number after grace period
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
  logger.info('Payment succeeded', {
    invoiceId: invoice.id,
    amount: invoice.amount_paid / 100,
    customerId: invoice.customer
  });

  // TODO: Record payment in Payment table
  // TODO: Send receipt email
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  logger.error('Payment failed', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    attemptCount: invoice.attempt_count
  });

  const business = await prisma.business.findFirst({
    where: {
      ownerEmail: invoice.customer_email
    }
  });

  if (business) {
    // Suspend after 3 failed attempts
    if (invoice.attempt_count >= 3) {
      await prisma.business.update({
        where: { id: business.id },
        data: {
          status: 'SUSPENDED'
        }
      });

      logger.warn('Business suspended due to payment failure', {
        businessId: business.id,
        attempts: invoice.attempt_count
      });

      // TODO: Send urgent payment failure email
    } else {
      // TODO: Send payment retry notification
    }
  }
}

/**
 * Handle trial ending soon (3 days before)
 */
async function handleTrialWillEnd(subscription) {
  logger.info('Trial ending soon', {
    subscriptionId: subscription.id,
    trialEnd: subscription.trial_end
  });

  const business = await prisma.business.findFirst({
    where: {
      ownerEmail: subscription.customer_email
    }
  });

  if (business) {
    logger.info('Sending trial ending notification', {
      businessId: business.id,
      email: business.ownerEmail
    });

    // TODO: Send trial ending email
  }
}

module.exports = { router };
