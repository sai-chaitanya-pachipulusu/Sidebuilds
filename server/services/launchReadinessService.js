const { readAccount } = require('./sellerConnectionService');
const { deserializeListing } = require('../utils/listingFields');
const { commerceEnabled } = require('../utils/commercePolicy');

async function launchReadiness({ db, stripe, configuration, emailConfigured, env = process.env }) {
  const result = await db.query(`SELECT p.project_id,p.name,p.category,p.tech_stack,p.demo_url,p.github_url,p.stage_details,
    u.stripe_account_id FROM projects p JOIN users u ON u.user_id=p.owner_id
    WHERE p.is_public=true AND p.is_for_sale=true AND COALESCE(p.status,'active')='active' ORDER BY p.created_at DESC LIMIT 26`);
  const rows = result.rows.slice(0, 25);
  const connections = new Map();
  // One read per unique seller, bounded list and provider timeout. No account/link creation.
  for (const row of rows) if (!connections.has(row.stripe_account_id)) connections.set(row.stripe_account_id,
    configuration.valid ? readAccount(stripe, row.stripe_account_id) : Promise.resolve({ verificationStatus: 'unavailable', isOnboardingComplete: false }));
  const listings = await Promise.all(rows.map(async row => {
    const status = await connections.get(row.stripe_account_id);
    const listing = deserializeListing(row);
    const text = value => typeof value === 'string' ? value.trim() : Array.isArray(value) ? value.join('').trim() : '';
    const missing = [!text(listing.category) && 'Category', !text(listing.tech_stack) && 'Technologies',
      !(text(listing.demo_url) || text(listing.github_url)) && 'Demo or repository',
      !text(listing.stage_details?.included_assets) && 'Included assets',
      !text(listing.stage_details?.running_costs) && 'Running costs',
      !text(listing.stage_details?.setup_handoff) && 'Handover details'].filter(Boolean);
    return { projectId: row.project_id, name: row.name, paymentStatus: status.isOnboardingComplete ? 'ready' :
      status.verificationStatus === 'verified' ? 'onboarding_required' : status.verificationStatus,
      missingInformation: missing };
  }));
  return { checkedAt: new Date().toISOString(), checkoutEnabled: Boolean(configuration.valid && commerceEnabled(env)),
    providerConfigured: configuration.valid, providerMode: configuration.mode, emailConfigured: Boolean(emailConfigured),
    listings, hasMore: result.rows.length > 25 };
}
module.exports = { launchReadiness };
