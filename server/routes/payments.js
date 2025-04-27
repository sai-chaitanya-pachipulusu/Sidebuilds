const express = require('express');
const db = require('../db');
require('dotenv').config();

// Ensure Stripe keys are loaded
if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PUBLISHABLE_KEY) {
    console.error("FATAL ERROR: Stripe API keys are missing from .env file.");
    process.exit(1);
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// --- Create Stripe Checkout Session --- 
// POST /api/payments/create-checkout-session
router.post('/create-checkout-session', async (req, res) => {
    const { projectId } = req.body;

    if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required.' });
    }

    try {
        // 1. Fetch project details from your DB to get the price
        const projectResult = await db.query(
            'SELECT name, sale_price FROM projects WHERE project_id = $1 AND is_for_sale = TRUE AND sale_price IS NOT NULL',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found or not available for sale.' });
        }

        const project = projectResult.rows[0];
        const priceInCents = Math.round(parseFloat(project.sale_price) * 100); // Stripe requires price in cents

        // Basic validation for price
        if (priceInCents <= 0) {
             return res.status(400).json({ message: 'Invalid project price.' });
        }

        // 2. Create a Stripe Checkout Session
        // Replace YOUR_DOMAIN with your actual frontend domain (or localhost for testing)
        const YOUR_DOMAIN = process.env.FRONTEND_URL || 'http://localhost:3000'; 

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd', // Or your desired currency
                        product_data: {
                            name: `Side Project: ${project.name}`, // Name shown in Stripe checkout
                            // Add more product details if needed
                        },
                        unit_amount: priceInCents,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${YOUR_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${YOUR_DOMAIN}/marketplace`, // Redirect back to marketplace on cancel
            // Add metadata to link the session to your internal data
            metadata: {
                projectId: projectId,
                // Add buyer userId if available (requires user to be logged in for purchase?)
                // buyerUserId: req.user?.id // Assuming auth middleware runs before this for logged-in purchases
            }
        });

        res.json({ id: session.id }); // Send session ID back to the frontend

    } catch (err) {
        console.error("Stripe Checkout Session Error:", err.message);
        res.status(500).send('Server error creating checkout session.');
    }
});


// --- Stripe Webhook Handler --- 
// POST /api/payments/webhook 
// Use raw body parser for webhook signature verification
router.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
         console.error("FATAL ERROR: Stripe webhook secret is not set.");
         return res.status(500).send('Webhook secret not configured.');
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log(`PaymentIntent was successful for session ID: ${session.id}`);
            console.log('Session metadata:', session.metadata);
            
            // TODO: Fulfill the purchase based on session metadata
            // 1. Get projectId from session.metadata.projectId
            // 2. Verify payment amount (session.amount_total / 100)
            // 3. Update your database: Mark project projectId as sold (add is_sold column?)
            // 4. Calculate commission (e.g., const commission = session.amount_total * 0.10; // 10%)
            // 5. Record commission, maybe notify seller/buyer
            // 6. Handle potential payouts (requires Stripe Connect for marketplaces)
            
            handleSuccessfulPayment(session);

            break;
        // ... handle other event types (payment_failed, etc.)
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({received: true});
});

// Placeholder function for handling successful payment logic
async function handleSuccessfulPayment(session) {
    const projectId = session.metadata.projectId;
    const amountPaid = session.amount_total / 100; // Amount in dollars/euros etc.

    console.log(`Processing successful payment for Project ID: ${projectId}, Amount: ${amountPaid}`);

    // --- !!! IMPLEMENT YOUR DATABASE UPDATE AND COMMISSION LOGIC HERE !!! ---
    try {
        // Example: Mark project as sold (assuming you add an is_sold column)
        // await db.query('UPDATE projects SET is_sold = TRUE, updated_at = NOW() WHERE project_id = $1', [projectId]);
        
        // Example: Calculate and maybe store commission info (needs more structure)
        const commissionRate = 0.10; // 10% example
        const commissionAmount = amountPaid * commissionRate;
        console.log(`Commission calculated: $${commissionAmount.toFixed(2)}`);
        
        // TODO: Store commission record, notify relevant parties, handle payouts
        
        console.log(`Project ${projectId} marked as sold (Placeholder).`);

    } catch (dbError) {
        console.error(`Failed to update database for project ${projectId} after payment:`, dbError);
        // Consider retry logic or logging for manual intervention
    }
    // --- !!! END OF IMPLEMENTATION AREA !!! ---
}


module.exports = router; 