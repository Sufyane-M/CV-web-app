import express from 'express';
import cors from 'cors';

// Import routes dynamically after dotenv is configured
let stripeRouter, analyticsRouter, alertsRouter, rumRouter, couponsRouter, couponAdminRouter;

// Function to initialize routes
export async function initializeRoutes() {
  const [stripe, analytics, alerts, rum, coupons, couponAdmin] = await Promise.all([
    import('./routes/stripe.js'),
    import('./routes/analytics.js'),
    import('./routes/alerts.js'),
    import('./routes/rum.js'),
    import('./routes/coupons.js'),
    import('./routes/couponAdmin.js')
  ]);
  
  stripeRouter = stripe.default;
  analyticsRouter = analytics.default;
  alertsRouter = alerts.default;
  rumRouter = rum.default;
  couponsRouter = coupons.default;
  couponAdminRouter = couponAdmin.default;
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
  // Health check endpoint
  app.get(['/health', '/api/health'], (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });
  
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
  if (couponsRouter) {
    app.use(['/api/coupons', '/coupons'], couponsRouter);
  }
  if (couponAdminRouter) {
    app.use(['/api/coupons/admin', '/coupons/admin'], couponAdminRouter);
  }
  
  // Add 404 handler after all routes are configured
  app.use('*', (req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Route not found', path: req.url, method: req.method });
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
export { app };


