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
 const [platform,setPlatform]=useState<BookingPlatform>('google'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const mounted=useRef(false),lock=useRef(false),loadAbort=useRef<AbortController|null>(null),linkField=useRef<HTMLInputElement|null>(null);
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
  try{const next=await requestBookingLinks('save',draft);if(mounted.current){setSaved(next);setDraft(next);setNotice('Configuración guardada. Los enlaces conservan la misma dirección.');}}
  catch(value){if(mounted.current)setError(value instanceof Error?value.message:'No se pudo guardar.');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 const copy=async()=>{setNotice('');try{if(!navigator.clipboard?.writeText)throw new Error('clipboard');await navigator.clipboard.writeText(reservationLink(platform));setNotice('Enlace de '+names[platform]+' copiado.');}catch{linkField.current?.focus();linkField.current?.select();setNotice('Selecciona y copia el enlace del campo.');}};
 return <section style={{background:'#29231F',color:'#FFF8EE',padding:20,border:'1px solid #806340',borderRadius:12,display:'grid',gap:18}} aria-label="Enlaces de reserva">
  <h3 style={{fontFamily:'Georgia,serif',fontSize:26,fontWeight:400,color:'#E4C687',margin:0}}>Enlaces de reserva</h3>
  <p style={{lineHeight:1.6,margin:0}}>Comparte tu acceso en Google, Facebook e Instagram. Puedes pausarlo sin cambiar los enlaces de tus perfiles.</p>
  <div><button type="button" style={button} disabled={busy} onClick={()=>{if(!dirty||window.confirm('Al actualizar se descartarán los cambios que no has guardado. ¿Continuar?'))void load();}}>{busy?'Consultando / guardando…':'Actualizar'}</button></div>
  {error&&<p role="alert" style={{margin:0,color:'#FFB4A9'}}>{error}</p>}
  {draft&&<>
   <label style={{display:'flex',gap:10,alignItems:'center'}}><input type="checkbox" checked={draft.enabled} disabled={busy} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/> Activar acceso de reserva desde tus perfiles</label>
   <p style={{fontSize:13,margin:0,color:'#D6CBB8'}}>Estado guardado: {saved?.enabled?'activado':'pausado'}{dirty?' · Hay cambios pendientes de guardar':''}</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:24}}>
    <div style={{display:'grid',gap:16,alignContent:'start',minWidth:0}}>
     <label style={{display:'grid',gap:8}}>Texto del botón en tu página<input style={field} maxLength={60} value={draft.title} disabled={busy} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
     <label style={{display:'grid',gap:8}}>Mensaje cuando pauses el acceso<textarea style={field} rows={3} maxLength={240} value={draft.pausedMessage} disabled={busy} onChange={e=>setDraft({...draft,pausedMessage:e.target.value})}/></label>
     <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{(Object.keys(names) as BookingPlatform[]).map(key=><button key={key} type="button" aria-pressed={platform===key} style={platform===key?primary:button} onClick={()=>setPlatform(key)}>{names[key]}</button>)}</div>
     <label style={{display:'grid',gap:8}}>Enlace para {names[platform]}<input ref={linkField} style={{...field,fontSize:13}} readOnly value={reservationLink(platform)} onFocus={e=>e.target.select()}/></label>
     <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button type="button" style={primary} disabled={busy||!dirty||!draft.title.trim()||!draft.pausedMessage.trim()} onClick={()=>void save()}>Guardar configuración</button><button type="button" style={button} onClick={()=>void copy()}>Copiar enlace</button><a style={{...button,textDecoration:'none'}} href={reservationLink(platform)} target="_blank" rel="noopener noreferrer">Probar enlace ↗</a></div>
    </div>
    <div><p style={{fontSize:12,color:'#D6CBB8',marginTop:0}}>Vista previa de tus cambios</p><LinkPreview config={draft} onContinue={()=>setNotice('Vista previa: el enlace real se comprueba con «Probar enlace».')}/></div>
   </div>
   <div role="status" aria-live="polite">{notice}</div>
   <React.Suspense fallback={<p>Preparando el QR…</p>}><LazyReservationQr /></React.Suspense>
   <details><summary style={{cursor:'pointer',color:'#E4C687'}}>Dónde poner cada enlace</summary><div style={{fontSize:13,lineHeight:1.7,color:'#D6CBB8'}}><p><strong>Google:</strong> en el enlace de reservas de tu Perfil de Empresa, si tu perfil dispone de esa opción.</p><p><strong>Instagram:</strong> como enlace del perfil o en una historia con enlace.</p><p><strong>Facebook:</strong> como enlace de tu página, publicación fijada o botón que acepte una dirección web.</p><p>El botón nativo «Reservar» de las redes depende de las opciones de cada cuenta. Este apartado no publica ni cambia botones en esas plataformas. El texto que configuras aquí aparece en tu página.</p><p>Pausar este acceso afecta a nuevas entradas por estos enlaces. La app, las citas existentes y las reservas ya iniciadas mantienen su funcionamiento habitual.</p></div></details>
  </>}
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
