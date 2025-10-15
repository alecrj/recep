/**
 * Shared active calls Map
 * This allows both twilio.js and calls.js to access the same call data
 */

const activeCalls = new Map();

module.exports = activeCalls;
