import express from 'express';
const router = express.Router();

// Store RUM data (Real User Monitoring)
router.post('/', async (req, res) => {
  try {
    const { metrics, userAgent, url, timestamp } = req.body;
    
    // Log RUM data for debugging
    console.log('RUM Data received:', {
      metrics,
      userAgent,
      url,
      timestamp: new Date(timestamp)
    });
    
    // In a real application, you would store this data in a database
    // For now, we'll just acknowledge receipt
    
    res.status(200).json({
      success: true,
      message: 'RUM data received successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing RUM data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process RUM data'
    });
  }
});

// Get RUM analytics data
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    
    // In a real application, you would fetch this data from a database
    // For now, return mock data
    const mockData = {
      metrics: {
        pageViews: 1250,
        uniqueUsers: 890,
        averageLoadTime: 2.3,
        bounceRate: 0.35
      },
      timeRange: {
        start: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: endDate || new Date().toISOString()
      }
    };
    
    res.status(200).json({
      success: true,
      data: mockData
    });
  } catch (error) {
    console.error('Error fetching RUM data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RUM data'
    });
  }
});

export default router;