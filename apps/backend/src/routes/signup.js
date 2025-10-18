const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('@ai-receptionist/database');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { provisionPhoneNumber } = require('../services/phone-provisioning');
const stripe = require('stripe')(config.STRIPE_SECRET_KEY);

const router = express.Router();

/**
 * Self-Serve Signup Routes
 *
 * Complete automated onboarding:
 * 1. Collect business info
 * 2. Process payment (Stripe)
 * 3. Auto-provision Twilio phone number
 * 4. Create business account
 * 5. Send welcome email
 * 6. Return dashboard access
 */

/**
 * Step 1: Check if email is available
 */
router.post('/signup/check-email', async (req, res) => {
  const { email } = req.body;

  try {
    const existing = await prisma.business.findFirst({
      where: { ownerEmail: email.toLowerCase() }
    });

    res.json({
      available: !existing,
      message: existing ? 'Email already registered' : 'Email available'
    });
  } catch (error) {
    logger.error('Error checking email', { error: error.message });
    res.status(500).json({ error: 'Failed to check email' });
  }
});

/**
 * Step 2: Complete signup with payment
 */
router.post(
  '/signup',
  [
    body('businessName').notEmpty().withMessage('Business name is required'),
    body('ownerName').notEmpty().withMessage('Owner name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('industry').notEmpty().withMessage('Industry is required'),
    body('plan')
      .isIn(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'])
      .withMessage('Valid plan is required'),
    body('paymentMethodId').notEmpty().withMessage('Payment method is required'),
    body('areaCode').optional().isLength({ min: 3, max: 3 })
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      businessName,
      ownerName,
      email,
      password,
      phone,
      industry,
      plan,
      paymentMethodId,
      areaCode
    } = req.body;

    try {
      // Check if email already exists
      const existingBusiness = await prisma.business.findFirst({
        where: { ownerEmail: email.toLowerCase() }
      });

      if (existingBusiness) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Define plan pricing
      const PLANS = {
        STARTER: { price: 29900, name: 'Starter' }, // $299 in cents
        PROFESSIONAL: { price: 79900, name: 'Professional' },
        ENTERPRISE: { price: 149900, name: 'Enterprise' }
      };

      const selectedPlan = PLANS[plan];

      logger.info('Starting signup process', {
        email,
        businessName,
        plan: selectedPlan.name
      });

      // ========================================
      // STEP 1: Create Stripe customer
      // ========================================
      const stripeCustomer = await stripe.customers.create({
        email: email.toLowerCase(),
        name: ownerName,
        phone: phone,
        metadata: {
          businessName: businessName,
          industry: industry
        }
      });

      logger.info('Stripe customer created', {
        customerId: stripeCustomer.id,
        email
      });

      // Attach payment method
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomer.id
      });

      // Set as default payment method
      await stripe.customers.update(stripeCustomer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      // ========================================
      // STEP 2: Create subscription with 14-day trial
      // ========================================
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomer.id,
        items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Voxi AI Receptionist - ${selectedPlan.name} Plan`,
                description: 'AI-powered phone receptionist for your business'
              },
              unit_amount: selectedPlan.price,
              recurring: {
                interval: 'month'
              }
            }
          }
        ],
        trial_period_days: 14,
        metadata: {
          businessName: businessName,
          plan: plan
        }
      });

      logger.info('Stripe subscription created', {
        subscriptionId: subscription.id,
        trialEnd: subscription.trial_end
      });

      // ========================================
      // STEP 3: Hash password
      // ========================================
      const hashedPassword = await bcrypt.hash(password, 10);

      // ========================================
      // STEP 4: Create business account
      // ========================================
      const business = await prisma.business.create({
        data: {
          name: businessName,
          ownerEmail: email.toLowerCase(),
          ownerName: ownerName,
          ownerPhone: phone,
          password: hashedPassword,
          industry: industry,
          status: 'TRIAL',
          plan: plan,
          stripeCustomerId: stripeCustomer.id,
          stripeSubscriptionId: subscription.id,
          config: {
            create: {
              greetingMessage: `Thank you for calling ${businessName}. How can I help you today?`,
              businessHoursStart: '09:00',
              businessHoursEnd: '17:00',
              appointmentDuration: 60,
              industry: industry,
              bookingEnabled: true,
              paymentEnabled: false,
              reminderEnabled: true,
              aiAgentName: 'Sarah',
              aiTone: 'professional'
            }
          }
        },
        include: { config: true }
      });

      logger.info('Business account created', {
        businessId: business.id,
        name: businessName
      });

      // ========================================
      // STEP 5: Auto-provision Twilio phone number
      // ========================================
      let phoneProvisionResult;
      try {
        phoneProvisionResult = await provisionPhoneNumber(
          business.id,
          null,
          areaCode
        );

        logger.info('Phone number provisioned', {
          businessId: business.id,
          phoneNumber: phoneProvisionResult.phoneNumber
        });
      } catch (phoneError) {
        // If phone provisioning fails, still allow signup but log error
        logger.error('Phone provisioning failed during signup', {
          businessId: business.id,
          error: phoneError.message
        });

        // We'll assign a number later manually if needed
        phoneProvisionResult = {
          success: false,
          phoneNumber: null,
          error: phoneError.message
        };
      }

      // ========================================
      // STEP 6: Generate JWT token
      // ========================================
      const token = jwt.sign(
        {
          id: business.id,
          email: business.ownerEmail,
          name: business.name,
          type: 'business'
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      // ========================================
      // STEP 7: Send welcome email (TODO)
      // ========================================
      // TODO: Implement email sending via SendGrid/AWS SES
      // - Welcome message
      // - Phone number
      // - Forwarding instructions
      // - Dashboard login link

      logger.info('Signup completed successfully', {
        businessId: business.id,
        email: business.ownerEmail,
        plan: plan,
        phoneNumber: phoneProvisionResult.phoneNumber
      });

      // ========================================
      // STEP 8: Return success with all details
      // ========================================
      res.status(201).json({
        success: true,
        token: token,
        business: {
          id: business.id,
          name: business.name,
          email: business.ownerEmail,
          plan: business.plan,
          status: business.status,
          phoneNumber: phoneProvisionResult.phoneNumber,
          trialEndsAt: new Date(subscription.trial_end * 1000)
        },
        subscription: {
          id: subscription.id,
          status: subscription.status,
          trialEnd: subscription.trial_end,
          currentPeriodEnd: subscription.current_period_end
        },
        nextSteps: {
          step1: 'Forward your business line to your new AI phone number',
          step2: 'Customize your AI receptionist in the dashboard',
          step3: 'Test by calling your AI phone number',
          dashboardUrl: config.BUSINESS_DASHBOARD_URL
        }
      });
    } catch (error) {
      logger.error('Signup error', {
        error: error.message,
        stack: error.stack,
        email
      });

      // If we got far enough to create Stripe customer, try to clean up
      // (In production, you might want to keep this for debugging)

      res.status(500).json({
        error: 'Signup failed',
        message:
          config.NODE_ENV === 'development'
            ? error.message
            : 'An error occurred during signup. Please try again.'
      });
    }
  }
);

/**
 * Get available area codes for phone number selection
 */
router.get('/signup/area-codes', async (req, res) => {
  // Popular area codes by region
  const areaCodes = [
    { code: '602', region: 'Phoenix, AZ' },
    { code: '480', region: 'Scottsdale, AZ' },
    { code: '520', region: 'Tucson, AZ' },
    { code: '213', region: 'Los Angeles, CA' },
    { code: '415', region: 'San Francisco, CA' },
    { code: '619', region: 'San Diego, CA' },
    { code: '312', region: 'Chicago, IL' },
    { code: '646', region: 'New York, NY' },
    { code: '212', region: 'Manhattan, NY' },
    { code: '305', region: 'Miami, FL' },
    { code: '713', region: 'Houston, TX' },
    { code: '214', region: 'Dallas, TX' },
    { code: '512', region: 'Austin, TX' },
    { code: '206', region: 'Seattle, WA' },
    { code: '303', region: 'Denver, CO' },
    { code: '702', region: 'Las Vegas, NV' }
  ];

  res.json({ areaCodes });
});

module.exports = { router };
