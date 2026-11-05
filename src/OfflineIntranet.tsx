import React, {useEffect, useState} from 'react';
import * as studioApi from './studioApi';
import {OFFLINE_EVENT, enterOfflineConsultation, offlineConsultation, offlineDataTimes} from './offlineSession';

type Snapshot = {owner:string; agendaAt:string; clientsAt:string; appointments:{id:string;date:string;time:string;name:string;services:string;duration:number;state:string}[]; clients:{name:string;phone:string;email:string}[]; blocks:{dateKey:string;time:string;durationMinutes:number;reason:string}[]};
let snapshot: Snapshot | null = null;
export function captureOfflineSnapshot(value: Omit<Snapshot,'owner'|'agendaAt'|'clientsAt'>) {
  if (offlineConsultation() || studioApi.storedRole() !== 'admin') return;
  const owner = studioApi.currentToken(); if (!owner) return;
  snapshot = {...value,owner,...offlineDataTimes()};
}
export function forgetOfflineSnapshot() {snapshot = null;}
const stamp = (date:string) => date ? new Date(date).toLocaleString('es-ES',{timeZone:'Europe/Madrid'}) : 'Sin actualización confirmada en esta sesión';
const today = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date());
const button:React.CSSProperties = {padding:'11px 16px',border:'1px solid #B9955F',borderRadius:8,background:'#3E342C',color:'#F3E7D5',cursor:'pointer'};

export function OfflineIntranet({children,unlocked,onLogout}:{children:React.ReactNode;unlocked:boolean;onLogout:()=>void}) {
  const [offline,setOffline] = useState(offlineConsultation);
  const [tab,setTab] = useState<'agenda'|'clients'>('agenda');
  const [date,setDate] = useState(today),[query,setQuery] = useState('');
  const [busy,setBusy] = useState(false),[error,setError] = useState('');
  const [connected,setConnected] = useState(navigator.onLine);
  useEffect(()=>{
    const changed=()=>{setOffline(offlineConsultation());setConnected(navigator.onLine);};
    window.addEventListener(OFFLINE_EVENT,changed);window.addEventListener('online',changed);window.addEventListener('offline',changed);
    return()=>{window.removeEventListener(OFFLINE_EVENT,changed);window.removeEventListener('online',changed);window.removeEventListener('offline',changed);};
  },[]);
  const active = unlocked && studioApi.storedRole()==='admin' && !!studioApi.currentToken();
  const data = snapshot?.owner === studioApi.currentToken() ? snapshot : null;
  const reconnect=async()=>{
    setBusy(true);setError('');
    const control=new AbortController(),timeout=setTimeout(()=>control.abort(),12000);
    const owner=studioApi.currentToken();
    try{
      const response=await fetch(String(import.meta.env.VITE_SUPABASE_URL)+'/functions/v1/studio-api/private-cache-key',{
        method:'POST',headers:{'Content-Type':'application/json',apikey:String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||''),Authorization:'Bearer '+owner},body:'{}',cache:'no-store',signal:control.signal,
      });
      if(!response.ok)throw new Error(response.status===401?'La sesión ha caducado. Cierra sesión y vuelve a entrar con conexión.':'La conexión con el servidor todavía no está disponible.');
      if(studioApi.currentToken()!==owner||studioApi.storedRole()!=='admin')throw new Error('La sesión ha cambiado.');
      window.location.reload();
    }catch(value){setError(value instanceof Error && value.name!=='AbortError'?value.message:'No se pudo conectar. Los datos de consulta siguen disponibles.');}
    finally{clearTimeout(timeout);setBusy(false);}
  };
  if(!active)return <>{children}</>;
  return <>
    {!offline && <div style={{background:'#29231F',color:'#E4C687',padding:'8px 16px',textAlign:'right'}}><button type="button" style={button} onClick={enterOfflineConsultation}>Consulta sin conexión</button></div>}
    <div hidden={offline} style={{display:offline?'none':undefined}}>{children}</div>
    {offline && <main style={{minHeight:'100vh',background:'#29231F',color:'#F3E7D5',padding:20,fontFamily:'Arial, sans-serif'}}>
      <div style={{maxWidth:900,margin:'0 auto',display:'grid',gap:16}}>
        <div role="status" style={{border:'1px solid #B9955F',borderRadius:12,padding:18}}><h1 style={{fontSize:24,margin:'0 0 10px',color:'#E4C687'}}>Intranet · Solo consulta</h1>
          <p>{connected?'Consulta local · Conexión pendiente de verificar':'Sin conexión · Consulta local'}</p>
          <p style={{fontSize:13}}>Agenda actualizada: {stamp(data?.agendaAt||'')}<br/>Contactos actualizados: {stamp(data?.clientsAt||'')}</p>
          <p>Solo se muestran los datos cargados en esta sesión. Las reservas, cambios, cobros, bonos y avisos requieren conexión.</p><p style={{fontSize:13}}>Al reconectar se recargará la app. Los cambios que no guardaste antes del corte no se confirman.</p>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button type="button" style={button} disabled={busy} onClick={()=>void reconnect()}>{busy?'Comprobando…':'Reconectar y actualizar'}</button><button type="button" style={button} onClick={onLogout}>Cerrar sesión</button></div>
          {error&&<p role="alert">{error}</p>}
        </div>
        {!data ? <p>No hay una captura de la agenda disponible en esta sesión. Conecta y abre la intranet para cargar los datos.</p> : <>
          <nav aria-label="Consulta local" style={{display:'flex',gap:10}}><button type="button" style={button} aria-pressed={tab==='agenda'} onClick={()=>setTab('agenda')}>Agenda</button><button type="button" style={button} aria-pressed={tab==='clients'} onClick={()=>setTab('clients')}>Contactos</button></nav>
          {tab==='agenda'?<>
            <label>Consultar día <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...button,marginLeft:10}}/></label>
            <p style={{fontSize:13}}>Las horas sin citas no confirman disponibilidad. Puede haber cambios que todavía no hayas recibido.</p>
            {data.blocks.filter(item=>item.dateKey===date).map((item,index)=><p key={'block'+index}>Bloqueo · {item.time} · {item.durationMinutes} min · {item.reason}</p>)}
            {data.appointments.filter(item=>item.date===date).sort((a,b)=>a.time.localeCompare(b.time)).map(item=><article key={item.id} style={{border:'1px solid #806340',borderRadius:10,padding:16}}><strong style={{color:'#E4C687'}}>{item.time} · {item.name}</strong><p>{item.services}</p><small>{item.duration} min · {item.state}</small></article>)}
            {!data.appointments.some(item=>item.date===date)&&<p>No hay citas cargadas para este día.</p>}
          </>:<>
            <label>Buscar contacto <input type="search" value={query} onChange={e=>setQuery(e.target.value)} style={{...button,width:'100%',boxSizing:'border-box',marginTop:8}}/></label>
            {data.clients.filter(item=>(item.name+' '+item.phone+' '+item.email).toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0,100).map((item,index)=><article key={index} style={{borderBottom:'1px solid #806340',padding:12}}><strong>{item.name}</strong><p>{item.phone} · {item.email}</p></article>)}
            <small>Hasta 100 resultados por búsqueda. No se incluyen PIN, notas internas ni fotografías.</small>
          </>}
        </>}
      </div>
    </main>}
  </>;
}
