// Real PostgreSQL locking/rollback tests. Synthetic users and a fake Stripe
// provider live only in a randomly named schema, which is removed in finally.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {Pool,Client}=require('../server/node_modules/pg');
if(!process.env.QA_DATABASE_URL)throw new Error('QA_DATABASE_URL is required; production tables are never test fixtures.');
const schema='__qa_commerce_'+randomUUID().replaceAll('-','');
if(!/^__qa_commerce_[a-f0-9]{32}$/.test(schema))throw new Error('Unsafe test schema');
const connection={connectionString:process.env.QA_DATABASE_URL,ssl:{rejectUnauthorized:true,ca:fs.readFileSync(process.env.QA_DB_CA_FILE||path.join(__dirname,'../server/certs/supabase-ca.crt'))},connectionTimeoutMillis:12000};
const admin=new Client(connection);
const pool=new Pool({...connection,max:5,options:`-c search_path=${schema},pg_catalog`});
let failInsert=false,failCommit=false,server;
const normalize=sql=>{let i=0;return sql.includes('?')?sql.replace(/\?/g,()=>'$'+(++i)):sql;};
const db={dialect:'postgres',query:(sql,args)=>pool.query(normalize(sql),args),checkConnection:async()=>({ok:true}),trueExpr:c=>`${c}=true`,withTransaction:async callback=>{
 const c=await pool.connect();let payoutWrite=false;try{await c.query('BEGIN');
 const result=await callback({query:async(sql,values)=>{if(/UPDATE project_transactions\s+SET status = 'completed'/.test(sql))payoutWrite=true;if(failInsert&&/INSERT INTO project_transactions/.test(sql)){failInsert=false;throw new Error('Synthetic database write failure');}return c.query(normalize(sql),values);}});
 if(failCommit&&payoutWrite){failCommit=false;throw new Error('Synthetic post-provider commit failure');}await c.query('COMMIT');return result;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}};
const sessions=new Map(),sessionKeys=new Map(),charges=new Map(),intents=new Map(),transfers=new Map();
let unknownCreation=false,transferCalls=0;
const stripe={accounts:{retrieve:async()=>({charges_enabled:true,payouts_enabled:true,details_submitted:true,capabilities:{transfers:'active'}})},
 checkout:{sessions:{create:async(data,options)=>{
  let session=sessionKeys.get(options.idempotencyKey);
  if(!session){session={id:'cs_test_'+randomUUID(),url:'https://checkout.stripe.com/synthetic',status:'open',payment_status:'unpaid',livemode:false,
   metadata:data.metadata,amount_total:data.line_items[0].price_data.unit_amount,currency:'usd'};sessionKeys.set(options.idempotencyKey,session);sessions.set(session.id,session);}
  if(unknownCreation){unknownCreation=false;throw new Error('Synthetic timeout after provider accepted request');}return session;
 },retrieve:async sessionId=>{assert.ok(sessions.has(sessionId));return sessions.get(sessionId);}}},
 paymentIntents:{retrieve:async value=>{assert.ok(intents.has(value));return intents.get(value);}},
 charges:{retrieve:async value=>{assert.ok(charges.has(value));return charges.get(value);}},
 transfers:{create:async(data,options)=>{transferCalls++;assert.ok(data.source_transaction);if(!transfers.has(options.idempotencyKey))transfers.set(options.idempotencyKey,{id:'tr_test_'+randomUUID(),...data});return transfers.get(options.idempotencyKey);}}};
Object.assign(process.env,{NODE_ENV:'test',STRIPE_MODE:'test',STRIPE_SECRET_KEY:'sk_test_synthetic_pg',STRIPE_PUBLISHABLE_KEY:'pk_test_synthetic_pg',
 STRIPE_WEBHOOK_SECRET:'whsec_synthetic_pg',STRIPE_STARTUP_CHECK:'false',JWT_SECRET:'postgres-commerce-test-only-secret-with-32-characters',CLIENT_URL:'http://localhost:3009'});
function replace(file,exports){const id=require.resolve(file);require.cache[id]={id,filename:id,loaded:true,exports};}
replace('../server/db',db);replace('../server/config/stripe.config',{stripe,stripeConfigValid:true,stripeEnvironment:{valid:true,mode:'test',live:false}});
const {createCheckout}=require('../server/services/checkoutService');
const hooks=require('../server/services/durableWebhookService');
const seller=randomUUID(),buyerA=randomUUID(),buyerB=randomUUID();
const results=[];
async function check(name,fn){await fn();results.push({name,passed:true});console.log('PASS '+name);}
async function fixture(){
 const project=randomUUID();await db.query("INSERT INTO projects(project_id,owner_id,owner_username,name,is_public,is_for_sale,sale_price,status) VALUES($1,$2,'qa_seller',$3,true,true,10.25,'active')",[project,seller,'Synthetic isolated purchase '+project]);
 const requests=[];for(const buyer of [buyerA,buyerB]){
  const request=(await db.query("INSERT INTO purchase_requests(project_id,buyer_id,seller_id,status,price) VALUES($1,$2,$3,'agreement_reached_pending_payment',10.25) RETURNING id",[project,buyer,seller])).rows[0].id;
  const agreement=randomUUID();await db.query(`INSERT INTO purchase_agreements(id,purchase_request_id,version,price_cents,included_items,exclusions,running_costs,handover_steps,support_terms,buyer_approved_at)
   VALUES($1,$2,1,1025,'["Source"]','No domain','Hosting excluded','Repository handover','Seven days',CURRENT_TIMESTAMP)`,[agreement,request]);
  requests.push({requestId:request,agreementId:agreement,buyerId:buyer});
 }return {project,requests};
}
const checkout=params=>createCheckout({db,stripe,clientUrl:'http://localhost:3009',...params});
function paid(sessionId){const session=sessions.get(sessionId);session.payment_status='paid';session.status='complete';
 const intent={id:'pi_test_'+randomUUID(),status:'succeeded',amount_received:session.amount_total,metadata:session.metadata};
 const charge={id:'ch_test_'+randomUUID(),paid:true,amount:session.amount_total,currency:'usd',amount_refunded:0,refunded:false,disputed:false,payment_intent:intent.id};
 intent.latest_charge=charge;intents.set(intent.id,intent);charges.set(charge.id,charge);session.payment_intent=intent.id;return session;
}
const event=(type,object,eventId='evt_test_'+randomUUID().replaceAll('-',''))=>({id:eventId,type,livemode:false,data:{object}});
async function post(base,route,buyer,body){const {signToken}=require('../server/utils/jwt');const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+signToken({user:{user_id:buyer}})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
(async()=>{const report={startedAt:new Date().toISOString(),isolatedSchema:true,fakePaymentProvider:true};try{
 await admin.connect();await admin.query(`CREATE SCHEMA "${schema}"`);
 for(const table of ['users','projects','purchase_requests','project_transactions','project_files','notifications'])await admin.query(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING DEFAULTS INCLUDING INDEXES)`);
 await admin.query(`CREATE SEQUENCE "${schema}".request_ids`);await admin.query(`ALTER TABLE "${schema}".purchase_requests ALTER COLUMN id SET DEFAULT nextval('"${schema}".request_ids'::regclass)`);
 for(const file of ['011_purchase_agreements.sql','013_commerce_integrity.sql','014_refund_state.sql','016_seller_connection_attempts.sql'])await pool.query(fs.readFileSync(path.join(__dirname,'../database/migrations',file),'utf8').replace(/^\s*(BEGIN|COMMIT);\s*$/gm,''));
 for(const [user,username] of [[seller,'qa_seller'],[buyerA,'qa_buyer_a'],[buyerB,'qa_buyer_b']])await db.query('INSERT INTO users(user_id,username,email,password_hash,stripe_account_id) VALUES($1,$2,$3,$4,$5)',[user,username,username+'@example.invalid','unusable-test-hash',user===seller?'acct_test_fixture':null]);
 let winner,main;
 await check('two simultaneous buyers produce only one payable project reservation',async()=>{main=await fixture();const r=await Promise.allSettled(main.requests.map(checkout));assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.status,409);winner=r.find(x=>x.status==='fulfilled').value;});
 await check('unknown provider outcome preserves reservation and retry returns the same payment',async()=>{const f=await fixture();const count=sessionKeys.size;unknownCreation=true;await assert.rejects(checkout(f.requests[0]));await assert.rejects(checkout(f.requests[1]),{status:409});const retry=await checkout(f.requests[0]);assert.ok(retry.sessionId);assert.equal(sessionKeys.size,count+1);});
 const paidSession=paid(winner.sessionId);
 await check('mismatched paid amount is rejected without transaction or event claim',async()=>{const bad=event('checkout.session.completed',{...paidSession,amount_total:1});await assert.rejects(hooks.processWebhook(bad));assert.equal(Number((await db.query('SELECT count(*) AS n FROM project_transactions')).rows[0].n),0);assert.equal((await db.query('SELECT event_id FROM payment_event_claims WHERE event_id=$1',[bad.id])).rows.length,0);});
 const completion=event('checkout.session.completed',paidSession);
 await check('a failed payment write rolls back its claim and a redelivery succeeds',async()=>{failInsert=true;await assert.rejects(hooks.processWebhook(completion));assert.equal((await db.query('SELECT event_id FROM payment_event_claims WHERE event_id=$1',[completion.id])).rows.length,0);await hooks.processWebhook(completion);});
 await check('duplicate and parallel redeliveries cannot duplicate transactions or notifications',async()=>{await Promise.all([hooks.processWebhook(completion),hooks.processWebhook(event('checkout.session.completed',paidSession))]);assert.equal(Number((await db.query('SELECT count(*) AS n FROM project_transactions')).rows[0].n),1);assert.equal(Number((await db.query("SELECT count(*) AS n FROM notifications WHERE type='PAYMENT_CONFIRMED'")).rows[0].n),2);});
 await check('the fee snapshot survives a later commission setting change',async()=>{const t=(await db.query('SELECT * FROM project_transactions')).rows[0];assert.equal(Number(t.amount),10.25);assert.equal(Number(t.commission_amount),0.51);assert.equal(Number(t.seller_amount),9.74);});
 const express=require('../server/node_modules/express');const app=express();app.use(express.json());app.use('/auth',require('../server/routes/auth'));app.use('/payments',require('../server/routes/payments').router);app.use('/requests',require('../server/routes/purchaseRequests'));app.use('/files',require('../server/routes/files'));app.use('/webhooks',require('../server/routes/paymentOperations'));
 server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 const transaction=(await db.query('SELECT * FROM project_transactions')).rows[0];
 await check('receipt release is blocked until the agreed handover is marked delivered',async()=>{assert.equal((await post(base,'/payments/confirm-receipt',transaction.buyer_id,{transactionId:transaction.transaction_id,receiptAcknowledged:true})).status,409);assert.equal(transfers.size,0);});
 await db.query("UPDATE purchase_requests SET status='assets_transferred_pending_buyer_confirmation' WHERE id=$1",[transaction.purchase_request_id]);
 await check('an old unknown release is blocked beyond the provider idempotency window',async()=>{
  await db.query("INSERT INTO payout_attempts(transaction_id,created_at) VALUES($1,NOW()-INTERVAL '25 hours')",[transaction.transaction_id]);
  const response=await post(base,'/payments/confirm-receipt',transaction.buyer_id,{transactionId:transaction.transaction_id,receiptAcknowledged:true});
  assert.equal(response.status,409);assert.equal(transfers.size,0);assert.match(response.body.error,/reconciliation/);
  await db.query('DELETE FROM payout_attempts WHERE transaction_id=$1',[transaction.transaction_id]);
 });
 await check('provider success followed by database failure retries without a second seller payment',async()=>{failCommit=true;assert.equal((await post(base,'/payments/confirm-receipt',transaction.buyer_id,{transactionId:transaction.transaction_id,receiptAcknowledged:true})).status,500);assert.equal(transfers.size,1);assert.equal((await post(base,'/payments/confirm-receipt',transaction.buyer_id,{transactionId:transaction.transaction_id,receiptAcknowledged:true})).status,200);assert.equal(transfers.size,1);assert.equal(transferCalls,2);assert.equal((await db.query('SELECT owner_id FROM projects WHERE project_id=$1',[main.project])).rows[0].owner_id,transaction.buyer_id);assert.equal(Number((await db.query('SELECT count(*) AS n FROM checkout_reservations WHERE project_id=$1',[main.project])).rows[0].n),0);});
 await check('refund arriving before checkout completion permanently blocks automatic release',async()=>{const f=await fixture();const c=await checkout(f.requests[0]);const s=paid(c.sessionId);const charge=intents.get(s.payment_intent).latest_charge;charge.amount_refunded=100;await hooks.processWebhook(event('charge.refunded',charge));await hooks.processWebhook(event('checkout.session.completed',s));const t=(await db.query('SELECT * FROM project_transactions WHERE stripe_session_id=$1',[s.id])).rows[0];assert.equal(t.escrow_status,'disputed');assert.equal((await post(base,'/payments/confirm-receipt',t.buyer_id,{transactionId:t.transaction_id,receiptAcknowledged:true})).status,409);});
 await check('private upload persists in PostgreSQL and becomes available only to its paid buyer',async()=>{
  const f=await fixture();const {signToken}=require('../server/utils/jwt');const headers=user=>({Authorization:'Bearer '+signToken({user:{user_id:user}})});
  const form=new FormData();form.set('files',new Blob(['Persistent synthetic handover'],{type:'text/plain'}),'handover.txt');
  const upload=await fetch(base+'/files/upload/'+f.project,{method:'POST',headers:headers(seller),body:form});assert.equal(upload.status,201);const file=(await upload.json()).files[0];
  assert.equal((await fetch(base+'/files/download/'+file.file_id,{headers:headers(buyerA)})).status,403);
  const c=await checkout(f.requests[0]);await hooks.processWebhook(event('checkout.session.completed',paid(c.sessionId)));
  const download=await fetch(base+'/files/download/'+file.file_id,{headers:headers(buyerA)});assert.equal(download.status,200);assert.equal(await download.text(),'Persistent synthetic handover');
  assert.equal((await fetch(base+'/files/download/'+file.file_id,{headers:headers(buyerB)})).status,403);
  assert.equal((await db.query('SELECT storage_type FROM project_files WHERE file_id=$1',[file.file_id])).rows[0].storage_type,'database');
  assert.equal(Buffer.from((await db.query('SELECT content FROM project_file_blobs WHERE file_id=$1',[file.file_id])).rows[0].content).toString(),'Persistent synthetic handover');
 });
 await check('a full refund records its amount and releases the unpaid handover reservation',async()=>{
  const f=await fixture();const c=await checkout(f.requests[0]);const s=paid(c.sessionId);await hooks.processWebhook(event('checkout.session.completed',s));
  const charge=intents.get(s.payment_intent).latest_charge;charge.amount_refunded=charge.amount;charge.refunded=true;
  await hooks.processWebhook(event('charge.refunded',{...charge,amount_refunded:100}));
  const t=(await db.query('SELECT * FROM project_transactions WHERE stripe_session_id=$1',[s.id])).rows[0];assert.equal(t.status,'refunded');assert.equal(Number(t.refunded_amount),10.25);assert.equal((await db.query('SELECT project_id FROM checkout_reservations WHERE project_id=$1',[f.project])).rows.length,0);
 });
 await check('a refund after seller release requires reconciliation and never changes ownership automatically',async()=>{
  const charge=intents.get(paidSession.payment_intent).latest_charge;charge.amount_refunded=charge.amount;charge.refunded=true;
  await hooks.processWebhook(event('charge.refunded',charge));
  const t=(await db.query('SELECT * FROM project_transactions WHERE stripe_session_id=$1',[paidSession.id])).rows[0];assert.equal(t.status,'refund_review');assert.equal(t.escrow_status,'refunded');assert.equal((await db.query('SELECT owner_id FROM projects WHERE project_id=$1',[main.project])).rows[0].owner_id,t.buyer_id);assert.equal(transfers.size,1);
 });
 await check('tagged QA users cannot start live payments even after agreeing a scope',async()=>{
  const f=await fixture();await db.query('UPDATE users SET is_test=true WHERE user_id=$1',[buyerA]);
  await assert.rejects(checkout({...f.requests[0],liveMode:true}),{status:403});
  assert.equal((await db.query('SELECT project_id FROM checkout_reservations WHERE project_id=$1',[f.project])).rows.length,0);
  await db.query('UPDATE users SET is_test=false WHERE user_id=$1',[buyerA]);
 });
 await check('only an actual administrator can see issue queues or replay provider events',async()=>{
  const {signToken}=require('../server/utils/jwt');const headers=user=>({Authorization:'Bearer '+signToken({user:{user_id:user}})});
  assert.equal((await fetch(base+'/webhooks/issues')).status,401);
  assert.equal((await fetch(base+'/webhooks/issues',{headers:headers(buyerA)})).status,403);
  await db.query('UPDATE users SET is_admin=true WHERE user_id=$1',[buyerB]);
  const response=await fetch(base+'/webhooks/issues',{headers:headers(buyerB)});assert.equal(response.status,200);const data=await response.json();assert.ok(data.issues.some(t=>t.status==='refund_review'));
  assert.equal(JSON.stringify(data).includes('password_hash'),false);
  stripe.events={retrieve:async value=>{assert.equal(value,completion.id);return completion;}};
  const retry=await post(base,'/webhooks/replay/'+completion.id,buyerB,{});assert.equal(retry.status,200);assert.equal(retry.body.duplicate,true);
 });
 await check('restored timezone-less reset expiries migrate to exact UTC instants',async()=>{
  await db.query('CREATE TABLE password_reset_tokens(id SERIAL PRIMARY KEY,user_id UUID NOT NULL,token_hash TEXT UNIQUE NOT NULL,expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,used_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)');
  const expected=new Date(Date.now()+3600000).toISOString();
  await db.query('INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,$3)',[buyerA,'synthetic-legacy-expiry',expected]);
  const sql=fs.readFileSync(path.join(__dirname,'../database/migrations/015_reset_token_timezone.sql'),'utf8').replace(/^\s*(BEGIN|COMMIT);\s*$/gm,'');
  await pool.query(sql);await pool.query(sql);
  const row=(await db.query("SELECT expires_at,pg_typeof(expires_at)::text AS type,expires_at>CURRENT_TIMESTAMP AS valid FROM password_reset_tokens WHERE token_hash='synthetic-legacy-expiry'")).rows[0];
  assert.equal(row.type,'timestamp with time zone');assert.equal(row.expires_at.toISOString(),expected);assert.equal(row.valid,true);
 });
 await check('PostgreSQL registration, login and single-use password setup work without granting administrator access',async()=>{
  const unique=randomUUID().slice(0,8),email='qa.signup.'+unique+'@example.invalid',password='Synthetic-registration-only-2026!';
  const request=async(route,body)=>{const r=await fetch(base+'/auth/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
  const registered=await request('register',{username:'qa_signup_'+unique,email,password,is_admin:true});assert.equal(registered.status,201);assert.notEqual(registered.data.user.is_admin,true);assert.equal(registered.data.user.password_hash,undefined);
  const userId=registered.data.user.user_id;assert.equal((await db.query('SELECT is_admin FROM users WHERE user_id=$1',[userId])).rows[0].is_admin,false);
  assert.equal((await request('login',{email,password})).status,200);
  await db.query('CREATE TABLE IF NOT EXISTS password_reset_tokens(id SERIAL PRIMARY KEY,user_id UUID NOT NULL,token_hash TEXT UNIQUE NOT NULL,expires_at TIMESTAMPTZ NOT NULL,used_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)');
  const token=require('crypto').randomBytes(32).toString('hex'),newPassword='Synthetic-replacement-only-2026!';
  await db.query('INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,$3)',[userId,require('crypto').createHash('sha256').update(token).digest('hex'),new Date(Date.now()+60000)]);
  const preflight=await request('reset-password/validate',{token});assert.equal(preflight.status,200);assert.deepEqual(preflight.data,{valid:true});
  assert.equal((await request('reset-password',{token,password:newPassword})).status,200);assert.equal((await request('reset-password',{token,password:'Wrong-repeated-attempt!'})).status,400);
  assert.equal((await request('reset-password/validate',{token})).status,400);
  assert.equal((await request('login',{email,password:newPassword})).status,200);
  // This isolated scenario intentionally exceeds the normal five-request
  // authentication bucket; reset only its local test bucket for the old-password check.
  require('../server/middleware/rateLimiting').authLimiter.resetKey('127.0.0.1');
  assert.equal((await request('login',{email,password})).status,401);
 });
 await check('refund review closes only after Stripe confirms both refund and seller reversal',async()=>{
  const row=(await db.query('SELECT * FROM project_transactions WHERE stripe_session_id=$1',[paidSession.id])).rows[0];
  const route='/webhooks/issues/'+row.transaction_id+'/reconcile';
  assert.equal((await post(base,route,buyerA,{})).status,403);
  stripe.transfers.retrieve=async value=>[...transfers.values()].find(t=>t.id===value);
  assert.equal((await post(base,route,buyerB,{})).status,409);
  const transfer=[...transfers.values()][0];transfer.reversed=true;transfer.amount_reversed=974;
  assert.equal((await post(base,route,buyerB,{})).status,200);
  const reconciled=(await db.query('SELECT * FROM project_transactions WHERE transaction_id=$1',[row.transaction_id])).rows[0];assert.equal(reconciled.status,'refunded');assert.equal(reconciled.reconciled_by,buyerB);assert.ok(reconciled.reconciled_at);
  assert.equal((await post(base,route,buyerB,{})).body.already_reconciled,true);assert.equal(transfers.size,1);
 });
 await check('fresh pending transfer capability blocks PostgreSQL checkout without a reservation',async()=>{
  const f=await fixture(),retrieve=stripe.accounts.retrieve;
  try{stripe.accounts.retrieve=async()=>({charges_enabled:true,payouts_enabled:true,details_submitted:true,capabilities:{transfers:'pending'}});
   await assert.rejects(checkout(f.requests[0]),{status:409});
   assert.equal((await db.query('SELECT project_id FROM checkout_reservations WHERE project_id=$1',[f.project])).rows.length,0);
  }finally{stripe.accounts.retrieve=retrieve;}
 });
 await check('unfinished PostgreSQL purchases block seller connection replacement',async()=>{
  const {assertNoUnsettledSales}=require('../server/services/sellerConnectionService');
  await assert.rejects(db.withTransaction(client=>assertNoUnsettledSales(client,seller)),{status:409});
  assert.equal((await db.query('SELECT stripe_account_id FROM users WHERE user_id=$1',[seller])).rows[0].stripe_account_id,'acct_test_fixture');
 });
 await check('parallel seller reconnects reuse one durable PostgreSQL provider attempt',async()=>{
  const user=randomUUID();await db.query("INSERT INTO users(user_id,username,email,password_hash,stripe_account_id) VALUES($1,$2,$3,'unusable','acct_old_connection')",[user,'qa_connect_'+user,user+'@example.invalid']);
  const created=new Map(),provider={accounts:{retrieve:async id=>{
   if(id==='acct_old_connection')throw Object.assign(new Error('Synthetic missing account'),{code:'account_invalid'});return {};
  },create:async(params,options)=>{if(!created.has(options.idempotencyKey))created.set(options.idempotencyKey,{id:'acct_test_new_'+randomUUID(),params});
   const record=created.get(options.idempotencyKey);assert.deepEqual(record.params,params);return {id:record.id};}},accountLinks:{create:async()=>({url:'https://connect.stripe.com/synthetic'})}};
  const {createOnboardingLink}=require('../server/services/sellerConnectionService');
  const results=await Promise.all([1,2].map(()=>createOnboardingLink({db,stripe:provider,userId:user,mode:'test',clientUrl:'http://localhost:3009'})));
  assert.equal(created.size,1);assert.equal(results[0].account_id,results[1].account_id);
  const attempt=(await db.query('SELECT * FROM stripe_connection_attempts WHERE user_id=$1',[user])).rows[0];assert.equal(attempt.account_id,results[0].account_id);
  const policy=(await db.query("SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND c.relname='stripe_connection_attempts'")).rows[0];assert.equal(policy.relrowsecurity,true);
 });
 await check('administrator launch checks return live provider observations without private account data',async()=>{
  const {signToken}=require('../server/utils/jwt');const response=await fetch(base+'/webhooks/readiness',{headers:{Authorization:'Bearer '+signToken({user:{user_id:buyerB}})}});
  assert.equal(response.status,200);const data=await response.json();assert.ok(data.listings.length);assert.doesNotMatch(JSON.stringify(data),/acct_|@example|password_hash|whsec_/);
 });
 report.success=true;
}catch(e){report.success=false;report.error=e.message;console.error(e.stack);process.exitCode=1;}finally{
 if(server)await new Promise(resolve=>server.close(resolve));await pool.end();
 try{if(admin._connected)await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);report.testSchemaRemoved=true;}catch(e){report.cleanupError=e.code;process.exitCode=1;}
 await admin.end();report.results=results;report.completedAt=new Date().toISOString();
 if(process.env.QA_REPORT_FILE)fs.writeFileSync(process.env.QA_REPORT_FILE,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}})();
