import React,{useEffect,useRef,useState} from 'react';
import {audienceCall,type AudienceCounts} from './appAudience';
type AccessItem={clientId:string;name:string;installed:boolean;browser:boolean;lastSeenAt:string|null;lastMode:'installed'|'browser'|null};
type AccessPage={page:number;pageSize:number;total:number;items:AccessItem[]};
const button:React.CSSProperties={minHeight:44,padding:'9px 14px',border:'1px solid #806340',borderRadius:7,background:'transparent',color:'#E4C687',cursor:'pointer',fontSize:14};
const date=(value:string)=>new Date(value).toLocaleString('es-ES',{timeZone:'Europe/Madrid',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
export default function ClientAccessStats(){
 const [open,setOpen]=useState(false),[counts,setCounts]=useState<AudienceCounts|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [namesOpen,setNamesOpen]=useState(false),[filter,setFilter]=useState('all'),[searchDraft,setSearchDraft]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(1),[version,setVersion]=useState(0);
 const [clients,setClients]=useState<AccessPage|null>(null),[clientsBusy,setClientsBusy]=useState(false),[clientsError,setClientsError]=useState('');
 const mounted=useRef(false),running=useRef(false),controller=useRef<AbortController|null>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[]);
 const load=async(reset=false)=>{
  if(running.current||reset&&(!counts||!Number.isSafeInteger(counts.resetRevision)))return;
  if(reset&&!window.confirm('¿Poner a cero el uso de la app y el navegador? Se borrarán los contadores actuales y este listado de accesos. No modifica fichas ni citas. Las próximas entradas volverán a registrarse.'))return;
  running.current=true;setBusy(true);setError('');setNotice('');const control=new AbortController();controller.current=control;const timeout=setTimeout(()=>control.abort(),12000);
  try{
   const value=await audienceCall<AudienceCounts>(reset?'reset':'stats',reset?{expectedRevision:counts!.resetRevision}:{},control.signal);
   if(value.metricVersion!==2||!Number.isSafeInteger(value.installed)||value.installed<0||!Number.isSafeInteger(value.browser)||value.browser<0)throw new Error('No se recibió un recuento válido.');
   if(mounted.current){setCounts(value);if(reset){setPage(1);setNotice(value.resetApplied?'Recuento reiniciado.':'El recuento había cambiado. Datos actualizados.');}setVersion(v=>v+1);}
  }catch(value){if(mounted.current)setError(reset?'No se pudo confirmar el reinicio. Pulsa Actualizar antes de reintentar.':value instanceof Error&&value.name==='AbortError'?'La consulta ha tardado demasiado.':value instanceof Error?value.message:'No se pudo consultar el uso.');}
  finally{clearTimeout(timeout);running.current=false;if(controller.current===control)controller.current=null;if(mounted.current)setBusy(false);}
 };
 useEffect(()=>{if(open)void load();},[open]);
 useEffect(()=>{
  if(!open||!namesOpen)return;
  let active=true;const control=new AbortController(),timeout=setTimeout(()=>control.abort(),12000);setClientsBusy(true);setClientsError('');setClients(null);
  void audienceCall<AccessPage>('clients',{filter,search,page},control.signal).then(value=>{
   if(!value||value.page!==page||value.pageSize!==20||!Number.isSafeInteger(value.total)||value.total<0||!Array.isArray(value.items)||value.items.length>20||value.items.some(row=>typeof row.clientId!=='string'||typeof row.name!=='string'||typeof row.installed!=='boolean'||typeof row.browser!=='boolean'||(!row.installed&&!row.browser)||(row.lastSeenAt!==null&&!Number.isFinite(Date.parse(row.lastSeenAt)))||(row.lastSeenAt===null)!==(row.lastMode===null)||![null,'installed','browser'].includes(row.lastMode)))throw new Error('No se recibió un listado válido.');
   if(active)setClients(value);
  }).catch(value=>{if(active)setClientsError(value instanceof Error&&value.name==='AbortError'?'La consulta ha tardado demasiado. Pulsa Actualizar.':value instanceof Error?value.message:'No se pudo consultar el listado.');}).finally(()=>{clearTimeout(timeout);if(active)setClientsBusy(false);});
  return()=>{active=false;clearTimeout(timeout);control.abort();};
 },[open,namesOpen,filter,search,page,version]);
 return <details onToggle={event=>setOpen(event.currentTarget.open)} style={{marginTop:16,padding:16,border:'1px solid #655039',borderRadius:12,background:'#29231F',color:'#FFF8EE'}}>
  <summary style={{cursor:'pointer',color:'#E4C687',fontSize:17}}>Uso de la app y del navegador</summary>
  {open&&<div style={{display:'grid',gap:16,marginTop:16}}>
   <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
    <div style={{flex:'1 1 180px'}}><span style={{fontSize:13,color:'#D6CBB8'}}>Clientas detectadas en app</span><strong style={{display:'block',fontSize:27,color:'#E4C687'}}>{counts?counts.installed.toLocaleString('es-ES'):'—'}</strong></div>
    <div style={{flex:'1 1 180px'}}><span style={{fontSize:13,color:'#D6CBB8'}}>Cargas desde navegador</span><strong style={{display:'block',fontSize:27,color:'#E4C687'}}>{counts?counts.browser.toLocaleString('es-ES'):'—'}</strong></div>
    <button type="button" style={button} disabled={busy} onClick={()=>void load()}>{busy?'Consultando…':'Actualizar'}</button>
   </div>
   {counts&&(counts.resetAt||counts.installedSince)&&<small style={{color:'#D6CBB8'}}>Inicio del recuento: {date((counts.resetAt||counts.installedSince)!)}</small>}
   {error&&<p role="alert" style={{color:'#FFB4A9',margin:0,fontSize:14}}>{error}</p>}
   {notice&&<p role="status" style={{color:'#BDE1B8',margin:0,fontSize:14}}>{notice}</p>}
   <details onToggle={event=>setNamesOpen(event.currentTarget.open)}><summary style={{cursor:'pointer',color:'#E4C687',fontSize:15}}>Ver clientas</summary>
    <div style={{display:'grid',gap:14,marginTop:14}}>
     <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{([{id:'all',label:'Todas'},{id:'installed',label:'App'},{id:'browser',label:'Navegador'},{id:'both',label:'Ambas'}]).map(option=><button type="button" key={option.id} aria-pressed={filter===option.id} onClick={()=>{setFilter(option.id);setPage(1);}} style={{...button,background:filter===option.id?'#C49A58':'transparent',color:filter===option.id?'#29231F':'#E4C687'}}>{option.label}</button>)}</div>
     <form onSubmit={event=>{event.preventDefault();setSearch(searchDraft.trim());setPage(1);}} style={{display:'flex',gap:8,flexWrap:'wrap'}}><input type="search" aria-label="Buscar clienta por nombre" maxLength={100} placeholder="Buscar clienta por nombre" value={searchDraft} onChange={event=>setSearchDraft(event.target.value)} style={{flex:'1 1 200px',minWidth:0,minHeight:44,padding:10,border:'1px solid #655039',borderRadius:7,background:'#322A25',color:'#FFF8EE',fontSize:14}}/><button type="submit" style={button}>Buscar</button></form>
     {clientsBusy&&<p role="status" style={{margin:0,color:'#D6CBB8',fontSize:14}}>Consultando clientas…</p>}
     {clientsError&&<p role="alert" style={{margin:0,color:'#FFB4A9',fontSize:14}}>{clientsError}</p>}
     {clients&&<>
      <small style={{color:'#D6CBB8'}}>{clients.total} {clients.total===1?'clienta':'clientas'} · Ambas muestra quienes tienen detectados los dos accesos.</small>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:14,textAlign:'left'}}><thead><tr>{['Clienta','Último acceso registrado','Acceso detectado'].map(label=><th key={label} style={{padding:'10px 8px',borderBottom:'1px solid #655039',color:'#E4C687',fontWeight:500}}>{label}</th>)}</tr></thead><tbody>{clients.items.map(row=><tr key={row.clientId}><td style={{padding:'12px 8px',borderBottom:'1px solid #4B4035'}}>{row.name}</td><td style={{padding:'12px 8px',borderBottom:'1px solid #4B4035',color:'#D6CBB8'}}>{row.lastSeenAt?<>{date(row.lastSeenAt)}<small style={{display:'block'}}>Último: {row.lastMode==='installed'?'App':'Navegador'}</small></>:'Esperando nueva apertura'}</td><td style={{padding:'12px 8px',borderBottom:'1px solid #4B4035'}}>{row.installed&&row.browser?'App y navegador':row.installed?'App':'Navegador'}</td></tr>)}</tbody></table></div>
      {!clients.items.length&&<p style={{margin:0,fontSize:14,color:'#D6CBB8'}}>No hay clientas en esta vista. Las nuevas entradas identificadas aparecerán aquí.</p>}
      {clients.total>20&&<nav aria-label="Páginas de accesos" style={{display:'flex',gap:10,alignItems:'center',justifyContent:'flex-end',flexWrap:'wrap'}}><button type="button" style={button} disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Anterior</button><span style={{fontSize:13}}>Página {page} de {Math.max(1,Math.ceil(clients.total/20))}</span><button type="button" style={button} disabled={page>=Math.ceil(clients.total/20)} onClick={()=>setPage(p=>p+1)}>Siguiente</button></nav>}
     </>}
    </div>
   </details>
   <details><summary style={{cursor:'pointer',color:'#D6CBB8',fontSize:14}}>Cómo se calcula</summary><div style={{fontSize:13,color:'#D6CBB8',lineHeight:1.6}}><p>Solo se identifican cuentas de clientas que han accedido al portal. App cuenta cuentas distintas detectadas en modo instalado; navegador conserva cargas agregadas de página, hasta 365 días desde el reinicio. Volver a una pestaña ya abierta actualiza la última entrada, sin sumar otra carga. Los accesos de administración no se registran.</p><p>Se conserva la primera y última detección por cuenta y modalidad hasta el reinicio, sin historial de cada visita, IP, identificadores de dispositivo ni tokens. Las reentradas se agrupan como máximo una vez por minuto. No es un indicador de presencia en línea ni detecta desinstalaciones.</p><p>Las cuentas instaladas detectadas antes de esta actualización se conservan, pero su última entrada se conocerá cuando vuelvan. No se reconstruyen visitas de navegador anteriores. Este bloque es independiente del periodo de citas elegido en el CRM.</p>
    {counts&&<p>Aperturas desde la app instalada: {(counts.installedAccesses||0).toLocaleString('es-ES')}.</p>}
    {counts?.legacy&&<p>Histórico anterior: {counts.legacy.installed} dispositivos en app y {counts.legacy.browser} desde navegador. Se conserva separado.</p>}
    {counts?.transition&&<p>Transición anterior: {counts.transition.installed} registros de app y {counts.transition.browser} de navegador, separados del recuento actual.</p>}
   </div></details>
   <details><summary style={{cursor:'pointer',color:'#D6CBB8',fontSize:14}}>Opciones del recuento</summary><div style={{marginTop:12}}><button type="button" style={button} disabled={busy||!counts||!Number.isSafeInteger(counts.resetRevision)} onClick={()=>void load(true)}>Poner a cero el uso y el listado</button><p style={{color:'#D6CBB8',fontSize:13}}>Borra las mediciones de ambas modalidades y este listado. Las fichas y las citas se conservan.</p></div></details>
  </div>}
 </details>;
}
