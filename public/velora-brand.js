(() => {
 const root=document.getElementById('__nuxt'), base=window.VELORA_BASE_PATH||'/';
 function update(){
  root.querySelectorAll('a[href^="mailto:"],a[href^="tel:"]').forEach(link=>{link.href=base+'plan-with-us';link.removeAttribute('target')});
  if(base!=='/')root.querySelectorAll('a[href^="/"]').forEach(link=>{const href=link.getAttribute('href');if(!href.startsWith(base)&&!href.startsWith('//'))link.setAttribute('href',base+href.slice(1))});
 }
 new MutationObserver(update).observe(root,{childList:true,subtree:true});update();
})();
