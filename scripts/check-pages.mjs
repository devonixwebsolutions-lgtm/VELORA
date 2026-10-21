import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist');
const registry=JSON.parse(fs.readFileSync(path.join(dist,'content/registry.json'),'utf8'));
for(const route of Object.keys(registry.routes))assert.ok(fs.existsSync(path.join(dist,decodeURI(route),'index.html')),`Missing route ${route}`);
for(const file of fs.readdirSync(path.join(dist,'_nuxt')).filter(name=>name.endsWith('.js')))execFileSync(process.execPath,['--check',path.join(dist,'_nuxt',file)]);
for(const file of ['replica-bootstrap.js','replica-fallback.js','velora-brand.js','velora-booking.js','velora-media-core.mjs'])execFileSync(process.execPath,['--check',path.join(dist,file)]);
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
assert.ok(html.includes('window.VELORA_BASE_PATH="/VELORA/"'));
assert.ok(html.includes('src="/VELORA/_nuxt/'));
assert.ok(!html.includes('/VELORA/VELORA/'));
const seen=[];
const window={VELORA_BASE_PATH:'/VELORA/',fetch:async input=>{
  const url=new URL(input,'https://example.com');seen.push(url.pathname);
  return new Response(fs.readFileSync(path.join(dist,url.pathname.slice('/VELORA/'.length))));
}};
const sandbox={window,location:{origin:'https://example.com',href:'https://example.com/VELORA/'},crypto:{randomUUID:()=>''},URL,Response,navigator:{},Map,Date,JSON,console,document:{getElementById:()=>({})},MutationObserver:class{observe(){}}};
vm.runInNewContext(fs.readFileSync(path.join(dist,'replica-bootstrap.js'),'utf8'),sandbox);
assert.equal(window.__NUXT__.config.app.baseURL,'/VELORA/');
assert.equal(window.__NUXT__.config.public.apiUrl,'https://example.com/VELORA');
for(const suffix of ['concept-5','footer','projects']){
  const endpoint=Object.keys(registry.endpoints).find(key=>key.endsWith('/'+suffix));
  if(endpoint){const response=await window.fetch('https://example.com/VELORA'+endpoint);assert.ok(response.ok);await response.json();}
}
assert.ok(seen.every(url=>url.startsWith('/VELORA/content/')));
const manifestResponse=await window.fetch('https://example.com/VELORA/_nuxt/builds/meta/velora-studio.json');
assert.equal((await manifestResponse.json()).id,'velora-studio');
console.log(`Verified ${Object.keys(registry.routes).length} page files, module syntax and subpath content requests.`);
