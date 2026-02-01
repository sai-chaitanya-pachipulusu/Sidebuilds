// Performance monitoring routes
const express = require('express');
const router = express.Router();
const { getQueryStats } = require('../db');
const { getStats: getCacheStats } = require('../middleware/cache');

// Get database performance statistics
router.get('/db-stats', async (req, res) => {
    try {
        const stats = getQueryStats ? getQueryStats() : { error: 'Query stats not available' };
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get cache performance statistics
router.get('/cache-stats', async (req, res) => {
    try {
        const stats = getCacheStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
router.get('/health', async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Check database connection
        const db = require('../db');
        const dbHealthy = await db.isConnectionHealthy();
        
        const responseTime = Date.now() - startTime;
        
        res.json({
            success: true,
            status: 'healthy',
            responseTime: `${responseTime}ms`,
            database: dbHealthy ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
