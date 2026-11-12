import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ChevronDown,Sparkles} from 'lucide-react';
import * as studioApi from './studioApi';
import {prepareCatalogImage} from './catalogImage';
import {verifyCatalogPhotoUrl} from './catalogPhotoDrafts';
import {exactPrice} from './promotionPricing';
import {getBookingName} from './serviceNames';
import type {Appointment,BusinessConfig,CatalogCategory,ClientRecord,ServiceVariant,SubService} from './App';
import {voucherMoney,voucherToken,voucherServiceOptions,deleteTestVoucher,type VoucherServiceOption,type VoucherClientOption,type RepeatPortalDraft} from './portalFeatureData';
const LazyMemoriesClient=React.lazy(()=>import('./MemoriesClient'));
const DEFAULT_BRAND_LOGO='/studio-brand-default.webp';
const isActiveAppointment=(a:Appointment)=>a.lifecycleStatus!=='cancelled'&&a.lifecycleStatus!=='no_show';
export function privatePhotoExpiry(date:string):string|null{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const parsed=new Date(date+'T12:00:00Z');if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)return null;
 const [year,month,day]=date.split('-').map(Number),nextYear=year+1;
 const lastDay=new Date(Date.UTC(nextYear,month,0)).getUTCDate();
 return String(nextYear).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(Math.min(day,lastDay)).padStart(2,'0');
}
export function ClientPhotoGallery({clientId,editable=false}:{clientId?:string;editable?:boolean}){
  const [photos,setPhotos]=useState<studioApi.ClientPhoto[]>([]),[total,setTotal]=useState(0),[page,setPage]=useState(0);
  const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [file,setFile]=useState<File|null>(null),[takenOn,setTakenOn]=useState(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
  const [label,setLabel]=useState('seguimiento'),[note,setNote]=useState(''),[pendingDelete,setPendingDelete]=useState<string|null>(null),[selected,setSelected]=useState<studioApi.ClientPhoto|null>(null);
  const mounted=useRef(true),generation=useRef(0),locked=useRef(false),loadBusy=useRef(false),lastRenew=useRef(0),fileInput=useRef<HTMLInputElement|null>(null);
  const attempt=useRef<{file:File;signature:string;id:string;dataUrl:string}|null>(null);
  const canEdit=editable&&studioApi.storedRole()==='admin';
  const [opened,setOpened]=useState(!editable);
  const name=(value:string)=>value==='antes'?'Antes':value==='despues'?'Después':'Seguimiento';
  const load=async(target=page)=>{
    const run=++generation.current;loadBusy.current=true;setLoading(true);setError('');
    try{
      const token=studioApi.currentToken();if(!token)throw new Error('Inicia sesión para ver tus fotos.');
      if(editable&&!clientId)throw new Error('Guarda primero la ficha para añadir fotografías.');
      const result=await studioApi.fetchClientPhotos(token,clientId,target);
      if(!mounted.current||generation.current!==run)return;
      if(target>0&&!result.photos.length&&result.total>0){setPage(Math.max(0,target-1));return;}
      setPhotos(result.photos);setTotal(result.total);setPage(target);
    }catch(value){if(mounted.current&&generation.current===run){setPhotos([]);setSelected(null);setError(value instanceof Error?value.message:'No se pudo abrir la galería.');}}
    finally{if(mounted.current&&generation.current===run){loadBusy.current=false;setLoading(false);}}
  };
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
  useEffect(()=>{setSelected(null);if(opened)void load(page);},[opened,page,clientId]);
  const expired=(photo:studioApi.ClientPhoto)=>{
    if(Date.parse(photo.expiresAt)<=Date.now()&&!loadBusy.current&&!locked.current&&Date.now()-lastRenew.current>60000){lastRenew.current=Date.now();setSelected(null);void load(page);}
    else setError('No se pudo abrir una foto. Pulsa «Actualizar fotos» para volver a intentarlo.');
  };
  const upload=async(event:React.FormEvent)=>{
    event.preventDefault();if(locked.current)return;setError('');setMessage('');
    if(!canEdit||!clientId||!file){setError('Selecciona una foto y una ficha guardada.');return;}
    const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const expiry=privatePhotoExpiry(takenOn);
    if(!expiry||takenOn>today){setError('Revisa la fecha de toma de la fotografía. No puede ser futura.');return;}
    if(expiry<=today){setError('Esta fotografía ya cumple 12 meses desde su toma. Selecciona una foto más reciente para el seguimiento privado.');return;}
    locked.current=true;setBusy(true);
    try{
      const token=studioApi.currentToken();if(!token||studioApi.storedRole()!=='admin')throw new Error('Entra de nuevo en la intranet para subir la foto.');
      const signature=JSON.stringify([takenOn,label,note.trim()]);
      if(!attempt.current||attempt.current.file!==file||attempt.current.signature!==signature){
        setMessage('Optimizando la foto…');const prepared=await prepareCatalogImage(file,true);
        attempt.current={file,signature,id:crypto.randomUUID(),dataUrl:prepared.dataUrl};
      }
      if(!mounted.current)return;
      setMessage('Guardando en la ficha…');
      const result=await studioApi.uploadClientPhoto(token,{clientId,takenOn,label,note:note.trim(),dataUrl:attempt.current.dataUrl,requestId:attempt.current.id});
      if(!result.ok)throw new Error('No se confirmó el guardado. Conservamos la selección para reintentar.');
      if(!mounted.current)return;
      attempt.current=null;setFile(null);setNote('');if(fileInput.current)fileInput.current.value='';
      setSelected(null);setMessage('Foto guardada. Ya está disponible para la clienta en su portal.');await load(0);
    }catch(value){if(mounted.current){setMessage('');setError(value instanceof Error?value.message:'No se pudo guardar la foto.');}}
    finally{locked.current=false;if(mounted.current)setBusy(false);}
  };
  const remove=async(id:string)=>{
    if(locked.current||!canEdit||!clientId)return;locked.current=true;setBusy(true);setError('');setMessage('');
    try{
      const token=studioApi.currentToken();if(!token)throw new Error('Inicia sesión de nuevo.');
      const result=await studioApi.deleteClientPhoto(token,clientId,id);
      if(!result.ok)throw new Error('No se confirmó la eliminación.');
      if(!mounted.current)return;
      setPendingDelete(null);setSelected(null);setMessage(result.cleanupPending?'La foto se ha retirado de la ficha. La limpieza del archivo sigue pendiente; se reintentará en la siguiente gestión de fotos.':'Foto eliminada de la ficha y del portal.');await load(page);
    }catch(value){if(mounted.current)setError(value instanceof Error?value.message:'No se pudo eliminar la foto.');}
    finally{locked.current=false;if(mounted.current)setBusy(false);}
  };
  const input:React.CSSProperties={display:'block',width:'100%',boxSizing:'border-box',padding:10,marginTop:6,border:'1px solid #8C6A4B',borderRadius:6,background:'#29231F',color:'#FFF8EE',fontSize:13};
  const button:React.CSSProperties={padding:'10px 12px',minHeight:42,border:'1px solid #8C6A4B',borderRadius:6,background:'#29231F',color:'#E4C687',fontSize:12,cursor:busy?'wait':'pointer'};
  return <section style={{padding:14,border:'1px solid #655039',borderRadius:10,background:'#322A25',color:'#FFF8EE',minWidth:0}} aria-busy={busy||loading}>
    <button type="button" onClick={()=>setOpened(value=>!value)} disabled={busy} aria-expanded={opened} style={{background:'none',border:0,color:'#E4C687',padding:'4px 0',minHeight:36,fontSize:16,cursor:'pointer',textAlign:'left',width:'100%'}}>Galería de seguimiento <span aria-hidden="true">{opened?'▴':'▾'}</span></button>
    {opened&&<>
      <p style={{fontSize:12,lineHeight:1.6,color:'#D6CBB8',margin:'8px 0 12px'}}>{canEdit?'Estas fotos y sus notas serán visibles para esta clienta en su portal.':'Tus fotos de antes, después y seguimiento, añadidas por el Studio.'}</p>
      {canEdit&&<form onSubmit={upload} style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
        <label style={{fontSize:12}}>Foto<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event=>{setFile(event.target.files?.[0]||null);attempt.current=null;setError('');setMessage('');}} style={input}/></label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
          <label style={{fontSize:12}}>Fecha<input type="date" required disabled={busy} max={new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())} value={takenOn} onChange={event=>setTakenOn(event.target.value)} style={input}/></label>
          <label style={{fontSize:12}}>Tipo<select disabled={busy} value={label} onChange={event=>setLabel(event.target.value)} style={input}><option value="antes">Antes</option><option value="despues">Después</option><option value="seguimiento">Seguimiento</option></select></label>
        </div>
        <small style={{color:'#D6CBB8',fontSize:11}}>Conservación del seguimiento privado: máximo de 12 meses desde la toma de cada foto.</small>
        <label style={{fontSize:12}}>Nota visible a la clienta · opcional<textarea disabled={busy} maxLength={1000} rows={2} value={note} onChange={event=>setNote(event.target.value)} style={input}/></label>
        <button type="submit" disabled={busy||!file||!clientId} style={{...button,background:'#C99E52',color:'#29231F',fontWeight:600}}>{busy?'Guardando…':'Subir foto a la ficha'}</button>
      </form>}
      <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center',marginBottom:12}}><span style={{fontSize:12,color:'#D6CBB8'}}>{loading?'Cargando…':`${total} fotos`}</span><button type="button" disabled={busy||loading} onClick={()=>{setSelected(null);void load(page);}} style={button}>Actualizar fotos</button></div>
      {message&&<p role="status" aria-live="polite" style={{fontSize:12,color:'#E4C687',lineHeight:1.6}}>{message}</p>}
      {error&&<p role="alert" style={{fontSize:12,color:'#FFB4A9',lineHeight:1.6}}>{error}</p>}
      {!loading&&!photos.length&&!error&&<p style={{fontSize:13,color:'#D6CBB8'}}>Todavía no hay fotos de seguimiento.</p>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12}}>
        {photos.map(photo=><article key={photo.id} style={{minWidth:0,border:'1px solid #655039',borderRadius:8,overflow:'hidden',background:'#29231F'}}>
          <button type="button" onClick={()=>setSelected(photo)} style={{display:'block',width:'100%',padding:0,border:0,background:'none',cursor:'pointer'}} aria-label={'Ampliar foto: '+name(photo.label)}><img src={photo.url} alt={name(photo.label)+' · '+photo.taken_on} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>expired(photo)} style={{display:'block',width:'100%',height:180,objectFit:'cover'}}/></button>
          <div style={{padding:10,fontSize:12,lineHeight:1.6}}><strong style={{color:'#E4C687'}}>{name(photo.label)}</strong><br/>{photo.taken_on.split('-').reverse().join('/')}{photo.note&&<p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',margin:'6px 0'}}>{photo.note}</p>}
            {canEdit&&(pendingDelete===photo.id?<div role="group" aria-label="Confirmar eliminación"><p>¿Eliminarla de ambos sitios?</p><button type="button" disabled={busy} onClick={()=>void remove(photo.id)} style={button}>Sí, eliminar</button> <button type="button" disabled={busy} onClick={()=>setPendingDelete(null)} style={button}>Volver</button></div>:<button type="button" disabled={busy} onClick={()=>setPendingDelete(photo.id)} style={{...button,color:'#FFC4B5',marginTop:8}}>Eliminar foto</button>)}
          </div>
        </article>)}
      </div>
      {total>12&&<div style={{display:'flex',gap:10,alignItems:'center',justifyContent:'center',marginTop:14}}><button type="button" disabled={busy||loading||page===0} onClick={()=>setPage(value=>value-1)} style={button}>Anterior</button><span style={{fontSize:12}}>{page+1} / {Math.ceil(total/12)}</span><button type="button" disabled={busy||loading||(page+1)*12>=total} onClick={()=>setPage(value=>value+1)} style={button}>Siguiente</button></div>}
      {selected&&<div role="dialog" aria-modal="true" aria-label="Foto de seguimiento" style={{position:'fixed',inset:0,zIndex:8000,background:'rgba(10,8,6,.96)',overflowY:'auto',padding:20,boxSizing:'border-box',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}><button type="button" onClick={()=>setSelected(null)} style={{...button,alignSelf:'flex-end'}}>Cerrar foto</button><img src={selected.url} alt={name(selected.label)} referrerPolicy="no-referrer" onError={()=>expired(selected)} style={{maxWidth:'100%',maxHeight:'75vh',objectFit:'contain'}}/><p style={{maxWidth:650,fontSize:13,whiteSpace:'pre-wrap',lineHeight:1.7}}>{name(selected.label)} · {selected.taken_on.split('-').reverse().join('/')}<br/>{selected.note}</p></div>}
    </>}
  </section>;
}

const NEWS_CATEGORIES:Record<string,string>={servicios:'Nuevos servicios',cuidados:'Cuidados e inspiración',studio:'Vida en L’Studio',avisos:'Avisos del estudio'};
type NewsOption={id:string;label:string};
const newsToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const newsDate=(date:string)=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(date.slice(0,10)+'T12:00:00Z'));
function newsState(item:studioApi.StudioNewsSummary){return item.status==='draft'?'Borrador':item.start_date&&item.start_date>newsToday()?'Programada':item.end_date&&item.end_date<newsToday()?'Finalizada':'Publicada';}
const emptyNews=():studioApi.StudioNews=>({id:crypto.randomUUID(),title:'',summary:'',body:'',category:'studio',image_url:'',status:'draft',start_date:null,end_date:null,action:'none',service_id:null,created_at:'',updated_at:''});
export function StudioNews({admin=false,serviceOptions=[],onService,promotionCards}:{admin?:boolean;serviceOptions?:NewsOption[];onService?:(id:string,action:'service'|'booking')=>void;promotionCards?:React.ReactNode}){
  const [view,setView]=useState<'latest'|'list'|'detail'>(admin?'list':'latest');
  const [page,setPage]=useState(0),[list,setList]=useState<studioApi.StudioNewsPage|null>(null),[detail,setDetail]=useState<studioApi.StudioNews|null>(null);
  const [draft,setDraft]=useState<studioApi.StudioNews|null>(null),[preview,setPreview]=useState(false),[deleting,setDeleting]=useState<string|null>(null);
  const [busy,setBusy]=useState(false),[writing,setWriting]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const mounted=useRef(false),generation=useRef(0),writeLock=useRef(false),photoLock=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
  const token=()=>{const t=studioApi.currentToken();if(!t)throw new Error('Vuelve a iniciar sesión para consultar las novedades.');return t;};
  const report=(value:unknown)=>setError(value instanceof Error?value.message:'No se pudo completar la operación.');
  const load=async()=>{
    const request=++generation.current;setBusy(true);setError('');
    try{const data=await studioApi.fetchNews(token(),page,!admin&&view==='latest');if(mounted.current&&request===generation.current)setList(data);}
    catch(e){if(mounted.current&&request===generation.current)report(e);}
    finally{if(mounted.current&&request===generation.current)setBusy(false);}
  };
  useEffect(()=>{if(view!=='detail')void load();},[admin,page,view]);
  // Refresh when returning to the app; no polling or background downloads.
  useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible'&&view!=='detail'&&!writeLock.current&&!photoLock.current)void load();};document.addEventListener('visibilitychange',refresh);return()=>document.removeEventListener('visibilitychange',refresh);},[admin,page,view]);
  const open=async(id:string,editing=false)=>{
    if(writeLock.current||photoLock.current)return;const request=++generation.current;setBusy(true);setError('');setMessage('');
    try{const {item}=await studioApi.fetchNewsDetail(token(),id);if(!mounted.current||request!==generation.current)return;if(editing){setDraft(item);setPreview(false);setDeleting(null);}else{setDetail(item);setView('detail');}}
    catch(e){if(mounted.current&&request===generation.current)report(e);}
    finally{if(mounted.current&&request===generation.current)setBusy(false);}
  };
  const change=(patch:Partial<studioApi.StudioNews>)=>setDraft(current=>current?{...current,...patch}:current);
  const save=async(event:React.FormEvent)=>{
    event.preventDefault();if(!draft||writeLock.current||photoLock.current)return;writeLock.current=true;setWriting(true);setError('');setMessage('');
    try{const {item}=await studioApi.saveNews(token(),draft);if(!mounted.current)return;setDraft(item);setMessage(item.status==='draft'?'Borrador guardado. Solo se ve en intranet.':newsState(item)==='Programada'?'Publicación programada. Aparecerá en la fecha indicada.':newsState(item)==='Finalizada'?'Guardada fuera de las fechas de publicación. No se muestra en el portal.':'Publicación guardada. Ya está disponible en el portal.');await load();}
    catch(e){if(mounted.current)report(e);}
    finally{writeLock.current=false;if(mounted.current)setWriting(false);}
  };
  const remove=async(item:studioApi.StudioNewsSummary)=>{
    if(writeLock.current||photoLock.current)return;writeLock.current=true;setWriting(true);setError('');setMessage('');
    try{await studioApi.deleteNews(token(),item.id,item.updated_at);if(!mounted.current)return;if(draft?.id===item.id)setDraft(null);setDeleting(null);setMessage('Publicación eliminada.');if(page>0&&list?.items.length===1)setPage(p=>p-1);else await load();}
    catch(e){if(mounted.current)report(e);}
    finally{writeLock.current=false;if(mounted.current)setWriting(false);}
  };
  const upload=async(file:File|undefined)=>{
    if(!file||!draft||writeLock.current||photoLock.current)return;photoLock.current=true;setUploading(true);setError('');setMessage('');const id=draft.id;
    try{const prepared=await prepareCatalogImage(file,true);const result=await studioApi.uploadServiceImage(token(),prepared.dataUrl);await verifyCatalogPhotoUrl(result.url);if(mounted.current){setDraft(current=>current?.id===id?{...current,image_url:result.url}:current);setMessage('Foto preparada. Guarda la publicación para conservarla.');}}
    catch(e){if(mounted.current)report(e);}
    finally{photoLock.current=false;if(mounted.current)setUploading(false);}
  };
  const article=(item:studioApi.StudioNews,forPreview=false)=><article className="lst-news-article">
    {item.image_url&&<img src={item.image_url} alt={item.title} loading="lazy" decoding="async" className="lst-news-cover"/>}
    <div className="lst-news-inner"><small>{NEWS_CATEGORIES[item.category]}</small><h3>{item.title||'Título de la novedad'}</h3><p className="lst-news-lead">{item.summary}</p><p className="lst-news-body">{item.body||'Aquí aparecerá el texto completo.'}</p>
      {item.action!=='none'&&item.service_id&&(forPreview||serviceOptions.some(s=>s.id===item.service_id))&&<button type="button" disabled={forPreview} className="lst-news-primary" onClick={()=>{if(!forPreview)onService?.(item.service_id!,item.action as 'service'|'booking');}}>{item.action==='booking'?'Elegir y reservar':'Ver servicio'} <ArrowRight size={15}/></button>}
    </div></article>;
  // No empty placeholder or loading flash on the portal home. Keep all hooks above this return.
  if(!admin&&view==='latest'&&!error&&!promotionCards&&(!list||list.items.length===0))return null;
  return <section className={`lst-news ${admin?'lst-news-admin':'lst-news-portal'}`} aria-label="El universo L’Studio">
    <style>{`
      .lst-news{color:#302822;min-width:0;font-size:13px;line-height:1.6;overflow-wrap:anywhere}
      .lst-news *{box-sizing:border-box}.lst-news h2,.lst-news h3,.lst-news p{margin:0}.lst-news h2{font-family:Georgia,serif;font-size:23px;font-weight:400;color:#E4C687;line-height:1.3}.lst-news h3{font-family:Georgia,serif;font-size:21px;font-weight:400;color:#876431;line-height:1.3}
      .lst-news-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}.lst-news-sub{color:#D6CBB8;font-size:12px;margin-top:4px!important}
      .lst-news button{min-height:44px;padding:9px 13px;border:1px solid #BBA47F;border-radius:9px;cursor:pointer;font-size:12px;background:#F4EFE7;color:#302822;display:inline-flex;align-items:center;justify-content:center;gap:6px}.lst-news button:disabled{opacity:.55;cursor:default}.lst-news button:focus-visible,.lst-news input:focus-visible,.lst-news textarea:focus-visible,.lst-news select:focus-visible{outline:2px solid #C49A58;outline-offset:3px}
      .lst-news button.lst-news-primary{background:#C49A58;color:#29231F;border-color:#C49A58;font-weight:600}.lst-news-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px}.lst-news-card,.lst-news-article,.lst-news-editor{background:#F4EFE7;border:1px solid #C8B79A;border-radius:13px;overflow:hidden}.lst-news-inner{padding:16px;display:flex;flex-direction:column;gap:10px}.lst-news small{font-size:11px;color:#705B40;letter-spacing:.03em}.lst-news-cover{width:100%;height:180px;object-fit:cover;display:block}.lst-news-article .lst-news-cover{height:auto;max-height:420px;object-fit:contain;background:#E8DFD1}.lst-news-lead{font-size:13px;color:#665448}.lst-news-body{font-size:13px;line-height:1.8;white-space:pre-wrap;color:#302822}.lst-news-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.lst-news-pagination{display:flex;gap:12px;align-items:center;justify-content:center;margin-top:14px;color:#E8D9C4}
      .lst-news-editor{padding:18px;margin-bottom:18px;display:grid;gap:12px}.lst-news-editor label{display:grid;gap:5px;font-size:12px;color:#493B2E}.lst-news-editor input,.lst-news-editor select,.lst-news-editor textarea{font:inherit;font-size:13px;width:100%;min-height:44px;background:#FFFDF9;color:#302822;border:1px solid #BBA47F;border-radius:7px;padding:10px;resize:vertical;color-scheme:light}.lst-news-editor fieldset{border:0;padding:0;margin:0;min-width:0;display:grid;gap:12px}.lst-news-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px}.lst-news-status{color:#DFD1BB;margin:8px 0!important}.lst-news-error{background:#F8DFD7;color:#782D20;padding:12px;border-radius:9px;margin-bottom:12px!important}.lst-news-message{background:#E4EAD9;color:#35452B;padding:12px;border-radius:9px;margin-bottom:12px!important}.lst-news-empty{background:#F4EFE7;border-radius:12px;padding:18px;color:#5C4A37}.lst-news-preview{border-top:1px solid #C8B79A;padding-top:12px;margin-top:8px}

      .lst-news-portal{padding-top:19px;border-top:1px solid rgba(212,187,143,.22)}
      .lst-news-portal .lst-news-header{margin-bottom:17px;align-items:flex-start}
      .lst-news-portal h2{font-family:'Cormorant Garamond','Playfair Display',Georgia,serif;font-size:21px;letter-spacing:.025em;color:#DDC49B}
      .lst-news-portal .lst-news-sub{font-size:11px;line-height:1.6;color:#B9AA96;margin-top:5px!important}
      .lst-news-portal button:not(.lst-news-primary){background:transparent;border:0;border-radius:3px;padding:9px 0;color:#DCC6A4;font-size:11px;letter-spacing:.035em;min-height:44px;justify-content:flex-start}
      .lst-news-portal button:not(.lst-news-primary):hover{text-decoration:underline;text-underline-offset:5px}
      .lst-news-portal .lst-news-card{border:1px solid rgba(200,173,129,.23);background:#2C251F;border-radius:9px;box-shadow:none}
      .lst-news-portal .lst-news-card h3{font-size:19px;color:#E7D8C0}
      .lst-news-portal .lst-news-card .lst-news-lead{color:#C9BCA9;font-size:12px}
      .lst-news-portal .lst-news-card small{color:#BBA687;font-size:10px}
      .lst-news-portal .lst-news-grid{gap:17px}
      .lst-news-portal .lst-news-article{border:1px solid #C8B79A;border-radius:9px}
      .lst-news-portal .lst-news-article h3{font-size:22px;color:#795C36}
      .lst-news-portal .lst-news-article .lst-news-inner{padding:22px;gap:14px}
      .lst-news-portal .lst-news-article .lst-news-body{font-size:13px;line-height:1.9}
      .lst-news-portal .lst-news-article .lst-news-primary{font-size:12px;align-self:flex-start;padding:10px 17px}
      .lst-news-feature{position:relative;isolation:isolate;overflow:hidden;border-radius:10px;border:1px solid rgba(200,173,129,.32);background:linear-gradient(135deg,#44362B,#231D18);min-height:250px;display:flex;align-items:flex-end}
      .lst-news-feature>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
      .lst-news-feature::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,12,9,.08) 0%,rgba(16,12,9,.36) 28%,rgba(16,12,9,.90) 68%,rgba(16,12,9,.97) 100%);z-index:-1;pointer-events:none}
      .lst-news-feature-content{width:100%;padding:62px 22px 17px;display:flex;flex-direction:column;align-items:flex-start;gap:9px}
      .lst-news-feature-content>small{color:#E4CEAC;font-size:9px;letter-spacing:.15em;text-transform:uppercase}
      .lst-news-feature-content>h3{color:#FFF5E5;font-size:25px;line-height:1.22;max-width:28ch;letter-spacing:.015em;text-wrap:pretty}
      .lst-news-feature-content>p{font-size:12px;line-height:1.65;color:#E2D5C2;max-width:48ch;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .lst-news-portal .lst-news-feature button{color:#F1D7B1;border-bottom:1px solid rgba(228,198,151,.55);min-height:44px;border-radius:0;padding:7px 0;gap:12px;font-size:11px}
      .lst-news-footer{display:flex;justify-content:flex-end;margin-top:3px}
      @media(max-width:420px){.lst-news-portal h2{font-size:20px}.lst-news-feature{min-height:245px}.lst-news-feature-content{padding:58px 18px 16px}.lst-news-feature-content>h3{font-size:23px}.lst-news-portal .lst-news-article .lst-news-inner{padding:18px}}
    `}</style>
    <header className="lst-news-header"><div><h2>{admin?'El universo L’Studio':'Novedades del Studio'}</h2><p className="lst-news-sub">{admin?'Novedades, inspiración y cuidados para tu cabello.':'Inspiración y novedades del estudio.'}</p></div><div className="lst-news-actions">
      {admin&&<button type="button" disabled={writing||uploading||busy} className="lst-news-primary" onClick={()=>{setDraft(emptyNews());setPreview(false);setError('');setMessage('');setDeleting(null);}}>+ Nueva publicación</button>}
      {!admin&&view!=='latest'&&<button type="button" onClick={()=>{setDetail(null);setView(view==='detail'?'list':'latest');setPage(0);setError('');}}> <ArrowLeft size={15}/> {view==='detail'?'Novedades':'Volver'}</button>}
      {admin&&view!=='detail'&&<button type="button" disabled={busy||writing||uploading} onClick={()=>void load()} aria-label="Actualizar novedades">Actualizar</button>}
    </div></header>
    {!admin&&view!=='detail'&&promotionCards}

    {error&&<div className="lst-news-error"><p role="alert">{error}</p>{!admin&&<button type="button" disabled={busy} onClick={()=>void load()}>Reintentar</button>}</div>}{message&&<p role="status" className="lst-news-message">{message}</p>}
    {admin&&draft&&<form onSubmit={save} className="lst-news-editor"><h3>{draft.updated_at?'Editar publicación':'Nueva publicación'}</h3><fieldset disabled={writing||uploading}>
      <label>Título<input required maxLength={100} value={draft.title} onChange={e=>change({title:e.target.value})} placeholder="Una novedad para tu cabello"/></label>
      <label>Resumen de la tarjeta<textarea required maxLength={240} rows={2} value={draft.summary} onChange={e=>change({summary:e.target.value})}/></label>
      <label>Texto completo<textarea required maxLength={6000} rows={7} value={draft.body} onChange={e=>change({body:e.target.value})}/></label>
      <div className="lst-news-fields"><label>Sección<select value={draft.category} onChange={e=>change({category:e.target.value as studioApi.StudioNews['category']})}>{Object.entries(NEWS_CATEGORIES).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Visibilidad<select value={draft.status} onChange={e=>change({status:e.target.value as 'draft'|'published'})}><option value="draft">Borrador · solo intranet</option><option value="published">Publicar en el portal</option></select></label></div>
      <div className="lst-news-fields"><label>Publicar desde (opcional)<input type="date" value={draft.start_date||''} onChange={e=>change({start_date:e.target.value||null})}/></label><label>Mostrar hasta (opcional)<input type="date" min={draft.start_date||undefined} value={draft.end_date||''} onChange={e=>change({end_date:e.target.value||null})}/></label></div>
      <small>Las fechas siguen el horario de Elche. La fecha final está incluida. Sin fechas, una publicación activa se muestra hasta que la retires.</small>
      <label>Foto pública de la novedad (opcional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];e.target.value='';void upload(file);}}/></label>
      {draft.image_url&&<div className="lst-news-actions"><img src={draft.image_url} alt="Foto elegida" style={{width:120,height:85,objectFit:'cover',borderRadius:8}}/><button type="button" onClick={()=>change({image_url:''})}>Quitar de la publicación</button></div>}
      <div className="lst-news-fields"><label>Botón al final<select value={draft.action} onChange={e=>change({action:e.target.value as studioApi.StudioNews['action'],service_id:e.target.value==='none'?null:draft.service_id})}><option value="none">Sin botón</option><option value="service">Ver servicio</option><option value="booking">Elegir y reservar</option></select></label>
      {draft.action!=='none'&&<label>Servicio del botón<select required value={draft.service_id||''} onChange={e=>change({service_id:e.target.value||null})}><option value="">Selecciona un servicio</option>{draft.service_id&&!serviceOptions.some(s=>s.id===draft.service_id)&&<option value={draft.service_id}>Servicio no disponible · elige otro</option>}{serviceOptions.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>}</div>
      {draft.action==='booking'&&<small>El botón abre la ficha del servicio para elegir sus opciones y complementos antes de reservar.</small>}
      <div className="lst-news-actions"><button type="submit" className="lst-news-primary">{writing?'Guardando…':draft.status==='draft'?'Guardar borrador':'Guardar publicación'}</button><button type="button" onClick={()=>setPreview(v=>!v)}>{preview?'Ocultar vista previa':'Vista previa'}</button><button type="button" onClick={()=>{setDraft(null);setPreview(false);setMessage('');}}>Cerrar editor</button></div>
    </fieldset>{uploading&&<p role="status">Optimizando y preparando la foto…</p>}{preview&&<div className="lst-news-preview"><small>Vista previa del portal</small>{article(draft,true)}</div>}</form>}
    {busy&&<p role="status" className="lst-news-status">Cargando novedades…</p>}
    {view==='detail'&&detail?article(detail):!admin&&view==='latest'?<>
      {list?.items.slice(0,1).map(item=><article key={item.id} className="lst-news-feature">
        {item.image_url&&<img src={item.image_url} alt="" loading="lazy" decoding="async"/>}
        <div className="lst-news-feature-content"><small>{NEWS_CATEGORIES[item.category]}</small><h3>{item.title}</h3><p>{item.summary}</p>
          <button type="button" disabled={busy} aria-label={'Descubrir: '+item.title} onClick={()=>void open(item.id)}>Descubrir <ArrowRight size={15}/></button>
        </div>
      </article>)}
      {!!list?.total&&<div className="lst-news-footer"><button type="button" onClick={()=>{setPage(0);setView('list');}}>Ver todas las novedades <ArrowRight size={14}/></button></div>}
    </>:<>
      {!busy&&list?.items.length===0&&<p className="lst-news-empty">{admin?'Todavía no hay publicaciones. Crea la primera novedad del estudio.':'Pronto compartiremos novedades y cuidados para ti.'}</p>}
      <div className="lst-news-grid">{list?.items.map(item=><article key={item.id} className="lst-news-card">
        {item.image_url&&<img src={item.image_url} alt={item.title} loading="lazy" decoding="async" className="lst-news-cover"/>}<div className="lst-news-inner"><small>{NEWS_CATEGORIES[item.category]}{admin?' · '+newsState(item):''}</small><h3>{item.title}</h3><p className="lst-news-lead">{item.summary}</p><small>{newsDate(item.start_date||item.created_at)}</small>
        <div className="lst-news-actions"><button type="button" disabled={busy||writing||uploading} onClick={()=>void open(item.id,admin)}>{admin?'Editar':'Leer novedad'} <ArrowRight size={14}/></button>{admin&&<button type="button" disabled={writing||uploading||busy} onClick={()=>setDeleting(deleting===item.id?null:item.id)}>Eliminar</button>}</div>
        {admin&&deleting===item.id&&<div role="group" aria-label="Confirmar eliminación"><p>¿Eliminar esta publicación del estudio?</p><div className="lst-news-actions"><button type="button" disabled={writing||uploading} onClick={()=>void remove(item)}>Sí, eliminar</button><button type="button" disabled={writing} onClick={()=>setDeleting(null)}>Conservar</button></div></div>}
      </div></article>)}</div>
      {view==='list'&&list&&list.total>8&&<div className="lst-news-pagination"><button type="button" disabled={page===0||busy||writing||uploading} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>{page+1} / {Math.max(1,Math.ceil(list.total/8))}</span><button type="button" disabled={(page+1)*8>=list.total||busy||writing||uploading} onClick={()=>setPage(p=>p+1)}>Siguiente</button></div>}
    </>}
  </section>;
}



const voucherDisplayTitle=(item:{product_id?:string;id?:string;title:string})=>{const id=item.product_id||item.id;return id==='intensive5'?'Bono tratamientos intensivos · 5×4':id==='men5'?'Bono corte caballero · 5×4':item.title;};

const voucherDate=(date:string|null)=>date?date.slice(0,10).split('-').reverse().join('/'):'Al activar';
const voucherToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

const voucherAvailable=(v:studioApi.StudioVoucher)=>v.kind==='gift'?v.price_cents-v.used_cents-v.held_cents:v.sessions-v.used_sessions-v.held_sessions;
const voucherUsable=(v:studioApi.StudioVoucher)=>v.status==='active'&&!!v.expires_on&&v.expires_on>=voucherToday()&&voucherAvailable(v)>0;

function VoucherStyles(){return <style>{`
 .lst-bonos{min-width:0;color:#F4EADB;font-size:13px;line-height:1.65;overflow-wrap:anywhere}.lst-bonos *{box-sizing:border-box}.lst-bonos h2,.lst-bonos h3,.lst-bonos p{margin:0}.lst-bonos h2,.lst-bonos h3{font-family:Georgia,serif;font-weight:400}.lst-bonos h2{color:#DDC49B;font-size:23px}.lst-bonos h3{color:#DDC49B;font-size:19px}.lst-bonos small{font-size:11px;color:#C3B29A}.lst-bonos button{min-height:44px;padding:9px 13px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid #92764F;background:transparent;color:#E6CC9F;border-radius:7px;font-size:12px;cursor:pointer}.lst-bonos button:disabled{opacity:.5;cursor:default}.lst-bonos button:focus-visible,.lst-bonos input:focus-visible,.lst-bonos select:focus-visible{outline:2px solid #E4C687;outline-offset:3px}.lst-bonos .vb-primary{background:#C49A58;color:#29231F;border-color:#C49A58}.lst-bonos .vb-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lst-bonos .vb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:14px}.lst-bonos .vb-card{position:relative;background:linear-gradient(135deg,#403329,#241E19);border:1px solid #917447;border-radius:12px;padding:21px;display:flex;flex-direction:column;gap:11px;box-shadow:0 8px 22px rgba(0,0,0,.10)}.lst-bonos .vb-gift{background:linear-gradient(130deg,#F0E4CF,#D9C19B);color:#3C3024;border-color:#C1A16D}.lst-bonos .vb-gift h3{color:#69502E}.lst-bonos .vb-gift small{color:#68543D}.lst-bonos .vb-gift button{border-color:#8B704D;color:#4B3820}.lst-bonos .vb-amount{font-family:Georgia,serif;font-size:32px;line-height:1.2;letter-spacing:.02em}.lst-bonos .vb-kicker{font-size:9px;letter-spacing:.16em;text-transform:uppercase}.lst-bonos .vb-meta{font-size:11px;border-top:1px solid rgba(160,133,90,.35);padding-top:10px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.lst-bonos .vb-code{font-family:monospace;font-size:11px;letter-spacing:.025em;overflow-wrap:anywhere;user-select:all}.lst-bonos .vb-dots{display:flex;gap:9px;margin:5px 0}.lst-bonos .vb-dot{width:15px;height:15px;border-radius:50%;border:1px solid #C3A16A}.lst-bonos .vb-dot.used{background:#C3A16A}.lst-bonos .vb-dot.held{background:linear-gradient(90deg,#C3A16A 50%,transparent 50%)}.lst-bonos .vb-panel{background:#30271F;border:1px solid #746044;border-radius:10px;padding:17px;display:grid;gap:12px;margin:14px 0}.lst-bonos input,.lst-bonos select,.lst-bonos textarea{min-height:44px;width:100%;padding:10px;background:#F5EFE5;color:#352B23;border:1px solid #A58B64;border-radius:7px;font:inherit;font-size:13px}.lst-bonos label{display:grid;gap:5px;font-size:12px}.lst-bonos input[type=checkbox]{width:18px;min-height:18px;margin:0;accent-color:#C49A58}.lst-bonos .vb-check{display:flex;align-items:center;gap:9px}.lst-bonos .vb-note{color:#D1C0A7;font-size:12px}.lst-bonos .vb-error{background:#F5DED6;color:#792C20;padding:12px;border-radius:7px;margin:12px 0}.lst-bonos .vb-message{background:#E5EAD9;color:#35452A;padding:12px;border-radius:7px;margin:12px 0}.lst-bonos summary{cursor:pointer;min-height:44px;padding:10px 0;font-size:12px}.lst-bonos details p{font-size:11px;margin:8px 0}.lst-bonos .vb-header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:15px}.lst-bonos .vb-pager{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:14px}.lst-bonos .vb-entry{padding:19px;width:100%;justify-content:space-between;text-align:left;border-radius:11px;background:linear-gradient(120deg,#362B23,#251F1A)}.lst-bonos .vb-entry strong{font-family:Georgia,serif;font-size:19px;font-weight:400;display:block}.lst-bonos .vb-entry small{display:block;margin-top:4px;font-size:11px}.lst-bonos .vb-wallet-heading{margin:22px 0 12px}.lst-bonos .vb-eligible{max-height:230px;overflow-y:auto;display:grid;gap:8px}.lst-bonos .vb-current{font-size:12px;background:#EAE0CF;color:#483821;padding:13px;border-radius:8px;margin:9px 0}.lst-bonos .vb-disabled{opacity:.7}
 .lst-bonos .vb-card.vl-card{--vl-pad:22px;position:relative;isolation:isolate;overflow:hidden;padding:var(--vl-pad);gap:11px;border:1px solid #786145;border-radius:12px;background:#30271F;color:#F4EADC;box-shadow:0 14px 30px rgba(0,0,0,.17);text-align:left;align-items:stretch}
 .lst-bonos .vb-card.vl-card::after{content:'';position:absolute;inset:7px;border:1px solid rgba(213,179,124,.26);border-radius:7px;pointer-events:none;z-index:2}
 .lst-bonos .vb-card.vl-card.vl-gift100{background:#29221F}.lst-bonos .vb-card.vl-card.vl-intensive5{background:#2A302B}.lst-bonos .vb-card.vl-card.vl-men5{background:#29292A}
 .lst-bonos .vl-visual{position:relative;height:210px;margin:calc(-1 * var(--vl-pad)) calc(-1 * var(--vl-pad)) 5px;overflow:hidden;background:linear-gradient(135deg,#67503B,#231E19)}
 .lst-bonos .vl-photo{display:block;width:100%;height:100%;object-fit:cover;filter:saturate(.68) brightness(.9);transition:transform .5s ease}
 .lst-bonos .vl-card:hover .vl-photo{transform:scale(1.025)}
 .lst-bonos .vl-photo-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(21,16,11,.15),rgba(21,16,11,.02) 35%,rgba(21,16,11,.8) 100%);pointer-events:none}
 .lst-bonos .vl-logo{position:absolute;top:18px;left:20px;padding:5px 12px;background:rgba(33,26,20,.78);border:1px solid rgba(220,190,140,.37);border-radius:3px}
 .lst-bonos .vl-logo .vb-gift-brand{margin:0;padding:0;min-height:0;background:none;border:0;display:flex;align-items:center;justify-content:center}
 .lst-bonos .vl-logo img{display:block;width:116px;height:38px;object-fit:contain}.lst-bonos .vl-logo span{font-family:Georgia,serif;font-size:19px;color:#E8D0AA;line-height:1.3;letter-spacing:.03em}
 .lst-bonos .vl-visual .vl-eyebrow{position:absolute;bottom:18px;left:22px;right:22px;color:#F2DFBE;font-size:9px;letter-spacing:.16em;text-transform:uppercase;line-height:1.6}
 .lst-bonos .vb-card.vl-card h3{font-family:Georgia,serif;font-size:22px;line-height:1.25;color:#F0E1C9;font-weight:400;letter-spacing:.01em}
 .lst-bonos .vb-card.vl-card .vb-amount{font-family:Georgia,serif;font-size:36px;line-height:1.1;font-weight:400;color:#E7C28E;font-variant-numeric:tabular-nums;letter-spacing:-.015em}
 .lst-bonos .vb-card.vl-card .vb-kicker{font-size:9px;letter-spacing:.13em;color:#C7AF8D;line-height:1.6}
 .lst-bonos .vb-card.vl-card small{color:#C7B69E;font-size:11px;line-height:1.65}
 .lst-bonos .vb-card.vl-card .vl-description{font-size:12px;line-height:1.75;color:#E0D2BD;min-height:42px}
 .lst-bonos .vl-benefits{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid rgba(206,172,118,.25);border-bottom:1px solid rgba(206,172,118,.25);font-size:11px;color:#DDC6A2;margin-top:2px}
 .lst-bonos .vb-card.vl-card button{font-size:12px;border-color:#8A704E;color:#EBD2AA;background:transparent;min-height:44px}
 .lst-bonos .vb-card.vl-card .vl-cta,.lst-bonos .vb-card.vl-card .vb-primary{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;width:100%;margin-top:auto;padding:12px 15px;background:#D4B17C;border:1px solid #D4B17C;color:#2C2219;border-radius:5px;font-size:12px;font-weight:600;letter-spacing:.025em}
 .lst-bonos .vb-card.vl-card .vl-cta:hover:not(:disabled){background:#E3C696;border-color:#E3C696}
 .lst-bonos .vb-card.vl-card .vb-code{background:rgba(235,216,181,.06);border:1px solid #786145;color:#F0DCC0;border-radius:4px;padding:9px 10px;font-size:10px;line-height:1.7}
 .lst-bonos .vb-card.vl-card .vb-meta{color:#C7B69E;font-size:10px;border-color:#786145}
 .lst-bonos .vl-pay-note{font-size:10px!important;color:#BDA98B!important;text-align:center;line-height:1.6}
 .vl-backdrop{position:fixed;inset:0;z-index:12000;background:rgba(13,10,8,.78);backdrop-filter:blur(7px);padding:24px 14px;display:flex;align-items:center;justify-content:center;overflow:auto}
 .lst-bonos .vl-dialog{width:min(100%,490px);max-height:calc(100dvh - 48px);overflow:auto;overscroll-behavior:contain;background:#29221C;border:1px solid #A6895C;border-radius:13px;box-shadow:0 30px 80px rgba(0,0,0,.45);padding:24px;position:relative;color:#F4EADB}
 .lst-bonos .vl-dialog .vl-visual{--vl-pad:24px;height:170px;margin-bottom:19px}
 .lst-bonos .vl-dialog h3{color:#F0E1C9;font-family:Georgia,serif;font-size:25px;line-height:1.3;margin:0 0 8px;font-weight:400}
 .lst-bonos .vl-dialog .vl-close{position:absolute;top:10px;right:10px;z-index:3;width:36px;min-height:36px;padding:0;border:1px solid #BDA178;border-radius:50%;background:#2C231D;color:#EAD4B3;font-size:20px;line-height:1}
 .lst-bonos .vl-dialog form,.lst-bonos .vl-checkout-body{display:grid;gap:13px}
 .lst-bonos .vl-dialog label{display:grid;gap:6px;font-size:12px;color:#D9C9B1}
 .lst-bonos .vl-dialog textarea,.lst-bonos .vl-dialog input,.lst-bonos .vl-dialog select{background:#F2EADC;color:#352A20;border-color:#A68A60;font-size:13px;width:100%;border-radius:5px}
 .lst-bonos .vl-dialog .vl-total{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #66523A;border-bottom:1px solid #66523A;padding:12px 0;gap:12px;color:#E5D2B4;font-size:12px}
 .lst-bonos .vl-dialog .vl-total strong{font-family:Georgia,serif;color:#E7C28E;font-size:27px;font-weight:400}
 .lst-bonos .vl-dialog .vl-action{width:100%;background:#D4B17C;color:#2C2219;border:1px solid #D4B17C;padding:12px;min-height:48px;border-radius:5px;font-weight:600;justify-content:center}
 .lst-bonos .vl-dialog .vl-error{color:#F6C9B8;background:#4A2B24;padding:11px;border:1px solid #9F6554;border-radius:6px;font-size:12px}
 .lst-bonos .vl-dialog .vl-info{color:#DDE5CE;background:#30372A;padding:11px;border:1px solid #687351;border-radius:6px;font-size:12px}
 .lst-bonos .vl-bizum{border:1px solid #786145;background:#34291F;border-radius:7px;padding:14px;display:grid;gap:10px}
 .lst-bonos .vl-bizum>div{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
 .lst-bonos .vl-bizum strong{color:#F0D2A3;font-size:17px;font-weight:500;user-select:all}.lst-bonos .vl-bizum .vl-reference{font-family:monospace;font-size:15px;letter-spacing:.04em}
 .lst-bonos .vl-muted{font-size:11px;color:#C7B69E;line-height:1.8}
 @media(max-width:480px){.lst-bonos .vb-card.vl-card{--vl-pad:20px}.lst-bonos .vl-visual{height:220px}.lst-bonos .vb-card.vl-card h3{font-size:21px}.vl-backdrop{padding:12px}.lst-bonos .vl-dialog{max-height:calc(100dvh - 24px);padding:20px}.lst-bonos .vl-dialog .vl-visual{--vl-pad:20px;height:155px}.lst-bonos .vl-dialog h3{font-size:23px}}
 @media(prefers-reduced-motion:reduce){.lst-bonos .vl-photo{transition:none}.lst-bonos .vl-card:hover .vl-photo{transform:none}}
 `}</style>;}
function GiftCardBrand({logoSrc}:{logoSrc?:string}){
 const resolved=logoSrc||DEFAULT_BRAND_LOGO;
 const [failedSrc,setFailedSrc]=useState<string|null>(null);
 return <div className="vb-gift-brand">{failedSrc!==resolved?<img src={resolved} alt="L’Studio Ana" loading="lazy" decoding="async" onError={()=>setFailedSrc(resolved)}/>:<span>L’Studio Ana</span>}</div>;
}
const VOUCHER_ART:Record<string,{image:string;alt:string;position:string;eyebrow:string;description:string}>= {
 gift50:{image:'regalo-50.webp',alt:'Cuidado profesional de una melena larga',position:'50% 38%',eyebrow:'El arte de regalar',description:'Un detalle para disfrutar del cuidado y elegir su próxima experiencia.'},
 gift100:{image:'regalo-100.webp',alt:'Retrato editorial de una mujer con cabello castaño',position:'50% 37%',eyebrow:'Un regalo para recordar',description:'Tiempo para cuidarse. Una experiencia con el sello de L’Studio Ana.'},
 intensive5:{image:'intensivos.webp',alt:'Lavado y cuidado del cabello en un salón',position:'50% 45%',eyebrow:'El ritual de volver',description:'Cinco encuentros con el cuidado intensivo de tu cabello.'},
 men5:{image:'caballero.webp',alt:'Profesional realizando un corte de caballero',position:'50% 42%',eyebrow:'Precisión y carácter',description:'Tu corte, tu estilo y cinco momentos para mantenerlo.'},
};
function VoucherVisual({productId,logoSrc}:{productId:string;logoSrc?:string}){
 const art=VOUCHER_ART[productId]||VOUCHER_ART.gift50;
 const [failed,setFailed]=useState(false);
 return <div className="vl-visual">{!failed&&<img className="vl-photo" src={'/voucher-images/'+art.image} alt={art.alt} loading="lazy" decoding="async" style={{objectPosition:art.position}} onError={()=>setFailed(true)}/>}<div className="vl-photo-shade"/><div className="vl-logo"><GiftCardBrand logoSrc={logoSrc}/></div><span className="vl-eyebrow">{art.eyebrow}</span></div>;
}

export function VoucherHub(props:{logoSrc?:string;services:VoucherServiceOption[];onReserve?:(voucher:studioApi.StudioVoucher,serviceId?:string)=>void}){
 const [opened,setOpened]=useState(false);
 return <section className="lst-bonos"><VoucherStyles/><button type="button" className="vb-entry" aria-expanded={opened} onClick={()=>setOpened(v=>!v)}><span><strong>Tarjetas regalo y bonos</strong><small>Regala cuidado. Reserva tu próximo ritual.</small></span><Sparkles size={21}/></button>{opened&&<VoucherPanel logoSrc={props.logoSrc} services={props.services} onReserve={props.onReserve}/>}</section>;
}
export function VoucherPanel({admin=false,services=[],clients=[],onReserve,logoSrc}:{admin?:boolean;logoSrc?:string;services:VoucherServiceOption[];clients?:VoucherClientOption[];onReserve?:(voucher:studioApi.StudioVoucher,serviceId?:string)=>void}){
 const [data,setData]=useState<studioApi.VoucherPage|null>(null),[page,setPage]=useState(0),[client,setClient]=useState('');
 const [busy,setBusy]=useState(false),[writing,setWriting]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [pendingDelete,setPendingDelete]=useState<string|null>(null);
 const [testDeleteConfirmed,setTestDeleteConfirmed]=useState(false);
 const [dedication,setDedication]=useState(''),[code,setCode]=useState(''),[confirming,setConfirming]=useState<string|null>(null),[amount,setAmount]=useState(''),[checked,setChecked]=useState(false);
 const [serviceSearch,setServiceSearch]=useState<Record<string,string>>({});
 const [config,setConfig]=useState<Record<string,string[]>>({}),[reserveId,setReserveId]=useState<string|null>(null),[pendingCancel,setPendingCancel]=useState<string|null>(null);
 const lock=useRef(false),mounted=useRef(false),gen=useRef(0),attempt=useRef<{key:string;id:string}|null>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;gen.current++;};},[]);
 const load=async()=>{const request=++gen.current;setBusy(true);setError('');try{const result=await studioApi.fetchVouchers(voucherToken(),admin?client||undefined:undefined,page);if(mounted.current&&request===gen.current){setData(result);setConfig(Object.fromEntries(result.products.map(p=>[p.id,p.service_ids])));}}catch(e){if(mounted.current&&request===gen.current)setError(e instanceof Error?e.message:'No se pudieron cargar los bonos.');}finally{if(mounted.current&&request===gen.current)setBusy(false);}};
 useEffect(()=>{void load();},[page,client,admin]);
 const act=async(action:()=>Promise<unknown>,success:string)=>{if(lock.current)return;lock.current=true;setWriting(true);setError('');setMessage('');try{await action();if(mounted.current){setMessage(success);setConfirming(null);setChecked(false);setPendingCancel(null);await load();}}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se pudo completar la operación.');}finally{lock.current=false;if(mounted.current)setWriting(false);}};
 const [checkoutProduct,setCheckoutProduct]=useState<studioApi.VoucherProduct|null>(null),[checkoutOrder,setCheckoutOrder]=useState<studioApi.VoucherCheckout|null>(null);
 const [purchaseError,setPurchaseError]=useState(''),[purchaseInfo,setPurchaseInfo]=useState(''),[recipient,setRecipient]=useState('');
 const checkoutRef=useRef<HTMLDivElement|null>(null),checkoutHeading=useRef<HTMLHeadingElement|null>(null),checkoutTrigger=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  if(!checkoutProduct)return;
  const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';checkoutHeading.current?.focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){if(!lock.current){event.preventDefault();setCheckoutProduct(null);}return;}
   if(event.key!=='Tab')return;
   const elements=Array.from(checkoutRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')||[]).filter(el=>el.getClientRects().length>0);
   const first=elements[0],last=elements[elements.length-1];
   if(!first){event.preventDefault();return;}
   if(event.shiftKey&&(document.activeElement===first||document.activeElement===checkoutHeading.current)){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',key);
  return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',key);if(checkoutTrigger.current?.isConnected)checkoutTrigger.current.focus();};
 },[checkoutProduct?.id]);
 const openPurchase=(product:studioApi.VoucherProduct)=>{
  if(lock.current)return;
  checkoutTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  setCheckoutProduct(product);setCheckoutOrder(null);setPurchaseError('');setPurchaseInfo('');setRecipient('');setDedication('');
 };
 const closePurchase=()=>{if(lock.current)return;setCheckoutProduct(null);setCheckoutOrder(null);setPurchaseError('');setPurchaseInfo('');};
 const submitPurchase=async(event:React.FormEvent)=>{
  event.preventDefault();if(!checkoutProduct||lock.current)return;
  if(admin&&!client){setPurchaseError('Selecciona la clienta a la que asignarás esta compra.');return;}
  const savedDedication=checkoutProduct.kind==='gift'?[recipient.trim()?'Para '+recipient.trim():'',dedication.trim()].filter(Boolean).join('\n\n'):'';
  if(savedDedication.length>300){setPurchaseError('La dedicatoria completa debe tener un máximo de 300 caracteres.');return;}
  const key=JSON.stringify([client,checkoutProduct.id,savedDedication]);
  if(attempt.current?.key!==key)attempt.current={key,id:crypto.randomUUID()};
  const requestId=attempt.current.id;
  lock.current=true;setWriting(true);setPurchaseError('');setPurchaseInfo('');
  try{
   const result=await studioApi.orderVoucher(voucherToken(),{id:requestId,productId:checkoutProduct.id,clientId:admin?client:undefined,dedication:savedDedication});
   if(!result.checkout||!result.checkout.paymentReference||!result.checkout.bizumNumber)throw new Error('La solicitud puede haberse guardado. Actualiza studio-api con el archivo de este paquete y pulsa Continuar de nuevo para recuperarla.');
   if(!mounted.current)return;
   setCheckoutOrder(result.checkout);attempt.current=null;
   setPurchaseInfo(result.checkout.status==='pending'?'Solicitud guardada. Completa el Bizum con estos datos.':result.checkout.status==='active'?'Esta compra ya está activada. Puedes consultarla en tus tarjetas y bonos.':'Esta solicitud está anulada. Puedes volver al listado para preparar una nueva.');
   await load();
  }catch(e){if(mounted.current)setPurchaseError(e instanceof Error?e.message:'No se pudo preparar la compra. Conservamos tus datos para reintentar.');}
  finally{lock.current=false;if(mounted.current)setWriting(false);}
 };
 const reportPurchasePayment=async()=>{
  if(!checkoutOrder||checkoutOrder.status!=='pending'||lock.current)return;
  lock.current=true;setWriting(true);setPurchaseError('');
  try{await studioApi.reportVoucherPayment(voucherToken(),checkoutOrder.id);if(mounted.current){setCheckoutOrder(order=>order?{...order,paymentReported:true}:order);setPurchaseInfo('Has comunicado el Bizum. El estudio activará la compra después de comprobar el ingreso.');await load();}}
  catch(e){if(mounted.current)setPurchaseError(e instanceof Error?e.message:'No se pudo comunicar el pago. Puedes reintentarlo.');}
  finally{lock.current=false;if(mounted.current)setWriting(false);}
 };
 const copyPurchase=async(text:string)=>{try{await navigator.clipboard.writeText(text);setPurchaseInfo('Dato copiado.');}catch{setPurchaseInfo('Selecciona el dato mostrado para copiarlo manualmente.');}};
 const copy=async(text:string)=>{try{await navigator.clipboard.writeText(text);setMessage('Código copiado.');}catch{setMessage('Selecciona el código mostrado para copiarlo manualmente.');}};
 return <section className="lst-bonos"><VoucherStyles/><header className="vb-header"><div><h2>{admin?'Tarjetas regalo y bonos':'Tus tarjetas y bonos'}</h2><small>{admin?'Compras, cobros y sesiones del estudio.':'Un detalle para regalar. Un cuidado para volver.'}</small></div><button type="button" disabled={busy||writing} onClick={()=>void load()}>Actualizar</button></header>
  {error&&<p role="alert" className="vb-error">{error}</p>}{message&&<p role="status" className="vb-message">{message}</p>}{busy&&<p role="status">Consultando tus bonos…</p>}
  {admin&&<label>Clienta · filtrar y emitir<select disabled={writing} value={client} onChange={e=>{setClient(e.target.value);setPage(0);}}><option value="">Todas · elige una para emitir</option>{clients.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}
  {admin&&data&&<details className="vb-panel"><summary>Servicios incluidos en los bonos 5×4</summary><p className="vb-note">Elige por categoría y nombre. Para incluirlo debe estar activo y tener precio fijo de {voucherMoney(3800)} en intensivos o {voucherMoney(2000)} en caballero. Los servicios que no cumplen aparecen con el motivo para que puedas revisarlos en Catálogo.</p>{data.products.filter(p=>p.kind==='sessions').map(p=>{
    const match=(s:VoucherServiceOption)=>s.active&&(s.price===p.unit_cents/100||s.variantPrices.includes(p.unit_cents/100));
    const normal=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const query=normal(serviceSearch[p.id]||'');
    const options=services.filter(s=>normal(s.category+' '+s.label+' '+s.portalName).includes(query)).sort((a,b)=>Number(match(b))-Number(match(a))||(a.category+' '+a.label).localeCompare(b.category+' '+b.label,'es'));
    return <div key={p.id} style={{display:'grid',gap:10,marginBottom:12}}><h3>{voucherDisplayTitle(p)}</h3><label>Buscar por nombre o categoría<input type="search" value={serviceSearch[p.id]||''} onChange={e=>setServiceSearch(current=>({...current,[p.id]:e.target.value}))} placeholder="Corte, masculino, intensivos…"/></label><div className="vb-eligible" style={{maxHeight:350}}>{options.map(s=>{
      const eligible=match(s),checked=(config[p.id]||[]).includes(s.id);
      return <label className="vb-check" key={s.id} style={{alignItems:'flex-start',padding:'10px 3px',borderBottom:'1px solid rgba(195,161,106,.18)'}}><input type="checkbox" disabled={writing||(!eligible&&!checked)} checked={checked} onChange={e=>setConfig(current=>({...current,[p.id]:e.target.checked?[...(current[p.id]||[]),s.id]:(current[p.id]||[]).filter(id=>id!==s.id)}))}/><span style={{display:'grid',gap:3}}><small style={{color:'#DDC49B',fontSize:10,letterSpacing:'.05em'}}>{s.category}</small><strong style={{fontSize:12,fontWeight:500}}>{s.label}</strong>{normal(s.portalName)!==normal(s.label)&&<small>En el portal: {s.portalName}</small>}<small>{s.displayPrice||'Precio sin indicar'}</small>{!eligible&&<small style={{color:'#E4B99A'}}>{!s.active?'Inactivo: actívalo en Catálogo para ofrecerlo en el portal.':'Revisa en Catálogo: necesita precio fijo de '+voucherMoney(p.unit_cents)+' o una variante de ese importe.'}</small>}</span></label>;
    })}</div>{options.length===0&&<p className="vb-note">No hay coincidencias. Prueba con la categoría o el nombre que aparece en el catálogo.</p>}<button type="button" disabled={writing} onClick={()=>void act(()=>studioApi.configureVoucher(voucherToken(),p.id,config[p.id]||[]),'Servicios incluidos guardados.')}>Guardar servicios de este bono</button></div>;
  })}</details>}
  {(['gift','sessions'] as const).map(kind=><details key={kind} className="vb-panel"><summary>{kind==='gift'?(admin?'Preparar tarjeta regalo':'Descubrir tarjetas regalo'):(admin?'Preparar bono 5×4':'Descubrir bonos de sesiones')}</summary><h3>{kind==='gift'?'El arte de regalar L’Studio':'Tu ritual, con continuidad'}</h3><p className="vb-note">{kind==='gift'?'50 € o 100 € para elegir una experiencia.':'Corte caballero y tratamientos intensivos · 5 sesiones por el precio de 4.'}</p><div className="vb-grid">{data?.products.filter(p=>p.kind===kind).map(p=>{
    const ready=p.enabled&&(p.kind==='gift'||p.service_ids.length>0)&&!!data.bizumNumber;
    const art=VOUCHER_ART[p.id]||VOUCHER_ART.gift50;
    return <article key={p.id} className={'vb-card vl-card vl-'+p.id+(p.kind==='gift'?' vb-gift':'')}>
      <VoucherVisual productId={p.id} logoSrc={logoSrc}/><small className="vb-kicker">{p.kind==='gift'?'Tarjeta regalo':'Bono de sesiones · 5×4'}</small>
      <h3>{p.kind==='gift'?'Regala L’Studio':p.id==='men5'?'Corte caballero':'Tratamientos intensivos'}</h3>
      <strong className="vb-amount">{(p.price_cents/100).toLocaleString('es-ES')} €</strong><p className="vl-description">{art.description}</p>
      <div className="vl-benefits"><span>{p.kind==='gift'?'Saldo para elegir':'5 sesiones · pagas 4'}</span><span>{p.valid_months===12?'1 año de validez':'6 meses de validez'}</span></div>
      {p.kind==='sessions'&&<small>Una sesión por cita. Complementos aparte. No acumulable a otra promoción.</small>}
      <button type="button" className="vl-cta" disabled={!ready||writing||busy} onClick={()=>openPurchase(p)}>{ready?(p.kind==='gift'?(admin?'Preparar tarjeta regalo':'Regalar esta experiencia'):(admin?'Preparar bono':'Elegir mi bono')):'Consultar disponibilidad'}<ArrowRight size={15} aria-hidden="true"/></button><small className="vl-pay-note">Pago por Bizum · activación al comprobar el ingreso.</small>
    </article>;
  })}</div></details>)}
  {!admin&&<details className="vb-panel"><summary>Me han regalado una tarjeta</summary><label>Código completo<input autoComplete="off" maxLength={35} placeholder="LS-…" value={code} disabled={writing} onChange={e=>setCode(e.target.value.toUpperCase())}/></label><small>Una tarjeta activa y sin uso puede asignarse una vez a quien la recibe. Al añadirla, quedará en tu perfil.</small><button type="button" disabled={writing||!code.trim()} onClick={()=>void act(async()=>{await studioApi.claimGiftVoucher(voucherToken(),code);setCode('');},'Tarjeta regalo añadida a tu perfil.')}>Añadir mi tarjeta regalo</button></details>}
  {!busy&&data?.vouchers.length===0&&<p className="vb-note">{admin?'No hay tarjetas ni bonos para esta selección.':'Aquí aparecerán tus tarjetas regalo y tus bonos de sesiones.'}</p>}
  {(['gift','sessions'] as const).map(kind=>{
    const group=data?.vouchers.filter(v=>v.kind===kind)||[];
    if(!group.length)return null;
    return <section key={kind}><h3 className="vb-wallet-heading">{kind==='gift'?(admin?'Tarjetas regalo registradas':'Mis tarjetas regalo'):(admin?'Bonos de sesiones registrados':'Mis bonos de sesiones')}</h3>
<div className="vb-grid">{group.map(v=>{const expired=!!v.expires_on&&v.expires_on<voucherToday(),available=voucherAvailable(v);const label=v.status==='pending'?'Pendiente de comprobar Bizum':v.status==='cancelled'?'Solicitud cancelada':expired?'Caducado':available<=0?'Sin disponibilidad':v.kind==='gift'?'Tarjeta activa':'Bono activo';return <article key={v.id} className={'vb-card vl-card vl-owned vl-'+v.product_id+(v.kind==='gift'?' vb-gift':'')}><VoucherVisual productId={v.product_id} logoSrc={logoSrc}/>
   <small className="vb-kicker">L’STUDIO ANA · {label}</small><h3>{voucherDisplayTitle(v)}</h3>{admin&&<small>{clients.find(c=>c.id===v.client_id)?.label||'Ficha registrada'}</small>}
   {v.status!=='active'?<p style={{fontSize:12}}>{v.status==='cancelled'?'Solicitud anulada · sin saldo ni sesiones activadas.':'El saldo o las sesiones se activarán al confirmar el pago.'}</p>:(v.kind==='gift'?<><strong className="vb-amount">{voucherMoney(Math.max(0,v.price_cents-v.used_cents))}</strong><small>Saldo sin consumir{v.held_cents>0?` · ${voucherMoney(v.held_cents)} apartado para citas`:''}</small></>:<><div className="vb-dots" aria-label={`${v.used_sessions} usadas, ${v.held_sessions} reservadas, ${Math.max(0,available)} disponibles`}>{Array.from({length:v.sessions},(_,i)=><span key={i} aria-hidden="true" className={'vb-dot '+(i<v.used_sessions?'used':i<v.used_sessions+v.held_sessions?'held':'')}/>)}</div><p>{v.used_sessions} de {v.sessions} realizadas · {v.held_sessions} reservadas</p><small>{Math.max(0,available)} sesiones disponibles para reservar.</small></>)}
   {v.dedication&&<p style={{fontStyle:'italic',fontSize:12}}>{v.dedication}</p>}
   {v.status==='pending'&&<><p>Importe: <strong>{voucherMoney(v.price_cents)}</strong></p><p>Bizum: <strong>{data.bizumNumber}</strong></p><p>Concepto: <strong>{v.payment_reference}</strong></p>{v.payment_reported_at&&<small>Pago comunicado · pendiente de comprobar el ingreso.</small>}
     <div className="vb-actions">{!admin&&<button type="button" disabled={writing} onClick={()=>void act(()=>studioApi.reportVoucherPayment(voucherToken(),v.id),'Aviso enviado al estudio. El bono se activará cuando se compruebe el ingreso.')}>Ya he hecho el Bizum</button>}{admin&&<button type="button" disabled={writing} onClick={()=>{setConfirming(v.id);setAmount((v.price_cents/100).toFixed(2));setChecked(false);}}>Comprobar y activar</button>}<button type="button" disabled={writing} onClick={()=>setPendingCancel(p=>p===v.id?null:v.id)}>Cancelar solicitud</button></div>
     {pendingCancel===v.id&&<div><p>Si ya has enviado el Bizum, contacta con el estudio antes de cancelar.</p><button type="button" disabled={writing} onClick={()=>void act(()=>studioApi.cancelVoucherOrder(voucherToken(),v.id),'Solicitud cancelada. No se ha realizado ningún reembolso automático.')}>Confirmar cancelación</button></div>}
     {admin&&confirming===v.id&&<div><label>Importe recibido en euros<input type="number" min="0" step="0.01" value={amount} disabled={writing} onChange={e=>setAmount(e.target.value)}/></label><label className="vb-check"><input type="checkbox" checked={checked} disabled={writing} onChange={e=>setChecked(e.target.checked)}/>He comprobado el ingreso y su referencia.</label><button type="button" disabled={writing||!checked||Math.round(Number(amount)*100)!==v.price_cents} onClick={()=>void act(()=>studioApi.activateVoucher(voucherToken(),v.id,Math.round(Number(amount)*100)),'Pago confirmado. Bono activado con código y caducidad.')}>Confirmar pago y activar</button></div>}
   </>}
   {admin&&v.status==='cancelled'&&!v.activated_at&&!v.expires_on&&v.used_cents===0&&v.held_cents===0&&v.used_sessions===0&&v.held_sessions===0&&<div>
    <button type="button" disabled={writing||busy} onClick={()=>setPendingDelete(current=>current===v.id?null:v.id)}>Eliminar solicitud anulada</button>
    {pendingDelete===v.id&&<div style={{marginTop:10}}><p style={{fontSize:12}}>Se eliminará esta solicitud que no llegó a activarse. Si se envió un Bizum, revisa antes el ingreso en el banco.</p><div className="vb-actions"><button type="button" disabled={writing||busy} onClick={async()=>{
      let removed=false;
      await act(async()=>{await studioApi.deleteCancelledVoucher(voucherToken(),v.id);removed=true;setPendingDelete(null);},'Solicitud anulada eliminada.');
      if(removed&&page>0&&data.vouchers.length===1)setPage(p=>p-1);
    }}>Sí, eliminar solicitud</button><button type="button" disabled={writing} onClick={()=>setPendingDelete(null)}>Conservar</button></div></div>}
   </div>}
   {admin&&v.status==='active'&&<div style={{marginTop:10}}>
    <button type="button" disabled={writing||busy} onClick={()=>{setPendingDelete(current=>current==='test:'+v.id?null:'test:'+v.id);setTestDeleteConfirmed(false);}}>Eliminar {v.kind==='gift'?'tarjeta':'bono'} de prueba</button>
    {pendingDelete==='test:'+v.id&&<div role="group" aria-label="Eliminar bono ficticio" style={{marginTop:10,padding:12,border:'1px solid #B49161',borderRadius:10,background:'#F3E8D5',color:'#3D3024'}}>
      <strong>{voucherDisplayTitle(v)}</strong><p style={{fontSize:11,overflowWrap:'anywhere'}}>{v.code}</p>
      <p style={{fontSize:12,lineHeight:1.6}}>Se eliminará definitivamente este registro de prueba de la intranet y del portal. Esta acción no realiza ningún reembolso.</p>
      <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#3D3024'}}><input type="checkbox" checked={testDeleteConfirmed} disabled={writing||busy} onChange={event=>setTestDeleteConfirmed(event.target.checked)} style={{width:18,height:18,minHeight:18,flexShrink:0}}/>Confirmo que es un bono ficticio de prueba.</label>
      <div className="vb-actions" style={{marginTop:10}}><button type="button" disabled={writing||busy||!testDeleteConfirmed} onClick={async()=>{
        let removed=false;
        await act(async()=>{await deleteTestVoucher(voucherToken(),v.id,v.code);removed=true;setData(current=>current?{...current,vouchers:current.vouchers.filter(item=>item.id!==v.id),total:Math.max(0,(current.total||0)-(current.vouchers.some(item=>item.id===v.id)?1:0))}:current);setPendingDelete(null);setTestDeleteConfirmed(false);},'Bono de prueba eliminado.');
        if(removed&&page>0&&data.vouchers.length===1)setPage(value=>value-1);
      }} style={{background:'#7F3429',borderColor:'#7F3429',color:'#FFF8EE'}}>Sí, eliminar definitivamente</button><button type="button" disabled={writing} onClick={()=>{setPendingDelete(null);setTestDeleteConfirmed(false);}}>Conservar</button></div>
    </div>}
   </div>}
   {v.status==='active'&&<><div className="vb-code">{v.code}</div><div className="vb-actions"><button type="button" onClick={()=>void copy(v.code)}>Copiar código</button>{!admin&&voucherUsable(v)&&<button type="button" className="vb-primary" onClick={()=>v.kind==='gift'?onReserve?.(v):setReserveId(reserveId===v.id?null:v.id)}>Reservar con mi bono</button>}</div>
    {!admin&&reserveId===v.id&&<div className="vb-actions">{services.filter(s=>data.products.find(p=>p.id===v.product_id)?.service_ids.includes(s.id)).map(s=><button type="button" key={s.id} onClick={()=>onReserve?.(v,s.id)}>{s.label}</button>)}</div>}
    {v.kind==='gift'&&v.client_id===v.buyer_id&&v.used_cents===0&&v.held_cents===0&&<small>Para regalarla, comparte este código en privado. Quien la reciba podrá añadirla a su perfil una sola vez.</small>}
   </>}
   <div className="vb-meta"><span>{v.activated_at?'Compra':'Importe solicitado'} · {voucherMoney(v.price_cents)}</span><span>Caduca · {v.status==='cancelled'&&!v.expires_on?'—':voucherDate(v.expires_on)}</span></div>
   {v.history.length>0&&<details><summary>Últimos movimientos</summary>{v.history.map((u,i)=><p key={i}>{voucherDate(u.booked_for)} · {u.state==='held'?'Reservado':u.state==='consumed'?'Realizado':'Liberado'} · {v.kind==='gift'?voucherMoney(u.amount_cents):'1 sesión'}{u.service_text?' · '+u.service_text:''}</p>)}</details>}
  </article>;})}</div></section>;
  })}
  {data&&data.total>12&&<div className="vb-pager"><button type="button" disabled={page===0||writing||busy} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>{page+1} / {Math.ceil(data.total/12)}</span><button type="button" disabled={(page+1)*12>=data.total||writing||busy} onClick={()=>setPage(p=>p+1)}>Siguiente</button></div>}
  {checkoutProduct&&<div className="vl-backdrop" onClick={event=>{if(event.target===event.currentTarget)closePurchase();}}><div ref={checkoutRef} className="vl-dialog" role="dialog" aria-modal="true" aria-labelledby="voucher-checkout-title" aria-busy={writing}>
   <button type="button" className="vl-close" disabled={writing} onClick={closePurchase} aria-label="Cerrar compra">×</button>
   <VoucherVisual productId={checkoutProduct.id} logoSrc={logoSrc}/>
   <h3 id="voucher-checkout-title" ref={checkoutHeading} tabIndex={-1}>{checkoutOrder?'Tu experiencia, un paso más cerca':checkoutProduct.kind==='gift'?'Regala un momento L’Studio':'Tu próximo ritual L’Studio'}</h3>
   {purchaseError&&<p className="vl-error" role="alert">{purchaseError}</p>}{purchaseInfo&&<p className="vl-info" role="status">{purchaseInfo}</p>}
   {!checkoutOrder?<form onSubmit={submitPurchase}>
    <p className="vl-muted">{voucherDisplayTitle(checkoutProduct)} · {checkoutProduct.valid_months===12?'1 año':'6 meses'} de validez desde la activación.</p>
    {admin&&<label>Clienta<select required value={client} disabled={writing} onChange={event=>{setClient(event.target.value);setPage(0);}}><option value="">Selecciona una ficha</option>{clients.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}
    {checkoutProduct.kind==='gift'&&<><label>Para quién es · opcional<input maxLength={80} value={recipient} disabled={writing} autoComplete="off" placeholder="Su nombre" onChange={event=>setRecipient(event.target.value)}/></label><label>Tu dedicatoria · opcional<textarea maxLength={210} rows={3} value={dedication} disabled={writing} placeholder="Un momento para ti. Con el sello de L’Studio Ana." onChange={event=>setDedication(event.target.value)}/></label><p className="vl-muted">Tras confirmar el ingreso, tendrás un código para compartir en privado con quien reciba el regalo. También puedes disfrutarlo tú.</p></>}
    {checkoutProduct.kind==='sessions'&&<p className="vl-muted">Incluye 5 sesiones por el precio de 4. Una sesión por cita. Complementos aparte. No acumulable a otra promoción.</p>}
    <div className="vl-total"><span>Importe de la compra</span><strong>{voucherMoney(checkoutProduct.price_cents)}</strong></div>
    <button type="submit" className="vl-action" disabled={writing}>{writing?'Preparando tu compra…':'Continuar con Bizum'} <ArrowRight size={16}/></button>
    <p className="vl-muted">A continuación verás el número y el concepto del pago. La activación se realiza al comprobar el ingreso en el estudio.</p>
   </form>:<div className="vl-checkout-body">
    <p className="vl-muted">{checkoutOrder.title}</p>
    {checkoutOrder.existingRequest&&<p className="vl-muted">Ya tenías una solicitud de este modelo. Hemos recuperado su referencia para evitar una compra duplicada.</p>}
    {checkoutOrder.status==='pending'&&<><div className="vl-bizum"><div><span>Importe exacto</span><strong>{voucherMoney(checkoutOrder.priceCents)}</strong></div><div><span>Bizum al</span><strong>{checkoutOrder.bizumNumber}</strong><button type="button" onClick={()=>void copyPurchase(checkoutOrder.bizumNumber)}>Copiar número</button></div><div><span>Concepto</span><strong className="vl-reference">{checkoutOrder.paymentReference}</strong><button type="button" onClick={()=>void copyPurchase(checkoutOrder.paymentReference)}>Copiar concepto</button></div></div>
     <p className="vl-muted">Abre tu banco, envía el Bizum con ese concepto y vuelve para comunicar el pago. La compra seguirá pendiente hasta que el estudio compruebe el ingreso.</p>
     {checkoutOrder.dedication&&<p className="vl-muted" style={{whiteSpace:'pre-wrap'}}>Dedicatoria guardada:<br/>{checkoutOrder.dedication}</p>}
     <button type="button" className="vl-action" disabled={writing||checkoutOrder.paymentReported} onClick={()=>void reportPurchasePayment()}>{writing?'Comunicando…':checkoutOrder.paymentReported?'Bizum comunicado · pendiente de comprobación':'Ya he realizado el Bizum'}</button>
    </>}
    <button type="button" disabled={writing} onClick={()=>{closePurchase();if(page===0)void load();else setPage(0);}}>Ver mis tarjetas y bonos</button>
   </div>}
  </div></div>}
 </section>;
}
export function BookingVoucher({selectedId,onChange,services,dateKey,promotionId,clientId,appointmentId,onSaved,compact=false}:{selectedId:string|null;onChange:(id:string|null)=>void;services:unknown;dateKey:string;promotionId?:string|null;clientId?:string;appointmentId?:string;onSaved?:()=>Promise<unknown>;compact?:boolean}){
 const [data,setData]=useState<studioApi.VoucherPage|null>(null),[page,setPage]=useState(0),[quote,setQuote]=useState<studioApi.VoucherQuote|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[writing,setWriting]=useState(false);
 const live=useRef(false),gen=useRef(0),lock=useRef(false);const signature=JSON.stringify([selectedId,services,dateKey,promotionId,clientId,appointmentId]);
 useEffect(()=>{live.current=true;return()=>{live.current=false;gen.current++;};},[]);
 useEffect(()=>{let valid=true;Promise.resolve().then(()=>studioApi.fetchVouchers(voucherToken(),clientId,page,true)).then(result=>{if(valid)setData(result);}).catch(e=>{if(valid)setError(e instanceof Error?e.message:'No se pudieron consultar los bonos.');});return()=>{valid=false;};},[clientId,page,appointmentId]);
 useEffect(()=>{const request=++gen.current;setQuote(null);setError('');setBusy(false);if(!selectedId||appointmentId)return;setBusy(true);Promise.resolve().then(()=>studioApi.quoteVoucher(voucherToken(),{voucherId:selectedId,clientId,services,dateKey,promotionId})).then(({quote})=>{if(live.current&&request===gen.current)setQuote(quote);}).catch(e=>{if(live.current&&request===gen.current)setError(e instanceof Error?e.message:'No se pudo aplicar el bono.');}).finally(()=>{if(live.current&&request===gen.current)setBusy(false);});},[signature]);
 const attach=async()=>{if(!appointmentId||lock.current)return;lock.current=true;setWriting(true);setError('');try{await studioApi.attachAppointmentVoucher(voucherToken(),appointmentId,selectedId);await onSaved?.();}catch(e){if(live.current)setError(e instanceof Error?e.message:'No se pudo aplicar el bono.');}finally{lock.current=false;if(live.current)setWriting(false);}};
 return <section className="lst-bonos"><VoucherStyles/><details className={'vb-panel'+(compact?' vb-compact':'')} open={compact?false:!!selectedId||!!appointmentId}><summary>Usar tarjeta regalo o bono</summary><label>Elige tu bono<select disabled={writing} value={selectedId||''} onChange={e=>onChange(e.target.value||null)}><option value="">Reservar sin bono</option>{selectedId&&!data?.vouchers.some(v=>v.id===selectedId)&&<option value={selectedId}>Bono seleccionado · se comprobará al guardar</option>}{data?.vouchers.map(v=><option key={v.id} value={v.id}>{v.title} · {v.kind==='gift'?voucherMoney(voucherAvailable(v)):voucherAvailable(v)+' sesiones disponibles'}</option>)}</select></label>
 {data&&data.total>12&&<div className="vb-actions"><button type="button" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Anteriores</button><button type="button" disabled={(page+1)*12>=data.total} onClick={()=>setPage(p=>p+1)}>Más bonos</button></div>}
 {busy&&<p role="status">Comprobando cobertura…</p>}{error&&<p role="alert" className="vb-error">{error}</p>}{quote&&<div className="vb-current"><strong>{quote.title}</strong><p>{quote.kind==='gift'?'Saldo que se apartará: '+voucherMoney(quote.amountCents):'Incluye 1 sesión de '+quote.coveredServiceName}</p><p>{quote.dueCents===null?'Los complementos se confirman en el estudio.':'Resto por abonar: '+voucherMoney(quote.dueCents)}</p></div>}
 <small>Se aparta al reservar y se consume al finalizar la cita. Una sesión por cita; los complementos se cobran aparte. La fecha de la cita debe estar dentro de la validez.</small>{appointmentId&&<button type="button" disabled={writing} onClick={()=>void attach()}>{writing?'Guardando…':selectedId?'Aplicar bono a esta cita':'Guardar cita sin bono'}</button>}</details></section>;
}

export function AppointmentVoucherTools({appointment,onSaved}:{appointment:Appointment;onSaved:()=>Promise<unknown>}){
 const [selected,setSelected]=useState<string|null>(appointment.voucherId||null);
 useEffect(()=>{setSelected(appointment.voucherId||null);},[appointment.serverId,appointment.voucherId]);
 return <div>{appointment.voucher&&<p style={{fontSize:12,color:'#DEC49B'}}>Bono · {appointment.voucher.title} · {appointment.voucher.state==='consumed'?'Consumido':appointment.voucher.state==='released'?'Reserva liberada':'Apartado para esta cita'} · {appointment.voucher.kind==='gift'?voucherMoney(appointment.voucher.amountCents):'1 sesión'}</p>}{!appointment.completedAt&&isActiveAppointment(appointment)&&appointment.clientId&&appointment.serverId&&<BookingVoucher compact selectedId={selected} onChange={setSelected} services={appointment.services||[]} dateKey={appointment.dateKey} clientId={appointment.clientId} appointmentId={appointment.serverId} onSaved={onSaved}/>}</div>;
}


function resolveRepeatedServices(services:unknown,catalog:CatalogCategory[]):{items:RepeatPortalDraft['items'];warnings:string[]}{
  if(!Array.isArray(services)||!services.length)throw new Error('Esta cita antigua no tiene el detalle necesario para repetir sus servicios. Puedes elegirlos en el catálogo.');
  if(!Array.isArray(catalog)||catalog.some(c=>!c||!Array.isArray(c.subservices)))throw new Error('No se pudo comprobar el catálogo actual.');
  const current=catalog.flatMap(c=>c.subservices),seen=new Set<string>(),warnings:string[]=[];
  const items=services.map((entry:any)=>{
    const id=typeof entry?.sub?.id==='string'?entry.sub.id:'';
    const matches=current.filter(sub=>sub.id===id);
    if(!id||matches.length!==1||matches[0].active===false)throw new Error('Uno de los servicios de tu última cita ya no está disponible en el portal. Revisa el catálogo o contacta con el Studio.');
    if(seen.has(id))throw new Error('Tu cita anterior repite un servicio que necesita revisión. Contacta con el Studio para reservarlo de nuevo.');
    seen.add(id);const sub=matches[0];let variant:ServiceVariant|null=null;
    if(sub.hasVariants&&sub.variants?.length){
      if(entry?.variant?.id)variant=sub.variants.find(v=>v.id===entry.variant.id)||null;
      else if(typeof entry?.variant?.name==='string'&&entry.variant.name.trim()){
        const variants=sub.variants.filter(v=>v.name.trim().toLocaleLowerCase()===entry.variant.name.trim().toLocaleLowerCase());
        if(variants.length===1)variant=variants[0];
      }
      if(!variant)warnings.push('Elige la opción actual de «'+(sub.bookingName?.trim()||sub.name)+'».');
    }else if(sub.hasVariants){throw new Error('El Studio debe revisar las opciones de uno de estos servicios antes de poder reservarlo.');}
    else if(entry?.variant)warnings.push('Las opciones de «'+(sub.bookingName?.trim()||sub.name)+'» han cambiado. Revisa su configuración actual.');
    return{sub,variant};
  });
  return{items,warnings};
}
function RepeatLastAppointment({clientId,showPrices,onProceed,onCatalog}:{clientId?:string;showPrices:boolean;onProceed:(draft:RepeatPortalDraft)=>void;onCatalog:()=>void}){
  const [draft,setDraft]=useState<RepeatPortalDraft|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lock=useRef(false),mounted=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const load=async()=>{
    if(lock.current)return;lock.current=true;setBusy(true);setError('');setDraft(null);
    const token=studioApi.currentToken();
    try{
      if(!studioApi.serverConfigured||!token||studioApi.storedRole()!=='client'||!clientId)throw new Error('Accede al portal con tu ficha de clienta para recuperar tu última cita.');
      const response=await fetch(String(import.meta.env.VITE_SUPABASE_URL||'')+'/functions/v1/studio-api/repeat-last-appointment',{
        method:'POST',headers:{'Content-Type':'application/json',apikey:String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||''),Authorization:'Bearer '+token},
        body:'{}',signal:AbortSignal.timeout(15000),cache:'no-store',
      });
      const data=await response.json();
      if(!response.ok||data.ok!==true)throw new Error(data.error||'No se pudo recuperar tu última cita.');
      if(studioApi.currentToken()!==token||studioApi.storedRole()!=='client'||data.clientId!==clientId)throw new Error('La sesión ha cambiado. Vuelve a abrir tu perfil.');
      if(!data.appointment)throw new Error('Todavía no tienes una cita anterior confirmada para repetir. Puedes reservar desde el catálogo.');
      if(!Array.isArray(data.catalog)||!data.settings||typeof data.settings!=='object')throw new Error('No se pudieron comprobar las condiciones actuales.');
      const resolved=resolveRepeatedServices(data.appointment.services,data.catalog);
      if(mounted.current)setDraft({token,clientId,appointmentId:data.appointment.id,startsAt:data.appointment.startsAt,catalog:data.catalog,settings:data.settings,...resolved});
    }catch(value){if(mounted.current)setError((value as Error)?.message||'No se pudo recuperar tu última cita.');}
    finally{lock.current=false;if(mounted.current)setBusy(false);}
  };
  const proceed=()=>{
    if(!draft||busy)return;
    if(studioApi.currentToken()!==draft.token||studioApi.storedRole()!=='client'){setDraft(null);setError('La sesión ha cambiado. Accede de nuevo a tu perfil.');return;}
    onProceed(draft);
  };
  return <section className="lp-repeat" aria-label="Repetir mi última cita" style={{border:'1px solid #846A45',borderRadius:9,padding:12,marginBottom:12,background:'#302820'}}>
    <button type="button" disabled={busy} onClick={()=>void load()} style={{width:'100%',minHeight:44,padding:'10px 12px',border:0,borderRadius:6,background:'#D0AA71',color:'#2C2219',fontSize:13,fontWeight:600}}>{busy?'Recuperando tus servicios…':'Repetir mi última cita'}</button>
    <p style={{fontSize:11,color:'#C8B79E',marginTop:6,lineHeight:1.5}}>Recupera tus servicios y elige una nueva fecha.</p>
    {draft&&<div style={{marginTop:10,fontSize:12,lineHeight:1.6}}>
      <p style={{color:'#DCC7A4'}}>Servicios de tu cita del {draft.startsAt.slice(0,10).split('-').reverse().join('/')}</p>
      <ul style={{paddingLeft:18,margin:'8px 0'}}>{draft.items.map(item=><li key={item.sub.id}><strong>{item.sub.bookingName?.trim()||item.sub.name}</strong>{item.variant&&' · '+item.variant.name}{showPrices&&draft.settings.showPrices!==false&&<span style={{display:'block',color:'#C8B79E'}}>{item.variant?.price||item.sub.price} · {item.variant?.duration||item.sub.duration}</span>}</li>)}</ul>
      <p style={{fontSize:11,color:'#C8B79E'}}>Se aplican los precios y las condiciones actuales. Revisaremos el anticipo al reservar.</p>
      {draft.warnings.map((warning,i)=><p key={i} style={{color:'#E4C687',fontSize:11,marginTop:6}}>{warning}</p>)}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}><button type="button" onClick={proceed} style={{minHeight:44,padding:'9px 12px',background:'#D0AA71',color:'#2C2219',border:0,borderRadius:6,fontSize:12}}>{draft.items.some(item=>item.sub.hasVariants&&!item.variant)?'Elegir opciones del servicio':'Elegir nueva fecha y hora'}</button><button type="button" onClick={()=>setDraft(null)} style={{minHeight:44,padding:9,background:'transparent',color:'#DDC29A',border:'1px solid #6C583D',borderRadius:6,fontSize:12}}>Cerrar</button></div>
    </div>}
    {error&&<div role="alert" style={{marginTop:8,fontSize:12,color:'#FFC3B0'}}><p>{error}</p><button type="button" onClick={onCatalog} style={{minHeight:44,marginTop:7,padding:8,background:'transparent',color:'#E4C687',border:'1px solid #846A45',borderRadius:6}}>Ir al catálogo</button></div>}
  </section>;
}

type PortalProfileTab='hair'|'history'|'photos'|'vouchers'|'memories';
export function ClientProfileCompact({client,catalog,logoSrc,t,compactVisitText,onBack,onBook,onReserve,onRepeat,showPrices}:{client?:ClientRecord|null;catalog:CatalogCategory[];logoSrc:string;t:(key:string)=>string;compactVisitText:(text:string)=>string;onBack:()=>void;onBook:()=>void;onReserve:(voucher:studioApi.StudioVoucher,serviceId?:string)=>void;onRepeat:(draft:RepeatPortalDraft)=>void;showPrices:boolean}){
 const [tab,setTab]=useState<PortalProfileTab>('hair'),[historyPage,setHistoryPage]=useState(0);
 const [visited,setVisited]=useState<Record<PortalProfileTab,boolean>>({hair:true,history:false,photos:false,vouchers:false,memories:false});
 const tabs:{id:PortalProfileTab;label:string}[]=[{id:'hair',label:'Mi cabello'},{id:'history',label:'Historial'},{id:'photos',label:'Fotos'},{id:'vouchers',label:'Mis bonos'},{id:'memories',label:'Logros y recuerdos'}];
 useEffect(()=>{window.scrollTo({top:0,behavior:'auto'});},[]);
 const select=(id:PortalProfileTab)=>{setTab(id);setVisited(previous=>({...previous,[id]:true}));window.scrollTo({top:0,behavior:'auto'});};
 const tabKey=(event:React.KeyboardEvent<HTMLButtonElement>,index:number)=>{
  let next=index;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
  event.preventDefault();select(tabs[next].id);document.getElementById('lp-tab-'+tabs[next].id)?.focus();
 };
 const stamp=(date:string)=>{const d=date.trim();const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d);const iso=match?`${match[3]}-${match[2]}-${match[1]}`:d.slice(0,10);const value=Date.parse(iso+'T12:00:00Z');return Number.isFinite(value)?value:0;};
 const visits=[...(client?.pastVisits||[])].sort((a,b)=>stamp(b.date)-stamp(a.date));
 const pages=Math.max(1,Math.ceil(visits.length/4)),page=Math.min(historyPage,pages-1);
 return <section className="lst-profile-compact" aria-label="Perfil de cliente">
  <style>{`
   .lst-profile-compact{max-width:520px;width:100%;min-width:0;box-sizing:border-box;color:#F4EBDD;padding:0 0 90px;font-size:13px;line-height:1.6}
   .lst-profile-compact *{box-sizing:border-box}.lst-profile-compact h2,.lst-profile-compact h3,.lst-profile-compact p{margin:0}.lst-profile-compact button{font:inherit;cursor:pointer}.lst-profile-compact button:focus-visible,.lst-profile-compact summary:focus-visible{outline:2px solid #E4C687;outline-offset:3px}
   .lp-header{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;gap:11px;padding-right:52px;margin-bottom:15px}
   .lp-header .lp-back{width:40px;min-height:44px;background:transparent;color:#DDC29A;border:1px solid #6C583D;border-radius:50%;display:grid;place-items:center;padding:0}
   .lp-header h2{font-family:Georgia,serif;font-size:21px;font-weight:400;line-height:1.3;color:#EAD5B4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
   .lp-header p{font-size:12px;color:#C8B79E;line-height:1.5;margin-top:3px;overflow-wrap:anywhere}
   .lp-tabs{display:flex;overflow-x:auto;gap:3px;position:sticky;top:8px;z-index:20;padding:4px;background:#2C251F;border:1px solid #665039;border-radius:9px;margin-bottom:15px;box-shadow:0 4px 12px rgba(0,0,0,.13)}
   .lp-tabs button{flex:0 0 auto;min-width:76px;min-height:44px;padding:8px 3px;border:0;border-radius:6px;background:transparent;color:#CDBCA4;font-size:11px;white-space:nowrap;letter-spacing:.015em}
   .lp-tabs button[aria-selected=true]{background:#D0AA71;color:#2C2219;font-weight:600}
   .lp-panel[hidden]{display:none!important}.lp-panel{min-width:0}.lp-hair{display:grid;gap:10px}
   .lp-next{border:1px solid #846A45;background:linear-gradient(120deg,#3B3025,#2B241E);border-radius:10px;padding:14px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px 12px;align-items:center}
   .lp-next small{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#CEB791}.lp-next p{font-size:13px;color:#F1E4D0;line-height:1.55;overflow-wrap:anywhere}
   .lp-next .lp-book{min-height:44px;border:1px solid #C6A16C;border-radius:6px;background:#D0AA71;color:#2C2219;padding:9px 13px;font-size:12px;grid-column:2;grid-row:1/3}
   .lp-fold{border:1px solid #68533C;border-radius:9px;background:#302820;padding:0 14px}
   .lp-fold summary{display:flex;align-items:center;justify-content:space-between;gap:10px;list-style:none;min-height:59px;padding:10px 0;color:#E7D4B6;font-size:13px;cursor:pointer}
   .lp-fold summary::-webkit-details-marker{display:none}.lp-fold summary svg{color:#B69A73;flex-shrink:0}.lp-fold[open] summary svg{transform:rotate(180deg)}
   .lp-fold .lp-fold-body{font-size:13px;line-height:1.8;color:#DED0BC;white-space:pre-wrap;overflow-wrap:anywhere;padding:1px 0 15px}
   .lp-quiet{font-size:11px;color:#BFAE95;line-height:1.65;padding:3px 2px}.lp-recommend-extra{grid-column:1/-1;font-size:11px;color:#CBB99E}.lp-recommend-extra summary{cursor:pointer;min-height:35px;padding:5px 0}.lp-recommend-extra p{font-size:12px;color:#CBB99E}
   .lp-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 0 12px}.lp-section-head h3{font-family:Georgia,serif;font-size:19px;font-weight:400;color:#E3C9A2}.lp-section-head small{color:#BFAE95;font-size:11px}
   .lp-history-list{display:grid;gap:9px}.lp-visit{padding:0 13px}.lp-visit summary{min-height:66px}.lp-visit summary span{min-width:0}.lp-visit time{display:block;font-size:11px;color:#CAA879;margin-bottom:3px}.lp-visit strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;font-weight:500;line-height:1.55;color:#EFE3D2}
   .lp-visit .lp-fold-body{font-size:12px;white-space:normal}.lp-visit .lp-fold-body p{margin-top:7px}.lp-visit .lp-notes{white-space:pre-wrap;overflow-wrap:anywhere}
   .lp-pages{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:13px;color:#BEAB8D;font-size:11px}.lp-pages button{min-height:44px;padding:8px 13px;border:1px solid #796140;border-radius:6px;background:transparent;color:#DFCAA8;font-size:12px}.lp-pages button:disabled{opacity:.4;cursor:default}
   .lp-panel .vb-header{margin-bottom:10px}.lp-panel .vb-header h2{font-size:20px}.lp-panel .vb-header small{display:none}.lp-panel .vb-panel{padding:12px;margin:9px 0;gap:9px}.lp-panel .vb-panel>summary{padding:3px 0;min-height:36px}.lp-panel .vb-wallet-heading{margin-top:16px}
   @media(max-width:360px){.lp-header{gap:8px;padding-right:44px}.lp-header h2{font-size:19px}.lp-tabs button{font-size:10px}.lp-next{padding:12px}.lp-next .lp-book{padding:8px 10px}}
  `}</style>
  <header className="lp-header"><button className="lp-back" type="button" aria-label={t('backToPortal')} onClick={onBack}><ArrowLeft size={18}/></button><div><h2 title={t('passportTitle')}>{t('passportTitle')}</h2><p>{client?.nombre||'L’Studio Ana'}</p></div></header>
  <RepeatLastAppointment clientId={client?.serverId} showPrices={showPrices} onProceed={onRepeat} onCatalog={onBook}/>
  <nav role="tablist" aria-label="Apartados de tu perfil" className="lp-tabs">{tabs.map((item,index)=><button key={item.id} id={'lp-tab-'+item.id} type="button" role="tab" aria-selected={tab===item.id} aria-controls={'lp-panel-'+item.id} tabIndex={tab===item.id?0:-1} onClick={()=>select(item.id)} onKeyDown={event=>tabKey(event,index)}>{item.label}</button>)}</nav>
  <div className="lp-panel" id="lp-panel-hair" role="tabpanel" aria-labelledby="lp-tab-hair" hidden={tab!=='hair'}>
   <div className="lp-hair"><section className="lp-next"><small>{t('recommendedVisit')}</small><p>{client?.proximaVisitaSugerida||t('pendingRecommendation')}</p><button className="lp-book" type="button" onClick={onBook}>Reservar</button><details className="lp-recommend-extra"><summary>Ver orientación de mantenimiento</summary><p>{t('maintenanceNote')}</p></details></section>
   <details className="lp-fold"><summary>{t('hairDna')}<ChevronDown size={16}/></summary><div className="lp-fold-body">{client?.dniCapilar||t('emptyDna')}</div></details>
   <details className="lp-fold"><summary>{t('homeRitual')}<ChevronDown size={16}/></summary><div className="lp-fold-body">{client?.prescripcionCasa||t('emptyCare')}</div></details>
   {client?.ultimaVisita&&<p className="lp-quiet">Última visita registrada · {client.ultimaVisita}</p>}
   </div>
  </div>
  <div className="lp-panel" id="lp-panel-history" role="tabpanel" aria-labelledby="lp-tab-history" hidden={tab!=='history'}>{visited.history&&<><header className="lp-section-head"><h3>{t('visitHistory')}</h3><small>{visits.length} {visits.length===1?'visita':'visitas'}</small></header><div className="lp-history-list">{visits.length?visits.slice(page*4,page*4+4).map((visit,index)=><details className="lp-fold lp-visit" key={page*4+index}><summary><span><time>{visit.date}</time><strong>{compactVisitText(visit.service)}</strong></span><ChevronDown size={16}/></summary><div className="lp-fold-body"><p>{compactVisitText(visit.service)}</p>{visit.stylist&&<p>Con {visit.stylist}</p>}{visit.notes&&<p className="lp-notes">{visit.notes}</p>}</div></details>):<p className="lp-quiet">{t('emptyVisits')}</p>}</div>{pages>1&&<div className="lp-pages"><button type="button" disabled={page===0} onClick={()=>setHistoryPage(page-1)}>Anterior</button><span>{page+1} / {pages}</span><button type="button" disabled={page+1>=pages} onClick={()=>setHistoryPage(page+1)}>Siguiente</button></div>}</>}</div>
  <div className="lp-panel" id="lp-panel-photos" role="tabpanel" aria-labelledby="lp-tab-photos" hidden={tab!=='photos'}>{visited.photos&&<ClientPhotoGallery key={client?.serverId||'own-gallery'} clientId={client?.serverId}/>}</div>
  <div className="lp-panel" id="lp-panel-memories" role="tabpanel" aria-labelledby="lp-tab-memories" hidden={tab!=='memories'}>{visited.memories&&<React.Suspense fallback={<p>Cargando recuerdos…</p>}><LazyMemoriesClient key={client?.serverId||'own-memories'}/></React.Suspense>}</div>
  <div className="lp-panel" id="lp-panel-vouchers" role="tabpanel" aria-labelledby="lp-tab-vouchers" hidden={tab!=='vouchers'}>{visited.vouchers&&<VoucherPanel logoSrc={logoSrc} services={voucherServiceOptions(catalog)} onReserve={onReserve}/>}</div>
 </section>;
}


// lst-news-promotion-slot-v1
