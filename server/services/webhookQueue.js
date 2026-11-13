const db = require('../db');

class WebhookQueue {
    constructor() {
        this.processing = false;
        this.maxConcurrent = 5; // Max concurrent webhook processing
        this.currentProcessing = 0;
        this.queueTableReady = false;
        this.retryDelays = [1000, 5000, 15000, 30000]; // Exponential backoff in ms
        
        // Start processing queue
        this.startProcessing();
        
        console.log('[WEBHOOK QUEUE] Initialized with max concurrent:', this.maxConcurrent);
    }

    /**
     * Add webhook event to processing queue
     */
    async enqueue(event, requestId, priority = 'normal') {
        try {
            // Ensure webhook_queue table exists
            await this.ensureQueueTableExists();
            
            const queueItem = {
                event_id: event.id,
                event_type: event.type,
                event_data: JSON.stringify(event),
                request_id: requestId,
                priority: priority,
                retry_count: 0,
                status: 'pending',
                created_at: new Date().toISOString(),
                next_retry: new Date().toISOString()
            };
            
            await db.query(`
                INSERT INTO webhook_queue 
                (event_id, event_type, event_data, request_id, priority, retry_count, status, created_at, next_retry)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                queueItem.event_id,
                queueItem.event_type, 
                queueItem.event_data,
                queueItem.request_id,
                queueItem.priority,
                queueItem.retry_count,
                queueItem.status,
                queueItem.created_at,
                queueItem.next_retry
            ]);
            
            console.log(`[WEBHOOK QUEUE] Enqueued event ${event.id} with priority ${priority}`);
            return true;
            
        } catch (error) {
            console.error('[WEBHOOK QUEUE] Error enqueuing webhook:', error);
            throw error;
        }
    }

    /**
     * Start processing queue items
     */
    startProcessing() {
        if (this.processing) return;
        
        this.processing = true;
        this.processQueue();
        
        // Set up interval processing
        setInterval(() => {
            this.processQueue();
        }, 2000); // Check every 2 seconds
        
        console.log('[WEBHOOK QUEUE] Started queue processing');
    }

    /**
     * Process pending queue items
     */
    async processQueue() {
        if (this.currentProcessing >= this.maxConcurrent) {
            return; // Max concurrent limit reached
        }

        try {
            await this.ensureQueueTableExists();
            // Get next items to process (prioritize high priority and older items)
            const result = await db.query(`
                SELECT * FROM webhook_queue 
                WHERE status = 'pending' 
                  AND next_retry <= ?
                ORDER BY 
                  CASE priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 END,
                  created_at ASC
                LIMIT ?
            `, [new Date().toISOString(), this.maxConcurrent - this.currentProcessing]);
            
            const items = result.rows;
            
            if (items.length === 0) {
                return; // No items to process
            }
            
            // Process items concurrently
            const promises = items.map(item => this.processQueueItem(item));
            await Promise.allSettled(promises);
            
        } catch (error) {
            console.error('[WEBHOOK QUEUE] Error processing queue:', error);
        }
    }

    /**
     * Process individual queue item
     */
    async processQueueItem(item) {
        this.currentProcessing++;
        
        try {
            console.log(`[WEBHOOK QUEUE] Processing item ${item.event_id} (attempt ${item.retry_count + 1})`);
            
            // Mark as processing
            await db.query(`
                UPDATE webhook_queue 
                SET status = 'processing', updated_at = ? 
                WHERE id = ?
            `, [new Date().toISOString(), item.id]);
            
            // Parse event data
            const event = JSON.parse(item.event_data);
            
            // Process webhook using webhook service
            const webhookService = require('./webhookService');
            const result = await webhookService.processWebhook(event, item.request_id);
            
            if (result.success) {
                // Mark as completed
                await db.query(`
                    UPDATE webhook_queue 
                    SET status = 'completed', completed_at = ?, updated_at = ?
                    WHERE id = ?
                `, [new Date().toISOString(), new Date().toISOString(), item.id]);
                
                console.log(`[WEBHOOK QUEUE] Completed processing ${item.event_id}`);
            } else {
                throw new Error(result.message || 'Webhook processing failed');
            }
            
        } catch (error) {
            console.error(`[WEBHOOK QUEUE] Error processing ${item.event_id}:`, error);
            await this.handleProcessingError(item, error);
        } finally {
            this.currentProcessing--;
        }
    }

    /**
     * Handle processing error and determine retry strategy
     */
    async handleProcessingError(item, error) {
        const maxRetries = this.retryDelays.length;
        
        if (item.retry_count < maxRetries) {
            // Schedule retry
            const delay = this.retryDelays[item.retry_count];
            const nextRetry = new Date(Date.now() + delay).toISOString();
            
            await db.query(`
                UPDATE webhook_queue 
                SET status = 'pending', 
                    retry_count = ?, 
                    next_retry = ?, 
                    error_message = ?,
                    updated_at = ?
                WHERE id = ?
            `, [
                item.retry_count + 1,
                nextRetry,
                error.message,
                new Date().toISOString(),
                item.id
            ]);
            
            console.log(`[WEBHOOK QUEUE] Scheduled retry ${item.retry_count + 1} for ${item.event_id} in ${delay}ms`);
            
        } else {
            // Max retries reached, mark as failed
            await db.query(`
                UPDATE webhook_queue 
                SET status = 'failed', 
                    error_message = ?,
                    updated_at = ?
                WHERE id = ?
            `, [error.message, new Date().toISOString(), item.id]);
            
            console.error(`[WEBHOOK QUEUE] Max retries reached for ${item.event_id}, marking as failed`);
        }
    }

    /**
     * Get queue statistics
     */
    async getQueueStats() {
        try {
            await this.ensureQueueTableExists();
            const stats = await db.query(`
                SELECT 
                    status,
                    priority,
                    COUNT(*) as count,
                    AVG(retry_count) as avg_retries
                FROM webhook_queue 
                GROUP BY status, priority
            `);
            
            const total = await db.query(`
                SELECT COUNT(*) as total FROM webhook_queue
            `);
            
            const processing = await db.query(`
                SELECT COUNT(*) as processing 
                FROM webhook_queue 
                WHERE status = 'processing'
            `);
            
            return {
                total: total.rows[0]?.total || 0,
                currentProcessing: this.currentProcessing,
                maxConcurrent: this.maxConcurrent,
                breakdown: stats.rows,
                processingInDb: processing.rows[0]?.processing || 0
            };
            
        } catch (error) {
            console.error('[WEBHOOK QUEUE] Error getting stats:', error);
            return {
                error: error.message,
                currentProcessing: this.currentProcessing,
                maxConcurrent: this.maxConcurrent
            };
        }
    }

    /**
     * Clear completed items older than specified days
     */
    async cleanup(daysOld = 7) {
        try {
            await this.ensureQueueTableExists();
            const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000)).toISOString();
            
            const result = await db.query(`
                DELETE FROM webhook_queue 
                WHERE status IN ('completed', 'failed') 
                  AND created_at < ?
            `, [cutoffDate]);
            
            console.log(`[WEBHOOK QUEUE] Cleaned up ${result.changes || 0} old queue items`);
            return result.changes || 0;
            
        } catch (error) {
            console.error('[WEBHOOK QUEUE] Error during cleanup:', error);
            throw error;
        }
    }

    /**
     * Pause/Resume queue processing
     */
    pause() {
        this.processing = false;
        console.log('[WEBHOOK QUEUE] Processing paused');
    }

    resume() {
        if (!this.processing) {
            this.processing = true;
            this.processQueue();
            console.log('[WEBHOOK QUEUE] Processing resumed');
        }
    }

    /**
     * Get pending queue items
     */
    async getPendingItems(limit = 50) {
        try {
            await this.ensureQueueTableExists();
            const result = await db.query(`
                SELECT event_id, event_type, priority, retry_count, created_at, next_retry, error_message
                FROM webhook_queue 
                WHERE status = 'pending'
                ORDER BY 
                  CASE priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 END,
                  created_at ASC
                LIMIT ?
            `, [limit]);
            
            return result.rows;
            
        } catch (error) {
            console.error('[WEBHOOK QUEUE] Error getting pending items:', error);
            return [];
        }
    }

    /**
     * Retry failed webhook by ID
     */
    async retryWebhook(eventId) {
        try {
            const result = await db.query(`
                UPDATE webhook_queue 
                SET status = 'pending', 
                    next_retry = ?,
                    updated_at = ?
                WHERE event_id = ? AND status = 'failed'
            `, [new Date().toISOString(), new Date().toISOString(), eventId]);
            
            if (result.changes > 0) {
                console.log(`[WEBHOOK QUEUE] Queued retry for webhook ${eventId}`);
                return true;
            } else {
                console.warn(`[WEBHOOK QUEUE] No failed webhook found with ID ${eventId}`);
                return false;
            }
            
        } catch (error) {
            console.error(`[WEBHOOK QUEUE] Error retrying webhook ${eventId}:`, error);
            throw error;
        }
    }

    /**
     * Ensure webhook_queue table exists
     */
    async ensureQueueTableExists() {
        if (this.queueTableReady) return;
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS webhook_queue (
                    id SERIAL PRIMARY KEY,
                    event_id TEXT UNIQUE,
                    event_type TEXT,
                    event_data TEXT,
                    request_id TEXT,
                    priority TEXT DEFAULT 'normal',
                    status TEXT DEFAULT 'pending',
                    retry_count INTEGER DEFAULT 0,
                    error_message TEXT,
                    created_at TIMESTAMPTZ,
                    updated_at TIMESTAMPTZ,
                    next_retry TIMESTAMPTZ,
                    completed_at TIMESTAMPTZ
                )
            `);
            
            // Create indexes for better performance
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_webhook_queue_status 
                ON webhook_queue(status)
            `);
            
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_webhook_queue_priority 
                ON webhook_queue(priority, created_at)
            `);
            
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_webhook_queue_retry 
                ON webhook_queue(next_retry)
            `);
            this.queueTableReady = true;
            
        } catch (error) {
            console.error('[WEBHOOK QUEUE] Error creating queue table:', error);
            // Don't throw error as this might be called frequently
        }
    }
}

module.exports = new WebhookQueue();
