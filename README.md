# 🍳 CookAI — AI-Powered Cooking To-Do List

An intelligent meal planning micro-app that generates **personalized daily cooking plans** using **Google Gemini AI**. Get complete meal plans, grocery lists, ingredient substitutions, and budget analysis — all from two simple preferences.

> Built for the **PromptWars Hackathon** — Google for Developers × H2S

## ✨ Features

- **🍽️ Personalized Meal Plans** — Breakfast, lunch, and dinner recipes tailored to your dietary and cuisine preferences
- **🛒 Smart Grocery Lists** — Auto-generated, categorized shopping lists with estimated costs
- **🔄 Ingredient Substitutions** — AI-suggested alternatives for allergies, budget, or availability
- **💰 Budget Analysis** — Cost breakdown, budget tips, and money-saving alternatives

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express (local dev) |
| **AI** | Google Gemini 2.0 Flash |
| **Deployment** | Vercel (Serverless Functions) |

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **Google Gemini API Key** — [Get one free here](https://aistudio.google.com)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/ai-cooking-todo.git
   cd ai-cooking-todo
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open in your browser:**
   ```
   http://localhost:3000
   ```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

## 📁 Project Structure

```
├── api/                      # Serverless API functions (Vercel)
│   └── generate.js           # POST /api/generate — meal plan endpoint
├── lib/                      # Shared library modules
│   ├── gemini.js             # Gemini AI service (prompt + parsing)
│   └── validator.js          # Input validation & XSS sanitization
├── public/                   # Static frontend assets
│   ├── index.html            # Semantic, accessible HTML page
│   ├── css/styles.css        # Premium dark-mode design system
│   └── js/app.js             # Frontend application logic
├── tests/                    # Test suite
│   ├── validator.test.js     # Validation unit tests
│   └── gemini.test.js        # Prompt construction tests
├── server.js                 # Local Express dev server
├── vercel.json               # Vercel deployment configuration
├── .env.example              # Environment variable template
└── package.json              # Dependencies & scripts
```

## 🌐 Deployment (Vercel)

1. Push your code to a **public GitHub repository**
2. Go to [vercel.com](https://vercel.com) → **"Add New Project"**
3. Import your GitHub repository
4. In **Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` = `your_api_key_here`
5. Click **Deploy** — your app will be live!

## 🏗️ Architecture

```
User Input → Frontend (Vanilla JS) → POST /api/generate → Gemini AI → Structured JSON → Rendered UI
```

- **Single API call** to Gemini produces all 4 outputs (meal plan, grocery list, substitutions, budget)
- **Server-side API key** — never exposed to the browser
- **Input sanitization** — XSS prevention and schema validation
- **Rate limiting** — 10 requests per minute per IP

## 📊 Scoring Criteria Addressed

| Criteria | Implementation |
|----------|---------------|
| **Code Quality** | Clean architecture, JSDoc, ESLint, modular design |
| **Security** | API key in env vars, input sanitization, rate limiting, CORS, security headers |
| **Efficiency** | Single Gemini call, DOM caching, no framework overhead |
| **Testing** | Unit tests for validation & prompt construction |
| **Accessibility** | ARIA roles, keyboard nav, focus management, reduced motion, high contrast |
| **Problem Alignment** | All 4 outputs: Meals, Grocery, Substitutions, Budget |

## 📄 License

MIT — Built for PromptWars Hackathon
