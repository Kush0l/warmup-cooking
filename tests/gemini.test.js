/**
 * @fileoverview Unit tests for the Gemini AI service.
 * Tests prompt construction to ensure all required sections are included.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildPrompt } = require('../lib/gemini');

/* ============================================================
 * buildPrompt Tests
 * ============================================================ */

describe('buildPrompt', () => {
  it('should include the dietary preference in the generated prompt', () => {
    const prompt = buildPrompt({ dietary: 'Vegan', cuisine: 'Indian' });
    assert.ok(prompt.includes('Vegan'));
  });

  it('should include the cuisine preference in the generated prompt', () => {
    const prompt = buildPrompt({ dietary: 'Vegetarian', cuisine: 'Italian' });
    assert.ok(prompt.includes('Italian'));
  });

  it('should request mealPlan section in JSON schema', () => {
    const prompt = buildPrompt({ dietary: 'Keto', cuisine: 'Mexican' });
    assert.ok(prompt.includes('mealPlan'));
  });

  it('should request groceryList section in JSON schema', () => {
    const prompt = buildPrompt({ dietary: 'Keto', cuisine: 'Mexican' });
    assert.ok(prompt.includes('groceryList'));
  });

  it('should request substitutions section in JSON schema', () => {
    const prompt = buildPrompt({ dietary: 'Keto', cuisine: 'Mexican' });
    assert.ok(prompt.includes('substitutions'));
  });

  it('should request budgetAnalysis section in JSON schema', () => {
    const prompt = buildPrompt({ dietary: 'Keto', cuisine: 'Mexican' });
    assert.ok(prompt.includes('budgetAnalysis'));
  });

  it('should include all three meal types: breakfast, lunch, dinner', () => {
    const prompt = buildPrompt({ dietary: 'Vegetarian', cuisine: 'Indian' });
    assert.ok(prompt.includes('breakfast'));
    assert.ok(prompt.includes('lunch'));
    assert.ok(prompt.includes('dinner'));
  });

  it('should request cost estimates in Indian Rupees', () => {
    const prompt = buildPrompt({ dietary: 'Vegetarian', cuisine: 'Indian' });
    assert.ok(prompt.includes('₹'));
  });

  it('should return a non-empty string', () => {
    const prompt = buildPrompt({ dietary: 'Vegetarian', cuisine: 'Indian' });
    assert.ok(typeof prompt === 'string');
    assert.ok(prompt.length > 100);
  });

  it('should handle different preference combinations', () => {
    const combos = [
      { dietary: 'Non-Vegetarian', cuisine: 'Chinese' },
      { dietary: 'Vegan', cuisine: 'Thai' },
      { dietary: 'No Preference', cuisine: 'Mixed' },
    ];

    combos.forEach(({ dietary, cuisine }) => {
      const prompt = buildPrompt({ dietary, cuisine });
      assert.ok(prompt.includes(dietary), `Missing dietary: ${dietary}`);
      assert.ok(prompt.includes(cuisine), `Missing cuisine: ${cuisine}`);
    });
  });
});
