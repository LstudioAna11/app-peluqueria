// lst-permissions-fold-v1
// lst-scalp-health-v1
import React,{useEffect,useRef,useState} from 'react';
import * as studioApi from './studioApi';
import {offlineConsultation} from './offlineSession';
import spanish from './portalSpanish';
export type Purpose='privacy_notice'|'photo_private'|'image_publicity'|'scalp_health';
type Doc={id:string;purpose:Purpose;version:number;title:string;body:string;published_at:string};
type RecordState={purpose:Purpose;document_id:string;granted:boolean;revision:number;updated_at:string;document_version:number;document_title:string;document_body:string};
type State={documents:Doc[];records:RecordState[]};
type Change={purpose:Purpose;documentId:string;granted:boolean;revision:number};
type TFn=(key:string)=>string;
const purposes:Purpose[]=['privacy_notice','photo_private','image_publicity','scalp_health'];
const titles:Record<Purpose,string>={privacy_notice:'Información de privacidad',photo_private:'Fotos para seguimiento privado',image_publicity:'Imagen en web y redes sociales',scalp_health:'Información para mi cuidado del cuero cabelludo'};
const templates:Record<Purpose,string>={privacy_notice:'',photo_private:'Autorizo a L’Studio Ana a tomar y conservar fotografías y vídeos de mi cabello para documentar los servicios realizados y llevar mi seguimiento privado. Este permiso no autoriza su publicación. Puedo retirarlo desde el portal o contactar con el Studio para ejercer mis derechos conforme a la información de privacidad.',image_publicity:'Autorizo a L’Studio Ana a utilizar fotografías y vídeos de los servicios realizados en los que pueda ser reconocible mi imagen, para mostrar resultados y promocionar el trabajo del Studio en su página web y en sus perfiles de Instagram y Facebook. Es opcional y no condiciona mis reservas. No autoriza la cesión a otros negocios ni otros usos. Puedo retirar esta autorización desde el portal o contactar con el Studio conforme a la información de privacidad.',scalp_health:"Consiento expresamente que Ana Moreno Fernández, titular de L’Studio Ana, registre y utilice en mi ficha la información que facilite y las observaciones necesarias sobre descamación, caída, caspa y sensibilidad de mi cuero cabelludo, que pueden revelar información de salud, para adaptar los productos y servicios de cuidado capilar y realizar el seguimiento que solicite.\n\nSolo se recogerá la información pertinente para esa finalidad. No se solicita un historial médico completo. Esta información no se utilizará para publicidad ni se publicará mediante esta autorización. Las fotografías requieren además su permiso específico.\n\nLa información será accesible para el personal autorizado que la necesite, con la intervención de los proveedores técnicos y las garantías descritas en la política de privacidad. Se conservará mientras sea necesaria para el seguimiento autorizado. No se le aplica automáticamente el plazo de un año de las fotografías ni se conservará indefinidamente por el solo hecho de existir una ficha.\n\nPuedo retirar este consentimiento desde Privacidad y permisos o escribiendo a lstudioana@gmail.com. Se dejará de utilizar la información para este seguimiento y se atenderá su supresión cuando proceda, salvo la conservación mínima y restringida exigible por obligaciones o responsabilidades. La retirada no afecta al tratamiento lícito anterior.\n\nNo autorizar este tratamiento no impide realizar una reserva ordinaria. Si falta información necesaria para valorar con seguridad un servicio concreto, el Studio explicará las alternativas antes de realizarlo. Este seguimiento no sustituye una valoración médica.\n\nResponsable y contacto: Ana Moreno Fernández · C/ Port d’Alacant, 11, 1-AC, 03202 Elche (Alicante) · lstudioana@gmail.com. Puedo ejercer mis derechos conforme a la política de privacidad y reclamar ante la AEPD."};
const button:React.CSSProperties={padding:'10px 14px',minHeight:44,border:'1px solid #B9955F',borderRadius:8,background:'#3E342C',color:'#FFF8EE',cursor:'pointer',fontSize:14};
const primary:React.CSSProperties={...button,background:'#D6B77B',color:'#29231F'};
const field:React.CSSProperties={width:'100%',boxSizing:'border-box',padding:12,border:'1px solid #806340',borderRadius:8,background:'#221D19',color:'#FFF8EE',fontSize:16};
const date=(value:string)=>new Date(value).toLocaleString('es-ES',{timeZone:'Europe/Madrid'});
const permKey=(p:Purpose)=>p==='privacy_notice'?'permPrivacyNotice':p==='photo_private'?'permPhotoPrivate':p==='image_publicity'?'permImagePublicity':'permScalpHealth';
const confirmKey=(p:Purpose)=>p==='privacy_notice'?'permConfirmPrivacy':p==='photo_private'?'permConfirmPhotos':p==='scalp_health'?'permConfirmScalp':'permConfirmImage';
export async function permissionRequest<T>(action:string,body:unknown={},signal?:AbortSignal):Promise<T>{
 if(offlineConsultation())throw new Error('Conecta para consultar o guardar estos permisos.');
 const isPublic=action==='documents',token=isPublic?null:studioApi.currentToken(),expected=['mine','save'].includes(action)?'client':'admin';
 if(!isPublic&&(!token||studioApi.storedRole()!==expected))throw new Error('Accede con la cuenta correspondiente para continuar.');
 const control=new AbortController(),cancel=()=>control.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();const timer=setTimeout(cancel,15000);
 try{
  const response=await fetch(String(import.meta.env.VITE_SUPABASE_URL)+'/functions/v1/studio-permissions/'+action,{method:isPublic?'GET':'POST',headers:{'Content-Type':'application/json',apikey:String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||''),...(token?{Authorization:'Bearer '+token}:{})},body:isPublic?undefined:JSON.stringify(body),cache:'no-store',signal:control.signal});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'No se pudo confirmar el resultado. Puedes reintentar.');
  if(token&&(studioApi.currentToken()!==token||studioApi.storedRole()!==expected))throw new Error('La sesión ha cambiado.');return data;
 }catch(error){if(error instanceof Error&&error.name==='AbortError')throw new Error('No se pudo confirmar el resultado a tiempo. Puedes reintentar sin duplicar el registro.');throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
function usePermissionData<T>(action:string,body:Record<string,string>={}){
 const key=JSON.stringify([action,body.clientId||'',studioApi.currentToken()]);
 const [loaded,setLoaded]=useState<{key:string;data:T;at:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const serial=useRef(0),mounted=useRef(false),control=useRef<AbortController|null>(null);
 const load=async()=>{const generation=++serial.current;control.current?.abort();control.current=new AbortController();setBusy(true);setError('');
  try{const data=await permissionRequest<T>(action,body,control.current.signal);if(mounted.current&&generation===serial.current)setLoaded({key,data,at:new Date().toISOString()});}
  catch(value){if(mounted.current&&generation===serial.current){setLoaded(null);setError(value instanceof Error?value.message:'No se pudieron consultar los permisos.');}}
  finally{if(mounted.current&&generation===serial.current)setBusy(false);}
 };
 useEffect(()=>{mounted.current=true;const start=setTimeout(()=>void load(),0);return()=>{clearTimeout(start);mounted.current=false;serial.current++;control.current?.abort();};},[key]);
 return {data:loaded?.key===key?loaded.data:null,busy,error,load,checkedAt:loaded?.key===key?loaded.at:'',setData:(data:T)=>setLoaded({key,data,at:new Date().toISOString()})};
}
export function permissionLabel(purpose:Purpose,state:State):string{
 const doc=state.documents.find(d=>d.purpose===purpose),record=state.records.find(r=>r.purpose===purpose);
 if(!record)return purpose==='privacy_notice'?spanish.permNoRecord:spanish.permNoAuth;
 if(!record.granted)return spanish.permWithdrawn;
 if(!doc||doc.id!==record.document_id)return purpose==='privacy_notice'?spanish.permOldInfo:spanish.permOldAuth;
 return purpose==='privacy_notice'?spanish.permInfoReceived:spanish.permAuthCurrent;
}
export function PrivacyPermissionsEntry({t=(key:string)=>spanish[key]}:{t?:TFn}){
 const [open,setOpen]=useState(false);
 return <details open={open} onToggle={e=>setOpen(e.currentTarget.open)} style={{border:'1px solid #806340',borderRadius:10,padding:12,marginBottom:16}}><summary style={{cursor:'pointer',color:'#E4C687',minHeight:32}}>{t('permEntryLabel')}</summary>{open&&<ClientPermissions t={t}/>}</details>;
}
export function ClientPermissions({t=(key:string)=>spanish[key]}:{t?:TFn}){
 const remote=usePermissionData<State>('mine');const state=remote.data;
 const [choices,setChoices]=useState<Partial<Record<Purpose,boolean>>>({}),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const pending=useRef<{requestId:string;changes:Change[]}|null>(null),lock=useRef(false),mounted=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;pending.current=null;};},[]);
 useEffect(()=>{if(state){setChoices(Object.fromEntries(purposes.map(p=>[p,!!state.records.find(r=>r.purpose===p&&r.granted&&r.document_id===state.documents.find(d=>d.purpose===p)?.id)])));pending.current=null;}},[state]);
 const send=async(changes:Change[])=>{
  if(lock.current||!changes.length)return;lock.current=true;setSaving(true);setError('');setNotice('');
  if(!pending.current||JSON.stringify(pending.current.changes)!==JSON.stringify(changes))pending.current={requestId:crypto.randomUUID(),changes};
  try{const data=await permissionRequest<State>('save',pending.current);if(!Array.isArray(data.documents)||!Array.isArray(data.records))throw new Error(t('permConfirmIncomplete'));if(mounted.current){remote.setData(data);pending.current=null;setNotice(t('permSaved'));}}
  catch(value){if(mounted.current)setError(value instanceof Error?value.message:t('permSaveError'));}
  finally{lock.current=false;if(mounted.current)setSaving(false);}
 };
 const save=()=>{
  if(!state)return;const changes:Change[]=[];
  for(const purpose of purposes){
   const doc=state.documents.find(d=>d.purpose===purpose),old=state.records.find(r=>r.purpose===purpose);if(!doc)continue;
   const granted=choices[purpose]===true;
   if(granted&&purpose!=='privacy_notice'&&!state.documents.some(d=>d.purpose==='privacy_notice'))continue;
   if(purpose==='privacy_notice'&&!granted)continue;
   const documentId=granted?doc.id:old?.document_id||doc.id;
   if(old?.document_id===documentId&&old.granted===granted)continue;
   changes.push({purpose,documentId,granted,revision:old?.revision||0});
  }
  if(!changes.length){setNotice(t('permAlreadySaved'));return;}void send(changes);
 };
 return <div style={{display:'grid',gap:14,paddingTop:14,color:'#FFF8EE'}}>
  <p style={{fontSize:13,lineHeight:1.6,margin:0}}>{t('permIntro')}</p>
  <div><button type="button" style={button} disabled={remote.busy||saving} onClick={()=>void remote.load()}>{t('permRefresh')}</button></div>
  {(remote.error||error)&&<p role="alert" style={{color:'#FFB4A9',margin:0}}>{error||remote.error}</p>}
  {!state&&remote.busy&&<p role="status">{t('permLoading')}</p>}
  {state&&purposes.map(purpose=>{
   const doc=state.documents.find(d=>d.purpose===purpose),old=state.records.find(r=>r.purpose===purpose),isCurrent=old?.document_id===doc?.id&&old?.granted;
   return <section key={purpose} style={{borderTop:'1px solid #655039',paddingTop:12,display:'grid',gap:10}}>
    <strong style={{color:'#E4C687',fontSize:14}}>{t(permKey(purpose))}</strong><small>{permissionLabel(purpose,state)}{old?' · '+date(old.updated_at):''}</small>
    {doc?<><details><summary style={{cursor:'pointer'}}>{t('permReadText').replace('{version}',String(doc.version))}</summary><p style={{fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{doc.body}</p></details>
      {purpose==='privacy_notice'&&isCurrent?<span style={{fontSize:13}}>{t('permAlreadyInformed')}</span>:<label style={{display:'flex',gap:10,fontSize:13,lineHeight:1.6,alignItems:'flex-start'}}><input type="checkbox" checked={choices[purpose]===true} disabled={saving||remote.busy||(purpose!=='privacy_notice'&&!state.documents.some(d=>d.purpose==='privacy_notice'))} onChange={e=>{pending.current=null;setChoices({...choices,[purpose]:e.target.checked});setNotice('');}} style={{marginTop:4,width:18,height:18,flexShrink:0}}/>{t(confirmKey(purpose))}</label>}</>:<p style={{fontSize:13,margin:0}}>{t('permNotPublished')}</p>}
    {old&&<details><summary style={{cursor:'pointer',fontSize:12}}>{t('permViewRegistered').replace('{version}',String(old.document_version))}</summary><p style={{fontSize:12,lineHeight:1.7,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{old.document_body}</p></details>}
    {purpose!=='privacy_notice'&&old?.granted&&<button type="button" style={{...button,justifySelf:'start'}} disabled={saving||remote.busy} onClick={()=>void send([{purpose,documentId:old.document_id,granted:false,revision:old.revision}])}>{t('permWithdraw')}</button>}
   </section>;
  })}
  {state?.documents.length?<button type="button" style={primary} disabled={saving||remote.busy} onClick={save}>{saving?t('permSaving'):t('permSave')}</button>:null}
  <div role="status" aria-live="polite" style={{fontSize:13,color:'#E4C687'}}>{notice}</div>
  <p style={{fontSize:12,lineHeight:1.6,color:'#D6CBB8',margin:0}}>{t('permWithdrawNote')}</p>
 </div>;
}
export function ClientPermissionStatus({clientId}:{clientId?:string}){return clientId?<PermissionStatusFold key={clientId} clientId={clientId}/>:<p style={{fontSize:13}}>{spanish.permSaveFirst}</p>;}
function PermissionStatusFold({clientId}:{clientId:string}){
 const [expanded,setExpanded]=useState(false);
 return <details open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)} style={{border:'1px solid #806340',borderRadius:10,marginBottom:16,color:'#FFF8EE'}}><summary style={{display:'list-item',padding:'12px 14px',minHeight:46,boxSizing:'border-box',cursor:'pointer',color:'#E4C687',fontSize:14,lineHeight:1.6}}><strong>{spanish.permFoldHeading}</strong></summary>{expanded&&<PermissionStatusInner key={clientId} clientId={clientId}/>}</details>;
}

function PermissionStatusInner({clientId}:{clientId:string}){
 const remote=usePermissionData<State>('client',{clientId}),state=remote.data;
 return <section style={{padding:'0 14px 14px',display:'grid',gap:10}} aria-label={spanish.permPanelLabel}>
  <button type="button" style={{...button,justifySelf:'start'}} disabled={remote.busy} onClick={()=>void remote.load()}>{spanish.permRefresh}</button>
  {remote.error&&<p role="alert">{spanish.permCheckError}{remote.error}</p>}
  {!state&&<p style={{fontSize:13}}>{spanish.permUnchecked}</p>}
  {state&&<small>{spanish.permCheckedAt}{date(remote.checkedAt)}{spanish.permCheckedHint}</small>}
  {state&&purposes.map(p=>{const record=state.records.find(r=>r.purpose===p);return <div key={p} style={{fontSize:13,lineHeight:1.6}}><strong>{titles[p]}:</strong> {permissionLabel(p,state)}{record&&<><br/><small>{date(record.updated_at)} · versión {record.document_version}</small><details><summary style={{cursor:'pointer'}}>{spanish.permRegisteredText}</summary><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{record.document_body}</p></details></>}</div>;})}
  <small>{spanish.permClientOnlyNote}</small>
 </section>;
}
export function PrivacyDocumentsPanel(){
 const remote=usePermissionData<{documents:Doc[];withdrawals:any[]}>('admin'),[purpose,setPurpose]=useState<Purpose>('privacy_notice');
 const [title,setTitle]=useState(titles.privacy_notice),[body,setBody]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const lock=useRef(false),mounted=useRef(false);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const doc=remote.data?.documents.find(d=>d.purpose===purpose);
 useEffect(()=>{setTitle(doc?.title||titles[purpose]);setBody(doc?.body||templates[purpose]);setNotice('');setError('');},[doc?.id,purpose]);
 const publish=async()=>{
  if(lock.current||!remote.data)return;lock.current=true;setSaving(true);setError('');setNotice('');
  try{const result=await permissionRequest<{documents:Doc[]}>('publish',{purpose,revision:doc?.version||0,title,body});if(mounted.current){remote.setData({...remote.data,documents:result.documents});setNotice('Nueva versión publicada. Los registros anteriores conservan su texto.');}}
  catch(value){if(mounted.current)setError(value instanceof Error?value.message:'No se pudo confirmar la publicación. Actualiza antes de volver a publicar.');}
  finally{lock.current=false;if(mounted.current)setSaving(false);}
 };
 return <section style={{padding:20,background:'#29231F',border:'1px solid #806340',borderRadius:12,color:'#FFF8EE',display:'grid',gap:14}} aria-label="Textos de privacidad y permisos">
  <h3 style={{margin:0,color:'#E4C687'}}>Privacidad y permisos · Textos del portal</h3>
  <p style={{fontSize:13,lineHeight:1.7,margin:0}}>Publica por separado la información de privacidad y las autorizaciones de fotos privadas, publicación e información del cuero cabelludo. Se muestran en el portal, dentro de Avisos. Publicar el texto no concede el permiso: cada clienta debe registrar su elección.</p>
  <div><button type="button" style={button} disabled={saving||remote.busy} onClick={()=>void remote.load()}>Actualizar textos y retiradas</button></div>
  {(remote.error||error)&&<p role="alert" style={{color:'#FFB4A9'}}>{error||remote.error}</p>}
  {remote.data&&<>
   <label>Documento<select value={purpose} disabled={saving} onChange={e=>setPurpose(e.target.value as Purpose)} style={{...field,marginTop:8}}>{purposes.map(p=><option key={p} value={p}>{titles[p]}</option>)}</select></label>
   <small>{doc?'Publicado · versión '+doc.version+' · '+date(doc.published_at):'Sin publicar · todavía no se puede registrar este permiso en el portal'}</small>
   <label>Título<input style={{...field,marginTop:8}} value={title} maxLength={120} disabled={saving} onChange={e=>setTitle(e.target.value)}/></label>
   <label>Texto completo<textarea style={{...field,marginTop:8}} rows={9} maxLength={24000} value={body} disabled={saving} onChange={e=>setBody(e.target.value)}/></label>
   {purpose==='privacy_notice'&&<p style={{fontSize:13,lineHeight:1.7,margin:0}}>Incluye la identidad y contacto del responsable, finalidades y bases jurídicas, destinatarios y transferencias que procedan, conservación, derechos y forma de ejercerlos. Usa el texto aplicable a tu actividad; este formulario no sustituye su revisión.</p>}
   <p style={{fontSize:12,color:'#D6CBB8',margin:0}}>Publicar crea una versión nueva e inmutable para este documento. Las autorizaciones anteriores no se muestran como vigentes si cambia su documento; la clienta debe renovar el permiso afectado.</p>
   <div><button type="button" style={primary} disabled={saving||remote.busy||!title.trim()||body.trim().length<40||(!!doc&&title.trim()===doc.title&&body.trim()===doc.body)} onClick={()=>void publish()}>{saving?'Publicando…':'Publicar nueva versión'}</button></div>
   <details><summary style={{cursor:'pointer',color:'#E4C687'}}>Retiradas registradas recientemente</summary>{remote.data.withdrawals.length?remote.data.withdrawals.map(event=><p key={event.id} style={{fontSize:13,lineHeight:1.6}}>{event.client?.first_name||'Clienta'} {event.client?.last_name||''} · {titles[event.purpose as Purpose]} · {date(event.created_at)}</p>):<p style={{fontSize:13}}>No constan retiradas recientes.</p>}<p style={{fontSize:12}}>Se muestran las últimas 20 retiradas de permisos previamente concedidos. Comprueba la ficha y revisa las publicaciones existentes cuando corresponda; este módulo no elimina contenido de las redes.</p></details>
  </>}
 </section>;
}

export function RegistrationPrivacyNotice({t=(key:string)=>spanish[key]}:{t?:TFn}){
 const remote=usePermissionData<{documents:Doc[]}>('documents');
 const doc=remote.data?.documents.find(d=>d.purpose==='privacy_notice');
 if(!doc)return <p style={{fontSize:12,lineHeight:1.6,color:'#D6CBB8'}}>{t('permDataInfo')}{remote.busy?t('permDataLoading'):remote.error?t('permDataError'):t('permDataPending')}</p>;
 return <details style={{fontSize:13,lineHeight:1.7,color:'#D6CBB8'}}><summary style={{cursor:'pointer',color:'#E4C687'}}>{t('permDataHeading').replace('{version}',String(doc.version))}</summary><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{doc.body}</p><p>{t('permDataWhere')}</p></details>;
}
