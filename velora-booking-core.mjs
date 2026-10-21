export function nightCount(arrival,departure){
  const start=Date.parse(arrival+'T00:00:00Z'),end=Date.parse(departure+'T00:00:00Z');
  return Number.isFinite(start)&&Number.isFinite(end)?Math.round((end-start)/86400000):0;
}
export function estimateBooking(offer,arrival,departure){
  const nights=nightCount(arrival,departure);
  return offer?.kind==='vacation'&&nights>0?{nights,total:nights*offer.rate,currency:offer.currency}:null;
}
export function validateBooking(input,today){
  if(!input.name?.trim())return 'Please enter your name.';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email||''))return 'Please enter a valid email address.';
  if(!input.offer)return 'Please choose a place.';
  if(input.intent==='vacation'){
    if(!input.arrival||input.arrival<today)return 'Choose an arrival date today or later.';
    if(nightCount(input.arrival,input.departure)<1)return 'Departure must be after arrival.';
    if(nightCount(input.arrival,input.departure)>90)return 'For stays over 90 nights, contact our team using the inquiry page.';
    if(!Number.isInteger(Number(input.guests))||Number(input.guests)<1||Number(input.guests)>20)return 'Choose between 1 and 20 guests.';
  }
  return '';
}
