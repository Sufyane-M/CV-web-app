import dotenv from 'dotenv';

// Configure dotenv before importing modules that use process.env
dotenv.config();

import express from 'express';
import cors from 'cors';

import stripeRouter from './routes/stripe.js';
import analyticsRouter from './routes/analytics.js';
import alertsRouter from './routes/alerts.js';
import rumRouter from './routes/rum.js';

const app = express();

// Middleware
app.use(cors());

// For Stripe webhooks, we need raw body
app.use(['/api/stripe/webhook', '/stripe/webhook'], express.raw({ type: 'application/json' }));

// For other routes, use JSON parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes (mounted under both /api and root for flexibility)
app.use(['/api/stripe', '/stripe'], stripeRouter);
app.use(['/api/analytics', '/analytics'], analyticsRouter);
app.use(['/api/alerts', '/alerts'], alertsRouter);
app.use(['/api/rum', '/rum'], rumRouter);

// Health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;


