import React,{useEffect,useState} from 'react';
import {clockCall,clockDuration,type ClockReport,type ClockState} from './timeclockApi';
const madridFormat=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const madridParts=(instant:number)=>Object.fromEntries(madridFormat.formatToParts(new Date(instant)).map(p=>[p.type,p.value]));
let lastBounds:{day:string;start:number;end:number}|null=null;
export function clockMadridDay(instant:number){const p=madridParts(instant);return `${p.year}-${p.month}-${p.day}`;}
function madridMidnight(day:string){const target=Date.parse(day+'T00:00:00Z');let value=target;for(let i=0;i<3;i++){const p=madridParts(value);value+=target-Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);}return value;}
export function clockDailySummary(report:ClockReport,staffId:string,now:number){
 const day=clockMadridDay(now);if(lastBounds?.day!==day){const next=new Date(day+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);lastBounds={day,start:madridMidnight(day),end:madridMidnight(next.toISOString().slice(0,10))};}const {start,end}=lastBounds;
 let worked=0,pause=0;const shifts=report.shifts.filter(s=>s.staff_id===staffId);
 for(const shift of shifts){const from=Math.max(start,Date.parse(shift.started_at)),to=Math.min(now,end,shift.ended_at?Date.parse(shift.ended_at):now);if(to<=from)continue;
  const intervals=[...shift.pauses,...(shift.pause_started_at?[{start:shift.pause_started_at,end:shift.ended_at||new Date(now).toISOString()}]:[])].map(p=>({start:Math.max(from,Date.parse(p.start)),end:Math.min(to,Date.parse(p.end))})).filter(p=>p.end>p.start).sort((a,b)=>a.start-b.start);
  let paused=0,lastEnd=from;for(const p of intervals){paused+=Math.max(0,p.end-Math.max(p.start,lastEnd));lastEnd=Math.max(lastEnd,p.end);}pause+=paused;worked+=Math.max(0,to-from-paused);
 }
 const open=shifts.find(s=>!s.ended_at&&Date.parse(s.started_at)<=now);
 return {worked:Math.floor(worked/1000),pause:Math.floor(pause/1000),status:!open?'Fuera de jornada':open.pause_started_at?'En pausa':'Trabajando',day};
}
const perf=()=>performance.now();
export function useClockDailyReport({admin=false,token,enabled=true,refreshKey=''}:{admin?:boolean;token?:string;enabled?:boolean;refreshKey?:string}){
 const [snapshot,setSnapshot]=useState<{report:ClockReport;received:number;key:string}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[tick,setTick]=useState(0);
 useEffect(()=>{if(!enabled){setSnapshot(null);return;}let live=true,loading=false;
  const load=async()=>{if(!live||loading||document.visibilityState==='hidden')return;loading=true;setBusy(true);try{const p=madridParts(Date.now());let report=await clockCall<ClockReport>(admin?'report':'my-report',{month:`${p.year}-${p.month}`,...(admin?{staffId:null}:{})},token);
   if(Number.isFinite(Date.parse(report.asOf))){const serverMonth=clockMadridDay(Date.parse(report.asOf)).slice(0,7);if(report.month!==serverMonth)report=await clockCall<ClockReport>(admin?'report':'my-report',{month:serverMonth,...(admin?{staffId:null}:{})},token);}
   if(!Number.isFinite(Date.parse(report.asOf))||!Array.isArray(report.shifts)||report.shifts.some(s=>!Number.isFinite(Date.parse(s.started_at))||(s.ended_at&&!Number.isFinite(Date.parse(s.ended_at)))||(s.pause_started_at&&!Number.isFinite(Date.parse(s.pause_started_at)))||!Array.isArray(s.pauses)||s.pauses.some(p=>!Number.isFinite(Date.parse(p.start))||!Number.isFinite(Date.parse(p.end)))))throw new Error('No se pudo comprobar el contador.');
   if(live){setSnapshot({report,received:perf(),key:refreshKey});setError('');}
  }catch(value){if(live)setError(value instanceof Error?value.message:'No se pudo actualizar el contador.');}finally{loading=false;if(live)setBusy(false);}};
  const visible=()=>{if(document.visibilityState!=='hidden')void load();};const offline=()=>setError('Sin conexión. Mostrando la última consulta confirmada.');
  void load();const poll=setInterval(visible,60000),timer=setInterval(()=>{if(document.visibilityState!=='hidden')setTick(t=>t+1);},1000);
  window.addEventListener('focus',visible);window.addEventListener('online',visible);window.addEventListener('offline',offline);document.addEventListener('visibilitychange',visible);
  return()=>{live=false;clearInterval(poll);clearInterval(timer);window.removeEventListener('focus',visible);window.removeEventListener('online',visible);window.removeEventListener('offline',offline);document.removeEventListener('visibilitychange',visible);};
 },[admin,token,enabled,refreshKey]);
 const age=snapshot?Math.max(0,perf()-snapshot.received):0;
 const stale=!!error||age>90000;
 const now=snapshot?Date.parse(snapshot.report.asOf)+(stale?0:age):Date.now();
 const ready=!!snapshot&&snapshot.key===refreshKey;
 void tick;
 return {report:ready?snapshot!.report:null,now,stale,error,busy};
}
export function ClockDailyValue({report,staffId,now,stale=false,compact=false}:{report:ClockReport|null;staffId:string;now:number;stale?:boolean;compact?:boolean}){
 const value=report?clockDailySummary(report,staffId,now):null;
 return <div style={{display:'grid',gap:4}}><strong aria-label="Tiempo trabajado hoy" style={{fontSize:compact?20:32,fontVariantNumeric:'tabular-nums',color:'#E4C687',fontWeight:500}}>{value?clockDuration(value.worked):'—'}</strong><span style={{fontSize:13,color:value?.status==='Trabajando'?'#BDE1B8':'#D6CBB8'}}>{value?`${stale?'Último estado: ':''}${value.status}`:'Consultando jornada…'}</span></div>;
}
export function PersonalDailyTimer({token,state}:{token:string;state:ClockState}){
 const daily=useClockDailyReport({token,refreshKey:state.asOf});
 return <div><p style={{margin:'0 0 8px',fontSize:13,color:'#D6CBB8'}}>Tiempo trabajado hoy · sin pausas</p><ClockDailyValue report={daily.report} staffId={state.staff.id} now={daily.now} stale={daily.stale}/>{daily.error&&<p role="status" style={{fontSize:12,color:'#F5C7B8',margin:'8px 0 0'}}>Contador sin actualizar. Usa «Actualizar estado» para comprobarlo.</p>}</div>;
}
