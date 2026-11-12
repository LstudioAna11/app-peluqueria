import {useEffect,useRef,useState} from 'react';
import * as studioApi from './studioApi';
type Response={role?:string;clientId?:string;appointments?:Record<string,any>[]};
export function useClientAppointmentRefresh(enabled:boolean,clientId:string|undefined,onRows:(rows:Record<string,any>[])=>void){
 const apply=useRef(onRows);apply.current=onRows;
 const retry=useRef<()=>void>(()=>{}),[error,setError]=useState('');
 useEffect(()=>{
  if(!enabled||!clientId||!studioApi.serverConfigured||studioApi.storedRole()!=='client'){setError('');return;}
  const token=studioApi.currentToken();if(!token)return;
  let stopped=false,busy=false,last=0;
  const valid=()=>!stopped&&studioApi.currentToken()===token&&studioApi.storedRole()==='client';
  const refresh=async(force=false)=>{
   if(!valid()||busy||document.hidden||!navigator.onLine||(!force&&Date.now()-last<5000))return;
   busy=true;last=Date.now();
   try{const data=await studioApi.syncAll<Response>(token,['appointments']);if(!valid())return;if(data.role!=='client'||data.clientId!==clientId||!Array.isArray(data.appointments)||data.appointments.some(row=>row.client_id!==clientId))throw Error('No se ha podido verificar la sesión de tus citas.');apply.current(data.appointments);setError('');}
   catch{if(valid())setError('No se han podido actualizar tus citas. Comprueba la conexión y pulsa Reintentar.');}
   finally{busy=false;}
  };
  const wake=()=>{if(!document.hidden)void refresh();};
  retry.current=()=>void refresh(true);const timer=window.setInterval(wake,60000);
  window.addEventListener('focus',wake);window.addEventListener('online',wake);document.addEventListener('visibilitychange',wake);void refresh();
  return()=>{stopped=true;clearInterval(timer);retry.current=()=>{};window.removeEventListener('focus',wake);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake);};
 },[enabled,clientId]);
 return {error,retry:()=>retry.current()};
}
