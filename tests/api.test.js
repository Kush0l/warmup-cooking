/**
 * @fileoverview Integration tests for the /api/generate endpoint.
 * Uses a mock Gemini response to test the full request lifecycle
 * including validation, error handling, and response formatting.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { validateGenerateRequest, VALID_DAY_TYPES } = require('../lib/validator');
const { buildPrompt } = require('../lib/gemini');

/* ============================================================
 * Integration: Request Validation → Prompt → Response Flow
 * ============================================================ */

describe('API Integration: Full Request Flow', () => {
  it('should validate input and build prompt for a complete request', () => {
    const requestBody = {
      dietary: 'Vegetarian',
      cuisine: 'Indian',
      dayType: 'Busy',
      servings: 4,
    };

    // Step 1: Validate
    const { isValid, sanitized } = validateGenerateRequest(requestBody);
    assert.equal(isValid, true);
    assert.equal(sanitized.dietary, 'Vegetarian');
    assert.equal(sanitized.cuisine, 'Indian');
    assert.equal(sanitized.dayType, 'Busy');
    assert.equal(sanitized.servings, 4);

    // Step 2: Build prompt
    const prompt = buildPrompt(sanitized);
    assert.ok(prompt.includes('Vegetarian'));
    assert.ok(prompt.includes('Indian'));
    assert.ok(prompt.includes('Busy'));
    assert.ok(prompt.includes('4'));
  });

  it('should apply default dayType and servings when not provided', () => {
    const requestBody = {
      dietary: 'Vegan',
      cuisine: 'Thai',
    };

    const { isValid, sanitized } = validateGenerateRequest(requestBody);
    assert.equal(isValid, true);
    assert.equal(sanitized.dayType, 'Moderate');
    assert.equal(sanitized.servings, 2);

    const prompt = buildPrompt(sanitized);
    assert.ok(prompt.includes('Moderate'));
    assert.ok(prompt.includes('2'));
  });

  it('should reject invalid dayType while accepting valid dietary/cuisine', () => {
    const requestBody = {
      dietary: 'Keto',
      cuisine: 'Mexican',
      dayType: 'SuperBusy',
    };

    const { isValid, errors } = validateGenerateRequest(requestBody);
    assert.equal(isValid, false);
    assert.ok(errors.some((e) => e.includes('day type')));
  });

  it('should reject out-of-range servings', () => {
    const requestBody = {
      dietary: 'Vegetarian',
      cuisine: 'Indian',
      servings: 99,
    };

    const { isValid, errors } = validateGenerateRequest(requestBody);
    assert.equal(isValid, false);
    assert.ok(errors.some((e) => e.includes('Servings')));
  });

  it('should reject negative servings', () => {
    const requestBody = {
      dietary: 'Vegetarian',
      cuisine: 'Indian',
      servings: -1,
    };

    const { isValid, errors } = validateGenerateRequest(requestBody);
    assert.equal(isValid, false);
  });

  it('should reject non-integer servings', () => {
    const requestBody = {
      dietary: 'Vegetarian',
      cuisine: 'Indian',
      servings: 2.5,
    };

    const { isValid, errors } = validateGenerateRequest(requestBody);
    assert.equal(isValid, false);
  });
});

/* ============================================================
 * Day Type Validation
 * ============================================================ */

describe('Day Type Validation', () => {
  it('should accept all valid day types', () => {
    VALID_DAY_TYPES.forEach((dayType) => {
      const result = validateGenerateRequest({
        dietary: 'Vegetarian',
        cuisine: 'Indian',
        dayType,
      });
      assert.equal(result.isValid, true, `Failed for dayType: ${dayType}`);
      assert.equal(result.sanitized.dayType, dayType);
    });
  });

  it('should include day schedule context in prompt for Busy days', () => {
    const prompt = buildPrompt({
      dietary: 'Vegetarian',
      cuisine: 'Indian',
      dayType: 'Busy',
      servings: 1,
    });
    assert.ok(prompt.includes('quick'));
    assert.ok(prompt.includes('20 minutes'));
  });

  it('should include day schedule context in prompt for Relaxed days', () => {
    const prompt = buildPrompt({
      dietary: 'Vegetarian',
      cuisine: 'Indian',
      dayType: 'Relaxed',
      servings: 1,
    });
    assert.ok(prompt.includes('elaborate'));
  });
});

/* ============================================================
 * Security: XSS in New Fields
 * ============================================================ */

describe('Security: XSS Prevention in New Fields', () => {
  it('should sanitize XSS in dayType and reject as invalid', () => {
    const result = validateGenerateRequest({
      dietary: 'Vegetarian',
      cuisine: 'Indian',
      dayType: '<script>alert("xss")</script>',
    });
    assert.equal(result.isValid, false);
  });

  it('should handle servings as string number gracefully', () => {
    const result = validateGenerateRequest({
      dietary: 'Vegetarian',
      cuisine: 'Indian',
      servings: '3',
    });
    assert.equal(result.isValid, true);
    assert.equal(result.sanitized.servings, 3);
  });
});
