/**
 * @fileoverview Gemini AI service for generating structured meal plans.
 * Uses Google's Generative AI SDK to create personalized cooking recommendations
 * with meal plans, grocery lists, substitutions, and budget analysis.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

/** @type {string} Gemini model identifier — 2.5 Flash-Lite (current, free tier) */
const MODEL_NAME = 'gemini-2.5-flash-lite';

/** @type {number} Maximum output tokens for the response */
const MAX_OUTPUT_TOKENS = 4096;

/** @type {number} Temperature for generation creativity (0.0–1.0) */
const TEMPERATURE = 0.7;

/** @type {import('@google/generative-ai').GenerativeModel|null} Cached model singleton for efficiency */
let cachedModel = null;

/**
 * Creates and returns a configured Gemini generative model instance.
 * Caches the instance as a singleton to avoid re-initialization overhead.
 * Uses responseMimeType to guarantee JSON output format.
 *
 * @returns {import('@google/generative-ai').GenerativeModel} Configured model instance
 * @throws {Error} If GEMINI_API_KEY environment variable is not set
 */
function getModel() {
  if (cachedModel) {
    return cachedModel;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  cachedModel = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
      responseMimeType: 'application/json',
    },
  });

  return cachedModel;
}

/**
 * Builds the structured prompt for meal plan generation.
 * The prompt instructs Gemini to return a JSON object containing
 * all four required outputs: meal plan, grocery list, substitutions, and budget.
 *
 * @param {Object} preferences - User's dietary preferences
 * @param {string} preferences.dietary - Dietary type (e.g., 'Vegetarian', 'Vegan')
 * @param {string} preferences.cuisine - Cuisine style (e.g., 'Indian', 'Italian')
 * @returns {string} Formatted prompt string ready for Gemini API
 */
function buildPrompt(preferences) {
  const { dietary, cuisine, dayType = 'Moderate', servings = 2 } = preferences;

  const dayTypeGuide = {
    Busy: 'quick, minimal prep meals under 20 minutes each',
    Moderate: 'balanced prep time, 20-45 minutes per meal',
    Relaxed: 'elaborate, detailed recipes with no time pressure',
  };

  return `You are a professional meal planner and budget-conscious chef. Generate a complete daily cooking plan based on the following user preferences.

**User Preferences:**
- Dietary Restriction: ${dietary}
- Preferred Cuisine: ${cuisine}
- Day Schedule: ${dayType} — ${dayTypeGuide[dayType] || dayTypeGuide.Moderate}
- Number of Servings: ${servings}

**Requirements:**
- Create practical, easy-to-follow meals suitable for a home cook
- Adjust recipe complexity based on the day schedule (${dayType})
- Scale all ingredient quantities for ${servings} serving(s)
- Include accurate estimated costs in Indian Rupees (₹) for ${servings} serving(s)
- Provide realistic ingredient substitutions for common allergens, budget constraints, and ingredient availability
- Keep budget analysis helpful and actionable with real savings tips

Respond with a JSON object matching this exact schema:
{
  "mealPlan": {
    "breakfast": {
      "name": "Dish name",
      "description": "Brief appetizing one-line description",
      "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
      "cookTime": "X minutes",
      "difficulty": "Easy|Medium|Hard",
      "instructions": ["Step 1", "Step 2", "Step 3"]
    },
    "lunch": {
      "name": "Dish name",
      "description": "Brief appetizing one-line description",
      "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
      "cookTime": "X minutes",
      "difficulty": "Easy|Medium|Hard",
      "instructions": ["Step 1", "Step 2", "Step 3"]
    },
    "dinner": {
      "name": "Dish name",
      "description": "Brief appetizing one-line description",
      "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
      "cookTime": "X minutes",
      "difficulty": "Easy|Medium|Hard",
      "instructions": ["Step 1", "Step 2", "Step 3"]
    }
  },
  "groceryList": {
    "produce": [{ "item": "name", "quantity": "amount", "estimatedCost": "₹XX" }],
    "dairy": [{ "item": "name", "quantity": "amount", "estimatedCost": "₹XX" }],
    "protein": [{ "item": "name", "quantity": "amount", "estimatedCost": "₹XX" }],
    "pantryStaples": [{ "item": "name", "quantity": "amount", "estimatedCost": "₹XX" }],
    "spicesAndCondiments": [{ "item": "name", "quantity": "amount", "estimatedCost": "₹XX" }]
  },
  "substitutions": [
    {
      "original": "Original ingredient",
      "substitute": "Alternative ingredient",
      "reason": "Why this substitution works (allergy, budget, or availability)"
    }
  ],
  "budgetAnalysis": {
    "totalEstimatedCost": "₹XXX",
    "costBreakdown": {
      "breakfast": "₹XX",
      "lunch": "₹XX",
      "dinner": "₹XX"
    },
    "budgetTips": ["Practical tip 1", "Practical tip 2", "Practical tip 3"],
    "savingsAlternatives": ["Money-saving alternative 1", "Money-saving alternative 2"]
  }
}`;
}

/**
 * Generates a structured meal plan using the Gemini API.
 * Makes a single API call with a comprehensive prompt to produce all outputs.
 *
 * @param {Object} preferences - User's dietary preferences
 * @param {string} preferences.dietary - Dietary type
 * @param {string} preferences.cuisine - Cuisine style
 * @returns {Promise<Object>} Parsed meal plan JSON object
 * @throws {Error} If the API call fails or the response cannot be parsed
 */
async function generateMealPlan(preferences) {
  const model = getModel();
  const prompt = buildPrompt(preferences);

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  try {
    return JSON.parse(text);
  } catch (parseError) {
    // Fallback: attempt to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    throw new Error('Failed to parse AI response as valid JSON');
  }
}

module.exports = { generateMealPlan, buildPrompt };
