/**
 * @fileoverview Unit tests for input validation and sanitization.
 * Tests the validator module's security and data integrity functions.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  sanitizeString,
  validateGenerateRequest,
  VALID_DIETARY_OPTIONS,
  VALID_CUISINE_OPTIONS,
} = require('../lib/validator');

/* ============================================================
 * sanitizeString Tests
 * ============================================================ */

describe('sanitizeString', () => {
  it('should remove HTML tags to prevent XSS', () => {
    const result = sanitizeString('<script>alert("xss")</script>');
    assert.ok(!result.includes('<script>'));
    assert.ok(!result.includes('</script>'));
  });

  it('should remove dangerous special characters', () => {
    const result = sanitizeString('test<>"\'&value');
    assert.ok(!result.includes('<'));
    assert.ok(!result.includes('>'));
    assert.ok(!result.includes('"'));
    assert.ok(!result.includes("'"));
    assert.ok(!result.includes('&'));
  });

  it('should trim leading and trailing whitespace', () => {
    assert.equal(sanitizeString('  hello  '), 'hello');
  });

  it('should enforce maximum input length of 100 characters', () => {
    const longString = 'a'.repeat(200);
    const result = sanitizeString(longString);
    assert.equal(result.length, 100);
  });

  it('should return empty string for null input', () => {
    assert.equal(sanitizeString(null), '');
  });

  it('should return empty string for undefined input', () => {
    assert.equal(sanitizeString(undefined), '');
  });

  it('should return empty string for numeric input', () => {
    assert.equal(sanitizeString(42), '');
  });

  it('should return empty string for object input', () => {
    assert.equal(sanitizeString({}), '');
  });

  it('should preserve clean strings unchanged', () => {
    assert.equal(sanitizeString('Vegetarian'), 'Vegetarian');
  });
});

/* ============================================================
 * validateGenerateRequest Tests
 * ============================================================ */

describe('validateGenerateRequest', () => {
  it('should accept valid dietary and cuisine preferences', () => {
    const result = validateGenerateRequest({
      dietary: 'Vegetarian',
      cuisine: 'Indian',
    });
    assert.equal(result.isValid, true);
    assert.equal(result.errors.length, 0);
    assert.deepEqual(result.sanitized, {
      dietary: 'Vegetarian',
      cuisine: 'Indian',
      dayType: 'Moderate',
      servings: 2,
    });
  });

  it('should accept all valid dietary options', () => {
    VALID_DIETARY_OPTIONS.forEach((option) => {
      const result = validateGenerateRequest({
        dietary: option,
        cuisine: 'Indian',
      });
      assert.equal(result.isValid, true, `Failed for dietary: ${option}`);
    });
  });

  it('should accept all valid cuisine options', () => {
    VALID_CUISINE_OPTIONS.forEach((option) => {
      const result = validateGenerateRequest({
        dietary: 'Vegetarian',
        cuisine: option,
      });
      assert.equal(result.isValid, true, `Failed for cuisine: ${option}`);
    });
  });

  it('should reject missing dietary preference', () => {
    const result = validateGenerateRequest({ cuisine: 'Indian' });
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.toLowerCase().includes('dietary')));
  });

  it('should reject missing cuisine preference', () => {
    const result = validateGenerateRequest({ dietary: 'Vegetarian' });
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.toLowerCase().includes('cuisine')));
  });

  it('should reject invalid dietary preference', () => {
    const result = validateGenerateRequest({
      dietary: 'Paleo',
      cuisine: 'Indian',
    });
    assert.equal(result.isValid, false);
  });

  it('should reject invalid cuisine preference', () => {
    const result = validateGenerateRequest({
      dietary: 'Vegetarian',
      cuisine: 'Martian',
    });
    assert.equal(result.isValid, false);
  });

  it('should reject null request body', () => {
    const result = validateGenerateRequest(null);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.length > 0);
  });

  it('should reject undefined request body', () => {
    const result = validateGenerateRequest(undefined);
    assert.equal(result.isValid, false);
  });

  it('should reject non-object request body', () => {
    const result = validateGenerateRequest('not an object');
    assert.equal(result.isValid, false);
  });

  it('should sanitize XSS attempts and reject as invalid', () => {
    const result = validateGenerateRequest({
      dietary: '<script>alert("xss")</script>',
      cuisine: 'Indian',
    });
    assert.equal(result.isValid, false);
  });

  it('should return multiple errors for multiple invalid fields', () => {
    const result = validateGenerateRequest({});
    assert.equal(result.isValid, false);
    assert.ok(result.errors.length >= 2);
  });
});
