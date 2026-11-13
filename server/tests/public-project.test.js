const {test}=require('node:test');
const assert=require('node:assert/strict');
const {publicProjectRecord}=require('../utils/publicProject');
test('signed-in visitors see the public listing fields without internal record fields',()=>{
 const publicRow=publicProjectRecord({project_id:'p',name:'Listing',owner_id:'seller',is_public:true,is_for_sale:true,contact_email:'public@example.invalid',internal_notes:'private',stripe_payment_id:'private',transfer_notes:'private',verified:true});
 assert.equal(publicRow.name,'Listing');assert.equal(publicRow.contact_email,'public@example.invalid');
 for(const key of ['internal_notes','stripe_payment_id','transfer_notes'])assert.equal(publicRow[key],undefined);
 assert.equal(publicRow.verified,false);
});
test('a public project that is not for sale does not expose listing contact fields',()=>{
 const row=publicProjectRecord({project_id:'p',is_public:true,is_for_sale:false,contact_email:'private@example.invalid',contact_phone:'private'});
 assert.equal(row.contact_email,undefined);assert.equal(row.contact_phone,undefined);
});
