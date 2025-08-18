import app, { initializeRoutes, setupRoutes } from './app.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv to load from the api directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize routes once
let routesInitialized = false;

export default async function handler(req, res) {
  // Initialize routes if not already done
  if (!routesInitialized) {
    await initializeRoutes();
    setupRoutes();
    routesInitialized = true;
  }
  
  return app(req, res);
}


