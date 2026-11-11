import {PersonalDailyTimer,ClockDailyValue,useClockDailyReport} from './ClockDailyTimer';
import React,{useEffect,useRef,useState} from 'react';
import {clockCall,ClockError,clockDate,clockMonth,clockMetrics,clockDuration,madridInput,type ClockState,type ClockStaff,type ClockShift,type ClockReport} from './timeclockApi';
import {clockWorkbook} from './clockWorkbook';
const button:React.CSSProperties={padding:'11px 16px',minHeight:44,border:'1px solid #B9955F',borderRadius:8,background:'#3E342C',color:'#FFF8EE',fontSize:14,cursor:'pointer'};
const primary:React.CSSProperties={...button,background:'#D6B77B',color:'#29231F'};
const field:React.CSSProperties={width:'100%',boxSizing:'border-box',padding:12,border:'1px solid #806340',borderRadius:8,background:'#221D19',color:'#FFF8EE',fontSize:16};
const actions:Record<string,string>={in:'Entrada',out:'Salida',pause:'Iniciar pausa',resume:'Terminar pausa',adjust:'Corrección'};
export const clockLinks={mobile:'https://lstudioana.es/?fichaje=1',salon:'https://lstudioana.es/?fichaje=1&modo=salon'};
const sessionKey='lst_timeclock:'+String(import.meta.env.VITE_SUPABASE_URL||'');
type ClockSession={token:string;expiresAt:string;mode:'mobile'|'salon';staff:ClockStaff};
function readSession():ClockSession|null{try{const value=JSON.parse(sessionStorage.getItem(sessionKey)||'null');return value?.mode==='mobile'&&/^[a-f0-9]{64}$/.test(value.token||'')&&Date.parse(value.expiresAt)>Date.now()?value:null;}catch{return null;}}
function keepSession(value:ClockSession|null){try{if(value?.mode==='mobile')sessionStorage.setItem(sessionKey,JSON.stringify(value));else sessionStorage.removeItem(sessionKey);}catch{}}
export function ClockPortal(){
 const shared=new URLSearchParams(window.location.search).get('modo')==='salon';
 const [session,setSession]=useState<ClockSession|null>(()=>shared?null:readSession()),[state,setState]=useState<ClockState|null>(null);
 const [code,setCode]=useState(()=>new URLSearchParams(window.location.search).get('codigo')||''),[pin,setPin]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState('');
 const pending=useRef<{requestId:string;action:string;version:number}|null>(null),lock=useRef(false),mounted=useRef(false);
 const refresh=async(current=session)=>{
  if(!current||lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const data=await clockCall<ClockState>('state',{},current.token);if(mounted.current){setState(data);pending.current=null;}}
  catch(value){if(mounted.current){setError(value instanceof Error?value.message:'No se pudo consultar el estado.');if(value instanceof ClockError&&value.status===401){keepSession(null);setSession(null);setState(null);}}}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 useEffect(()=>{mounted.current=true;const start=setTimeout(()=>void refresh(),0);return()=>{clearTimeout(start);mounted.current=false;};},[]);
 useEffect(()=>{if(!session)return;const update=()=>{if(document.visibilityState!=='hidden'&&!pending.current)void refresh(session);};const timer=setInterval(update,60000);window.addEventListener('focus',update);window.addEventListener('online',update);document.addEventListener('visibilitychange',update);return()=>{clearInterval(timer);window.removeEventListener('focus',update);window.removeEventListener('online',update);document.removeEventListener('visibilitychange',update);};},[session?.token]);
 const login=async(e:React.FormEvent)=>{
  e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');setReceipt('');
  try{const next=await clockCall<ClockSession>('auth',{code:code.trim().toUpperCase(),pin,mode:shared?'salon':'mobile'});setPin('');if(!mounted.current)return;setSession(next);keepSession(next);const data=await clockCall<ClockState>('state',{},next.token);if(mounted.current)setState(data);}
  catch(value){if(mounted.current){setPin('');setError(value instanceof Error?value.message:'No se pudo abrir el fichaje.');}}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 const leave=()=>{const old=session;keepSession(null);setSession(null);setState(null);setPin('');setCode('');pending.current=null;if(old)void clockCall('logout',{},old.token).catch(()=>{});};
 const punch=async(action:string,retry=false)=>{
  if(!session||!state||lock.current)return;
  if(!retry||!pending.current)pending.current={requestId:crypto.randomUUID(),action,version:state.staff.version||0};
  lock.current=true;setBusy(true);setError('');
  try{
   const result=await clockCall<ClockState>('punch',pending.current,session.token);if(!result.receipt)throw new Error('No llegó el justificante. Reintenta la misma solicitud.');
   if(!mounted.current)return;pending.current=null;
   setReceipt(`${state.staff.displayName} · ${actions[result.receipt.action]} registrada · ${clockDate(result.receipt.at)}`);
   if(shared){leave();}else setState(result);
  }catch(value){if(mounted.current)setError(value instanceof Error?value.message:'No se ha confirmado el fichaje. Reintenta o consulta el estado.');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 return <main style={{minHeight:'100dvh',background:'#29231F',color:'#FFF8EE',padding:20,boxSizing:'border-box'}}><div style={{maxWidth:720,margin:'20px auto',display:'grid',gap:18}}>
  <header><div style={{fontFamily:'Georgia,serif',fontSize:28,color:'#E4C687'}}>L’Studio Ana</div><h1 style={{fontSize:22,fontWeight:400}}>Fichajes de estilistas</h1><p style={{color:'#D6CBB8',fontSize:13}}>{shared?'Dispositivo del salón · Una identificación por fichaje':'Acceso personal · Entrada, salida y pausas'}</p></header>
  {receipt&&<p role="status" style={{border:'1px solid #B9955F',borderRadius:10,padding:16,color:'#E4C687'}}>{receipt}</p>}
  {error&&<p role="alert" style={{color:'#FFB4A9',lineHeight:1.6}}>{error}</p>}
  {!session?<form onSubmit={login} style={{display:'grid',gap:16}}><label>Código personal<input autoComplete="username" value={code} maxLength={11} onChange={e=>setCode(e.target.value.toUpperCase())} style={{...field,marginTop:8}} placeholder="LA-XXXXXXXX" required/></label><label>PIN personal de 6 cifras<input type="password" inputMode="numeric" autoComplete="current-password" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} style={{...field,marginTop:8}} required/></label><button type="submit" disabled={busy} style={primary}>{busy?'Comprobando…':'Entrar para fichar'}</button></form>:<>
   <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong style={{color:'#E4C687'}}>{state?.staff.displayName||session.staff.displayName}</strong><button type="button" style={button} disabled={busy} onClick={leave}>{shared?'Cambiar persona':'Cerrar sesión de fichajes'}</button></div>
   <button type="button" style={button} disabled={busy} onClick={()=>void refresh()}>Actualizar estado</button>
   {state&&<section style={{padding:18,border:'1px solid #806340',borderRadius:12,display:'grid',gap:14}}>
    <h2 style={{fontSize:18,margin:0,color:'#E4C687'}}>Tu jornada</h2>
    <PersonalDailyTimer token={session.token} state={state}/>
    <details><summary style={{cursor:'pointer',color:'#D6CBB8',fontSize:14}}>Ver horas y último registro</summary>
    {state.shift&&<p style={{fontSize:14}}>Entrada: {clockDate(state.shift.startedAt)}{state.shift.pauseStartedAt&&<> · Pausa desde {clockDate(state.shift.pauseStartedAt)}</>}</p>}
    {state.lastEvent&&<p style={{fontSize:13}}>Último registro: {actions[state.lastEvent.action]} · {clockDate(state.lastEvent.at)}</p>}
    </details>
    <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>{(!state.shift?['in']:state.shift.pauseStartedAt?['resume','out']:['pause','out']).map(action=><button key={action} type="button" style={primary} disabled={busy||!!pending.current} onClick={()=>void punch(action)}>{({in:'Iniciar jornada',pause:'Pausar',resume:'Reanudar',out:'Finalizar jornada'} as Record<string,string>)[action]}</button>)}</div>
    {pending.current&&<button type="button" style={button} disabled={busy} onClick={()=>void punch(pending.current!.action,true)}>Reintentar último fichaje</button>}
    <small style={{color:'#D6CBB8'}}>La confirmación y la hora proceden del servidor. Si cierras la jornada durante una pausa, esa pausa termina a la hora de salida.</small>
   </section>}
   {!shared&&state&&<details><summary style={{cursor:'pointer',color:'#E4C687',padding:'10px 0'}}>Historial y resumen mensual</summary><ClockReportView staff={[state.staff]} token={session.token}/></details>}
  </>}
  {!shared&&<a href="/" style={{color:'#E4C687',padding:12,textAlign:'center'}}>Volver al Studio</a>}
 </div></main>;
}
function WorkbookDownload({report}:{report:ClockReport}){
 const [file,setFile]=useState<{file:File;url:string}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let url='';try{const next=new File([clockWorkbook(report)],`LStudio-fichajes-${report.month}.xlsx`,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});url=URL.createObjectURL(next);setFile({file:next,url});}catch(value){setError(value instanceof Error?value.message:'No se pudo preparar Excel.');}return()=>{if(url)URL.revokeObjectURL(url);};},[report]);
 const save=async()=>{if(!file||busy)return;setBusy(true);setError('');try{const picker=(window as any).showSaveFilePicker;if(typeof picker==='function'){const handle=await picker.call(window,{suggestedName:file.file.name}),writer=await handle.createWritable();try{await writer.write(file.file);await writer.close();}catch(e){try{await writer.abort();}catch{}throw e;}}else if(navigator.canShare?.({files:[file.file]}))await navigator.share({files:[file.file],title:'Registro de jornada'});else setError('Usa el enlace Descargar Excel. Si estás en Bolt, abre la web publicada.');}catch(value){if(!(value instanceof Error&&value.name==='AbortError'))setError(value instanceof Error?value.message:'No se pudo guardar Excel.');}finally{setBusy(false);}};
 return <div>{file&&<div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button type="button" style={primary} disabled={busy} onClick={()=>void save()}>Guardar Excel</button><a style={{...button,textDecoration:'none'}} href={file.url} download={file.file.name} target="_blank" rel="noopener noreferrer">Descargar Excel</a></div>}{error&&<p role="alert">{error}</p>}</div>;
}
export function ClockReportView({staff,token,admin=false,onAdjust,refreshKey=0}:{staff:ClockStaff[];token?:string;admin?:boolean;onAdjust?:(shift:ClockShift)=>void;refreshKey?:number}){
 const [month,setMonth]=useState(clockMonth),[staffId,setStaffId]=useState(''),[report,setReport]=useState<ClockReport|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false),mounted=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const load=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const value=await clockCall<ClockReport>(admin?'report':'my-report',{month,...(admin?{staffId:staffId||null}:{})},token);if(mounted.current)setReport(value);}catch(value){if(mounted.current){setReport(null);setError(value instanceof Error?value.message:'No se pudo obtener el resumen.');}}finally{lock.current=false;if(mounted.current)setBusy(false);}};
 useEffect(()=>setReport(null),[refreshKey]);
 const totals=report?.shifts.map(s=>clockMetrics(s,report));
 return <section style={{borderTop:'1px solid #806340',paddingTop:18,display:'grid',gap:14}}><h3 style={{margin:0,color:'#E4C687'}}>{admin?'Resumen mensual':'Registro y resumen mensual'}</h3>
  <div style={{display:'flex',gap:12,flexWrap:'wrap'}}><label>Mes<input type="month" value={month} onChange={e=>{setMonth(e.target.value);setReport(null);}} style={{...field,marginTop:8}} disabled={busy}/></label>{admin&&<label>Estilista<select value={staffId} onChange={e=>{setStaffId(e.target.value);setReport(null);}} style={{...field,marginTop:8}} disabled={busy}><option value="">Todas</option>{staff.map(p=><option key={p.id} value={p.id}>{p.displayName}{p.active?'':' · Inactiva'}</option>)}</select></label>}<button type="button" style={admin?primary:button} disabled={busy||!month} onClick={()=>void load()}>{busy?'Consultando…':'Ver resumen'}</button></div>
  {error&&<p role="alert">{error}</p>}
  {report&&<>
   <p style={{fontSize:13,margin:0}}>{report.company.name} · {report.month} · Consulta: {clockDate(report.asOf)}</p>
   <p style={{fontSize:14,margin:0}}>Entre entrada y salida: {clockDuration(totals!.reduce((n,v)=>n+v.gross,0))} · Pausas: {clockDuration(totals!.reduce((n,v)=>n+v.pause,0))} · Fuera de pausa: {clockDuration(totals!.reduce((n,v)=>n+v.outsidePause,0))}</p>
   <small style={{color:'#D6CBB8'}}>Duraciones dentro del mes seleccionado, hasta la hora de consulta. Las pausas están desglosadas; su tratamiento retributivo depende de las condiciones aplicables. Revisa las jornadas abiertas y las correcciones.</small>
   <WorkbookDownload report={report}/>
   {report.shifts.length===0?<p>No hay jornadas registradas en este periodo.</p>:report.shifts.map(s=>{const v=clockMetrics(s,report);return <article key={s.id} style={{border:'1px solid #655039',borderRadius:9,padding:14,display:'grid',gap:8}}><strong>{s.staff_name}</strong><span>Entrada: {clockDate(s.started_at)}<br/>Salida: {clockDate(s.ended_at)}</span><small>Duración: {clockDuration(v.gross)} · Pausas: {clockDuration(v.pause)} · Fuera de pausa: {clockDuration(v.outsidePause)}{s.correction_count?' · Con correcciones':''}</small>{admin&&<button type="button" style={{...button,justifySelf:'start'}} onClick={()=>onAdjust?.(s)}>Corregir con motivo</button>}<details><summary style={{cursor:'pointer',color:'#E4C687'}}>Ver fichajes originales e historial</summary>{report.events.filter(e=>e.shiftId===s.id).map(e=><p key={e.id} style={{fontSize:12,lineHeight:1.6}}>{actions[e.action]||e.action} · {clockDate(e.at)} · {e.source} · {e.actor}{e.reason?' · Motivo: '+e.reason:''}</p>)}</details></article>;})}
  </>}
 </section>;
}

type AdminData={staff:ClockStaff[];settings:{employer_name:string;tax_id:string;work_center:string;revision:number};employees:{id:string;name:string;status:string}[]};
type EditShift={staffId:string;shiftId?:string;revision:number;startLocal:string;endLocal:string;pauses:{startLocal:string;endLocal:string}[];reason:string;requestId:string};
export function TimeClockAdmin(){
 const [data,setData]=useState<AdminData|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [name,setName]=useState(''),[employeeId,setEmployeeId]=useState(''),[credential,setCredential]=useState<{staff:ClockStaff;pin:string|null}|null>(null),[showPin,setShowPin]=useState(false);
 const [company,setCompany]=useState({name:'',taxId:'',center:''}),[editing,setEditing]=useState<EditShift|null>(null),[reportVersion,setReportVersion]=useState(0);
 const [dailyRefresh,setDailyRefresh]=useState(0);
 const daily=useClockDailyReport({admin:true,enabled:!!data,refreshKey:reportVersion+':'+dailyRefresh});
 const mounted=useRef(false),lock=useRef(false),creation=useRef<{requestId:string;name:string;employeeId:string}|null>(null),companyDirty=useRef(false);
 const load=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const value=await clockCall<AdminData>('admin');if(mounted.current){setData(value);setDailyRefresh(v=>v+1);if(!companyDirty.current)setCompany({name:value.settings.employer_name,taxId:value.settings.tax_id,center:value.settings.work_center});}}catch(value){if(mounted.current)setError(value instanceof Error?value.message:'No se pudo cargar Fichajes.');}finally{lock.current=false;if(mounted.current)setBusy(false);}};
 useEffect(()=>{mounted.current=true;const start=setTimeout(()=>void load(),0);return()=>{clearTimeout(start);mounted.current=false;};},[]);
 const mutate=async(action:string,body:unknown,success:(value:any)=>void)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');let done=false;
  try{const result=await clockCall<any>(action,body);if(mounted.current){success(result);done=true;}}
  catch(value){if(mounted.current)setError(value instanceof Error?value.message:'No se pudo confirmar la operación.');}
  finally{lock.current=false;if(mounted.current){setBusy(false);if(done)void load();}}
 };
 const create=(e:React.FormEvent)=>{e.preventDefault();if(!creation.current||creation.current.name!==name.trim()||creation.current.employeeId!==employeeId)creation.current={requestId:crypto.randomUUID(),name:name.trim(),employeeId};void mutate('create-staff',creation.current,value=>{setCredential(value);setShowPin(false);setName('');setEmployeeId('');creation.current=null;setNotice(value.pin?'Acceso creado. Entrega sus credenciales a la estilista.':'El acceso ya estaba creado. Restablece el PIN para obtener uno nuevo.');});};
 const access=(person:ClockStaff,reset=false)=>{if(!window.confirm(reset?'Se generará un PIN nuevo y se cerrarán sus sesiones de fichaje. ¿Continuar?':person.active?'Se desactivará su acceso, conservando el historial. ¿Continuar?':'¿Activar de nuevo este acceso?'))return;void mutate('access',{staffId:person.id,revision:person.credentialVersion,active:reset?person.active:!person.active,reset},value=>{if(value.pin){setCredential({staff:person,pin:value.pin});setShowPin(false);}setNotice('Acceso actualizado. El historial se conserva.');});};
 const edit=(shift?:ClockShift)=>setEditing({staffId:shift?.staff_id||data?.staff.find(p=>p.active)?.id||'',shiftId:shift?.id,revision:shift?.revision||0,startLocal:shift?madridInput(shift.started_at):'',endLocal:shift?.ended_at?madridInput(shift.ended_at):'',pauses:shift?[...shift.pauses.map(p=>({startLocal:madridInput(p.start),endLocal:madridInput(p.end)})),...(shift.pause_started_at?[{startLocal:madridInput(shift.pause_started_at),endLocal:''}]:[])]:[],reason:'',requestId:crypto.randomUUID()});
 const copy=async(value:string)=>{try{await navigator.clipboard.writeText(value);setNotice('Enlace copiado.');}catch{setNotice('Selecciona y copia la dirección del campo.');}};
 return <section style={{background:'#29231F',color:'#FFF8EE',padding:20,border:'1px solid #806340',borderRadius:12,display:'grid',gap:18}} aria-label="Fichajes de estilistas">
  <p style={{margin:0,lineHeight:1.6}}>Entradas, pausas y salidas desde el móvil o el salón.</p>
  <div><button type="button" style={button} disabled={busy} onClick={()=>void load()}>Actualizar personal</button></div>
  {error&&<p role="alert" style={{color:'#FFB4A9'}}>{error}</p>}<div role="status" aria-live="polite" style={{color:'#E4C687'}}>{notice}</div>

  {data&&<>
   {credential&&<section style={{padding:16,border:'1px solid #B9955F',borderRadius:10,display:'grid',gap:10}}><strong>{credential.staff.displayName}</strong><label>Código<input readOnly style={field} value={credential.staff.code}/></label>{credential.pin?<><label>PIN nuevo · entrégalo a su titular<input readOnly type={showPin?'text':'password'} style={field} value={credential.pin}/></label><button type="button" style={button} onClick={()=>setShowPin(!showPin)}>{showPin?'Ocultar PIN':'Mostrar PIN'}</button></>:<p>El acceso ya existe y su PIN no puede recuperarse. Usa Restablecer PIN.</p>}<button type="button" style={button} onClick={()=>{setCredential(null);setShowPin(false);}}>Cerrar credenciales</button></section>}
   <section aria-label="Personal de fichajes" style={{display:'grid',gap:12}}>
    <h3 style={{margin:0,color:'#E4C687',fontSize:17}}>Personal · {data.staff.length}</h3><p style={{margin:0,fontSize:13,color:'#D6CBB8'}}>Tiempo trabajado hoy · sin pausas · Actualización cada minuto</p>{daily.error&&<p role="status" style={{fontSize:13,color:'#F5C7B8',margin:0}}>Contadores sin actualizar. Se conserva la última consulta confirmada.</p>}
    {!data.staff.length&&<p style={{margin:0,color:'#D6CBB8',fontSize:14}}>Crea el primer acceso en Configuración.</p>}
    <style>{`.studio-clock-person {display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:10px 12px;border:1px solid #4B4035;border-radius:9px;} .studio-clock-person>details[open]{flex-basis:100%;}.studio-clock-person summary{cursor:pointer;color:#E4C687;font-size:13px;padding:10px 0;} @media(max-width:520px){.studio-clock-person>strong{flex-basis:45% !important;}}`}</style>
    {data.staff.map(p=><article key={p.id} className="studio-clock-person">
      <strong style={{fontSize:15,flex:'1 1 160px'}}>{p.displayName}</strong>
      <ClockDailyValue report={daily.report} staffId={p.id} now={daily.now} stale={daily.stale} compact/>
      {!p.active&&<small style={{color:'#F5C7B8'}}>Acceso desactivado</small>}
      {p.pinReady===false&&<small style={{color:'#E4C687'}}>Necesita un PIN nuevo</small>}
      <details><summary>Gestionar acceso</summary><div style={{display:'grid',gap:12,marginTop:10}}>
       <small style={{color:'#D6CBB8'}}>Código: {p.code} · {p.active?'Acceso activo':'Acceso desactivado'}</small>
       <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button type="button" style={button} disabled={busy} onClick={()=>access(p,true)}>Restablecer PIN</button><button type="button" style={button} disabled={busy} onClick={()=>access(p)}>{p.active?'Desactivar acceso':'Activar acceso'}</button></div>
      </div></details>
    </article>)}
   </section>
   <div><button type="button" style={button} disabled={busy||!data.staff.length} onClick={()=>edit()}>Añadir jornada olvidada</button></div>
   {editing&&<form onSubmit={e=>{e.preventDefault();void mutate('adjust',editing,()=>{setEditing(null);setReportVersion(v=>v+1);setNotice('Corrección registrada. Pulsa Ver resumen para consultar el resultado.');});}} style={{border:'1px solid #B9955F',borderRadius:10,padding:16,display:'grid',gap:12}}>
    <h4 style={{margin:0,color:'#E4C687'}}>{editing.shiftId?'Corregir jornada · Se conserva el original':'Añadir jornada no fichada'}</h4>
    <label>Estilista<select style={{...field,marginTop:8}} value={editing.staffId} disabled={!!editing.shiftId||busy} onChange={e=>setEditing({...editing,staffId:e.target.value,requestId:crypto.randomUUID()})}>{data.staff.map(p=><option key={p.id} value={p.id}>{p.displayName}</option>)}</select></label>
    <label>Entrada · Hora de Madrid<input type="datetime-local" step="1" style={{...field,marginTop:8}} value={editing.startLocal} required onChange={e=>setEditing({...editing,startLocal:e.target.value,requestId:crypto.randomUUID()})}/></label>
    <label>Salida · Hora de Madrid<input type="datetime-local" step="1" style={{...field,marginTop:8}} value={editing.endLocal} required onChange={e=>setEditing({...editing,endLocal:e.target.value,requestId:crypto.randomUUID()})}/></label>
    {editing.pauses.map((p,index)=><div key={index} style={{borderTop:'1px solid #655039',paddingTop:10,display:'grid',gap:8}}><label>Inicio pausa<input type="datetime-local" step="1" style={field} required value={p.startLocal} onChange={e=>setEditing({...editing,requestId:crypto.randomUUID(),pauses:editing.pauses.map((v,i)=>i===index?{...v,startLocal:e.target.value}:v)})}/></label><label>Fin pausa<input type="datetime-local" step="1" style={field} required value={p.endLocal} onChange={e=>setEditing({...editing,requestId:crypto.randomUUID(),pauses:editing.pauses.map((v,i)=>i===index?{...v,endLocal:e.target.value}:v)})}/></label><button type="button" style={button} onClick={()=>setEditing({...editing,requestId:crypto.randomUUID(),pauses:editing.pauses.filter((_,i)=>i!==index)})}>Quitar pausa de la corrección</button></div>)}
    <button type="button" style={button} disabled={editing.pauses.length>=20||busy} onClick={()=>setEditing({...editing,requestId:crypto.randomUUID(),pauses:[...editing.pauses,{startLocal:'',endLocal:''}]})}>Añadir pausa</button>
    <label>Motivo de la corrección<textarea style={{...field,marginTop:8}} rows={3} minLength={8} maxLength={1000} required value={editing.reason} onChange={e=>setEditing({...editing,reason:e.target.value,requestId:crypto.randomUUID()})}/></label>
    <small>La corrección guarda quién la registra, cuándo y el antes/después. Si estaba abierta, esta operación cierra la jornada. Los fichajes originales siguen en el historial de la estilista.</small>
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button type="submit" style={primary} disabled={busy||!editing.staffId||!editing.startLocal||!editing.endLocal||editing.reason.trim().length<8}>Guardar corrección con historial</button><button type="button" style={button} disabled={busy} onClick={()=>setEditing(null)}>Cancelar corrección</button></div>
   </form>}
   <ClockReportView staff={data.staff} admin onAdjust={edit} refreshKey={reportVersion}/>
  </>}
  <details style={{borderTop:'1px solid #4B4035',paddingTop:14}}><summary style={{cursor:'pointer',color:'#E4C687',fontSize:15,padding:'8px 0'}}>Configuración</summary><div style={{display:'grid',gap:16,marginTop:12}}>
  <details><summary style={{cursor:'pointer',color:'#E4C687'}}>Enlaces de fichaje · Móvil y salón</summary>{(['mobile','salon'] as const).map(mode=><div key={mode} style={{display:'grid',gap:8,marginTop:14}}><label>{mode==='mobile'?'Móvil personal':'Dispositivo compartido del salón'}<input readOnly style={{...field,marginTop:8,fontSize:13}} value={clockLinks[mode]} onFocus={e=>e.target.select()}/></label><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button type="button" style={button} onClick={()=>void copy(clockLinks[mode])}>Copiar enlace</button><a style={{...button,textDecoration:'none'}} href={clockLinks[mode]} target="_blank" rel="noopener noreferrer">Abrir fichajes ↗</a></div></div>)}<p style={{fontSize:13,lineHeight:1.6}}>El modo salón exige identificarse para cada fichaje y cierra el acceso tras confirmarlo. El móvil personal mantiene una sesión de hasta 12 horas en esa pestaña. Estos accesos solo permiten ver y registrar la jornada propia.</p></details>
  {data&&<>
   <details><summary style={{cursor:'pointer',color:'#E4C687'}}>Empresa y centro de trabajo del informe</summary><form style={{display:'grid',gap:12,marginTop:14}} onSubmit={e=>{e.preventDefault();void mutate('company',{...company,revision:data.settings.revision},()=>{companyDirty.current=false;setNotice('Datos del registro guardados.');});}}>{([{key:'name',label:'Titular / razón social'},{key:'taxId',label:'NIF'},{key:'center',label:'Centro de trabajo'}] as const).map(item=><label key={item.key}>{item.label}<input value={company[item.key]} style={{...field,marginTop:8}} disabled={busy} onChange={e=>{companyDirty.current=true;setCompany({...company,[item.key]:e.target.value});}}/></label>)}<button type="submit" style={primary} disabled={busy||!company.name.trim()}>Guardar datos del registro</button></form></details>
   <details><summary style={{cursor:'pointer',color:'#E4C687'}}>Crear acceso personal</summary><form onSubmit={create} style={{display:'grid',gap:12,marginTop:14}}><label>Nombre y apellidos<input style={{...field,marginTop:8}} value={name} maxLength={160} onChange={e=>setName(e.target.value)} required/></label><label>Vincular estilista de la agenda (opcional)<select style={{...field,marginTop:8}} value={employeeId} onChange={e=>setEmployeeId(e.target.value)}><option value="">Sin vinculación</option>{data.employees.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button type="submit" style={primary} disabled={busy||name.trim().length<2}>Crear código y PIN personal</button></form></details>

  </>}
  </div></details>
 </section>;
}

// lst-timeclock-compact-v1

// lst-clock-daily-timer-v1
