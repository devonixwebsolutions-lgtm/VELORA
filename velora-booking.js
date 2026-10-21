import {estimateBooking,validateBooking} from './velora-booking-core.mjs';
const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const base=window.VELORA_BASE_PATH||'/';
const offers=await fetch(new URL('./content/velora-offers.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('VELORA collection unavailable');return r.json();});
const launcher=document.createElement('button');launcher.type='button';launcher.className='velora-booking-launcher';launcher.innerHTML='Plan a vacation <span>↗</span>';launcher.setAttribute('aria-haspopup','dialog');document.body.append(launcher);
const dialog=document.createElement('dialog');dialog.className='velora-dialog';dialog.setAttribute('aria-labelledby','velora-booking-title');document.body.append(dialog);
function currentOffer(){return offers.find(p=>location.pathname.replace(/\/$/,'').endsWith('/'+p.slug));}
function updateLauncher(){const item=currentOffer();launcher.innerHTML=(item?.kind==='property'?'Explore this home':item?.kind==='development'?'Discuss this project':item?'Request this stay':'Plan a vacation')+' <span>↗</span>';launcher.hidden=/^\/plan-with-us/.test('/'+location.pathname.slice(base.length));}
new MutationObserver(updateLauncher).observe(document.getElementById('__nuxt'),{childList:true,subtree:true});updateLauncher();window.addEventListener('popstate',updateLauncher);
launcher.addEventListener('click',()=>openBooking(currentOffer()));
function openBooking(selected){
  dialog.innerHTML=`<div class="velora-booking-grid"><div class="velora-booking-visual"><img id="velora-booking-photo" src="${escapeHTML((selected||offers[0]).image)}" alt="Illustrative VELORA retreat"><div class="velora-booking-brand">VELORA</div><div class="velora-booking-caption"><p>JOURNEYS & ESTATES</p><h2 id="velora-selected-name">Your next horizon.</h2><p id="velora-selected-location">Extraordinary places. A life well travelled.</p><output class="velora-estimate" id="velora-booking-estimate">Tailored around you.<small>Illustrative collection · Fictional agency</small></output></div></div><div class="velora-booking-form"><button class="velora-dialog-close" type="button" aria-label="Close booking request">×</button><p class="velora-booking-eyebrow">A new chapter starts here</p><h2 id="velora-booking-title">Plan with VELORA.</h2><form id="velora-request-form" novalidate><label for="velora-intent">What would you like to explore?</label><select id="velora-intent" name="intent"><option value="vacation">A vacation</option><option value="property">A home or property</option><option value="development">A development project</option></select><label for="velora-offer">Choose a place</label><select id="velora-offer" name="offer" required></select><div id="velora-trip-fields"><div class="velora-booking-row"><div><label for="velora-arrival">Arrival</label><input id="velora-arrival" name="arrival" type="date" min="${today()}" required></div><div><label for="velora-departure">Departure</label><input id="velora-departure" name="departure" type="date" min="${today()}" required></div></div><label for="velora-guests">Guests</label><select id="velora-guests" name="guests">${Array.from({length:20},(_,i)=>`<option value="${i+1}" ${i===1?'selected':''}>${i+1} ${i===0?'guest':'guests'}</option>`).join('')}</select></div><div class="velora-booking-row"><div><label for="velora-name">Your name</label><input id="velora-name" name="name" autocomplete="name" required></div><div><label for="velora-email">Email address</label><input id="velora-email" name="email" type="email" autocomplete="email" required></div></div><label for="velora-notes">Anything we should know?</label><textarea id="velora-notes" name="notes" placeholder="Your preferences, plans or property vision"></textarea><p class="velora-booking-error" id="velora-booking-error" role="alert" hidden></p><button class="velora-booking-submit" type="submit">Save booking request ↗</button><p class="velora-booking-note">Fictional agency demo. Requests save on this device. Rates are illustrative; no reservation or payment is made.</p></form></div></div>`;
  const form=dialog.querySelector('form'),intent=form.elements.intent,offer=form.elements.offer;
  if(selected)intent.value=selected.kind;
  function chosen(){return offers.find(p=>p.slug===offer.value);}
  function updateChoices(){
    const items=offers.filter(p=>p.kind===intent.value);
    offer.innerHTML=items.map(p=>`<option value="${escapeHTML(p.slug)}">${escapeHTML(p.name+' · '+p.location)}</option>`).join('');
    if(selected?.kind===intent.value)offer.value=selected.slug;
    dialog.querySelector('#velora-trip-fields').hidden=intent.value!=='vacation';
    form.querySelector('button[type="submit"]').textContent=intent.value==='vacation'?'Save booking request ↗':'Save property inquiry ↗';
    updatePreview();
  }
  function updatePreview(){
    const p=chosen();if(!p)return;
    dialog.querySelector('#velora-booking-photo').src=p.image;
    dialog.querySelector('#velora-selected-name').textContent=p.name;
    dialog.querySelector('#velora-selected-location').textContent=p.location;
    const estimate=estimateBooking(p,form.elements.arrival.value,form.elements.departure.value);
    const output=dialog.querySelector('#velora-booking-estimate');
    output.innerHTML=estimate?`${money(estimate.total)} <small>${estimate.nights} nights · Illustrative stay estimate</small>`:p.kind==='vacation'?`From ${money(p.rate)} / night <small>Illustrative pricing · Tailored quote</small>`:p.kind==='property'?`From ${money(p.rate)} <small>Illustrative property value · Request information</small>`:`Explore the possibilities.<small>Concept development · Discuss your vision</small>`;
    if(form.elements.arrival.value)form.elements.departure.min=form.elements.arrival.value;
  }
  intent.addEventListener('change',updateChoices);form.addEventListener('input',updatePreview);offer.addEventListener('change',updatePreview);updateChoices();
  dialog.querySelector('.velora-dialog-close').addEventListener('click',()=>dialog.close());
  form.addEventListener('submit',event=>{
    event.preventDefault();const input=Object.fromEntries(new FormData(form));const error=validateBooking(input,today());const box=dialog.querySelector('#velora-booking-error');
    if(error){box.hidden=false;box.textContent=error;return;}
    const item=chosen(),estimate=estimateBooking(item,input.arrival,input.departure);
    let requests=[];try{requests=JSON.parse(localStorage.getItem('velora-booking-requests')||'[]');if(!Array.isArray(requests))requests=[];}catch{}
    const id=crypto.randomUUID();requests.push({...input,id,createdAt:new Date().toISOString(),place:item.name,location:item.location,estimate,status:'demo-request'});
    try{localStorage.setItem('velora-booking-requests',JSON.stringify(requests));}catch{box.hidden=false;box.textContent='This browser cannot save requests. Please allow site storage and try again.';return;}
    dialog.querySelector('.velora-booking-form').innerHTML=`<button class="velora-dialog-close" type="button" aria-label="Close confirmation">×</button><div class="velora-booking-success" role="status" tabindex="-1"><p class="velora-booking-eyebrow">Request ${escapeHTML(id.slice(0,8).toUpperCase())}</p><h2>Your next chapter.</h2><p>Your ${input.intent==='vacation'?'booking request':'property inquiry'} for <strong>${escapeHTML(item.name)}</strong> is saved on this device.</p>${estimate?`<p>${estimate.nights} nights · ${escapeHTML(input.guests)} guests · ${money(estimate.total)} illustrative estimate.</p>`:''}<p class="velora-booking-note">This is a fictional agency demonstration. No reservation, email or payment has been made.</p><a href="${base}collection/">Explore more places ↗</a></div>`;
    dialog.querySelector('.velora-dialog-close').addEventListener('click',()=>dialog.close());dialog.querySelector('.velora-booking-success').focus();
  });
  dialog.showModal();
}
