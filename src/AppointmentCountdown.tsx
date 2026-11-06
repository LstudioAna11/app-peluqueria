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
export function countdownParts(start:number,now:number){const minutes=Math.max(0,Math.ceil((start-now)/60000));return [Math.floor(minutes/1440),Math.floor(minutes/60)%24,minutes%60];}
export function AppointmentCountdown({visits,onView,serviceName}:{visits:Visit[];onView:()=>void;serviceName:(id:string)=>string}){
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const schedule=()=>{if(timer)clearTimeout(timer);if(document.visibilityState==='hidden')return;setNow(Date.now());timer=setTimeout(schedule,Math.min(60000,60000-Date.now()%60000+30));};
  const wake=()=>schedule();schedule();document.addEventListener('visibilitychange',wake);window.addEventListener('focus',wake);
  return()=>{if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',wake);window.removeEventListener('focus',wake);};
 },[]);
 const next=nextCountdownVisit(visits,now);if(!next)return null;
 const {visit,start}=next,arrived=start<=now,pending=visit.saturdayApproval?.status==='pending'?'Pendiente de aprobación':visit.advancePayment?.status==='pending'?'Pendiente de Bizum':null;
 const values=countdownParts(start,now),labels=['Días','Horas','Minutos'];
 return <section aria-label="Cuenta atrás de tu cita" style={{background:'linear-gradient(135deg,#322A25,#221D19)',border:'1px solid #B9955F',borderRadius:14,padding:18,display:'grid',gap:14,color:'#FFF8EE'}}>
  <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><h3 style={{fontFamily:'Georgia,serif',fontSize:21,fontWeight:400,color:'#E4C687',margin:0}}>{arrived?'Es la hora de tu cita':'Tu momento en el Studio'}</h3>{pending&&<span style={{fontSize:11,color:'#E4C687'}}>{pending}</span>}</div>
  {!arrived&&<div aria-label={`Faltan ${values[0]} días, ${values[1]} horas y ${values[2]} minutos`} style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10}}>{values.map((value,index)=><div key={labels[index]} aria-hidden="true" style={{textAlign:'center',padding:'13px 4px',borderRadius:10,background:'rgba(228,198,135,.06)',border:'1px solid rgba(228,198,135,.18)'}}><strong style={{display:'block',fontSize:'clamp(25px,7vw,36px)',fontWeight:400,fontVariantNumeric:'tabular-nums',color:'#E4C687',lineHeight:1.2}}>{String(value).padStart(2,'0')}</strong><span style={{fontSize:11,color:'#D6CBB8'}}>{labels[index]}</span></div>)}</div>}
  <p style={{margin:0,fontSize:13,lineHeight:1.6}}>{new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',weekday:'long',day:'numeric',month:'long'}).format(new Date(start))} · {visit.time}<span style={{display:'block',color:'#D6CBB8',fontSize:12}}>Hora del salón · Madrid</span></p>
  <p style={{margin:0,fontSize:13,lineHeight:1.5,overflowWrap:'anywhere'}}>{serviceName(visit.id)}</p>
  {arrived?<p style={{margin:0,fontSize:12,color:'#D6CBB8'}}>Ha llegado la hora reservada. Si necesitas ayuda, contacta con el Studio.</p>:<button type="button" onClick={onView} style={{minHeight:44,padding:'10px 16px',borderRadius:8,border:'1px solid #B9955F',background:'transparent',color:'#E4C687',fontSize:13,cursor:'pointer'}}>Ver mi cita</button>}
 </section>;
}
