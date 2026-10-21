import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist');
const base = '/' + (process.env.BASE_PATH || 'VELORA').replace(/^\/+|\/+$/g, '') + '/';
const prefix = base === '//' ? '/' : base;
await fs.rm(output, {recursive:true, force:true});
await fs.cp(path.join(root,'public'), output, {recursive:true});
const escape = value => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

async function transform(directory) {
  for (const entry of await fs.readdir(directory,{withFileTypes:true})) {
    const file = path.join(directory,entry.name);
    if(entry.isDirectory()) { await transform(file); continue; }
    if(!/\.(?:html|css|js|mjs|json|svg)$/.test(entry.name)) continue;
    let source = await fs.readFile(file,'utf8');
    if(entry.name!=='replica-bootstrap.js')source = source.replace(/(["'`(])\/(media|brand|content|_nuxt)\//g,(_,quote,folder)=>`${quote}${prefix}${folder}/`);
    if(entry.name.endsWith('.html')) {
      source = source.replace(/\b(href|src|action)="\/(?!\/)([^"]*)"/g,(match,key,url)=>url.startsWith(prefix.slice(1))?match:`${key}="${prefix}${url}"`);
      source = source.replace('</head>',`<script>window.VELORA_BASE_PATH=${JSON.stringify(prefix)};</script></head>`);
    }
    await fs.writeFile(file,source);
  }
}
await transform(output);
const registry = JSON.parse(await fs.readFile(path.join(output,'content/registry.json'),'utf8'));
const html = await fs.readFile(path.join(output,'index.html'),'utf8');
for(const [route,meta] of Object.entries(registry.routes)) {
  if(route==='/') continue;
  const directory = path.join(output,decodeURI(route));
  await fs.mkdir(directory,{recursive:true});
  const page=html.replace(/<title>.*?<\/title>/,`<title>${escape(meta.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${escape(meta.description)}">`);
  await fs.writeFile(path.join(directory,'index.html'),page);
}
await fs.writeFile(path.join(output,'404.html'),html);
await fs.writeFile(path.join(output,'.nojekyll'),'');
await fs.writeFile(path.join(output,'robots.txt'),'User-agent: *\nDisallow: /\n');
console.log(`Built ${Object.keys(registry.routes).length} routes for ${prefix}`);
