const router=require('express').Router();
const db=require('../db');
const service=require('../services/webhookService');
router.use(require('../middleware/authMiddleware'),require('../middleware/requireAdmin'),(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
router.get('/health',async(_req,res)=>{try{const health=await service.getHealthStatus();res.status(health.healthy?200:503).json({webhook:health,timestamp:new Date().toISOString()});}catch(_){res.status(503).json({error:'Payment monitoring is temporarily unavailable.'});}});
router.get('/events',async(req,res)=>{try{
 const limit=Math.max(1,Math.min(200,parseInt(req.query.limit,10)||50));
 const result=await db.query(`SELECT event_id,event_type,status,received_at,completed_at,NULL AS error_code FROM payment_event_claims
   UNION ALL SELECT event_id,event_type,'failed' AS status,received_at,NULL AS completed_at,error_code FROM payment_event_failures ORDER BY received_at DESC LIMIT $1`,[limit]);
 res.json({events:result.rows});
}catch(_){res.status(503).json({error:'Payment events are temporarily unavailable.'});}});
router.post('/replay/:eventId',async(req,res)=>{try{
 if(!/^evt_[A-Za-z0-9_]{1,200}$/.test(req.params.eventId))return res.status(400).json({error:'Invalid event ID.'});
 const {stripe,stripeConfigValid}=require('../config/stripe.config');
 if(!stripeConfigValid)return res.status(503).json({error:'The payment provider is unavailable.'});
 const event=await stripe.events.retrieve(req.params.eventId);
 const result=await service.processWebhook(event);res.json(result);
}catch(error){console.error('Payment replay failed:',error.code||'PROCESSING_FAILED');res.status(503).json({error:'The original provider event could not be replayed. It remains eligible for provider redelivery.'});}});
router.get('/queue',(_req,res)=>res.json({strategy:'Stripe redelivery on HTTP 500',local_queue:false}));
router.post('/issues/:transactionId/reconcile',async(req,res)=>{try{
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(req.params.transactionId))return res.status(400).json({error:'Invalid purchase record.'});
 const {stripe,stripeConfigValid}=require('../config/stripe.config');
 if(!stripeConfigValid)return res.status(503).json({error:'The payment provider is unavailable.'});
 const result=await db.withTransaction(async client=>{
  const t=(await client.query('SELECT * FROM project_transactions WHERE transaction_id=$1 FOR UPDATE',[req.params.transactionId])).rows[0];
  const fail=message=>{throw Object.assign(new Error(message),{status:409});};
  if(!t)throw Object.assign(new Error('Purchase not found.'),{status:404});
  if(t.status==='refunded'&&t.reconciled_at)return {already_reconciled:true};
  if(t.status!=='refund_review')fail('This purchase is not waiting for refund reconciliation.');
  const charge=await stripe.charges.retrieve(t.payment_id);
  if(!charge.refunded||charge.amount_refunded<Math.round(Number(t.amount)*100)||charge.currency!==t.currency)fail('Stripe has not confirmed a full refund matching this purchase.');
  if(!t.stripe_transfer_id)fail('The seller transfer record needs manual review.');
  const transfer=await stripe.transfers.retrieve(t.stripe_transfer_id);
  const destination=typeof transfer.destination==='string'?transfer.destination:transfer.destination?.id;
  if(!transfer.reversed||transfer.amount_reversed<Math.round(Number(t.seller_amount)*100)||transfer.source_transaction!==t.payment_id||destination!==t.seller_stripe_account_id||transfer.currency!==t.currency)fail('Stripe has not confirmed the full seller transfer reversal. Review the payment in Stripe before retrying.');
  await client.query("UPDATE project_transactions SET status='refunded',escrow_status='refunded',reconciled_at=CURRENT_TIMESTAMP,reconciled_by=$2 WHERE transaction_id=$1",[t.transaction_id,req.user.user_id]);
  return {already_reconciled:false};
 });
 res.json({success:true,...result});
 }catch(error){res.status(error.status||503).json({error:error.status?error.message:'Provider reconciliation could not be verified. Please retry.'});}});
router.get('/issues',async(_req,res)=>{try{
 const result=await db.query(`SELECT t.transaction_id,t.purchase_request_id,t.stripe_payment_intent_id,t.amount,t.seller_amount,t.refunded_amount,t.status,t.escrow_status,
 t.dispute_reason,t.dispute_reported_at,t.created_at,p.name AS project_name,b.username AS buyer_username,s.username AS seller_username
 FROM project_transactions t LEFT JOIN projects p ON p.project_id=t.project_id LEFT JOIN users b ON b.user_id=t.buyer_id LEFT JOIN users s ON s.user_id=t.seller_id
 WHERE t.escrow_status='disputed' OR t.status='refund_review' ORDER BY t.created_at DESC LIMIT 100`);
 const reservations=await db.query(`SELECT r.purchase_request_id,r.state,r.created_at,p.name AS project_name FROM checkout_reservations r JOIN projects p ON p.project_id=r.project_id WHERE r.state='creating' ORDER BY r.created_at LIMIT 100`);
 res.json({issues:result.rows,reservations:reservations.rows});
 }catch(_){res.status(503).json({error:'The purchase review queue is temporarily unavailable.'});}});
router.post('/queue/*',(_req,res)=>res.status(410).json({error:'The local queue has been retired. Inspect failed events and replay the original provider event.'}));
module.exports=router;
