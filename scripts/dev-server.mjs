import './build-pages.mjs';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../dist');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{
  try {
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const prefix='/'+(process.env.BASE_PATH||'VELORA').replace(/^\/+|\/+$/g,'')+'/';
    if(pathname==='/'){res.writeHead(302,{location:prefix});res.end();return;}
    if(!pathname.startsWith(prefix)){res.writeHead(404);res.end('Not found');return;}
    pathname=pathname.slice(prefix.length);
    let file=path.resolve(root,pathname);
    if(!file.startsWith(root+path.sep)&&file!==root)throw new Error('Invalid path');
    const stat=await fs.stat(file).catch(()=>null);
    if(stat?.isDirectory())file=path.join(file,'index.html');
    const data=await fs.readFile(file);
    const headers={'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'};
    const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
    if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),data.length-1):data.length-1;res.writeHead(206,{...headers,'accept-ranges':'bytes','content-range':`bytes ${start}-${end}/${data.length}`,'content-length':end-start+1});res.end(data.subarray(start,end+1));}
    else {res.writeHead(200,{...headers,'content-length':data.length});res.end(data);}
  } catch {res.writeHead(404,{'content-type':'text/html'});res.end(await fs.readFile(path.join(root,'404.html')));}
}).listen(4173,'0.0.0.0',()=>console.log('VELORA preview on port 4173'));
