const fs = require('node:fs');
const path = require('node:path');
const ORIGIN = 'https://www.sidebuilds.online';
const API = 'https://sidebuilds.onrender.com/api/public';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g,'\\u003c');
const info = {
  '/': ['Buy and sell side projects | SideBuilds','Find a project to build on. Compare seller listings, ask questions and agree the handover before buying.'],
  '/marketplace': ['Side projects for sale | SideBuilds','Browse available side projects. Compare asking prices, technology and seller-provided details.'],
  '/how-it-works': ['How buying and selling works | SideBuilds','Browse, inquire, agree a written scope, pay when checkout is available and review the handover before confirming receipt.'],
  '/about': ['About SideBuilds','A marketplace connecting side project makers and buyers.'],
  '/faq': ['Frequently asked questions | SideBuilds','Learn about listings, purchase agreements, handover and payment availability.'],
  '/contact': ['Contact SideBuilds','Use the contact options on SideBuilds for marketplace questions and purchase support.'],
  '/terms': ['Marketplace terms | SideBuilds','Read the terms for listings, project purchases and handover.'],
  '/privacy': ['Privacy information | SideBuilds','Understand how account details, listings, conversations and purchase records are used.'],
  '/pricing': ['Marketplace fees | SideBuilds','Review the marketplace fee and the buying and selling process before you commit.']
};
async function get(resource, fetcher) {
  const response = await fetcher(API+resource,{signal:AbortSignal.timeout(25000),headers:{Accept:'application/json'}});
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Public listing service unavailable');
  return response.json();
}
function card(project, primary=false) {
  const price = Number(project.sale_price);
  const heading=primary?'h1':'h2';
  return `<article><${heading}><a href="/projects/${escape(project.project_id)}">${escape(project.name)}</a></${heading}><p>${escape(project.description)}</p>${project.is_for_sale && Number.isFinite(price) ? `<p>Asking price: ${escape(new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(price))}</p>` : ''}<p>Stage: ${escape(project.stage || 'Not specified')}. Details supplied by the seller.</p></article>`;
}
async function render(url, template, fetcher = fetch) {
  const pathname = url.pathname.replace(/\/$/,'') || '/';
  if (pathname === '/robots.txt') return {status:200,type:'text/plain; charset=utf-8',body:`User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /purchase-agreement/\nDisallow: /project-transfer\nDisallow: /api/\nSitemap: ${ORIGIN}/sitemap.xml\n`};
  if (pathname === '/sitemap.xml') {
    const listings = [];
    for (let page=1;page<=100;page++) {
      const result = await get(`/projects?limit=100&page=${page}`,fetcher);
      listings.push(...result.data);
      if (!result.pagination?.hasMore) break;
      if (page === 100) throw new Error('Sitemap pagination needs review');
    }
    const urls = [...Object.keys(info),...listings.map(p=>`/projects/${p.project_id}`)];
    return {status:200,type:'application/xml; charset=utf-8',body:`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(p=>`<url><loc>${escape(ORIGIN+p)}</loc></url>`).join('')}</urlset>`};
  }
  let [title,description] = info[pathname] || ['SideBuilds','Buy and sell side projects.'];
  let status=200, index=Boolean(info[pathname]), content='', structured={'@context':'https://schema.org','@type':'WebSite',name:'SideBuilds',url:ORIGIN};
  if (pathname.startsWith('/projects/') && !/^\/projects\/(new|edit(?:\/.*)?)$/.test(pathname)) {
    const projectId = pathname.slice('/projects/'.length);
    const valid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId);
    const result = valid ? await get('/projects/'+encodeURIComponent(projectId),fetcher) : null;
    const project = result?.project || result;
    if (!project?.project_id || !(project.is_public === true || project.is_public === 1)) {
      status=404;index=false;title='Project not found | SideBuilds';description='This project is private or no longer available.';
    } else {
      title=`${project.name} | SideBuilds`;description=String(project.description || 'Explore this seller-listed side project on SideBuilds.').slice(0,180);index=true;
      content=card(project,true)+`<p><a href="/marketplace">Browse projects for sale</a></p>`;
      structured={'@context':'https://schema.org','@type':'WebPage',name:project.name,description,url:ORIGIN+pathname};
    }
  } else if (pathname === '/marketplace') {
    const result=await get('/marketplace?limit=100',fetcher);
    content=`<h1>Side projects for sale</h1><p>Compare asking prices and seller-provided details. Ask questions and agree included assets before buying.</p>${result.data.map(p=>card(p)).join('') || '<p>No projects are listed for sale right now.</p>'}`;
  } else if (pathname === '/') {
    content='<h1>Side projects. New possibilities.</h1><p>Find a project to build on, or put your work in front of its next owner.</p><a href="/marketplace">Explore the marketplace</a><p>Ask the seller questions, agree a written purchase scope and review the handover before confirming receipt.</p>';
  } else if (info[pathname]) content=`<h1>${escape(title)}</h1><p>${escape(description)}</p>`;
  else if (!/^\/(login|register|forgot-password|reset-password|dashboard|purchases|purchase\/success|purchase-agreement(?:\/[^/]+)?|project-transfer|my-projects|projects\/(new|edit\/[^/]+)|create|saved|admin|settings|stripe\/connect\/complete|profile-settings|notifications|profile(?:\/[^/]+)?|users\/[^/]+|public-projects|trending|verify|vibe-code|help|blog)(?:\/.*)?$/.test(pathname)) {
    status=404;title='Page not found | SideBuilds';description='This page could not be found.';
  }
  if (url.search) index=false;
  const canonical=ORIGIN+pathname;
  const tags=`<title>${escape(title)}</title><meta data-rh="true" name="description" content="${escape(description)}"><meta data-rh="true" name="robots" content="${index?'index, follow':'noindex, follow'}"><link data-rh="true" rel="canonical" href="${escape(canonical)}"><meta data-rh="true" property="og:title" content="${escape(title)}"><meta data-rh="true" property="og:description" content="${escape(description)}"><meta data-rh="true" property="og:url" content="${escape(canonical)}"><meta data-rh="true" property="og:image" content="${ORIGIN}/og-image.png"><script data-rh="true" type="application/ld+json">${json(structured)}</script>`;
  const head=template.replace(/<title>[\s\S]*?<\/title>/i,'').replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,'').replace('</head>',tags+'</head>');
  const body=head.replace('<div id="root"></div>',`<div id="root"><main style="max-width:1000px;margin:auto;padding:48px 24px;font-family:Inter,sans-serif"><nav><a href="/">SideBuilds</a> · <a href="/marketplace">Marketplace</a> · <a href="/how-it-works">How it works</a></nav>${content||`<h1>${escape(title)}</h1><p>${escape(description)}</p>`}</main></div>`);
  return {status,type:'text/html; charset=utf-8',body,index};
}
module.exports=async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  try {
    const original = new URL(req.url,ORIGIN);
    const route=original.searchParams.get('__route');
    if(route!==null) {original.pathname='/'+route;original.searchParams.delete('__route');}
    if (original.pathname === '/reset-password') res.setHeader('Referrer-Policy', 'no-referrer');
    const template=fs.readFileSync(path.join(process.cwd(),'client/build/index.html'),'utf8');
    const result=await render(original,template);
    res.statusCode=result.status;res.setHeader('Content-Type',result.type);
    if(result.index===false) res.setHeader('X-Robots-Tag','noindex, follow');
    res.end(req.method==='HEAD'?'':result.body);
  } catch (_) {
    res.statusCode=503;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Retry-After','60');res.setHeader('X-Robots-Tag','noindex');
    res.end('<!doctype html><title>SideBuilds temporarily unavailable</title><h1>Listings are temporarily unavailable</h1><p>Please try again shortly.</p>');
  }
};
module.exports.render=render;
