/**
 * @fileoverview Serverless API endpoint for generating AI-powered meal plans.
 * Handles POST requests with dietary/cuisine preferences, validates input,
 * applies rate limiting, and returns structured meal plan data from Gemini AI.
 *
 * @route POST /api/generate
 * @security Rate limited to 10 requests per minute per IP
 */

const { generateMealPlan } = require('../lib/gemini');
const { validateGenerateRequest } = require('../lib/validator');

/**
 * In-memory rate limit tracking.
 * Maps client IP addresses to arrays of request timestamps.
 * @type {Map<string, number[]>}
 */
const requestLog = new Map();

/** @type {number} Maximum allowed requests per IP within the rate window */
const RATE_LIMIT = 10;

/** @type {number} Rate limit time window in milliseconds (60 seconds) */
const RATE_WINDOW_MS = 60 * 1000;

/**
 * Checks whether a client IP has exceeded the rate limit.
 * Maintains a sliding window of request timestamps per IP.
 *
 * @param {string} ip - Client IP address
 * @returns {boolean} True if the client has exceeded the rate limit
 */
function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter(
    (timestamp) => now - timestamp < RATE_WINDOW_MS
  );

  if (timestamps.length >= RATE_LIMIT) {
    return true;
  }

  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return false;
}

/**
 * Sets standard security and CORS headers on the response.
 *
 * @param {import('http').ServerResponse} res - HTTP response object
 */
function setHeaders(req, res) {
  // Restrict CORS to same origin (frontend & API share the same domain)
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
}

/**
 * Main serverless handler for the /api/generate endpoint.
 * Validates input, enforces rate limits, and delegates to Gemini AI.
 *
 * @param {import('http').IncomingMessage & { body: Object }} req - HTTP request
 * @param {import('http').ServerResponse} res - HTTP response
 * @returns {Promise<void>}
 */
module.exports = async function handler(req, res) {
  setHeaders(req, res);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Restrict to POST method only
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests',
    });
  }

  // Enforce rate limiting
  const clientIp =
    req.headers['x-forwarded-for'] ||
    req.socket?.remoteAddress ||
    'unknown';

  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please wait a minute before generating another meal plan',
    });
  }

  try {
    // Validate and sanitize input
    const { isValid, errors, sanitized } = validateGenerateRequest(req.body);

    if (!isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        messages: errors,
      });
    }

    // Generate meal plan via Gemini AI
    const mealPlan = await generateMealPlan(sanitized);

    return res.status(200).json({
      success: true,
      data: mealPlan,
    });
  } catch (error) {
    console.error('[API Error]', error.message);

    // Return 503 for configuration issues, 500 for everything else
    const statusCode = error.message.includes('API_KEY') ? 503 : 500;

    return res.status(statusCode).json({
      error: 'Generation failed',
      message: 'Unable to generate meal plan. Please try again later.',
    });
  }
};
