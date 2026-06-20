/**
 * @fileoverview Local development server for CookAI.
 * Serves static files from public/ and mounts the API endpoint.
 * This file is NOT used in production — Vercel handles routing directly.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const generateHandler = require('./api/generate');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---
app.post('/api/generate', generateHandler);

// --- SPA Fallback ---
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`\n  🍳 CookAI running at http://localhost:${PORT}\n`);
});
