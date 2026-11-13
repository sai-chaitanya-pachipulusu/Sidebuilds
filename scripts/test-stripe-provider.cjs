// Only Stripe's test ledger. No application database, customer email or live key.
const fs=require('fs');const assert=require('node:assert/strict');const {randomUUID}=require('crypto');
if(process.env.RUN_STRIPE_TEST_OPERATIONS!=='true')throw new Error('Set RUN_STRIPE_TEST_OPERATIONS=true to authorize synthetic test-ledger operations.');
const env={STRIPE_SECRET_KEY:process.env.QA_STRIPE_SECRET_KEY};
if(!/^sk_test_/.test(env.STRIPE_SECRET_KEY||''))throw new Error('A Stripe test key is required.');
const stripe=require('../server/node_modules/stripe')(env.STRIPE_SECRET_KEY,{maxNetworkRetries:0,timeout:12000});
const run='qa_repair_'+randomUUID();
let payment,transfer,session;
const report={checkedAt:new Date().toISOString(),mode:'test',applicationDatabaseAccess:false,realMoneyMoved:false,checks:[]};
async function check(name,fn){await fn();report.checks.push({name,passed:true});}
(async()=>{try{
 await check('provider confirms test ledger',async()=>assert.equal((await stripe.balance.retrieve()).livemode,false));
 const accounts=await stripe.accounts.list({limit:100});const destination=accounts.data.find(a=>a.charges_enabled&&a.payouts_enabled&&a.details_submitted&&a.capabilities?.transfers==='active');
 report.readyTestConnectedAccount=Boolean(destination);
 await check('real test Checkout creates and reads an unpaid session',async()=>{session=await stripe.checkout.sessions.create({mode:'payment',payment_method_types:['card'],line_items:[{price_data:{currency:'usd',product_data:{name:'Synthetic SideBuilds QA purchase'},unit_amount:1025},quantity:1}],success_url:'http://localhost:3009/purchase/success',cancel_url:'http://localhost:3009/marketplace',metadata:{qa_run:run}},{idempotencyKey:run+'_checkout'});assert.equal(session.livemode,false);assert.equal(session.payment_status,'unpaid');assert.equal((await stripe.checkout.sessions.retrieve(session.id)).amount_total,1025);});
 await check('test Checkout can be expired without taking payment',async()=>{assert.equal((await stripe.checkout.sessions.expire(session.id)).status,'expired');session=null;});
 await check('test card confirms a platform payment with a charge',async()=>{payment=await stripe.paymentIntents.create({amount:1025,currency:'usd',payment_method:'pm_card_visa',payment_method_types:['card'],confirm:true,metadata:{qa_run:run},transfer_group:run},{idempotencyKey:run+'_payment'});assert.equal(payment.livemode,false);assert.equal(payment.status,'succeeded');assert.ok(payment.latest_charge);});
 if(destination){await check('source-charge transfer and provider retries pay the test seller once',async()=>{const params={amount:974,currency:'usd',destination:destination.id,source_transaction:payment.latest_charge,transfer_group:run,metadata:{qa_run:run}};transfer=await stripe.transfers.create(params,{idempotencyKey:run+'_release'});assert.equal(transfer.livemode,false);const retry=await stripe.transfers.create(params,{idempotencyKey:run+'_release'});assert.equal(retry.id,transfer.id);assert.equal(transfer.source_transaction,payment.latest_charge);});}
 report.success=true;
}catch(error){report.success=false;report.errorCode=error.code||error.type||error.name;process.exitCode=1;}finally{
 if(session)try{await stripe.checkout.sessions.expire(session.id);}catch(_){report.checkoutCleanupPending=true;}
 if(transfer)try{const reversal=await stripe.transfers.createReversal(transfer.id,{amount:974},{idempotencyKey:run+'_reverse'});report.testTransferReversed=reversal.amount===974;}catch(error){report.reversalError=error.code||error.type;process.exitCode=1;}
 if(payment)try{const refund=await stripe.refunds.create({payment_intent:payment.id},{idempotencyKey:run+'_refund'});report.testPaymentRefunded=refund.status==='succeeded';}catch(error){report.refundError=error.code||error.type;process.exitCode=1;}
 if(process.env.QA_REPORT_FILE)fs.writeFileSync(process.env.QA_REPORT_FILE,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}})();
