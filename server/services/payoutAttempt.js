const {receiptState}=require('../utils/receiptReview');
async function preparePayoutAttempt(db,transactionId,buyerId){
 return db.withTransaction(async client=>{
  const transaction=(await client.query(`SELECT t.*,p.owner_id AS project_owner_id,
   (SELECT status FROM purchase_requests WHERE id=t.purchase_request_id) AS delivery_status
   FROM project_transactions t JOIN projects p ON p.project_id=t.project_id WHERE t.transaction_id=$1 AND t.buyer_id=$2 FOR UPDATE`,[transactionId,buyerId])).rows[0];
  if(!transaction)throw Object.assign(new Error('Transaction not found'),{status:404});
  const state=receiptState(transaction);
  if(state.completed)return;
  if(!state.can_confirm)throw Object.assign(new Error(state.message),{status:409});
  await client.query('INSERT INTO payout_attempts(transaction_id) VALUES($1) ON CONFLICT(transaction_id) DO NOTHING',[transactionId]);
  const attempt=(await client.query('SELECT created_at FROM payout_attempts WHERE transaction_id=$1',[transactionId])).rows[0];
  const time=attempt.created_at instanceof Date ? attempt.created_at.getTime() : Date.parse(String(attempt.created_at).includes('T')?attempt.created_at:String(attempt.created_at).replace(' ','T')+'Z');
  // Stripe only guarantees an idempotency key for at least 24 hours. A durable
  // pre-call marker survives a successful transfer followed by DB rollback.
  if(!Number.isFinite(time)||Date.now()-time>23*3600*1000)throw Object.assign(new Error('This release attempt needs support reconciliation before retrying. No additional seller payment has been started.'),{status:409});
 });
}
module.exports={preparePayoutAttempt};
