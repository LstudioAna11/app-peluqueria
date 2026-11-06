import * as studioApi from './studioApi';
export class ClockError extends Error{constructor(message:string,public status:number){super(message);this.name='ClockError';}}
export type ClockStaff={id:string;code:string;displayName:string;active:boolean;credentialVersion?:number;version?:number;pinReady?:boolean};
export type ClockShift={id:string;staff_id:string;staff_name:string;original_start:string|null;original_end:string|null;started_at:string;ended_at:string|null;pause_started_at:string|null;pauses:{start:string;end:string}[];revision:number;correction_count:number};
export type ClockState={staff:ClockStaff;shift:{id:string;startedAt:string;pauseStartedAt:string|null;pauses:{start:string;end:string}[];revision:number}|null;asOf:string;lastEvent?:{action:string;at:string;source:string}|null;receipt?:{id:string;action:string;at:string}};
export type ClockReport={month:string;from:string;to:string;asOf:string;company:{name:string;taxId:string;center:string};staff:ClockStaff[];shifts:ClockShift[];events:{id:string;staffId:string;shiftId:string;action:string;at:string;source:string;actor:string;reason:string|null;payload:unknown}[]};
const adminActions=new Set(['admin','create-staff','access','company','report','adjust']);
export async function clockCall<T>(action:string,body:unknown={},clockToken?:string):Promise<T>{
 if(!navigator.onLine)throw new ClockError('Sin conexión. El fichaje no se confirma hasta que responda el servidor.',0);
 const owner=adminActions.has(action)?studioApi.currentToken():null;
 if(adminActions.has(action)&&(!owner||studioApi.storedRole()!=='admin'))throw new ClockError('Accede a la intranet.',401);
 const token=owner||clockToken;if(action!=='auth'&&!token)throw new ClockError('Identifícate para continuar.',401);
 const control=new AbortController(),timeout=setTimeout(()=>control.abort(),20000);
 try{
  const response=await fetch(String(import.meta.env.VITE_SUPABASE_URL)+'/functions/v1/studio-timeclock/'+action,{method:'POST',headers:{'Content-Type':'application/json',apikey:String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||''),...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),cache:'no-store',signal:control.signal});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new ClockError(data.error||'No se pudo confirmar la operación.',response.status);
  if(owner&&(studioApi.currentToken()!==owner||studioApi.storedRole()!=='admin'))throw new ClockError('La sesión ha cambiado.',401);return data;
 }catch(error){if(error instanceof ClockError)throw error;throw new ClockError('No se pudo confirmar la operación. Puedes reintentar con la misma solicitud o consultar el estado.',0);}
 finally{clearTimeout(timeout);}
}
export const clockMonth=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);
export function madridInput(value:string):string{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;}
export const clockDate=(value:string|null|undefined)=>value?new Date(value).toLocaleString('es-ES',{timeZone:'Europe/Madrid',hour12:false}):'Abierta';
export function clockMetrics(shift:ClockShift,report:Pick<ClockReport,'from'|'to'|'asOf'>){
 const start=Math.max(Date.parse(shift.started_at),Date.parse(report.from)),end=Math.min(Date.parse(shift.ended_at||report.asOf),Date.parse(report.to),Date.parse(report.asOf));
 const gross=Math.max(0,end-start);let pause=0;const intervals=[...shift.pauses,...(shift.pause_started_at?[{start:shift.pause_started_at,end:shift.ended_at||report.asOf}]:[])];
 for(const p of intervals)pause+=Math.max(0,Math.min(end,Date.parse(p.end))-Math.max(start,Date.parse(p.start)));pause=Math.min(pause,gross);
 return {gross:Math.floor(gross/1000),pause:Math.floor(pause/1000),outsidePause:Math.floor((gross-pause)/1000)};
}
export function clockDuration(seconds:number){const value=Math.max(0,Math.floor(seconds));return String(Math.floor(value/3600)).padStart(2,'0')+':'+String(Math.floor(value/60)%60).padStart(2,'0')+':'+String(value%60).padStart(2,'0');}
