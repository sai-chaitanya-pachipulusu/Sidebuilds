const { randomUUID } = require('crypto');

const editableStatuses = new Set(['interest_expressed', 'seller_terms_proposed', 'seller_accepted_pending_payment', 'agreement_reached_pending_payment']);
const fail = (status, message) => { const error = new Error(message); error.status = status; throw error; };

function validateScope(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'Add the purchase scope.');
    if (!Array.isArray(input.included_items) || input.included_items.length < 1 || input.included_items.length > 30 ||
        input.included_items.some(item => typeof item !== 'string' || !item.trim() || item.trim().length > 300)) {
        fail(400, 'List 1–30 included deliverables, up to 300 characters each.');
    }
    const scope = { included_items: input.included_items.map(item => item.trim()) };
    for (const key of ['exclusions', 'running_costs', 'handover_steps', 'support_terms']) {
        if (typeof input[key] !== 'string' || !input[key].trim() || input[key].trim().length > 2000) {
            fail(400, 'Complete exclusions, ongoing costs, handover steps and support (up to 2,000 characters each). State “None” when appropriate.');
        }
        scope[key] = input[key].trim();
    }
    if (!Number.isSafeInteger(input.price_cents) || input.price_cents < 50 || input.price_cents > 99999999) {
        fail(400, 'Set a USD price between $0.50 and $999,999.99, with at most two decimal places.');
    }
    return { ...scope, price_cents: input.price_cents };
}

const serialize = row => row ? ({ id: row.id, version: row.version, price_cents: row.price_cents, currency: 'USD',
    included_items: JSON.parse(row.included_items), exclusions: row.exclusions, running_costs: row.running_costs,
    handover_steps: row.handover_steps, support_terms: row.support_terms, created_at: row.created_at,
    seller_approved_at: row.seller_approved_at, buyer_approved_at: row.buyer_approved_at }) : null;

async function latestAgreement(client, requestId) {
    const { rows } = await client.query('SELECT * FROM purchase_agreements WHERE purchase_request_id=$1 ORDER BY version DESC LIMIT 1', [requestId]);
    return rows[0] || null;
}

function assertEditable(request) {
    if (!editableStatuses.has(request.status) || request.stripe_session_id || request.agreement_id) {
        fail(409, 'This purchase scope is locked because checkout has started or the purchase is closed.');
    }
    if (request.project_owner_id !== request.seller_id || !request.project_is_for_sale || request.project_is_on_hold) {
        fail(409, 'The seller must still own an available sale listing to agree a purchase.');
    }
}

async function approvedAgreement(client, request, expectedId) {
    const agreement = await latestAgreement(client, request.purchase_request_id);
    if (!agreement || agreement.id !== expectedId || !agreement.seller_approved_at || !agreement.buyer_approved_at) {
        fail(409, 'Review the latest purchase agreement and get both approvals before payment.');
    }
    if (Math.round(Number(request.accepted_price) * 100) !== agreement.price_cents ||
        (request.agreement_id && request.agreement_id !== agreement.id)) {
        fail(409, 'The purchase price or agreement changed. Refresh the agreement before payment.');
    }
    return agreement;
}

module.exports = { randomUUID, fail, validateScope, serialize, latestAgreement, assertEditable, approvedAgreement };
