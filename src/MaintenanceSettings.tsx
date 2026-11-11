import React,{useEffect,useRef,useState} from 'react';
import {maintenanceCall,type MaintenanceStatus,type MaintenanceMode} from './maintenanceApi';
import {readMaintenancePending,mutateMaintenanceAdmin} from './maintenanceAdminPending';
import {MaintenanceScreen} from './MaintenancePortal';

const button:React.CSSProperties={minHeight:44,padding:'9px 14px',border:'1px solid #947749',borderRadius:8,background:'transparent',color:'#E4C687',cursor:'pointer',fontSize:14};
const input:React.CSSProperties={display:'block',boxSizing:'border-box',width:'100%',minHeight:44,marginTop:6,padding:10,border:'1px solid #655039',borderRadius:8,background:'#29231F',color:'#FFF8EE',fontSize:14};
type Draft={mode:MaintenanceMode;message:string;until:string;revision:number};
const stateLabel=(mode:MaintenanceMode)=>mode==='off'?'Portal abierto':mode==='notice'?'Portal abierto con aviso':'Portal pausado';

export default function MaintenanceSettings(){
 const [data,setData]=useState<MaintenanceStatus|null>(null),[draft,setDraft]=useState<Draft|null>(null);
 const [busy,setBusy]=useState(false),[reading,setReading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[preview,setPreview]=useState(false);
 const [pending,setPending]=useState<ReturnType<typeof readMaintenancePending>>(null);
 const alive=useRef(true),lock=useRef(false),readLock=useRef(false);
 const check=()=>{try{setPending(readMaintenancePending());}catch(e){setError((e as Error).message);}};
 const load=async(reset=true)=>{
  if(readLock.current)return;
  readLock.current=true;if(alive.current)setReading(true);
  try{
   const status=await maintenanceCall<MaintenanceStatus>('status');
   if(alive.current){setData(status);if(reset)setDraft({mode:status.mode,message:status.message,until:status.untilLocal||'',revision:status.revision});}
  }catch(e){if(alive.current)setError((e as Error).message);}
  finally{readLock.current=false;if(alive.current){setReading(false);check();}}
 };
 useEffect(()=>{alive.current=true;check();void load();return()=>{alive.current=false;};},[]);
 const save=async(body:Record<string,unknown>,retry=false)=>{
  if(lock.current||readLock.current)return;
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{
   await mutateMaintenanceAdmin('save',body,retry,'Portal · '+(body.mode==='paused'?'Pausar':body.mode==='notice'?'Mostrar aviso':'Desactivar mantenimiento'));
   if(alive.current){setNotice('Estado confirmado en el servidor.');setPreview(false);await load();}
  }catch(e){if(alive.current)setError((e as Error).message);}
  finally{lock.current=false;if(alive.current){setBusy(false);check();}}
 };
 const blocked=busy||reading||!!pending;
 const dirty=!!data&&!!draft&&(data.mode!==draft.mode||data.message!==draft.message||(data.untilLocal||'')!==draft.until);
 return <section aria-label="Mantenimiento del portal" style={{display:'grid',gap:16,color:'#FFF8EE',background:'#29231F',padding:18,border:'1px solid #4B4035',borderRadius:12}}>
  <style>{`.studio-maintenance-simple button:focus-visible,.studio-maintenance-simple input:focus-visible,.studio-maintenance-simple textarea:focus-visible,.studio-maintenance-simple select:focus-visible,.studio-maintenance-simple summary:focus-visible{outline:2px solid #E4C687;outline-offset:3px;}.studio-maintenance-simple button:disabled{opacity:.55;cursor:default;}`}</style>
  <div className="studio-maintenance-simple" style={{display:'grid',gap:16}}>
   {data&&<div role="status" aria-live="polite" style={{padding:14,border:'1px solid #806340',borderRadius:9,display:'flex',gap:12,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}>
    <strong style={{fontSize:17,color:data.mode==='off'?'#BDE1B8':'#E4C687'}}>{stateLabel(data.mode)}</strong>
    {data.mode!=='off'&&<button type="button" style={{...button,background:'#C49A58',color:'#29231F',fontWeight:600}} disabled={blocked} onClick={()=>void save({mode:'off',message:data.message,until:data.untilLocal,revision:data.revision})}>Abrir portal</button>}
   </div>}
   {!data&&reading&&<p role="status" style={{margin:0,color:'#D6CBB8',fontSize:14}}>Consultando estado…</p>}
   {pending&&<div role="status" style={{padding:12,border:'1px solid #806340',borderRadius:8}}><p style={{margin:'0 0 10px',fontSize:14}}>Operación pendiente: {pending.summary||'Mantenimiento'}.</p><button type="button" style={button} disabled={busy||reading} onClick={()=>void save(pending.body,true)}>Comprobar o reintentar</button></div>}
   {error&&<p role="alert" style={{color:'#FFB4A9',margin:0,fontSize:14}}>{error}</p>}
   {notice&&<p role="status" style={{color:'#BDE1B8',margin:0,fontSize:14}}>{notice}</p>}
   {draft&&<form onSubmit={e=>{
    e.preventDefault();
    if(blocked||!dirty||!draft.message.trim())return;
    if(draft.mode==='paused'&&data?.mode!=='paused'&&!window.confirm('¿Pausar el portal? Se impedirán nuevas reservas y cambios de cita de las clientas. La intranet seguirá abierta.'))return;
    void save(draft);
   }}><fieldset disabled={blocked} style={{border:0,padding:0,margin:0,display:'grid',gap:16}}>
    <label style={{fontSize:14}}>Modo del portal<select style={input} value={draft.mode} onChange={e=>setDraft({...draft,mode:e.target.value as MaintenanceMode})}><option value="off">Abierto</option><option value="notice">Solo aviso</option><option value="paused">Pausado</option></select></label>
    <label style={{fontSize:14}}>Mensaje para las clientas<textarea style={input} required rows={3} maxLength={1000} value={draft.message} onChange={e=>setDraft({...draft,message:e.target.value})}/></label>
    <details><summary style={{cursor:'pointer',color:'#E4C687',fontSize:14,padding:'6px 0'}}>Más opciones</summary><div style={{display:'grid',gap:12,marginTop:12}}>
     <label style={{fontSize:14}}>Vuelta prevista · opcional<input style={input} type="datetime-local" value={draft.until} onChange={e=>setDraft({...draft,until:e.target.value})}/></label>
     <p style={{fontSize:13,lineHeight:1.6,color:'#D6CBB8',margin:0}}>Hora de Elche, orientativa. El portal se reabre manualmente.</p>
     <button type="button" style={{...button,justifySelf:'start'}} onClick={()=>setPreview(v=>!v)}>{preview?'Cerrar vista previa':'Vista previa'}</button>
     {preview&&<section aria-label="Vista previa de mantenimiento" style={{padding:12,border:'1px dashed #947749',borderRadius:10}}><p style={{fontSize:12,color:'#E4C687',marginTop:0}}>Vista previa · no aplica los cambios</p>{draft.mode==='off'?<p>El portal se muestra normalmente.</p>:<MaintenanceScreen preview data={{mode:draft.mode,message:draft.message,until:null,untilLocal:draft.until,revision:draft.revision,updatedAt:''}} forecast={draft.until?'Vuelta prevista: '+draft.until.slice(0,10).split('-').reverse().join('/')+' '+draft.until.slice(11)+' · hora de Elche (estimada)':undefined}/>}</section>}
    </div></details>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
     <button type="submit" disabled={!dirty||!draft.message.trim()} style={{...button,background:'#C49A58',color:'#29231F',fontWeight:600}}>{busy?'Guardando…':'Guardar cambios'}</button>
     <button type="button" style={button} onClick={()=>{if(!dirty||window.confirm('¿Descartar los cambios sin guardar y actualizar el estado?')){setError('');setNotice('');void load();}}}>Actualizar estado</button>
     {dirty&&<span style={{fontSize:13,color:'#D6CBB8'}}>Sin guardar</span>}
    </div>
   </fieldset></form>}
   {!draft&&!reading&&<button type="button" style={{...button,justifySelf:'start'}} disabled={busy} onClick={()=>{setError('');void load();}}>Reintentar consulta</button>}
   <details style={{borderTop:'1px solid #4B4035',paddingTop:12}}><summary style={{cursor:'pointer',color:'#D6CBB8',fontSize:14}}>Ayuda</summary><div style={{fontSize:13,color:'#D6CBB8',lineHeight:1.6}}>
    <p>Abierto permite usar el portal. Solo aviso muestra tu mensaje y permite reservar. Pausado bloquea nuevas reservas y cambios de cita de las clientas; la intranet sigue disponible.</p>
    <p>Los mensajes y la vuelta prevista son públicos. La hora indicada no abre el portal automáticamente. Al terminar, pulsa «Abrir portal».</p>
    <p>Las pestañas abiertas comprueban el estado al volver a la app o, mientras estén visibles, aproximadamente cada minuto. La protección del servidor bloquea las reservas al activar la pausa. Una operación ya admitida puede terminar.</p>
    <p>No cancela citas ni reprograma recordatorios. Los avisos y tareas programados del salón mantienen su funcionamiento. Si falla todo el alojamiento, esta pantalla tampoco puede cargarse.</p>
   </div></details>
  </div>
 </section>;
}
