const {test}=require('node:test');
const assert=require('node:assert/strict');
const {render}=require('../../client/scripts/site-renderer.cjs');
const template='<!doctype html><head><title>Old title</title><meta name="description" content="Old description" /></head><body><div id="root"></div><script src="/static/main.js"></script></body>';
const url=path=>new URL(path,'https://www.sidebuilds.online');
const listing={project_id:'11111111-1111-4111-8111-111111111111',name:'Atlas <script>evil</script>',description:'A & B',is_public:true,is_for_sale:true,sale_price:10.25,stage:'mvp'};
const response=body=>async()=>({ok:true,status:200,json:async()=>body});
test('home is useful before JavaScript and has one canonical and description',async()=>{
 const r=await render(url('/'),template);assert.equal(r.status,200);assert.match(r.body,/<h1>Side projects/);assert.match(r.body,/static\/main.js/);
 assert.equal((r.body.match(/name="description"/g)||[]).length,1);assert.equal((r.body.match(/rel="canonical"/g)||[]).length,1);
});
test('listing initial HTML includes escaped public content, exact cents and its own URL',async()=>{
 const r=await render(url('/projects/'+listing.project_id),template,response(listing));assert.equal(r.status,200);assert.match(r.body,/\$10.25/);assert.match(r.body,/Atlas &lt;script&gt;/);assert.doesNotMatch(r.body,/<script>evil/);assert.match(r.body,new RegExp('canonical" href="https://www.sidebuilds.online/projects/'+listing.project_id));
});
test('missing and private projects return real 404s and noindex',async()=>{
 for(const data of [null,{...listing,is_public:false}]) {const r=await render(url('/projects/'+listing.project_id),template,response(data));assert.equal(r.status,404);assert.equal(r.index,false);assert.doesNotMatch(r.body,/Atlas/);}
});
test('marketplace HTML has real listing links, filtered variants are noindex',async()=>{
 const r=await render(url('/marketplace?q=test'),template,response({data:[listing]}));assert.equal(r.index,false);assert.match(r.body,new RegExp('href="/projects/'+listing.project_id));
});
test('robots and sitemap use their real formats and public listing URLs',async()=>{
 const robots=await render(url('/robots.txt'),template);assert.match(robots.type,/text\/plain/);assert.match(robots.body,/Sitemap:/);
 const sitemap=await render(url('/sitemap.xml'),template,response({data:[listing],pagination:{hasMore:false}}));assert.match(sitemap.type,/application\/xml/);assert.match(sitemap.body,/<urlset/);assert.match(sitemap.body,new RegExp(listing.project_id));assert.doesNotMatch(sitemap.body,/purchase-agreement/);
});
test('account routes are noindex, unknown routes are 404 and backend outages throw',async()=>{
 const account=await render(url('/login'),template);assert.equal(account.status,200);assert.equal(account.index,false);
 assert.equal((await render(url('/missing-random-page'),template)).status,404);
 await assert.rejects(render(url('/marketplace'),template,async()=>({ok:false,status:503})));
});
