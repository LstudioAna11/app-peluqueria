import {useEffect,useRef} from 'react';
import * as studioApi from './studioApi';
export const USAGE_EVENT='lst-usage-preference-changed';
const prefix='lst_usage_privacy:'+String(import.meta.env.VITE_SUPABASE_URL||'');
const prefKey=prefix+':preference';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
type Receipt={deviceId:string;receiptKey:string;version:number;revision:number;expiresAt:string};
export type UsagePreference=({state:'accepted'}&Receipt)|{state:'declined';expiresAt:string}|({state:'pending';allowed:boolean;requestId:string}&Receipt);
let memoryDeclined:UsagePreference|null=null;
export class UsageError extends Error{constructor(message:string,public status:number){super(message);}}
export function readUsagePreference():UsagePreference|null{
 try{
  const value=JSON.parse(localStorage.getItem(prefKey)||'null');if(!value)return memoryDeclined;
  if(!Number.isFinite(Date.parse(value.expiresAt))||Date.parse(value.expiresAt)<=Date.now()){localStorage.removeItem(prefKey);return null;}
  if(value.state==='declined')return value;
  if(!uuid.test(value.deviceId||'')||!/^[a-f0-9]{64}$/.test(value.receiptKey||'')||!Number.isSafeInteger(value.version)||!Number.isSafeInteger(value.revision))return null;
  if(value.state==='accepted'||value.state==='pending'&&typeof value.allowed==='boolean'&&uuid.test(value.requestId||''))return value;
  return null;
 }catch{return memoryDeclined;}
}
function announce(){window.dispatchEvent(new Event(USAGE_EVENT));}
function clearAcks(){try{for(const mode of ['installed','browser'])localStorage.removeItem(prefix+':ack:'+mode);}catch{}}
function writePreference(value:UsagePreference){
 try{localStorage.setItem(prefKey,JSON.stringify(value));if(localStorage.getItem(prefKey)!==JSON.stringify(value))throw new Error('storage');memoryDeclined=null;}
 catch{if(value.state!=='declined')throw new Error('Este navegador no permite guardar la elección. Las estadísticas seguirán desactivadas.');memoryDeclined=value;}
 clearAcks();announce();
}
function resetPreference(){try{localStorage.removeItem(prefKey);}catch{}memoryDeclined=null;clearAcks();announce();}
export async function usageCall<T>(action:string,body:unknown={}):Promise<T>{
 const token=studioApi.currentToken(),role=action==='stats'?'admin':'client';
 if(!token||studioApi.storedRole()!==role)throw new UsageError('Accede con la cuenta correspondiente.',401);
 if(!navigator.onLine)throw new UsageError('Sin conexión. Tu elección no se ha confirmado en el servidor.',0);
 const control=new AbortController(),timeout=setTimeout(()=>control.abort(),12000);
 try{
  const response=await fetch(String(import.meta.env.VITE_SUPABASE_URL)+'/functions/v1/studio-usage-privacy/'+action,{method:'POST',headers:{'Content-Type':'application/json',apikey:String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||''),Authorization:'Bearer '+token},body:JSON.stringify(body),cache:'no-store',signal:control.signal});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new UsageError(data.error||'No se pudieron confirmar las preferencias.',response.status);
  if(studioApi.currentToken()!==token||studioApi.storedRole()!==role)throw new UsageError('La sesión ha cambiado.',401);return data;
 }catch(e){if(e instanceof UsageError)throw e;throw new UsageError('No se pudo confirmar el resultado. Puedes reintentar.',0);}finally{clearTimeout(timeout);}
}
export async function retryUsageChoice():Promise<void>{
 const pending=readUsagePreference();if(pending?.state!=='pending')return;
 const result=await usageCall<{allowed:boolean;version:number;revision:number;expiresAt:string}>('choice',{deviceId:pending.deviceId,receiptKey:pending.receiptKey,requestId:pending.requestId,allowed:pending.allowed,version:pending.version,revision:pending.revision});
 const current=readUsagePreference();if(current?.state!=='pending'||current.requestId!==pending.requestId)return;
 if(result.allowed!==pending.allowed||result.version!==pending.version||!Number.isSafeInteger(result.revision)||Date.parse(result.expiresAt)<=Date.now())throw new Error('La confirmación de preferencias no es válida.');
 if(!pending.allowed)writePreference({state:'declined',expiresAt:result.expiresAt});
 else writePreference({state:'accepted',deviceId:pending.deviceId,receiptKey:pending.receiptKey,version:result.version,revision:result.revision,expiresAt:result.expiresAt});
}
export async function chooseUsage(allowed:boolean,version:number):Promise<void>{
 const old=readUsagePreference();
 if(old?.state==='pending'){if(old.allowed&&allowed&&old.version!==version){resetPreference();await chooseUsage(true,version);return;}if(old.allowed&&!allowed)writePreference({...old,allowed:false,requestId:crypto.randomUUID()});await retryUsageChoice();return;}
 if(!allowed&&old?.state!=='accepted'){
  writePreference({state:'declined',expiresAt:new Date(Date.now()+180*86400000).toISOString()});return;
 }
 const deviceId=old?.state==='accepted'?old.deviceId:crypto.randomUUID();
 const receiptKey=old?.state==='accepted'?old.receiptKey:Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('');
 writePreference({state:'pending',allowed,deviceId,receiptKey,version:allowed?version:old?.state==='accepted'?old.version:version,revision:old?.state==='accepted'?old.revision:0,requestId:crypto.randomUUID(),expiresAt:new Date(Date.now()+180*86400000).toISOString()});
 await retryUsageChoice();
}
export function usePrivateUsageRegistration(screen:string){
 const inFlight=useRef(false);
 useEffect(()=>{
  let stopped=false;
  const register=async()=>{
   if(stopped||inFlight.current||!studioApi.serverConfigured||studioApi.storedRole()!=='client'||['clientPin','clientRegistration','adminLogin','adminPanel'].includes(screen))return;
   let pref=readUsagePreference();if(!pref||pref.state==='declined')return;
   inFlight.current=true;
   try{
    if(pref.state==='pending'){await retryUsageChoice();pref=readUsagePreference();}
    if(!pref||pref.state!=='accepted'||stopped)return;
    const receipt=pref,mode=window.matchMedia('(display-mode: standalone)').matches||(window.navigator as any).standalone===true?'installed':'browser';
    try{const last=Number(localStorage.getItem(prefix+':ack:'+mode)||0);if(last>0&&Date.now()-last>=0&&Date.now()-last<86400000)return;}catch{return;}
    const result=await usageCall<{ok:boolean;requiresChoice?:boolean}>('register',{deviceId:receipt.deviceId,receiptKey:receipt.receiptKey,accessMode:mode});
    const current=readUsagePreference();if(stopped||current?.state!=='accepted'||current.deviceId!==receipt.deviceId||current.revision!==receipt.revision)return;
    if(result.ok){try{localStorage.setItem(prefix+':ack:'+mode,String(Date.now()));}catch{}}
    else if(result.requiresChoice)resetPreference();
   }catch{/* Optional statistics never block access or reservations; pending choices can be retried. */}
   finally{inFlight.current=false;}
  };
  // Remove identifiers from the previous automatic counter without reading or reusing their values.
  try{const old='lst_app_usage:'+String(import.meta.env.VITE_SUPABASE_URL||'');for(const suffix of [':id',':ack:installed',':ack:browser'])localStorage.removeItem(old+suffix);}catch{}
  const timer=setTimeout(()=>void register(),0),mode=window.matchMedia('(display-mode: standalone)');
  const changed=()=>void register();mode.addEventListener?.('change',changed);window.addEventListener('pageshow',changed);window.addEventListener('focus',changed);window.addEventListener(USAGE_EVENT,changed);window.addEventListener('storage',changed);
  return()=>{stopped=true;clearTimeout(timer);mode.removeEventListener?.('change',changed);window.removeEventListener('pageshow',changed);window.removeEventListener('focus',changed);window.removeEventListener(USAGE_EVENT,changed);window.removeEventListener('storage',changed);};
 },[screen]);
}
