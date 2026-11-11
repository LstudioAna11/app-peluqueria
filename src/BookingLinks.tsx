import React,{useEffect,useRef,useState} from 'react';
import * as studioApi from './studioApi';
import {offlineConsultation} from './offlineSession';
export type BookingLinkConfig={enabled:boolean;title:string;pausedMessage:string;revision:number;logo?:string};
export type BookingPlatform='google'|'facebook'|'instagram';
export const reservationLink=(platform:BookingPlatform)=>'https://lstudioana.es/?reservar=1&origen='+platform;
export function isSocialBookingEntry(url=new URL(window.location.href)):boolean{
 return (url.searchParams.get('reservar')==='1'||url.pathname.replace(/\/+$/,'')==='/reservar')&&!['cita','opinion','notificacion'].some(key=>url.searchParams.has(key))&&!new URLSearchParams(url.hash.slice(1)).has('recuperar');
}
function parseConfig(value:any):BookingLinkConfig{
 if(typeof value?.enabled!=='boolean'||typeof value.title!=='string'||!value.title.trim()||value.title.length>60||typeof value.pausedMessage!=='string'||!value.pausedMessage.trim()||value.pausedMessage.length>240||!Number.isSafeInteger(value.revision)||value.revision<1)throw new Error('La configuración del enlace no está disponible.');
 return {enabled:value.enabled,title:value.title,pausedMessage:value.pausedMessage,revision:value.revision,logo:typeof value.logo==='string'?value.logo:undefined};
}
export async function requestBookingLinks(action:'public'|'status'|'save',body?:BookingLinkConfig,signal?:AbortSignal):Promise<BookingLinkConfig>{
 if(offlineConsultation())throw new Error('Necesitas conexión para consultar o cambiar el acceso de reserva.');
 const token=action==='public'?null:studioApi.currentToken();
 if(action!=='public'&&(!token||studioApi.storedRole()!=='admin'))throw new Error('Accede a la intranet.');
 const control=new AbortController(),abort=()=>control.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)control.abort();
 const timeout=setTimeout(abort,15000);
 try{
  const response=await fetch(String(import.meta.env.VITE_SUPABASE_URL)+'/functions/v1/studio-booking-links/'+action,{
   method:action==='public'?'GET':'POST',headers:{'Content-Type':'application/json',apikey:String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||''),...(token?{Authorization:'Bearer '+token}:{})},body:action==='public'?undefined:JSON.stringify(body||{}),signal:control.signal,cache:'no-store',
  });
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'No se pudo abrir el acceso de reserva.');
  if(token&&(studioApi.currentToken()!==token||studioApi.storedRole()!=='admin'))throw new Error('La sesión ha cambiado.');
  return parseConfig(data);
 }catch(error){if(error instanceof Error&&error.name==='AbortError')throw new Error('La conexión ha tardado demasiado. Vuelve a intentarlo.');throw error;}
 finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}
const button:React.CSSProperties={minHeight:44,padding:'10px 16px',border:'1px solid #B9955F',borderRadius:8,background:'#3E342C',color:'#FFF8EE',cursor:'pointer',fontSize:14};
const primary:React.CSSProperties={...button,background:'#D6B77B',color:'#29231F'};
const field:React.CSSProperties={width:'100%',boxSizing:'border-box',padding:12,border:'1px solid #806340',borderRadius:8,background:'#221D19',color:'#FFF8EE',fontSize:16};
const LazyReservationQr=React.lazy(()=>import('./ReservationQr'));
const names:Record<BookingPlatform,string>={google:'Google',facebook:'Facebook',instagram:'Instagram'};
function LinkPreview({config,onContinue,busy=false}:{config:BookingLinkConfig;onContinue?:()=>void;busy?:boolean}){
 return <div style={{textAlign:'center',padding:'24px 12px',background:'#322A25',borderRadius:12,color:'#FFF8EE'}}>
  {config.logo?<img src={config.logo} alt="L’Studio Ana" style={{width:90,height:90,objectFit:'contain'}} onError={e=>{e.currentTarget.style.display='none';}}/>:<div style={{fontFamily:'Georgia,serif',fontSize:42,color:'#D6B77B'}}>L’A</div>}
  <div style={{fontFamily:'Georgia,serif',fontSize:24,color:'#D6B77B',marginTop:8}}>L’Studio Ana</div><small style={{letterSpacing:3,color:'#D6CBB8'}}>HAIR EXPERIENCE</small>
  <h3 style={{fontFamily:'Georgia,serif',fontWeight:400,fontSize:28,margin:'30px 0 22px'}}>{config.enabled?'Tu próximo momento, para ti.':'Volvemos pronto'}</h3>
  {config.enabled?<><button type="button" style={primary} disabled={busy} onClick={onContinue}>{busy?'Comprobando…':config.title} {!busy&&'↗'}</button><p style={{fontSize:13,color:'#D6CBB8'}}>Accede al portal para elegir tus servicios.</p></>:<p style={{lineHeight:1.7,color:'#D6CBB8',overflowWrap:'anywhere',whiteSpace:'pre-wrap'}}>{config.pausedMessage}</p>}
 </div>;
}
export function BookingLinksPanel(){
 const [saved,setSaved]=useState<BookingLinkConfig|null>(null),[draft,setDraft]=useState<BookingLinkConfig|null>(null);
 const [qrOpen,setQrOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const mounted=useRef(false),lock=useRef(false),loadAbort=useRef<AbortController|null>(null),linkFields=useRef<Partial<Record<BookingPlatform,HTMLInputElement|null>>>({});
 const dirty=!!draft&&!!saved&&(draft.enabled!==saved.enabled||draft.title!==saved.title||draft.pausedMessage!==saved.pausedMessage);
 const load=async()=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');loadAbort.current=new AbortController();
  try{const next=await requestBookingLinks('status',undefined,loadAbort.current.signal);if(mounted.current){setSaved(next);setDraft(next);}}
  catch(value){if(mounted.current)setError(value instanceof Error?value.message:'No se pudieron cargar los enlaces.');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 useEffect(()=>{mounted.current=true;const start=setTimeout(()=>void load(),0);return()=>{clearTimeout(start);mounted.current=false;loadAbort.current?.abort();};},[]);
 const save=async()=>{
  if(lock.current||!draft)return;lock.current=true;setBusy(true);setError('');setNotice('');
  try{const next=await requestBookingLinks('save',draft);if(mounted.current){setSaved(next);setDraft(next);setNotice('Cambios guardados.');}}
  catch(value){if(mounted.current)setError(value instanceof Error?value.message:'No se pudo guardar.');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 const copy=async(platform:BookingPlatform)=>{setNotice('');try{if(!navigator.clipboard?.writeText)throw new Error('clipboard');await navigator.clipboard.writeText(reservationLink(platform));setNotice('Enlace de '+names[platform]+' copiado.');}catch{linkFields.current[platform]?.focus();linkFields.current[platform]?.select();setNotice('Selecciona y copia el enlace del campo.');}};
 return <section style={{background:'#29231F',color:'#FFF8EE',padding:18,border:'1px solid #4B4035',borderRadius:12,display:'grid',gap:16}} aria-label="Enlaces de reserva">
  <style>{`.studio-booking-link-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 0;border-top:1px solid #4B4035;}.studio-booking-link-row input{flex:1 1 200px;min-width:0;}.studio-booking-link-switch:focus-visible{outline:2px solid #E4C687;outline-offset:3px;}@media(prefers-reduced-motion:reduce){.studio-booking-link-switch span{transition:none !important;}}`}</style>
  <p style={{color:'#D6CBB8',fontSize:14,lineHeight:1.6,margin:0}}>Estos enlaces llevan al mismo portal y comparten disponibilidad.</p>
  {error&&<p role="alert" style={{margin:0,color:'#FFB4A9'}}>{error}</p>}
  {draft&&<>
   <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
    <button type="button" role="switch" className="studio-booking-link-switch" aria-label="Activar acceso desde los enlaces de reserva" aria-checked={draft.enabled} disabled={busy} onClick={()=>setDraft({...draft,enabled:!draft.enabled})} style={{width:60,height:44,padding:5,flexShrink:0,background:draft.enabled?'#C49A58':'#51483F',border:'1px solid #806340',borderRadius:24,cursor:busy?'default':'pointer'}}><span aria-hidden="true" style={{display:'block',width:30,height:30,borderRadius:'50%',background:draft.enabled?'#29231F':'#FFF8EE',transform:draft.enabled?'translateX(18px)':'translateX(0)',transition:'transform .15s ease'}}/></button>
    <div style={{flex:'1 1 160px'}}><strong style={{fontSize:16,color:draft.enabled?'#BDE1B8':'#E4C687'}}>{draft.enabled?'Acceso activo':'Acceso pausado'}</strong><p style={{fontSize:13,margin:'5px 0 0',color:'#D6CBB8'}}>{dirty?`Sin guardar · Estado actual: ${saved?.enabled?'activo':'pausado'}`:'Guardado'}</p></div>
   </div>
   <div aria-label="Enlaces por red social">{(Object.keys(names) as BookingPlatform[]).map(platform=><div key={platform} className="studio-booking-link-row">
    <strong style={{minWidth:90,fontSize:15}}>{names[platform]}</strong>
    <input ref={element=>{linkFields.current[platform]=element;}} aria-label={'Enlace para '+names[platform]} readOnly value={reservationLink(platform)} onFocus={e=>e.currentTarget.select()} style={{...field,fontSize:13}}/>
    <button type="button" style={button} onClick={()=>void copy(platform)} aria-label={'Copiar enlace de '+names[platform]}>Copiar enlace</button>
    <a style={{...button,textDecoration:'none',boxSizing:'border-box',display:'inline-flex',alignItems:'center'}} href={reservationLink(platform)} target="_blank" rel="noopener noreferrer" aria-label={'Probar enlace de '+names[platform]}>Probar ↗</a>
   </div>)}</div>
   <details><summary style={{cursor:'pointer',color:'#E4C687',padding:'10px 0',fontSize:15}}>Personalizar</summary>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:20,marginTop:12}}>
     <div style={{display:'grid',gap:14,alignContent:'start'}}>
      <label style={{display:'grid',gap:8,fontSize:14}}>Texto del botón<input style={field} maxLength={60} value={draft.title} disabled={busy} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
      <label style={{display:'grid',gap:8,fontSize:14}}>Mensaje de pausa<textarea style={field} rows={3} maxLength={240} value={draft.pausedMessage} disabled={busy} onChange={e=>setDraft({...draft,pausedMessage:e.target.value})}/></label>
     </div>
     <div><p style={{fontSize:13,color:'#D6CBB8',marginTop:0}}>Vista previa{dirty?' · Cambios sin guardar':''}</p><LinkPreview config={draft} onContinue={()=>setNotice('Vista previa: usa «Probar» para abrir el enlace real.')}/></div>
    </div>
   </details>
   <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
    <button type="button" style={primary} disabled={busy||!dirty||!draft.title.trim()||!draft.pausedMessage.trim()} onClick={()=>void save()}>{busy?'Guardando / consultando…':'Guardar cambios'}</button>
    <button type="button" style={button} disabled={busy} onClick={()=>{if(!dirty||window.confirm('Se descartarán los cambios sin guardar. ¿Actualizar?'))void load();}}>Actualizar</button>
   </div>
   <div role="status" aria-live="polite" style={{fontSize:13,color:'#D6CBB8'}}>{notice}</div>
   <details onToggle={event=>setQrOpen(event.currentTarget.open)}><summary style={{cursor:'pointer',color:'#E4C687',padding:'8px 0'}}>Código QR</summary>{qrOpen&&<React.Suspense fallback={<p>Preparando el QR…</p>}><LazyReservationQr/></React.Suspense>}</details>
   <details><summary style={{cursor:'pointer',color:'#D6CBB8',padding:'8px 0'}}>Ayuda</summary><div style={{fontSize:13,lineHeight:1.7,color:'#D6CBB8'}}>
    <p>Google: enlace de reservas del Perfil de Empresa. Instagram: enlace del perfil o historias. Facebook: enlace de la página o publicaciones. Las opciones disponibles dependen de cada cuenta.</p>
    <p>Los tres enlaces abren el mismo sistema de reservas. El origen no crea agendas independientes. Si otra clienta ocupa un hueco antes de confirmar, deberá elegirse otra hora.</p>
    <p>Las citas acordadas por mensajes o fuera del portal deben anotarse en la agenda. Este apartado no importa calendarios ni conecta botones nativos de las redes.</p>
    <p>Pausar estos enlaces afecta a nuevas entradas desde ellos. La app, las citas existentes y las reservas ya iniciadas mantienen su funcionamiento. El mantenimiento general se gestiona aparte.</p>
    <p>Guardar aquí aplica el acceso y la personalización de estos enlaces. No cambia tus perfiles automáticamente ni requiere el guardado general de Configuración.</p>
   </div></details>
  </>}
  {!draft&&<button type="button" style={button} disabled={busy} onClick={()=>void load()}>{busy?'Consultando…':'Reintentar'}</button>}
 </section>;
}

export function SocialBookingEntry({children}:{children:React.ReactNode}){
 const [entry,setEntry]=useState(isSocialBookingEntry),[config,setConfig]=useState<BookingLinkConfig|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const mounted=useRef(false),lock=useRef(false),control=useRef<AbortController|null>(null);
 const load=async(continueToPortal=false)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');control.current=new AbortController();
  try{
   const next=await requestBookingLinks('public',undefined,control.current.signal);if(!mounted.current)return;setConfig(next);
   if(continueToPortal&&next.enabled){
    const url=new URL(window.location.href);url.pathname='/';url.searchParams.delete('reservar');url.searchParams.delete('origen');url.searchParams.set('iniciarReserva','1');window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);setEntry(false);
   }
  }catch(value){if(mounted.current)setError(value instanceof Error?value.message:'No se pudo consultar el enlace.');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 useEffect(()=>{mounted.current=true;if(!entry)return()=>{mounted.current=false;};const start=setTimeout(()=>void load(),0);return()=>{clearTimeout(start);mounted.current=false;control.current?.abort();};},[entry]);
 if(!entry)return <>{children}</>;
 return <main style={{background:'#29231F',color:'#FFF8EE',minHeight:'100dvh',padding:20,boxSizing:'border-box',display:'grid',alignContent:'center'}}><div style={{width:'100%',maxWidth:520,margin:'0 auto',display:'grid',gap:16}}>
  {config&&<LinkPreview config={config} onContinue={()=>void load(true)} busy={busy}/>}
  {!config&&busy&&<p role="status">Preparando tu experiencia…</p>}
  {error&&<p role="alert" style={{color:'#FFB4A9',lineHeight:1.6}}>{error}</p>}
  {(error||!config)&&<button type="button" disabled={busy} style={button} onClick={()=>void load()}>Reintentar</button>}
  {config&&!config.enabled&&<button type="button" disabled={busy} style={button} onClick={()=>void load()}>Comprobar disponibilidad del acceso</button>}
  <a href="/" style={{textAlign:'center',color:'#E4C687',padding:12}}>Volver al Studio</a>
 </div></main>;
}

// lst-booking-links-compact-v1
