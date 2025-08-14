const app = require('./server');

module.exports = (req, res) => {
  // Handle CORS preflight requests explicitly for Vercel
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', 'https://cv-plum-ten.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, stripe-signature');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
    return;
  }

  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', 'https://cv-plum-ten.vercel.app');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  return app(req, res);
};


