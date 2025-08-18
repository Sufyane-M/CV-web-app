import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv to load from the api directory
dotenv.config({ path: path.join(__dirname, '.env') });

import app, { initializeRoutes, setupRoutes } from './app.js';

const PORT = process.env.PORT || 3001;

// Initialize routes after dotenv is configured
await initializeRoutes();
setupRoutes();

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;