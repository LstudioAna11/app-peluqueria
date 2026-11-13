import React, {useEffect, useState} from 'react';

type Visit = {id:string;dateKey:string;time:string;durationMinutes?:number;completedAt?:string;lifecycleStatus?:string;saturdayApproval?:{status:string};advancePayment?:{status:string}};
// Appointments use the salon's Madrid wall time, regardless of the device's time zone.
export function visitInstant(dateKey:string,time:string):number {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)||!/^\d{2}:\d{2}$/.test(time))return NaN;
 const target=Date.parse(`${dateKey}T${time}:00Z`);if(!Number.isFinite(target))return NaN;
 let guess=target;
 for(let i=0;i<4;i++){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess)).map(v=>[v.type,v.value]));
  const adjustment=target-Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
  if(!adjustment)return guess;guess+=adjustment;
 }
 return NaN;
}
export function nextCountdownVisit(visits:Visit[],now:number){
 return visits.filter(v=>!v.completedAt&&!['cancelled','no_show'].includes(v.lifecycleStatus||'')&&v.saturdayApproval?.status!=='rejected')
  .map(visit=>({visit,start:visitInstant(visit.dateKey,visit.time)}))
  .filter(v=>Number.isFinite(v.start)&&v.start+Math.max(1,v.visit.durationMinutes||45)*60000>now)
  .sort((a,b)=>a.start-b.start)[0];
}
export function countdownParts(start:number,now:number){const seconds=Math.max(0,Math.ceil((start-now)/1000));return [Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];}
export function AppointmentCountdown({visits,onView,serviceName}:{visits:Visit[];onView:()=>void;serviceName:(id:string)=>string}){
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const schedule=()=>{if(timer)clearTimeout(timer);if(document.visibilityState==='hidden')return;setNow(Date.now());timer=setTimeout(schedule,Math.min(1000,1000-Date.now()%1000+15));};
  const wake=()=>schedule();schedule();document.addEventListener('visibilitychange',wake);window.addEventListener('focus',wake);
  return()=>{if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',wake);window.removeEventListener('focus',wake);};
 },[]);
 const next=nextCountdownVisit(visits,now);if(!next)return null;
 const {visit,start}=next,arrived=start<=now,pending=visit.saturdayApproval?.status==='pending'?'Pendiente de aprobación':visit.advancePayment?.status==='pending'?'Pendiente de Bizum':null;
 const values=countdownParts(start,now),services=serviceName(visit.id);
 return <section aria-label="Cuenta atrás de tu cita" style={{background:'#2D2621',border:'1px solid #806340',borderRadius:10,padding:'10px 12px',display:'grid',gap:5,color:'#FFF8EE'}}>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
   <div style={{minWidth:0}}>
    <h3 style={{fontFamily:'Georgia,serif',fontSize:15,fontWeight:400,color:'#E4C687',margin:'0 0 4px'}}>{arrived?'Es la hora de tu cita':'Tu momento en el Studio'}</h3>
    {!arrived&&<p aria-label={`Faltan ${values[0]} días, ${values[1]} horas, ${values[2]} minutos y ${values[3]} segundos`} style={{margin:0,fontSize:19,fontVariantNumeric:'tabular-nums',color:'#E4C687',lineHeight:1.3}}><span aria-hidden="true">{values[0]} <small style={{fontSize:12}}>d</small> · {String(values[1]).padStart(2,'0')} <small style={{fontSize:12}}>h</small> · {String(values[2]).padStart(2,'0')} <small style={{fontSize:12}}>min</small> · {String(values[3]).padStart(2,'0')} <small style={{fontSize:12}}>s</small></span></p>}
   </div>
   {!arrived&&<button type="button" onClick={onView} style={{flexShrink:0,minHeight:44,padding:'7px 10px',borderRadius:7,border:'1px solid #806340',background:'transparent',color:'#E4C687',fontSize:12,cursor:'pointer'}}>Ver mi cita</button>}
  </div>
  <p style={{margin:0,fontSize:12,lineHeight:1.4,color:'#D6CBB8'}}>{new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',day:'numeric',month:'short'}).format(new Date(start))} · {visit.time} <span style={{fontSize:11}}>(Elche)</span></p>
  {services&&<p title={services} style={{margin:0,fontSize:12,lineHeight:1.4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{services}</p>}
  {pending&&<span style={{fontSize:11,color:'#E4C687'}}>{pending}</span>}
 </section>;
}

// lst-countdown-live-seconds-v1
