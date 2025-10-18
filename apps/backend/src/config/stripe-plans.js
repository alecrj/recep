/**
 * Stripe Plan Configuration
 *
 * IMPORTANT: Replace the priceId values with actual Price IDs from your Stripe Dashboard
 * See STRIPE-SETUP.md in the project root for setup instructions
 */

module.exports = {
  plans: {
    STARTER: {
      name: 'Starter',
      // TODO: Replace with actual Stripe Price ID from Dashboard
      // Go to Stripe Dashboard → Products → Find "Voxi AI Receptionist - Starter" → Copy Price ID
      priceId: process.env.STRIPE_PRICE_STARTER || 'price_STARTER_REPLACE_ME',
      price: 29900, // $299.00 in cents
      displayPrice: '$299',
      interval: 'month',
      features: [
        'Unlimited calls',
        'AI appointment booking',
        'Calendar integration',
        'Email notifications',
        'Basic analytics',
        '24/7 AI receptionist'
      ],
      limits: {
        calls: -1, // Unlimited
        appointments: -1, // Unlimited
        integrations: 3,
        users: 1
      }
    },
    PROFESSIONAL: {
      name: 'Professional',
      // TODO: Replace with actual Stripe Price ID from Dashboard
      priceId: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_PROFESSIONAL_REPLACE_ME',
      price: 79900, // $799.00 in cents
      displayPrice: '$799',
      interval: 'month',
      features: [
        'Everything in Starter',
        'Priority AI processing',
        'SMS notifications',
        'Advanced analytics',
        'Call recordings',
        'Custom AI personality',
        'API access'
      ],
      limits: {
        calls: -1, // Unlimited
        appointments: -1, // Unlimited
        integrations: -1, // Unlimited
        users: 5
      }
    },
    ENTERPRISE: {
      name: 'Enterprise',
      // TODO: Replace with actual Stripe Price ID from Dashboard
      priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_ENTERPRISE_REPLACE_ME',
      price: 149900, // $1,499.00 in cents
      displayPrice: '$1,499',
      interval: 'month',
      features: [
        'Everything in Professional',
        'Dedicated support',
        'Custom integrations',
        'White-label options',
        'SLA guarantee',
        'Priority support',
        'Dedicated account manager',
        'Custom AI training'
      ],
      limits: {
        calls: -1, // Unlimited
        appointments: -1, // Unlimited
        integrations: -1, // Unlimited
        users: -1 // Unlimited
      }
    }
  },

  // Trial configuration
  trial: {
    days: 14,
    enabled: true
  },

  // Helper function to get plan config by name
  getPlan(planName) {
    return this.plans[planName] || null;
  },

  // Helper function to get all plan names
  getAllPlanNames() {
    return Object.keys(this.plans);
  },

  // Validate that a plan exists
  isValidPlan(planName) {
    return planName in this.plans;
  }
};
