/**
 * Cost Calculator Service
 * Calculates actual costs for all platform services
 */

const logger = require('../utils/logger');

/**
 * API Cost Rates (as of 2024)
 * Update these with your actual rates
 */
const COST_RATES = {
  // OpenAI Realtime API
  openai: {
    inputAudioPerMinute: 0.06,    // $0.06 per minute of input audio
    outputAudioPerMinute: 0.24,   // $0.24 per minute of output audio
    textInputPer1kTokens: 0.005,  // $0.005 per 1K input tokens
    textOutputPer1kTokens: 0.02,  // $0.020 per 1K output tokens
  },

  // ElevenLabs Text-to-Speech
  elevenlabs: {
    perCharacter: 0.0003,         // $0.30 per 1000 characters
    perMinute: 0.018,             // ~$0.018 per minute (rough estimate)
  },

  // Deepgram Speech-to-Text
  deepgram: {
    perMinute: 0.0048,            // $0.0048 per minute (Nova-2 model)
  },

  // Twilio
  twilio: {
    phoneNumberMonthly: 1.00,     // $1.00 per phone number per month
    voicePerMinute: 0.013,        // $0.013 per minute (US)
    smsOutbound: 0.0079,          // $0.0079 per SMS sent (US)
    smsInbound: 0.0079,           // $0.0079 per SMS received (US)
  },

  // Stripe Transaction Fees
  stripe: {
    percentageFee: 0.029,         // 2.9%
    fixedFee: 0.30,               // $0.30 per transaction
  },

  // Infrastructure (monthly estimates)
  infrastructure: {
    database: 25.00,              // Supabase Pro plan
    backend: 20.00,               // Railway Starter plan
    frontend: 0.00,               // Vercel/Netlify free tier (for now)
    domain: 1.00,                 // Domain name amortized monthly
    monitoring: 0.00,             // Free tier services
  }
};

class CostCalculator {
  /**
   * Calculate cost for a single call
   * @param {Object} callData - Call information
   * @returns {Object} Cost breakdown
   */
  calculateCallCost(callData) {
    const {
      durationSeconds = 0,
      transcript = '',
      openaiTokensIn = 0,
      openaiTokensOut = 0,
    } = callData;

    const durationMinutes = durationSeconds / 60;

    const costs = {
      // OpenAI Realtime API costs
      openai: {
        inputAudio: (durationMinutes * COST_RATES.openai.inputAudioPerMinute) || 0,
        outputAudio: (durationMinutes * COST_RATES.openai.outputAudioPerMinute) || 0,
        textInput: (openaiTokensIn / 1000) * COST_RATES.openai.textInputPer1kTokens,
        textOutput: (openaiTokensOut / 1000) * COST_RATES.openai.textOutputPer1kTokens,
      },

      // Deepgram transcription (if used as backup)
      deepgram: durationMinutes * COST_RATES.deepgram.perMinute,

      // Twilio voice costs
      twilio: durationMinutes * COST_RATES.twilio.voicePerMinute,
    };

    // Total cost
    const totalCost =
      costs.openai.inputAudio +
      costs.openai.outputAudio +
      costs.openai.textInput +
      costs.openai.textOutput +
      costs.deepgram +
      costs.twilio;

    return {
      breakdown: costs,
      total: parseFloat(totalCost.toFixed(4)),
      perMinute: parseFloat((totalCost / durationMinutes).toFixed(4)) || 0,
    };
  }

  /**
   * Calculate monthly phone number costs
   * @param {number} phoneNumberCount - Number of active phone numbers
   * @returns {number} Monthly cost
   */
  calculatePhoneNumberCosts(phoneNumberCount) {
    return phoneNumberCount * COST_RATES.twilio.phoneNumberMonthly;
  }

  /**
   * Calculate SMS costs
   * @param {Object} smsData - SMS usage data
   * @returns {number} Total SMS cost
   */
  calculateSmsCosts(smsData) {
    const { outbound = 0, inbound = 0 } = smsData;
    return (
      (outbound * COST_RATES.twilio.smsOutbound) +
      (inbound * COST_RATES.twilio.smsInbound)
    );
  }

  /**
   * Calculate Stripe fees
   * @param {number} amount - Transaction amount in dollars
   * @returns {number} Stripe fee
   */
  calculateStripeFee(amount) {
    return (amount * COST_RATES.stripe.percentageFee) + COST_RATES.stripe.fixedFee;
  }

  /**
   * Calculate total monthly infrastructure costs
   * @returns {number} Monthly infrastructure cost
   */
  getMonthlyInfrastructureCost() {
    return Object.values(COST_RATES.infrastructure).reduce((sum, cost) => sum + cost, 0);
  }

  /**
   * Calculate platform-wide costs for a date range
   * @param {Object} data - Platform metrics
   * @returns {Object} Complete cost breakdown
   */
  calculatePlatformCosts(data) {
    const {
      totalCallMinutes = 0,
      totalCalls = 0,
      activePhoneNumbers = 0,
      smsOutbound = 0,
      smsInbound = 0,
      revenue = 0,
      daysInPeriod = 30,
    } = data;

    // Call costs (AI + Twilio)
    const avgCallDuration = totalCalls > 0 ? totalCallMinutes / totalCalls : 0;
    const callCostPerMinute = (
      COST_RATES.openai.inputAudioPerMinute +
      COST_RATES.openai.outputAudioPerMinute +
      COST_RATES.deepgram.perMinute +
      COST_RATES.twilio.voicePerMinute
    );

    const totalCallCosts = totalCallMinutes * callCostPerMinute;

    // Phone number costs (prorated for period)
    const phoneNumberCosts = (activePhoneNumbers * COST_RATES.twilio.phoneNumberMonthly) * (daysInPeriod / 30);

    // SMS costs
    const smsCosts = this.calculateSmsCosts({ outbound: smsOutbound, inbound: smsInbound });

    // Stripe fees
    const stripeFees = revenue > 0 ? this.calculateStripeFee(revenue) : 0;

    // Infrastructure costs (prorated)
    const infrastructureCosts = this.getMonthlyInfrastructureCost() * (daysInPeriod / 30);

    // Totals
    const totalVariableCosts = totalCallCosts + smsCosts + stripeFees;
    const totalFixedCosts = phoneNumberCosts + infrastructureCosts;
    const totalCosts = totalVariableCosts + totalFixedCosts;

    // Profitability metrics
    const grossProfit = revenue - totalCallCosts;
    const netProfit = revenue - totalCosts;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      costs: {
        calls: {
          total: parseFloat(totalCallCosts.toFixed(2)),
          perMinute: parseFloat(callCostPerMinute.toFixed(4)),
          perCall: parseFloat((totalCallCosts / totalCalls).toFixed(4)) || 0,
        },
        phoneNumbers: parseFloat(phoneNumberCosts.toFixed(2)),
        sms: parseFloat(smsCosts.toFixed(2)),
        stripe: parseFloat(stripeFees.toFixed(2)),
        infrastructure: parseFloat(infrastructureCosts.toFixed(2)),
        variable: parseFloat(totalVariableCosts.toFixed(2)),
        fixed: parseFloat(totalFixedCosts.toFixed(2)),
        total: parseFloat(totalCosts.toFixed(2)),
      },
      revenue: parseFloat(revenue.toFixed(2)),
      profit: {
        gross: parseFloat(grossProfit.toFixed(2)),
        net: parseFloat(netProfit.toFixed(2)),
        grossMargin: parseFloat(grossMargin.toFixed(2)),
        netMargin: parseFloat(netMargin.toFixed(2)),
      },
      metrics: {
        totalCalls,
        totalCallMinutes: parseFloat(totalCallMinutes.toFixed(2)),
        avgCallDuration: parseFloat(avgCallDuration.toFixed(2)),
        activePhoneNumbers,
        costPerBusiness: data.totalBusinesses > 0
          ? parseFloat((totalCosts / data.totalBusinesses).toFixed(2))
          : 0,
        revenuePerBusiness: data.totalBusinesses > 0
          ? parseFloat((revenue / data.totalBusinesses).toFixed(2))
          : 0,
      }
    };
  }

  /**
   * Get cost rates (for display purposes)
   */
  getCostRates() {
    return COST_RATES;
  }
}

module.exports = new CostCalculator();
