const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {verifyUnclaimedSetup}=require('../../scripts/renew-ops-setup.cjs');
const user={user_id:'synthetic-user',username:'internal-ops',email:'ops@example.com',is_admin:true,is_test:false,password_hash:'unusable-initial-hash'};
const state={userId:user.user_id,username:user.username,email:user.email,passwordFingerprint:createHash('sha256').update(user.password_hash).digest('hex'),resetTokenId:1};
const token={id:1,expires_at:'2020-01-01T00:00:00Z',used_at:null};
test('only an expired unclaimed invitation for the exact operator can be renewed',()=>assert.doesNotThrow(()=>verifyUnclaimedSetup(state,user,token,1)));
test('invitation renewal cannot overwrite a password already chosen by its owner',()=>assert.throws(()=>verifyUnclaimedSetup(state,{...user,password_hash:'owner-chosen-hash'},token,1),/chosen password/));
test('used, replaced, active and mismatched-role invitations cannot be renewed',()=>{
 assert.throws(()=>verifyUnclaimedSetup(state,user,{...token,used_at:new Date()},1),/used or replaced/);
 assert.throws(()=>verifyUnclaimedSetup(state,user,token,2),/used or replaced/);
 assert.throws(()=>verifyUnclaimedSetup(state,user,{...token,expires_at:'2099-01-01T00:00:00Z'},1),/not expired/);
 assert.throws(()=>verifyUnclaimedSetup(state,{...user,is_admin:false},token,1),/no longer matches/);
});
