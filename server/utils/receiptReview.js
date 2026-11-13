const flag = value => value === true || value === 1;

function receiptState(transaction) {
    if(transaction.escrow_status==='refunded') return {can_confirm:false,completed:false,message:'A refund has been recorded for this purchase. Receipt confirmation is unavailable.'};
    if (transaction.status === 'completed' && transaction.escrow_status === 'released' && flag(transaction.transfer_completed)) {
        return { can_confirm: false, completed: true, message: 'Receipt has already been confirmed for this purchase.' };
    }
    if (transaction.escrow_status === 'disputed') return { can_confirm: false, completed: false, message: 'This purchase has an open issue. Receipt confirmation is unavailable while it is under review.' };
    if (transaction.status !== 'payment_completed' || !transaction.payment_id || !transaction.stripe_payment_intent_id) {
        return { can_confirm: false, completed: false, message: 'Payment has not been verified as completed. Return to purchases and check the payment status.' };
    }
    if (!transaction.purchase_request_id || transaction.delivery_status !== 'assets_transferred_pending_buyer_confirmation') {
        return {can_confirm:false,completed:false,message:'The seller must mark the agreed handover as delivered before you can confirm receipt.'};
    }
    if (transaction.escrow_status !== 'held' || flag(transaction.escrow_released) || flag(transaction.transfer_completed)) {
        return { can_confirm: false, completed: false, message: 'This purchase is not awaiting receipt confirmation.' };
    }
    const amount = Number(transaction.amount);
    const sellerAmount = Number(transaction.seller_amount);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(sellerAmount) || Math.round(sellerAmount * 100) < 1 || sellerAmount > amount) {
        return { can_confirm: false, completed: false, message: 'The recorded payment amounts need review before receipt can be confirmed.' };
    }
    if (transaction.project_owner_id !== transaction.seller_id) return { can_confirm: false, completed: false, message: 'Project ownership has changed. This transfer needs review before confirmation.' };
    return { can_confirm: true, completed: false, message: 'Review your agreement and confirm only after receiving the agreed deliverables.' };
}

// Old request-only endpoints must never transfer ownership without the paid transaction.
async function directToReceiptReview(req, res) {
    const db = require('../db');
    try {
        const request = await db.query('SELECT id, project_id, buyer_id, seller_id, stripe_session_id FROM purchase_requests WHERE id=$1 AND buyer_id=$2', [req.params.requestId, req.user.user_id]);
        if (!request.rows.length) return res.status(404).json({ error: 'Purchase request not found or access denied.' });
        const purchase = request.rows[0];
        const transaction = purchase.stripe_session_id ? await db.query(
            'SELECT transaction_id FROM project_transactions WHERE stripe_session_id=$1 AND project_id=$2 AND buyer_id=$3 AND seller_id=$4',
            [purchase.stripe_session_id, purchase.project_id, purchase.buyer_id, purchase.seller_id]) : { rows: [] };
        const reviewUrl = transaction.rows.length === 1 ? `/project-transfer?transactionId=${encodeURIComponent(transaction.rows[0].transaction_id)}` : null;
        return res.status(409).json({ error: reviewUrl ? 'Review the paid transaction before confirming receipt.' : 'No linked payment transaction is available for receipt review.', review_url: reviewUrl });
    } catch (error) {
        console.error('Receipt review lookup failed:', error.message);
        return res.status(500).json({ error: 'Receipt review could not be loaded. Please retry.' });
    }
}

module.exports = { receiptState, directToReceiptReview };
