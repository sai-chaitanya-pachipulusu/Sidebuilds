const express = require('express');
const router = express.Router();
const webhookService = require('../services/webhookService');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../db');

// GET /api/webhooks/health
// Get webhook system health status
router.get('/health', authMiddleware, async (req, res) => {
    try {
        // Check if user has admin privileges (you may want to add role-based auth)
        // For now, we'll allow authenticated users to check webhook health
        
        const healthStatus = await webhookService.getHealthStatus();
        
        // Additional system health checks
        const dbHealth = await db.checkConnection();
        const currentTime = new Date().toISOString();
        
        const response = {
            timestamp: currentTime,
            webhook: healthStatus,
            database: dbHealth,
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version,
                environment: process.env.NODE_ENV
            }
        };
        
        const overallHealthy = healthStatus.healthy && dbHealth.ok;
        
        res.status(overallHealthy ? 200 : 503).json(response);
        
    } catch (error) {
        console.error('[WEBHOOK HEALTH] Error checking health:', error);
        res.status(500).json({
            timestamp: new Date().toISOString(),
            healthy: false,
            error: error.message
        });
    }
});

// GET /api/webhooks/events
// Get recent webhook events for monitoring
router.get('/events', authMiddleware, async (req, res) => {
    try {
        const { limit = 50, status, event_type } = req.query;
        
        let query = `
            SELECT event_id, event_type, status, received_at, processing_time, error_message, retry_count
            FROM webhook_events 
            WHERE 1=1
        `;
        const params = [];
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        if (event_type) {
            query += ' AND event_type = ?';
            params.push(event_type);
        }
        
        query += ' ORDER BY received_at DESC LIMIT ?';
        params.push(parseInt(limit));
        
        const result = await db.query(query, params);
        
        // Get summary statistics
        const statsQuery = await db.query(`
            SELECT 
                status,
                COUNT(*) as count,
                AVG(processing_time) as avg_processing_time,
                MAX(processing_time) as max_processing_time
            FROM webhook_events 
            WHERE received_at >= datetime('now', '-24 hours')
            GROUP BY status
        `);
        
        res.json({
            events: result.rows,
            stats: statsQuery.rows,
            total: result.rows.length
        });
        
    } catch (error) {
        console.error('[WEBHOOK EVENTS] Error fetching events:', error);
        res.status(500).json({
            error: 'Failed to fetch webhook events',
            message: error.message
        });
    }
});

// POST /api/webhooks/replay/:eventId
// Replay a failed webhook event
router.post('/replay/:eventId', authMiddleware, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { force = false } = req.body;
        
        console.log(`[WEBHOOK REPLAY] Attempting to replay event ${eventId}`);
        
        // Get the original event from webhook_events table
        const eventResult = await db.query(
            'SELECT * FROM webhook_events WHERE event_id = ?',
            [eventId]
        );
        
        if (eventResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Webhook event not found',
                eventId
            });
        }
        
        const eventRecord = eventResult.rows[0];
        
        // Check if event can be replayed
        if (!force && eventRecord.status === 'completed') {
            return res.status(400).json({
                error: 'Event already completed. Use force=true to replay anyway.',
                eventId,
                currentStatus: eventRecord.status
            });
        }
        
        // For replay, we'd need to store the original Stripe event data
        // Since we don't store the full event, we'll simulate based on event type
        // In a production system, you'd want to store the full event payload
        
        // For now, return a simulated response
        res.json({
            message: 'Webhook replay initiated',
            eventId,
            originalStatus: eventRecord.status,
            note: 'Full replay functionality requires storing original event payload'
        });
        
    } catch (error) {
        console.error('[WEBHOOK REPLAY] Error replaying event:', error);
        res.status(500).json({
            error: 'Failed to replay webhook event',
            message: error.message
        });
    }
});

// GET /api/webhooks/stats
// Get webhook statistics and performance metrics
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const { period = '24h' } = req.query;
        
        let timeCondition;
        switch (period) {
            case '1h':
                timeCondition = "received_at >= datetime('now', '-1 hour')";
                break;
            case '24h':
                timeCondition = "received_at >= datetime('now', '-24 hours')";
                break;
            case '7d':
                timeCondition = "received_at >= datetime('now', '-7 days')";
                break;
            case '30d':
                timeCondition = "received_at >= datetime('now', '-30 days')";
                break;
            default:
                timeCondition = "received_at >= datetime('now', '-24 hours')";
        }
        
        // Get overall statistics
        const overallStats = await db.query(`
            SELECT 
                COUNT(*) as total_events,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_events,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_events,
                COUNT(CASE WHEN status = 'retry_needed' THEN 1 END) as retry_needed,
                AVG(processing_time) as avg_processing_time,
                MAX(processing_time) as max_processing_time,
                MIN(processing_time) as min_processing_time
            FROM webhook_events 
            WHERE ${timeCondition}
        `);
        
        // Get statistics by event type
        const eventTypeStats = await db.query(`
            SELECT 
                event_type,
                COUNT(*) as count,
                AVG(processing_time) as avg_processing_time,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as success_count,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as error_count
            FROM webhook_events 
            WHERE ${timeCondition}
            GROUP BY event_type
            ORDER BY count DESC
        `);
        
        // Get hourly distribution for the last 24 hours
        const hourlyStats = await db.query(`
            SELECT 
                strftime('%Y-%m-%d %H:00', received_at) as hour,
                COUNT(*) as event_count,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as success_count,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as error_count,
                AVG(processing_time) as avg_processing_time
            FROM webhook_events 
            WHERE received_at >= datetime('now', '-24 hours')
            GROUP BY strftime('%Y-%m-%d %H:00', received_at)
            ORDER BY hour DESC
        `);
        
        const stats = overallStats.rows[0];
        const successRate = stats.total_events > 0 
            ? ((stats.completed_events / stats.total_events) * 100).toFixed(2)
            : 0;
        
        res.json({
            period,
            overall: {
                ...stats,
                success_rate: parseFloat(successRate)
            },
            by_event_type: eventTypeStats.rows,
            hourly_distribution: hourlyStats.rows.slice(0, 24) // Last 24 hours
        });
        
    } catch (error) {
        console.error('[WEBHOOK STATS] Error fetching stats:', error);
        res.status(500).json({
            error: 'Failed to fetch webhook statistics',
            message: error.message
        });
    }
});

// GET /api/webhooks/queue
// Get webhook queue status and statistics
router.get('/queue', authMiddleware, async (req, res) => {
    try {
        const webhookQueue = require('../services/webhookQueue');
        
        const stats = await webhookQueue.getQueueStats();
        const pendingItems = await webhookQueue.getPendingItems(20); // Get first 20 pending items
        
        res.json({
            stats,
            pending: pendingItems,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[WEBHOOK QUEUE] Error getting queue info:', error);
        res.status(500).json({
            error: 'Failed to get queue information',
            message: error.message
        });
    }
});

// POST /api/webhooks/queue/retry/:eventId
// Retry a specific webhook from queue
router.post('/queue/retry/:eventId', authMiddleware, async (req, res) => {
    try {
        const { eventId } = req.params;
        const webhookQueue = require('../services/webhookQueue');
        
        const success = await webhookQueue.retryWebhook(eventId);
        
        if (success) {
            res.json({
                message: 'Webhook queued for retry',
                eventId
            });
        } else {
            res.status(404).json({
                error: 'Webhook not found or not in failed state',
                eventId
            });
        }
        
    } catch (error) {
        console.error('[WEBHOOK QUEUE] Error retrying webhook:', error);
        res.status(500).json({
            error: 'Failed to retry webhook',
            message: error.message
        });
    }
});

// POST /api/webhooks/queue/cleanup
// Clean up old completed/failed queue items
router.post('/queue/cleanup', authMiddleware, async (req, res) => {
    try {
        const { daysOld = 7 } = req.body;
        const webhookQueue = require('../services/webhookQueue');
        
        const cleanedCount = await webhookQueue.cleanup(daysOld);
        
        res.json({
            message: 'Queue cleanup completed',
            cleanedItems: cleanedCount,
            daysOld
        });
        
    } catch (error) {
        console.error('[WEBHOOK QUEUE] Error during cleanup:', error);
        res.status(500).json({
            error: 'Failed to cleanup queue',
            message: error.message
        });
    }
});

// POST /api/webhooks/queue/pause
// Pause webhook queue processing
router.post('/queue/pause', authMiddleware, async (req, res) => {
    try {
        const webhookQueue = require('../services/webhookQueue');
        webhookQueue.pause();
        
        res.json({
            message: 'Webhook queue processing paused'
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to pause queue',
            message: error.message
        });
    }
});

// POST /api/webhooks/queue/resume
// Resume webhook queue processing
router.post('/queue/resume', authMiddleware, async (req, res) => {
    try {
        const webhookQueue = require('../services/webhookQueue');
        webhookQueue.resume();
        
        res.json({
            message: 'Webhook queue processing resumed'
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to resume queue',
            message: error.message
        });
    }
});

// POST /api/webhooks/test
// Test webhook endpoint for development/debugging
router.post('/test', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            error: 'Test endpoint not available in production'
        });
    }
    
    try {
        const { event_type = 'test.event', data = {} } = req.body;
        
        // Create a mock Stripe event for testing
        const mockEvent = {
            id: `evt_test_${Date.now()}`,
            object: 'event',
            type: event_type,
            data: {
                object: data
            },
            created: Math.floor(Date.now() / 1000)
        };
        
        console.log('[WEBHOOK TEST] Processing mock event:', mockEvent.id);
        
        const result = await webhookService.processWebhook(mockEvent, `test_${Date.now()}`);
        
        res.json({
            message: 'Test webhook processed',
            event: mockEvent,
            result
        });
        
    } catch (error) {
        console.error('[WEBHOOK TEST] Error processing test webhook:', error);
        res.status(500).json({
            error: 'Test webhook failed',
            message: error.message
        });
    }
});

module.exports = router;