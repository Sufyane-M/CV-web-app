import express from 'express';
import cors from 'cors';

// Import routes dynamically after dotenv is configured
let stripeRouter, analyticsRouter, alertsRouter, rumRouter;

// Function to initialize routes
export async function initializeRoutes() {
  const [stripe, analytics, alerts, rum] = await Promise.all([
    import('./routes/stripe.js'),
    import('./routes/analytics.js'),
    import('./routes/alerts.js'),
    import('./routes/rum.js')
  ]);
  
  stripeRouter = stripe.default;
  analyticsRouter = analytics.default;
  alertsRouter = alerts.default;
  rumRouter = rum.default;
}

const app = express();

// Middleware
app.use(cors());

// For Stripe webhooks, we need raw body
app.use(['/api/stripe/webhook', '/stripe/webhook'], express.raw({ type: 'application/json' }));

// For other routes, use JSON parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Function to setup routes after initialization
export function setupRoutes() {
  // Routes (mounted under both /api and root for flexibility)
  if (stripeRouter) {
    app.use(['/api/stripe', '/stripe'], stripeRouter);
  }
  if (analyticsRouter) {
    app.use(['/api/analytics', '/analytics'], analyticsRouter);
  }
  if (alertsRouter) {
    app.use(['/api/alerts', '/alerts'], alertsRouter);
  }
  if (rumRouter) {
    app.use(['/api/rum', '/rum'], rumRouter);
  }
  
  // Add 404 handler after all routes are configured
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;


