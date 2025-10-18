/**
 * Subscription Plans Configuration
 *
 * Defines all pricing tiers, features, and limits
 */

const PLANS = {
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    description: 'Perfect for solo contractors and small businesses',
    price: 29900, // $299 in cents
    currency: 'usd',
    interval: 'month',

    // Stripe configuration
    stripePriceId: process.env.STRIPE_PRICE_STARTER || 'price_starter_test',
    stripeProductId: process.env.STRIPE_PRODUCT_STARTER || 'prod_starter_test',

    // Features
    features: [
      '1 AI phone number',
      'Unlimited incoming calls',
      'Appointment booking',
      'Message taking',
      'Call transcripts & recordings',
      'Google Calendar sync',
      'Email notifications',
      'Basic analytics',
      '1 business location'
    ],

    // Limits
    limits: {
      phoneNumbers: 1,
      locations: 1,
      callsPerMonth: null, // Unlimited
      appointmentsPerMonth: null, // Unlimited
      customersPerMonth: null, // Unlimited
      teamMembers: 1,
      apiAccess: false,
      customAiTraining: false,
      prioritySupport: false,
      whiteLabel: false
    },

    // Display
    popular: false,
    badge: null,
    color: 'blue'
  },

  PROFESSIONAL: {
    id: 'PROFESSIONAL',
    name: 'Professional',
    description: 'For growing businesses that need more power',
    price: 79900, // $799 in cents
    currency: 'usd',
    interval: 'month',

    stripePriceId: process.env.STRIPE_PRICE_PRO || 'price_pro_test',
    stripeProductId: process.env.STRIPE_PRODUCT_PRO || 'prod_pro_test',

    features: [
      'Everything in Starter, plus:',
      'Up to 3 phone numbers',
      'SMS appointment reminders',
      'Advanced analytics & reports',
      'CRM integration (Salesforce, HubSpot)',
      'Custom business hours per day',
      'Multiple service types',
      'Priority email support',
      'Up to 3 team members',
      'Call recording storage (90 days)'
    ],

    limits: {
      phoneNumbers: 3,
      locations: 3,
      callsPerMonth: null,
      appointmentsPerMonth: null,
      customersPerMonth: null,
      teamMembers: 3,
      apiAccess: true, // Basic API access
      customAiTraining: false,
      prioritySupport: true,
      whiteLabel: false
    },

    popular: true,
    badge: 'Most Popular',
    color: 'green'
  },

  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'For large businesses and franchises',
    price: 149900, // $1,499 in cents
    currency: 'usd',
    interval: 'month',

    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_test',
    stripeProductId: process.env.STRIPE_PRODUCT_ENTERPRISE || 'prod_enterprise_test',

    features: [
      'Everything in Professional, plus:',
      'Unlimited phone numbers',
      'Unlimited locations',
      'Custom AI voice training',
      'Full API access',
      'Webhook integrations',
      'White-label option',
      'Dedicated account manager',
      'Phone support (24/7)',
      'Unlimited team members',
      'Custom integrations',
      'Call recording storage (unlimited)',
      'Advanced call routing',
      'Multi-language support'
    ],

    limits: {
      phoneNumbers: null, // Unlimited
      locations: null,
      callsPerMonth: null,
      appointmentsPerMonth: null,
      customersPerMonth: null,
      teamMembers: null,
      apiAccess: true, // Full API access
      customAiTraining: true,
      prioritySupport: true,
      whiteLabel: true
    },

    popular: false,
    badge: 'Best Value',
    color: 'purple'
  }
};

/**
 * Get plan by ID
 */
function getPlan(planId) {
  return PLANS[planId] || null;
}

/**
 * Get all plans as array
 */
function getAllPlans() {
  return Object.values(PLANS);
}

/**
 * Get plan by Stripe price ID
 */
function getPlanByStripePriceId(stripePriceId) {
  return Object.values(PLANS).find(plan => plan.stripePriceId === stripePriceId);
}

/**
 * Check if business can perform action based on plan limits
 */
function canPerformAction(plan, action, currentUsage) {
  const planConfig = getPlan(plan);

  if (!planConfig) {
    return { allowed: false, reason: 'Invalid plan' };
  }

  const limit = planConfig.limits[action];

  // Null means unlimited
  if (limit === null) {
    return { allowed: true };
  }

  // Boolean check
  if (typeof limit === 'boolean') {
    return {
      allowed: limit,
      reason: limit ? null : `${action} not available on ${planConfig.name} plan`
    };
  }

  // Numeric limit check
  if (typeof limit === 'number') {
    const allowed = currentUsage < limit;
    return {
      allowed,
      reason: allowed ? null : `${action} limit reached (${limit} max on ${planConfig.name} plan)`,
      limit,
      current: currentUsage
    };
  }

  return { allowed: false, reason: 'Unknown limit type' };
}

/**
 * Format price for display
 */
function formatPrice(cents) {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}

/**
 * Calculate savings vs lower tier
 */
function calculateSavings(currentPlan, targetPlan) {
  const current = getPlan(currentPlan);
  const target = getPlan(targetPlan);

  if (!current || !target) return null;

  const difference = target.price - current.price;
  return {
    amount: Math.abs(difference),
    isUpgrade: difference > 0,
    formatted: formatPrice(Math.abs(difference))
  };
}

module.exports = {
  PLANS,
  getPlan,
  getAllPlans,
  getPlanByStripePriceId,
  canPerformAction,
  formatPrice,
  calculateSavings
};
