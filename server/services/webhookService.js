const db = require('../db');
const emailService = require('./emailService');

class WebhookService {
    constructor() {
        this.processedEvents = new Set(); // In-memory cache for recent event IDs
        this.eventQueue = []; // Simple in-memory queue for high-load scenarios
        this.processing = false;
        
        // Clean up old processed events every hour
        setInterval(() => {
            this.cleanupProcessedEvents();
        }, 3600000); // 1 hour
        
        // Process queued events
        setInterval(() => {
            this.processQueue();
        }, 1000); // Every second
    }

    /**
     * Process webhook with comprehensive error handling and idempotency
     * Can optionally use queue for high-load scenarios
     */
    async processWebhook(event, requestId, useQueue = false) {
        const startTime = Date.now();
        const eventLog = {
            event_id: event.id,
            event_type: event.type,
            request_id: requestId,
            received_at: new Date().toISOString(),
            status: 'processing',
            processing_time: null,
            error_message: null,
            retry_count: 0
        };

        try {
            // Check if we should use queue for high-load processing
            if (useQueue) {
                const webhookQueue = require('./webhookQueue');
                await webhookQueue.enqueue(event, requestId, 'normal');
                return { success: true, message: 'Event queued for processing', queued: true };
            }

            // Log webhook event reception
            await this.logWebhookEvent(eventLog);
            
            // Check for duplicate processing (idempotency)
            if (await this.isEventProcessed(event.id)) {
                console.log(`[WEBHOOK] Event ${event.id} already processed. Skipping.`);
                await this.updateWebhookEventStatus(event.id, 'duplicate', Date.now() - startTime);
                return { success: true, message: 'Event already processed' };
            }

            // Mark as processing
            this.processedEvents.add(event.id);
            
            // Process event with timeout protection
            const result = await Promise.race([
                this.handleWebhookEvent(event),
                this.createTimeoutPromise(25000) // 25 second timeout (within Stripe's 30s limit)
            ]);

            // Update success status
            const processingTime = Date.now() - startTime;
            await this.updateWebhookEventStatus(event.id, 'completed', processingTime);
            
            console.log(`[WEBHOOK] Successfully processed ${event.type} event ${event.id} in ${processingTime}ms`);
            return result;

        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error(`[WEBHOOK] Error processing event ${event.id}:`, error);
            
            // Log error and determine if retry is needed
            const shouldRetry = this.shouldRetryEvent(error);
            await this.updateWebhookEventStatus(
                event.id, 
                shouldRetry ? 'retry_needed' : 'failed', 
                processingTime, 
                error.message
            );

            if (shouldRetry && eventLog.retry_count < 3) {
                // Add to queue for retry
                this.eventQueue.push({
                    event,
                    requestId,
                    retryCount: eventLog.retry_count + 1,
                    nextRetry: Date.now() + (Math.pow(2, eventLog.retry_count) * 1000) // Exponential backoff
                });
            }

            // Don't throw error to prevent Stripe retry if we're handling it internally
            if (shouldRetry) {
                return { success: false, message: 'Event queued for retry', retry: true };
            }
            
            throw error;
        }
    }

    /**
     * Handle specific webhook event types
     */
    async handleWebhookEvent(event) {
        switch (event.type) {
            case 'checkout.session.completed':
                return await this.processCheckoutCompleted(event.data.object);
            
            case 'account.updated':
                return await this.processAccountUpdated(event.data.object);
            
            case 'payment_intent.succeeded':
                return await this.processPaymentIntentSucceeded(event.data.object);
            
            case 'payment_intent.payment_failed':
                return await this.processPaymentIntentFailed(event.data.object);
            
            case 'charge.dispute.created':
                return await this.processChargeDispute(event.data.object);
            
            default:
                console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
                return { success: true, message: 'Event type not handled' };
        }
    }

    /**
     * Enhanced checkout completion with atomic transactions
     */
    async processCheckoutCompleted(session) {
        // Use database transaction for atomicity
        return await db.withTransaction(async (client) => {
            const purchaseRequestId = session.metadata.purchase_request_id || session.client_reference_id;
            const paymentIntentId = session.payment_intent;

            if (!purchaseRequestId) {
                throw new Error('Critical: Purchase Request ID missing in webhook session data.');
            }

            console.log(`[WEBHOOK] Processing checkout completion for Purchase Request ID: ${purchaseRequestId}`);

            // Fetch payment intent details
            const stripe = require('../config/stripe.config').stripe;
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                expand: ['latest_charge']
            });
            
            if (!paymentIntent || !paymentIntent.latest_charge) {
                throw new Error('Failed to retrieve payment intent details from Stripe.');
            }

            const charge = paymentIntent.latest_charge;
            const totalAmountGross = charge.amount / 100;
            const applicationFeeAmount = (charge.application_fee_amount || 0) / 100;
            const netAmountToSeller = (charge.amount - (charge.application_fee_amount || 0)) / 100;

            // Fetch current purchase request details
            const prQuery = await client.query(
                'SELECT * FROM purchase_requests WHERE id = ?',
                [purchaseRequestId]
            );
            
            if (prQuery.rows.length === 0) {
                throw new Error(`Purchase request ${purchaseRequestId} not found.`);
            }
            
            const purchaseRequest = prQuery.rows[0];

            // Idempotency check: If already processed, skip
            if (purchaseRequest.status === 'payment_completed_pending_transfer' || 
                purchaseRequest.status === 'completed') {
                console.log(`[WEBHOOK] Purchase request ${purchaseRequestId} already processed. Skipping.`);
                return { success: true, message: 'Already processed' };
            }

            // Update purchase request status
            await client.query(
                `UPDATE purchase_requests 
                 SET status = 'payment_completed_pending_transfer', 
                     updated_at = CURRENT_TIMESTAMP,
                     stripe_session_id = ?,
                     stripe_payment_intent_id = ?
                 WHERE id = ? AND status != 'payment_completed_pending_transfer'`,
                [session.id, paymentIntentId, purchaseRequestId]
            );

            // Log the transaction
            const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await client.query(
                `INSERT INTO project_transactions (
                    transaction_id, project_id, buyer_id, seller_id, amount, 
                    commission_amount, seller_amount, status, escrow_status, payment_method, 
                    payment_id, stripe_payment_intent_id, stripe_session_id, created_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [
                    transactionId,
                    purchaseRequest.project_id,
                    purchaseRequest.buyer_id,
                    purchaseRequest.seller_id,
                    totalAmountGross,
                    applicationFeeAmount,
                    netAmountToSeller,
                    'completed',
                    session.metadata?.escrow_status || 'held', // Capture escrow status
                    charge.payment_method_details?.type || 'card',
                    charge.id,
                    paymentIntentId,
                    session.id
                ]
            );

            // Send email notifications
            await this.sendPaymentNotifications(purchaseRequestId, totalAmountGross);

            console.log(`[WEBHOOK] Successfully processed checkout completion for ${purchaseRequestId}`);
            return { success: true, message: 'Checkout completed successfully' };
        });
    }

    /**
     * Process account updates
     */
    async processAccountUpdated(account) {
        try {
            const userQuery = await db.query(
                'SELECT user_id, username, email FROM users WHERE stripe_account_id = ?', 
                [account.id]
            );
            
            if (userQuery.rows.length > 0) {
                const user = userQuery.rows[0];
                const onboardingComplete = account.charges_enabled && 
                                         account.payouts_enabled && 
                                         account.details_submitted;
                
                await db.query(
                    'UPDATE users SET onboarding_complete = ? WHERE user_id = ?',
                    [onboardingComplete, user.user_id]
                );
                
                console.log(`[WEBHOOK] Updated Stripe onboarding status for user ${user.username}`);
            }
            
            return { success: true, message: 'Account updated successfully' };
        } catch (error) {
            console.error(`[WEBHOOK] Error processing account update:`, error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Process payment intent succeeded (additional verification)
     */
    async processPaymentIntentSucceeded(paymentIntent) {
        console.log(`[WEBHOOK] Payment intent succeeded: ${paymentIntent.id}`);
        // Additional logging or verification can be added here
        return { success: true, message: 'Payment intent success logged' };
    }

    /**
     * Process payment intent failed
     */
    async processPaymentIntentFailed(paymentIntent) {
        console.log(`[WEBHOOK] Payment intent failed: ${paymentIntent.id}`);
        
        // Update purchase request status if applicable
        if (paymentIntent.metadata?.purchase_request_id) {
            await db.query(
                `UPDATE purchase_requests 
                 SET status = 'payment_failed', updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [paymentIntent.metadata.purchase_request_id]
            );
        }
        
        return { success: true, message: 'Payment failure processed' };
    }

    /**
     * Process charge disputes
     */
    async processChargeDispute(dispute) {
        console.log(`[WEBHOOK] Charge dispute created: ${dispute.id}`);
        
        // Log dispute for manual review
        const disputeLog = {
            dispute_id: dispute.id,
            charge_id: dispute.charge,
            amount: dispute.amount / 100,
            reason: dispute.reason,
            status: dispute.status,
            created_at: new Date().toISOString()
        };
        
        // Store dispute information (you may want to create a disputes table)
        console.log('[WEBHOOK] Dispute details:', disputeLog);
        
        return { success: true, message: 'Dispute logged for review' };
    }

    /**
     * Send payment notifications
     */
    async sendPaymentNotifications(purchaseRequestId, amount) {
        try {
            const userDetailsQuery = await db.query(
                `SELECT 
                    b.email AS buyer_email, b.username AS buyer_username,
                    s.email AS seller_email, s.username AS seller_username,
                    p.name AS project_name
                FROM purchase_requests pr
                JOIN users b ON pr.buyer_id = b.user_id
                JOIN users s ON pr.seller_id = s.user_id
                JOIN projects p ON pr.project_id = p.project_id
                WHERE pr.id = ?`,
                [purchaseRequestId]
            );
            
            if (userDetailsQuery.rows.length > 0) {
                const details = userDetailsQuery.rows[0];
                
                // Notify seller
                if (details.seller_email) {
                    await emailService.notifyPaymentSuccess(details.seller_email, {
                        sellerName: details.seller_username || 'Seller',
                        projectName: details.project_name,
                        amount: `$${amount.toFixed(2)}`,
                        buyerName: details.buyer_username || 'Buyer'
                    });
                }
                
                // Notify buyer
                if (details.buyer_email) {
                    await emailService.sendCustomEmail(
                        details.buyer_email,
                        `Payment Confirmed for ${details.project_name}`,
                        `Hi ${details.buyer_username || 'Buyer'},\n\nYour payment of $${amount.toFixed(2)} for "${details.project_name}" has been successfully processed.\n\nBest regards,\nSideBuilds Team`,
                        this.generateBuyerEmailHTML(details, amount)
                    );
                }
            }
        } catch (emailError) {
            console.error('[WEBHOOK] Error sending payment notifications:', emailError);
            // Don't fail the transaction for email errors
        }
    }

    /**
     * Generate buyer email HTML template
     */
    generateBuyerEmailHTML(details, amount) {
        return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Payment Confirmed!</h2>
            <p>Hi ${details.buyer_username || 'Buyer'},</p>
            <p>Your payment of <strong>$${amount.toFixed(2)}</strong> for <strong>"${details.project_name}"</strong> has been successfully processed.</p>
            <p>The seller will now transfer the project assets to you. You'll receive another notification once the transfer is complete.</p>
            <p><a href="${process.env.CLIENT_URL}/dashboard?tab=purchases" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View in Dashboard</a></p>
            <p style="color: #6b7280; font-size: 14px;">Best regards,<br>SideBuilds Team</p>
        </div>`;
    }

    /**
     * Log webhook event to database
     */
    async logWebhookEvent(eventLog) {
        try {
            // Create webhook_events table if it doesn't exist
            await db.query(`
                CREATE TABLE IF NOT EXISTS webhook_events (
                    id SERIAL PRIMARY KEY,
                    event_id TEXT UNIQUE,
                    event_type TEXT,
                    request_id TEXT,
                    received_at TIMESTAMPTZ,
                    status TEXT,
                    processing_time INTEGER,
                    error_message TEXT,
                    retry_count INTEGER DEFAULT 0,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            await db.query(
                `INSERT INTO webhook_events (event_id, event_type, request_id, received_at, status, retry_count)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    eventLog.event_id,
                    eventLog.event_type,
                    eventLog.request_id,
                    eventLog.received_at,
                    eventLog.status,
                    eventLog.retry_count
                ]
            );
        } catch (error) {
            console.error('[WEBHOOK] Error logging webhook event:', error);
            // Don't fail webhook processing for logging errors
        }
    }

    /**
     * Update webhook event status
     */
    async updateWebhookEventStatus(eventId, status, processingTime, errorMessage = null) {
        try {
            await db.query(
                `UPDATE webhook_events 
                 SET status = ?, processing_time = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE event_id = ?`,
                [status, processingTime, errorMessage, eventId]
            );
        } catch (error) {
            console.error('[WEBHOOK] Error updating webhook status:', error);
        }
    }

    /**
     * Check if event has been processed (idempotency check)
     */
    async isEventProcessed(eventId) {
        // Check in-memory cache first
        if (this.processedEvents.has(eventId)) {
            return true;
        }
        
        // Check database
        try {
            const result = await db.query(
                'SELECT status FROM webhook_events WHERE event_id = ? AND status IN ("completed", "duplicate")',
                [eventId]
            );
            return result.rows.length > 0;
        } catch (error) {
            console.error('[WEBHOOK] Error checking event processing status:', error);
            return false;
        }
    }

    /**
     * Determine if event should be retried based on error type
     */
    shouldRetryEvent(error) {
        // Retry on temporary failures, not on permanent failures
        const retryableErrors = [
            'ECONNRESET',
            'ENOTFOUND',
            'ETIMEDOUT',
            'ECONNREFUSED',
            'EAI_AGAIN',
            'SQLITE_BUSY',
            'SQLITE_LOCKED'
        ];
        
        return retryableErrors.some(retryableError => 
            error.message.includes(retryableError) || 
            error.code === retryableError
        );
    }

    /**
     * Create timeout promise for webhook processing
     */
    createTimeoutPromise(timeoutMs) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Webhook processing timeout after ${timeoutMs}ms`));
            }, timeoutMs);
        });
    }

    /**
     * Process queued events for retry
     */
    async processQueue() {
        if (this.processing || this.eventQueue.length === 0) {
            return;
        }
        
        this.processing = true;
        const now = Date.now();
        
        // Find events ready for retry
        const readyEvents = this.eventQueue.filter(item => item.nextRetry <= now);
        
        for (const item of readyEvents) {
            try {
                console.log(`[WEBHOOK] Retrying event ${item.event.id} (attempt ${item.retryCount})`);
                await this.handleWebhookEvent(item.event);
                
                // Remove from queue on success
                this.eventQueue = this.eventQueue.filter(queuedItem => queuedItem !== item);
                await this.updateWebhookEventStatus(item.event.id, 'completed', null);
                
            } catch (error) {
                console.error(`[WEBHOOK] Retry failed for event ${item.event.id}:`, error);
                
                if (item.retryCount >= 3) {
                    // Max retries reached, mark as failed
                    this.eventQueue = this.eventQueue.filter(queuedItem => queuedItem !== item);
                    await this.updateWebhookEventStatus(item.event.id, 'failed', null, error.message);
                } else {
                    // Schedule next retry
                    item.retryCount++;
                    item.nextRetry = now + (Math.pow(2, item.retryCount) * 1000);
                }
            }
        }
        
        this.processing = false;
    }

    /**
     * Clean up old processed events from memory
     */
    cleanupProcessedEvents() {
        // Clear in-memory cache periodically to prevent memory leaks
        this.processedEvents.clear();
        console.log('[WEBHOOK] Cleaned up processed events cache');
    }

    /**
     * Get webhook health status
     */
    async getHealthStatus() {
        try {
            const stats = await db.query(`
                SELECT 
                    status,
                    COUNT(*) as count,
                    AVG(processing_time) as avg_processing_time
                FROM webhook_events 
                WHERE received_at >= NOW() - INTERVAL '1 hour'
                GROUP BY status
            `);
            
            return {
                healthy: true,
                queueLength: this.eventQueue.length,
                recentStats: stats.rows,
                lastCleanup: new Date().toISOString()
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                queueLength: this.eventQueue.length
            };
        }
    }
}

module.exports = new WebhookService();