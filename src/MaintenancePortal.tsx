import React,{useEffect,useRef,useState} from 'react';
import {maintenanceCall,isMaintenanceStatus,type MaintenanceStatus} from './maintenanceApi';
const button:React.CSSProperties={minHeight:44,padding:'9px 14px',border:'1px solid #947749',borderRadius:8,background:'transparent',color:'#E4C687',cursor:'pointer'};
export function MaintenanceScreen({data,onAdmin,onRetry,busy=false,preview=false,forecast}:{data:MaintenanceStatus;onAdmin?:()=>void;onRetry?:()=>void;busy?:boolean;preview?:boolean;forecast?:string}){
 const time=data.until?Date.parse(data.until):NaN;
 const estimate=forecast||(Number.isFinite(time)?time>Date.now()?'Vuelta prevista: '+new Date(time).toLocaleString('es-ES',{timeZone:'Europe/Madrid',dateStyle:'short',timeStyle:'short'})+' · hora de Elche (estimada)':'Seguimos trabajando en la actualización.':'' );
 if(data.mode==='notice')return <div role="status" style={{width:'100%',boxSizing:'border-box',padding:'12px 16px',border:'1px solid #B9955F',borderRadius:10,background:'#3B3023',color:'#FFF8EE',fontFamily:'inherit',lineHeight:1.6,marginBottom:12}}><strong style={{display:'block',color:'#E4C687'}}>Aviso del Studio</strong><span style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{data.message}</span>{estimate&&<small style={{display:'block',color:'#D6CBB8'}}>{estimate}</small>}</div>;
 return <div role={preview?'region':'main'} aria-label="Portal en mantenimiento" style={{minHeight:preview?0:'100dvh',boxSizing:'border-box',padding:preview?0:24,width:'100%',display:'grid',placeItems:'center',background:'#29231F',fontFamily:'Garet, Poppins, sans-serif',color:'#FFF8EE'}}><section role="status" style={{width:'100%',maxWidth:500,boxSizing:'border-box',padding:28,border:'1px solid #B9955F',borderRadius:16,background:'#322A25',textAlign:'center',display:'grid',gap:18}}><p style={{margin:0,fontSize:11,letterSpacing:2,color:'#E4C687'}}>L’STUDIO ANA</p><h1 style={{margin:0,fontFamily:'Georgia,serif',fontSize:27,fontWeight:400,color:'#EAD5B4',lineHeight:1.3}}>Estamos mejorando tu experiencia</h1><p style={{margin:0,fontSize:15,lineHeight:1.7,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{data.message}</p>{estimate&&<p style={{margin:0,fontSize:12,lineHeight:1.6,color:'#D6CBB8'}}>{estimate}</p>}{onRetry&&<button type="button" style={button} disabled={busy} onClick={onRetry}>{busy?'Comprobando…':'Comprobar si ya está disponible'}</button>}{onAdmin&&<button type="button" style={{...button,border:0,fontSize:12}} onClick={onAdmin}>Acceso al Studio</button>}</section></div>;
}
export default function MaintenancePortal({adminAccess,onAdmin,children}:{adminAccess:boolean;onAdmin:()=>void;children:React.ReactNode}){
 const [data,setData]=useState<MaintenanceStatus|null>(null),[busy,setBusy]=useState(false);const readRef=useRef<()=>void>(()=>{}),previousPaused=useRef(false);
 useEffect(()=>{
  if(adminAccess)return;
  let stopped=false,reading=false,timer:ReturnType<typeof setTimeout>|undefined,lastRead=0;
  const apply=(next:MaintenanceStatus)=>{if(stopped)return;if(previousPaused.current&&next.mode!=='paused'){window.location.reload();return;}previousPaused.current=next.mode==='paused';setData(next);};
  const read=async()=>{if(stopped||reading||document.hidden||!navigator.onLine)return;reading=true;setBusy(true);try{const result=await maintenanceCall<MaintenanceStatus>('status');apply(result);lastRead=Date.now();}catch{/* Keep the last confirmed public state; the booking API enforces the pause. */}finally{reading=false;if(!stopped)setBusy(false);}};
  const schedule=()=>{clearTimeout(timer);if(!stopped&&!document.hidden)timer=setTimeout(async()=>{await read();schedule();},60000);};
  const visible=()=>{if(!document.hidden)void read();schedule();},focus=()=>{if(Date.now()-lastRead>10000)void read();};
  const blocked=(event:Event)=>{const state=(event as CustomEvent).detail;if(isMaintenanceStatus(state))apply(state);};
  readRef.current=()=>void read();document.addEventListener('visibilitychange',visible);window.addEventListener('focus',focus);window.addEventListener('online',visible);window.addEventListener('lst-portal-maintenance',blocked);void read();schedule();
  return()=>{stopped=true;clearTimeout(timer);readRef.current=()=>{};document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',focus);window.removeEventListener('online',visible);window.removeEventListener('lst-portal-maintenance',blocked);};
 },[adminAccess]);
 if(!adminAccess&&data?.mode==='paused')return <MaintenanceScreen data={data} onAdmin={onAdmin} onRetry={()=>readRef.current()} busy={busy}/>;
 return <>{!adminAccess&&data?.mode==='notice'&&<MaintenanceScreen data={data}/>} {children}</>;
}
