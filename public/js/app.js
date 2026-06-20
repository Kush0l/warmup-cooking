/**
 * @fileoverview Main application logic for CookAI meal planner.
 * Handles user interactions, API communication, dynamic rendering,
 * and accessible tab navigation for the meal plan results.
 *
 * @author CookAI Team
 * @version 1.0.0
 */

'use strict';

/* ============================================================
 * Constants & Configuration
 * ============================================================ */

/** @type {string} API endpoint for meal plan generation */
const API_ENDPOINT = '/api/generate';

/** @type {number} Staggered animation delay per card (ms) */
const ANIMATION_DELAY_MS = 100;

/** @type {number} Toast auto-dismiss duration (ms) */
const TOAST_DURATION_MS = 6000;

/* ============================================================
 * DOM References — Cached for performance
 * ============================================================ */

const elements = {
  form: document.getElementById('preferences-form'),
  dietarySelect: document.getElementById('dietary'),
  cuisineSelect: document.getElementById('cuisine'),
  generateBtn: document.getElementById('generate-btn'),
  dayTypeSelect: document.getElementById('dayType'),
  servingsInput: document.getElementById('servings'),
  inputSection: document.getElementById('input-section'),
  loadingSection: document.getElementById('loading-section'),
  resultsSection: document.getElementById('results-section'),
  regenerateBtn: document.getElementById('regenerate-btn'),
  errorToast: document.getElementById('error-toast'),
  toastMessage: document.getElementById('toast-message'),
  toastClose: document.getElementById('toast-close'),
  tabs: document.querySelectorAll('[role="tab"]'),
  tabPanels: {
    meals: document.getElementById('panel-meals'),
    grocery: document.getElementById('panel-grocery'),
    subs: document.getElementById('panel-subs'),
    budget: document.getElementById('panel-budget'),
  },
};

/* ============================================================
 * State Management
 * ============================================================ */

/**
 * Application state object.
 * @type {{ isLoading: boolean, currentTab: string, data: Object|null }}
 */
const state = {
  isLoading: false,
  currentTab: 'meals',
  data: null,
};

/** @type {number|null} Toast auto-dismiss timer ID */
let toastTimerId = null;

/* ============================================================
 * API Communication
 * ============================================================ */

/**
 * Sends user preferences to the API and returns a structured meal plan.
 *
 * @param {{ dietary: string, cuisine: string }} preferences - User selections
 * @returns {Promise<Object>} Parsed meal plan data from Gemini AI
 * @throws {Error} If the request fails or the server returns an error
 */
async function fetchMealPlan(preferences) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Request failed with status ${response.status}`
      );
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Unknown server error');
    }

    return result.data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
}

/* ============================================================
 * Rendering — Meal Plan Tab
 * ============================================================ */

/**
 * Returns an emoji representing the difficulty level.
 * @param {string} difficulty - 'Easy', 'Medium', or 'Hard'
 * @returns {string} Color-coded emoji indicator
 */
function getDifficultyEmoji(difficulty) {
  const map = { Easy: '🟢', Medium: '🟡', Hard: '🔴' };
  return map[difficulty] || '⚪';
}

/**
 * Renders the meal plan tab content with breakfast, lunch, and dinner cards.
 * Each card includes expandable recipe details.
 *
 * @param {Object} mealPlan - Meal plan data with breakfast, lunch, dinner keys
 * @returns {string} HTML string for the meals tab
 */
function renderMeals(mealPlan) {
  const meals = [
    { key: 'breakfast', icon: '🌅', label: 'Breakfast', data: mealPlan.breakfast },
    { key: 'lunch', icon: '☀️', label: 'Lunch', data: mealPlan.lunch },
    { key: 'dinner', icon: '🌙', label: 'Dinner', data: mealPlan.dinner },
  ];

  return meals
    .map(
      (meal, index) => `
    <article class="meal-card fade-in" style="animation-delay: ${index * ANIMATION_DELAY_MS}ms" aria-label="${meal.label} meal">
      <div class="meal-card__header">
        <span class="meal-card__icon" aria-hidden="true">${meal.icon}</span>
        <div>
          <h3 class="meal-card__label">${meal.label}</h3>
          <h2 class="meal-card__name">${escapeHtml(meal.data.name)}</h2>
        </div>
        <div class="meal-card__meta">
          <span class="badge badge--time">⏱️ ${escapeHtml(meal.data.cookTime)}</span>
          <span class="badge badge--difficulty">${getDifficultyEmoji(meal.data.difficulty)} ${escapeHtml(meal.data.difficulty)}</span>
        </div>
      </div>
      <p class="meal-card__description">${escapeHtml(meal.data.description)}</p>
      <details class="meal-card__details">
        <summary class="meal-card__toggle">View Recipe Details</summary>
        <div class="meal-card__content">
          <div class="meal-card__ingredients">
            <h4>Ingredients</h4>
            <ul>${meal.data.ingredients.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
          </div>
          <div class="meal-card__instructions">
            <h4>Instructions</h4>
            <ol>${meal.data.instructions.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
          </div>
        </div>
      </details>
    </article>
  `
    )
    .join('');
}

/* ============================================================
 * Rendering — Grocery List Tab
 * ============================================================ */

/**
 * Returns a category-appropriate emoji icon.
 * @param {string} category - Grocery category key
 * @returns {string} Emoji icon
 */
function getCategoryIcon(category) {
  const icons = {
    produce: '🥬',
    dairy: '🧈',
    protein: '🥩',
    pantryStaples: '🫙',
    spicesAndCondiments: '🧂',
  };
  return icons[category] || '📦';
}

/**
 * Formats a category key into a human-readable title.
 * @param {string} key - camelCase category key
 * @returns {string} Formatted title (e.g., 'pantryStaples' → 'Pantry Staples')
 */
function formatCategoryName(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase());
}

/**
 * Renders the grocery list tab with categorized items and costs.
 *
 * @param {Object} groceryList - Categorized grocery data
 * @returns {string} HTML string for the grocery tab
 */
function renderGrocery(groceryList) {
  return Object.entries(groceryList)
    .filter(([, items]) => Array.isArray(items) && items.length > 0)
    .map(
      ([key, items], index) => `
      <div class="grocery-category fade-in" style="animation-delay: ${index * ANIMATION_DELAY_MS}ms">
        <h3 class="grocery-category__title">${getCategoryIcon(key)} ${formatCategoryName(key)}</h3>
        <div class="grocery-items">
          ${items
            .map(
              (item) => `
            <div class="grocery-item">
              <span class="grocery-item__name">${escapeHtml(item.item)}</span>
              <span class="grocery-item__qty">${escapeHtml(item.quantity)}</span>
              <span class="grocery-item__cost">${escapeHtml(item.estimatedCost)}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
    )
    .join('');
}

/* ============================================================
 * Rendering — Substitutions Tab
 * ============================================================ */

/**
 * Renders substitution cards showing original → substitute mappings.
 *
 * @param {Array<{original: string, substitute: string, reason: string}>} substitutions
 * @returns {string} HTML string for the substitutions tab
 */
function renderSubstitutions(substitutions) {
  if (!Array.isArray(substitutions) || substitutions.length === 0) {
    return '<p class="empty-state">No substitutions needed for this meal plan.</p>';
  }

  return substitutions
    .map(
      (sub, index) => `
    <div class="sub-card fade-in" style="animation-delay: ${index * ANIMATION_DELAY_MS}ms">
      <div class="sub-card__flow">
        <div class="sub-card__original">
          <span class="sub-card__label">Original</span>
          <span class="sub-card__value">${escapeHtml(sub.original)}</span>
        </div>
        <span class="sub-card__arrow" aria-hidden="true">→</span>
        <div class="sub-card__substitute">
          <span class="sub-card__label">Substitute</span>
          <span class="sub-card__value">${escapeHtml(sub.substitute)}</span>
        </div>
      </div>
      <p class="sub-card__reason">${escapeHtml(sub.reason)}</p>
    </div>
  `
    )
    .join('');
}

/* ============================================================
 * Rendering — Budget Analysis Tab
 * ============================================================ */

/**
 * Extracts the numeric value from a cost string (e.g., '₹250' → 250).
 * @param {string} costString - Cost string with currency symbol
 * @returns {number} Numeric cost value
 */
function parseCost(costString) {
  return parseInt(String(costString).replace(/[^0-9]/g, ''), 10) || 0;
}

/**
 * Renders the budget analysis tab with cost breakdown bars, tips, and savings.
 *
 * @param {Object} budgetAnalysis - Budget data from the AI response
 * @returns {string} HTML string for the budget tab
 */
function renderBudget(budgetAnalysis) {
  const {
    totalEstimatedCost,
    costBreakdown,
    budgetTips,
    savingsAlternatives,
  } = budgetAnalysis;

  const costs = Object.values(costBreakdown).map(parseCost);
  const maxCost = Math.max(...costs, 1);

  const mealIcons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };

  const breakdownBars = Object.entries(costBreakdown)
    .map(([meal, cost]) => {
      const numericCost = parseCost(cost);
      const percentage = Math.round((numericCost / maxCost) * 100);
      const icon = mealIcons[meal] || '🍽️';
      const capitalizedMeal = meal.charAt(0).toUpperCase() + meal.slice(1);

      return `
        <div class="budget-bar">
          <span class="budget-bar__label">${icon} ${capitalizedMeal}</span>
          <div class="budget-bar__track">
            <div class="budget-bar__fill" style="width: ${percentage}%"></div>
          </div>
          <span class="budget-bar__value">${escapeHtml(cost)}</span>
        </div>
      `;
    })
    .join('');

  const tipsHtml = Array.isArray(budgetTips)
    ? budgetTips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')
    : '';

  const savingsHtml = Array.isArray(savingsAlternatives)
    ? savingsAlternatives.map((alt) => `<li>${escapeHtml(alt)}</li>`).join('')
    : '';

  return `
    <div class="budget-overview fade-in">
      <div class="budget-total">
        <span class="budget-total__label">Total Estimated Cost</span>
        <span class="budget-total__value">${escapeHtml(totalEstimatedCost)}</span>
      </div>

      <div class="budget-breakdown">
        <h3>📊 Cost Breakdown</h3>
        ${breakdownBars}
      </div>

      ${tipsHtml ? `
      <div class="budget-tips">
        <h3>💡 Budget Tips</h3>
        <ul>${tipsHtml}</ul>
      </div>
      ` : ''}

      ${savingsHtml ? `
      <div class="budget-savings">
        <h3>🏷️ Savings Alternatives</h3>
        <ul>${savingsHtml}</ul>
      </div>
      ` : ''}
    </div>
  `;
}

/* ============================================================
 * Utility Functions
 * ============================================================ */

/**
 * Escapes HTML special characters to prevent XSS in rendered content.
 * @param {string} text - Raw text to escape
 * @returns {string} HTML-safe string
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/* ============================================================
 * View Management
 * ============================================================ */

/**
 * Shows a specific section and hides all others.
 * @param {string} sectionId - DOM ID of the section to display
 */
function showSection(sectionId) {
  const sections = ['input-section', 'loading-section', 'results-section'];

  sections.forEach((id) => {
    document.getElementById(id).classList.toggle('hidden', id !== sectionId);
  });

  // Update aria-busy on loading section
  elements.loadingSection.setAttribute(
    'aria-busy',
    sectionId === 'loading-section' ? 'true' : 'false'
  );
}

/**
 * Switches the active tab and displays the corresponding panel.
 * Updates ARIA attributes for accessibility.
 *
 * @param {string} tabId - DOM ID of the tab button to activate
 */
function switchTab(tabId) {
  const tabName = tabId.replace('tab-', '');

  // Update tab button states
  elements.tabs.forEach((tab) => {
    const isActive = tab.id === tabId;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  // Update tab panel visibility
  Object.entries(elements.tabPanels).forEach(([key, panel]) => {
    const isActive = key === tabName;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });

  // Animate tab indicator
  const activeTab = document.getElementById(tabId);
  const indicator = document.querySelector('.tab__indicator');
  if (activeTab && indicator) {
    indicator.style.left = `${activeTab.offsetLeft}px`;
    indicator.style.width = `${activeTab.offsetWidth}px`;
  }

  state.currentTab = tabName;
}

/**
 * Displays an error toast notification.
 * Auto-dismisses after TOAST_DURATION_MS.
 *
 * @param {string} message - Error message to display
 */
function showError(message) {
  elements.toastMessage.textContent = message;
  elements.errorToast.classList.remove('hidden');

  // Clear any existing timer
  if (toastTimerId) {
    clearTimeout(toastTimerId);
  }

  toastTimerId = setTimeout(() => {
    elements.errorToast.classList.add('hidden');
    toastTimerId = null;
  }, TOAST_DURATION_MS);
}

/**
 * Updates the generate button's loading state.
 * @param {boolean} isLoading - Whether the app is in a loading state
 */
function setLoading(isLoading) {
  state.isLoading = isLoading;
  elements.generateBtn.disabled = isLoading;
  elements.generateBtn.classList.toggle('loading', isLoading);
}

/* ============================================================
 * Event Handlers
 * ============================================================ */

/**
 * Handles form submission: validates input, calls API, renders results.
 * @param {SubmitEvent} event - Form submit event
 */
async function handleSubmit(event) {
  event.preventDefault();

  const dietary = elements.dietarySelect.value;
  const cuisine = elements.cuisineSelect.value;
  const dayType = elements.dayTypeSelect.value;
  const servings = Number(elements.servingsInput.value) || 2;

  // Client-side validation
  if (!dietary || !cuisine) {
    showError('Please select both dietary and cuisine preferences.');
    return;
  }

  setLoading(true);
  showSection('loading-section');

  try {
    const data = await fetchMealPlan({ dietary, cuisine, dayType, servings });
    state.data = data;

    // Render all tab panels
    elements.tabPanels.meals.innerHTML = renderMeals(data.mealPlan);
    elements.tabPanels.grocery.innerHTML = renderGrocery(data.groceryList);
    elements.tabPanels.subs.innerHTML = renderSubstitutions(data.substitutions);
    elements.tabPanels.budget.innerHTML = renderBudget(data.budgetAnalysis);

    // Show results with the meals tab active
    showSection('results-section');
    switchTab('tab-meals');
  } catch (error) {
    showError(error.message || 'Something went wrong. Please try again.');
    showSection('input-section');
  } finally {
    setLoading(false);
  }
}

/**
 * Handles tab click events using event delegation.
 * @param {MouseEvent} event - Click event on a tab
 */
function handleTabClick(event) {
  const tab = event.target.closest('[role="tab"]');
  if (tab) {
    switchTab(tab.id);
  }
}

/**
 * Handles keyboard navigation within the tab bar.
 * Supports ArrowLeft/ArrowRight per WAI-ARIA tab pattern.
 *
 * @param {KeyboardEvent} event - Keydown event
 */
function handleTabKeydown(event) {
  const tabs = Array.from(elements.tabs);
  const currentIndex = tabs.indexOf(document.activeElement);

  if (currentIndex === -1) {
    return;
  }

  let nextIndex;

  if (event.key === 'ArrowRight') {
    nextIndex = (currentIndex + 1) % tabs.length;
  } else if (event.key === 'ArrowLeft') {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  } else if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = tabs.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  tabs[nextIndex].focus();
  switchTab(tabs[nextIndex].id);
}

/**
 * Navigates back to the input form for generating a new plan.
 */
function handleRegenerate() {
  showSection('input-section');
  state.data = null;
  elements.form.querySelector('select')?.focus();
}

/**
 * Dismisses the error toast notification.
 */
function handleToastClose() {
  elements.errorToast.classList.add('hidden');
  if (toastTimerId) {
    clearTimeout(toastTimerId);
    toastTimerId = null;
  }
}

/* ============================================================
 * Initialization
 * ============================================================ */

/**
 * Initializes the application by attaching all event listeners
 * and setting the initial tab indicator position.
 */
function init() {
  // Form submission
  elements.form.addEventListener('submit', handleSubmit);

  // Tab navigation
  elements.tabs.forEach((tab) => {
    tab.addEventListener('click', handleTabClick);
    tab.addEventListener('keydown', handleTabKeydown);
  });

  // Regenerate button
  elements.regenerateBtn.addEventListener('click', handleRegenerate);

  // Toast close button
  elements.toastClose.addEventListener('click', handleToastClose);

  // Position the tab indicator on the first tab
  requestAnimationFrame(() => {
    const firstTab = document.getElementById('tab-meals');
    const indicator = document.querySelector('.tab__indicator');
    if (firstTab && indicator) {
      indicator.style.left = `${firstTab.offsetLeft}px`;
      indicator.style.width = `${firstTab.offsetWidth}px`;
    }
  });
}

// Bootstrap the application
document.addEventListener('DOMContentLoaded', init);
