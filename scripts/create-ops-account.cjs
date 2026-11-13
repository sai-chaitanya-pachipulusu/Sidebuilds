// Create a NEW internal operations identity. Never promotes an existing user.
// No password is delivered: the owner chooses one using a single-use reset link.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Client}=require('../server/node_modules/pg');
const bcrypt=require('../server/node_modules/bcryptjs');
const apply=process.argv.includes('--apply');
const mailbox=String(process.env.OPS_MAILBOX||'').trim().toLowerCase();
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailbox))throw new Error('A user-controlled operations mailbox is required.');
const [mailUser,mailDomain]=mailbox.split('@');
const suffix=crypto.randomBytes(3).toString('hex');
const username='sidebuilds_ops_'+suffix;
const email=mailUser.split('+')[0]+'+sidebuilds-ops-'+suffix+'@'+mailDomain;
const privateDir=path.resolve('.tmp/production-admin');
const output=path.join(privateDir,'ADMIN_SETUP.md');
if(apply&&fs.existsSync(output))throw new Error('An operations setup file already exists. Review it before creating another account.');
const db=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true,ca:fs.readFileSync(process.env.DB_SSL_CA_FILE||path.join(__dirname,'../server/certs/supabase-ca.crt'))},connectionTimeoutMillis:12000});
(async()=>{let committed=false;try{
 await db.connect();await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='5s'");
 const admins=Number((await db.query('SELECT count(*) AS n FROM users WHERE is_admin=true')).rows[0].n);
 if(admins!==0)throw new Error('An administrator already exists. No account was created or promoted.');
 const existing=(await db.query('SELECT user_id FROM users WHERE username=$1 OR email=$2',[username,email])).rows;
 if(existing.length)throw new Error('The proposed new identity is already in use.');
 const id=crypto.randomUUID(),token=crypto.randomBytes(32).toString('hex');
 const tokenHash=crypto.createHash('sha256').update(token).digest('hex');
 // The random password is intentionally discarded. Only the owner's setup
 // token can establish a usable initial password.
 const unusablePasswordHash=await bcrypt.hash(crypto.randomBytes(48).toString('base64url'),12);
 await db.query('INSERT INTO users(user_id,username,email,password_hash,is_admin,is_test) VALUES($1,$2,$3,$4,true,false)',[id,username,email,unusablePasswordHash]);
 await db.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens(id SERIAL PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(user_id),token_hash TEXT NOT NULL UNIQUE,expires_at TIMESTAMPTZ NOT NULL,used_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`);
 await db.query('ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY');
 await db.query('REVOKE ALL ON password_reset_tokens FROM PUBLIC,anon,authenticated');
 const expires=new Date(Date.now()+60*60*1000);
 const reset=(await db.query('INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,$3) RETURNING id',[id,tokenHash,expires])).rows[0];
 if(!apply){await db.query('ROLLBACK');console.log(JSON.stringify({mode:'rollback rehearsal',success:true,wouldCreateNewAdministrator:true,noExistingAccountPromoted:true}));return;}
 fs.mkdirSync(privateDir,{recursive:true});
 const setupUrl='https://www.sidebuilds.online/reset-password?token='+token;
 const content=`# Private SideBuilds operations setup\n\nThis file contains a single-use sign-in setup capability. Keep it private and out of version control.\n\nUsername: ${username}\n\nLogin email: ${email}\n\n[Choose your administrator password](${setupUrl})\n\nThe link expires at ${expires.toISOString()} (60 minutes after creation). Enter a unique password yourself, then sign in using the login email above and open [Payment operations](https://www.sidebuilds.online/admin). No password was saved or sent by email. The account can review purchase issues and replay original provider events; it does not initiate refunds or payouts from the management screen.\n`;
 fs.writeFileSync(output,content,{flag:'wx'});
 fs.writeFileSync(path.join(privateDir,'state.json'),JSON.stringify({userId:id,username,email,resetTokenId:reset.id,expiresAt:expires.toISOString(),passwordFingerprint:crypto.createHash('sha256').update(unusablePasswordHash).digest('hex')},null,2),{flag:'wx'});
 await db.query('COMMIT');committed=true;
 console.log(JSON.stringify({success:true,username,newInternalAccount:true,noExistingAccountPromoted:true,setupFile:output,expiresAt:expires.toISOString()}));
}catch(e){if(!committed)await db.query('ROLLBACK').catch(()=>{});console.error(e.code||e.message);process.exitCode=1;}finally{await db.end();}})();
