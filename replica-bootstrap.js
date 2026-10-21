/* Standalone content adapter. No request is submitted to the reference studio. */
(() => {
  if (!crypto.randomUUID) crypto.randomUUID = () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c => (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16));
  const originalFetch = window.fetch.bind(window);
  const base = window.VELORA_BASE_PATH || '/';
  const asset = path => base + path.replace(/^\/+/, '');
  const requests = new Map();
  const registry = originalFetch(asset('content/registry.json')).then(r => r.json());
  function content(file) {
    if (!requests.has(file)) requests.set(file, originalFetch(asset('content/' + file)).then(r => {
      if (!r.ok) throw new Error('Content unavailable: ' + file);
      return r.json();
    }));
    return requests.get(file);
  }
  function json(data, status = 200) {
    return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json'}});
  }
  function notify(text) {
    const message = document.createElement('div');
    message.className = 'replica-notice'; message.setAttribute('role','status');
    message.textContent = text; document.body.append(message);
    setTimeout(() => message.remove(), 12000);
  }
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const pathname = url.pathname.startsWith(base) ? '/' + url.pathname.slice(base.length) : url.pathname;
    const method = (options.method || input.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      if (pathname === '/api/form/odoo') {
        const drafts = JSON.parse(localStorage.getItem('velora-preview-requests') || '[]');
        drafts.push({createdAt:new Date().toISOString(),body:typeof options.body==='string'?options.body:'Form data'});
        localStorage.setItem('velora-preview-requests',JSON.stringify(drafts));
        notify('Your request is saved in this preview. No email has been sent.');
      }
      return json({success:true,ok:true,status:'success',message:'Saved in this preview'});
    }
    if (pathname.startsWith('/api/strapi/')) {
      const map = await registry;
      const file = map.endpoints[decodeURI(pathname).replace(/\/$/,'')];
      if (!file) {console.error('VELORA content missing',url.pathname);return json({error:'Content unavailable',path:url.pathname},404);}
      return json(await content(file));
    }
    if (pathname.startsWith('/_nuxt/builds/')) {
      return json({id:'velora-studio',timestamp:Date.now(),matcher:{static:{},wildcard:{},dynamic:{}},prerendered:[]});
    }
    if (/google-analytics|googletagmanager|facebook\.com|pinterest\.com|doubleclick/.test(url.hostname)) return json({});
    return originalFetch(input,options);
  };
  navigator.sendBeacon = () => false;
  new MutationObserver(() => {
    const confirmation = document.querySelector('.thanks-page .thanks');
    if (confirmation && !confirmation.querySelector('.replica-form-status')) {
      const status = document.createElement('p');
      status.className = 'replica-form-status';
      status.setAttribute('role','status');
      status.textContent = 'Saved on this device. This preview does not send email.';
      status.style.cssText = 'margin-top:24px;font-size:12px;line-height:1.5;opacity:.65';
      confirmation.append(status);
    }
  }).observe(document.getElementById('__nuxt'), {childList:true,subtree:true});
  window.__NUXT__ = {config:{public:{apiUrl:location.origin + base.replace(/\/$/, ''),dev_mode:false},app:{baseURL:base,buildId:'velora-studio',buildAssetsDir:'_nuxt/',cdnURL:''}}};
})();
