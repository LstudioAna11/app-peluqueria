import {useEffect} from 'react';
import * as studioApi from './studioApi';
export type AudienceCounts={installed:number;browser:number;legacy?:{installed:number;browser:number;captured_at:string};transition?:{installed:number;browser:number};periodDays:number};
// Memoria de esta página únicamente: no cookies, UUID ni almacenamiento analítico.
const attempted=new Set<string>();
export async function audienceCall<T>(action:'register'|'stats',body:unknown={},signal?:AbortSignal):Promise<T>{
 const token=studioApi.currentToken(),role=action==='stats'?'admin':'client';
 if(!token||studioApi.storedRole()!==role)throw new Error('Accede con la cuenta correspondiente.');
 const response=await fetch(String(import.meta.env.VITE_SUPABASE_URL)+'/functions/v1/studio-app-metrics/'+action,{method:'POST',headers:{'Content-Type':'application/json',apikey:String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||''),Authorization:'Bearer '+token},body:JSON.stringify(body),signal:signal||AbortSignal.timeout(12000),cache:'no-store'});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo consultar el contador.');
 if(studioApi.currentToken()!==token||studioApi.storedRole()!==role)throw new Error('La sesión ha cambiado.');return data;
}
export function useAppAudience(screen:string){
 useEffect(()=>{
  const register=()=>{
   if(!studioApi.serverConfigured||studioApi.storedRole()!=='client'||!studioApi.currentToken()||['clientPin','clientRegistration','adminLogin','adminPanel'].includes(screen)||!navigator.onLine)return;
   const mode=window.matchMedia('(display-mode: standalone)').matches||(navigator as any).standalone===true?'installed':'browser';
   if(attempted.has(mode))return;attempted.add(mode);
   // No reintentar automáticamente: una respuesta perdida podría duplicar la cifra.
   void audienceCall('register',{accessMode:mode}).catch(()=>{});
  };
  // Retira referencias de los dos sistemas sustituidos, sin leer sus valores.
  try{
   const root=String(import.meta.env.VITE_SUPABASE_URL||'');
   for(const suffix of [':id',':ack:installed',':ack:browser'])localStorage.removeItem('lst_app_usage:'+root+suffix);
   for(const suffix of [':preference',':ack:installed',':ack:browser'])localStorage.removeItem('lst_usage_privacy:'+root+suffix);
  }catch{}
  const timer=setTimeout(register,0),mode=window.matchMedia('(display-mode: standalone)');
  mode.addEventListener?.('change',register);window.addEventListener('online',register);
  return()=>{clearTimeout(timer);mode.removeEventListener?.('change',register);window.removeEventListener('online',register);};
 },[screen]);
}
