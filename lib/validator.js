/**
 * @fileoverview Input validation and sanitization utilities.
 * Provides security-focused validation for user inputs to prevent
 * XSS attacks and ensure data integrity before API processing.
 */

/** @type {string[]} Allowed dietary preference values */
const VALID_DIETARY_OPTIONS = [
  'Vegetarian',
  'Non-Vegetarian',
  'Vegan',
  'Keto',
  'No Preference',
];

/** @type {string[]} Allowed cuisine preference values */
const VALID_CUISINE_OPTIONS = [
  'Indian',
  'Italian',
  'Chinese',
  'Mexican',
  'Japanese',
  'Mediterranean',
  'Thai',
  'American',
  'Mixed',
];

/** @type {string[]} Allowed day schedule type values */
const VALID_DAY_TYPES = [
  'Busy',
  'Moderate',
  'Relaxed',
];

/** @type {number} Maximum allowed length for any string input */
const MAX_INPUT_LENGTH = 100;

/**
 * Sanitizes a string input by removing HTML tags, special characters,
 * and enforcing a maximum length. Prevents XSS and injection attacks.
 *
 * @param {*} input - Raw user input (any type)
 * @returns {string} Sanitized string, or empty string if input is invalid
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/<[^>]*>/g, '')       // Strip HTML tags
    .replace(/[<>"'&]/g, '')       // Remove dangerous special characters
    .trim()
    .slice(0, MAX_INPUT_LENGTH);   // Enforce maximum length
}

/**
 * Validates the meal plan generation request body.
 * Checks for required fields, validates against allowed enum values,
 * and sanitizes all string inputs.
 *
 * @param {Object} body - Request body to validate
 * @returns {{ isValid: boolean, errors: string[], sanitized: Object }}
 *   Validation result containing:
 *   - isValid: whether all checks passed
 *   - errors: array of human-readable error messages
 *   - sanitized: cleaned input data (only populated if valid)
 */
function validateGenerateRequest(body) {
  const errors = [];
  const sanitized = {};

  // Guard against null/undefined/non-object body
  if (!body || typeof body !== 'object') {
    return {
      isValid: false,
      errors: ['Request body must be a JSON object'],
      sanitized: {},
    };
  }

  // Validate and sanitize dietary preference
  const dietary = sanitizeString(body.dietary);
  if (!dietary) {
    errors.push('Dietary preference is required');
  } else if (!VALID_DIETARY_OPTIONS.includes(dietary)) {
    errors.push(
      `Invalid dietary preference. Must be one of: ${VALID_DIETARY_OPTIONS.join(', ')}`
    );
  } else {
    sanitized.dietary = dietary;
  }

  // Validate and sanitize cuisine preference
  const cuisine = sanitizeString(body.cuisine);
  if (!cuisine) {
    errors.push('Cuisine preference is required');
  } else if (!VALID_CUISINE_OPTIONS.includes(cuisine)) {
    errors.push(
      `Invalid cuisine preference. Must be one of: ${VALID_CUISINE_OPTIONS.join(', ')}`
    );
  } else {
    sanitized.cuisine = cuisine;
  }

  // Validate day type (optional, defaults to 'Moderate')
  if (body.dayType !== undefined && body.dayType !== null && String(body.dayType).trim() !== '') {
    const dayType = sanitizeString(body.dayType);
    if (!VALID_DAY_TYPES.includes(dayType)) {
      errors.push(
        `Invalid day type. Must be one of: ${VALID_DAY_TYPES.join(', ')}`
      );
    } else {
      sanitized.dayType = dayType;
    }
  } else {
    sanitized.dayType = 'Moderate';
  }

  // Validate servings (optional, defaults to 2)
  if (body.servings !== undefined && body.servings !== null && body.servings !== '') {
    const servings = Number(body.servings);
    if (!Number.isInteger(servings) || servings < 1 || servings > 10) {
      errors.push('Servings must be a whole number between 1 and 10');
    } else {
      sanitized.servings = servings;
    }
  } else {
    sanitized.servings = 2;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

module.exports = {
  sanitizeString,
  validateGenerateRequest,
  VALID_DIETARY_OPTIONS,
  VALID_CUISINE_OPTIONS,
  VALID_DAY_TYPES,
};
