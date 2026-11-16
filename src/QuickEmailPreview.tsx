import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import * as studioApi from './studioApi';

export type QuickEmailDraft={clientName:string;toEmail:string;dateKey:string;time:string;services:any[];pending:boolean;isUpdate:boolean;appointmentId?:string;promotion?:unknown;voucher?:unknown};
type Preview={html:string;subject:string;fromEmail:string;toEmail:string;pending:boolean};
// The frame cannot execute code, open links, submit forms or load remote resources.
export function safeEmailDocument(source:string):string{
 const doc=new DOMParser().parseFromString(source,'text/html');
 doc.querySelectorAll('script,iframe,object,embed,base,meta,link,form,svg,math').forEach(el=>el.remove());
 doc.querySelectorAll('*').forEach(el=>{
  for(const attr of Array.from(el.attributes))if(/^on/i.test(attr.name)||['href','src','srcset','action','formaction','target','xlink:href','poster','background'].includes(attr.name.toLowerCase()))el.removeAttribute(attr.name);
 });
 return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src \'none\'; font-src \'none\'; base-uri \'none\'; form-action \'none\'"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+doc.body.innerHTML+'</body></html>';
}
export default function QuickEmailPreview({getDraft,disabled=false}:{getDraft:()=>QuickEmailDraft|null;disabled?:boolean}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState<Preview|null>(null);
 const controller=useRef<AbortController|null>(null),trigger=useRef<HTMLButtonElement>(null),closeButton=useRef<HTMLButtonElement>(null);
 const generation=useRef(0),mounted=useRef(true);
 const close=()=>{generation.current++;controller.current?.abort();setOpen(false);setBusy(false);setPreview(null);setError('');trigger.current?.focus();};
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;controller.current?.abort();};},[]);
 useEffect(()=>{if(open)closeButton.current?.focus();},[open]);
 const show=async()=>{
  if(busy)return;
  const draft=getDraft();if(!draft)return;
  setError('');setPreview(null);setOpen(true);
  const token=studioApi.currentToken();
  if(!studioApi.serverConfigured||!token||studioApi.storedRole()!=='admin'){setError('Necesitas conexión y una sesión de administración para consultar la plantilla.');return;}
  if(!draft.clientName.trim()||!draft.services.length||!/^\d{4}-\d{2}-\d{2}$/.test(draft.dateKey)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.time)){setError('Completa nombre, fecha, hora y servicios antes de abrir la vista previa.');return;}
  controller.current?.abort();const request=new AbortController();controller.current=request;
  const attempt=++generation.current;
  const active=()=>mounted.current&&generation.current===attempt&&studioApi.currentToken()===token&&studioApi.storedRole()==='admin';
  const timer=setTimeout(()=>request.abort(),20000);setBusy(true);
  try{
   const services=draft.services.map(item=>({sub:{id:item.sub.id,name:item.sub.name,bookingName:item.sub.bookingName,price:item.sub.price,priceType:item.sub.priceType},variant:item.variant?{id:item.variant.id,name:item.variant.name,price:item.variant.price,priceType:item.variant.priceType}:null,appointmentDiscount:item.appointmentDiscount}));
   const response=await fetch(String(import.meta.env.VITE_SUPABASE_URL)+'/functions/v1/studio-api/email-preview',{method:'POST',headers:{'Content-Type':'application/json',apikey:String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||''),Authorization:'Bearer '+token},body:JSON.stringify({draft:{...draft,services}}),signal:request.signal,cache:'no-store'});
   let data:any;try{data=await response.json();}catch{throw Error('No se pudo leer la vista previa. Revisa que studio-api tenga instalado el apartado email-preview.');}
   if(!response.ok)throw Error(response.status===404?'Falta añadir email-preview a studio-api en Supabase.':data.error||'No se pudo abrir la vista previa.');
   if(typeof data.html!=='string'||typeof data.subject!=='string')throw Error('La plantilla recibida no es válida.');
   if(active())setPreview({...data,html:safeEmailDocument(data.html)});
  }catch(value){if(active())setError(request.signal.aborted?'La consulta ha tardado demasiado. Cierra y vuelve a abrir la vista previa.':value instanceof Error?value.message:'No se pudo abrir la vista previa.');}
  finally{clearTimeout(timer);if(mounted.current&&generation.current===attempt)setBusy(false);}
 };
 const buttonStyle:React.CSSProperties={padding:'10px 13px',minHeight:44,border:'1px solid #C5A059',borderRadius:7,background:'#322A25',color:'#E4C687',cursor:'pointer',fontSize:13};
 return <>
  <button ref={trigger} type="button" onClick={show} disabled={disabled||busy} style={buttonStyle}>Vista previa del email</button>
  {open&&createPortal(<div onClick={event=>{if(event.target===event.currentTarget)close();}} style={{position:'fixed',inset:0,background:'#000B',zIndex:10000,display:'grid',placeItems:'center',padding:12}}>
   <section role="dialog" aria-modal="true" aria-labelledby="lst-email-preview-title" onKeyDown={event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
    if(event.key==='Tab'){event.preventDefault();closeButton.current?.focus();}
   }} style={{background:'#29231F',color:'#FFF8EE',border:'1px solid #C5A059',borderRadius:12,width:'min(620px,100%)',maxHeight:'calc(100dvh - 24px)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
    <header style={{padding:14,display:'flex',gap:12,alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #655039'}}><h3 id="lst-email-preview-title" style={{margin:0,fontSize:18,color:'#E4C687'}}>Así lo verá la clienta</h3><button ref={closeButton} type="button" onClick={close} style={buttonStyle}>Cerrar</button></header>
    <div style={{padding:'12px 14px',fontSize:12,lineHeight:1.6}}><p style={{margin:0}}>Vista previa antes de guardar. No envía ningún correo ni reserva la cita. Los enlaces están desactivados aquí.</p>
     {preview&&<><p style={{margin:'8px 0 0'}}><strong>Para:</strong> {preview.toEmail||'Falta el email de la clienta; no podrá recibirlo.'}<br/><strong>Asunto:</strong> {preview.subject}{preview.fromEmail&&<><br/><strong>Remitente:</strong> L’Studio Ana · {preview.fromEmail}</>}</p><p style={{margin:'6px 0 0',color:'#D6CBB8'}}>Se usa la plantilla del servidor con los datos actuales del formulario. Puede verse ligeramente diferente según la aplicación de correo.</p></>}
     {busy&&<p role="status">Cargando plantilla…</p>}{error&&<p role="alert" style={{color:'#FFC3B0'}}>{error}</p>}
    </div>
    {preview&&<iframe title="Email de la cita" sandbox="" referrerPolicy="no-referrer" srcDoc={preview.html} style={{width:'100%',height:'min(65dvh,650px)',minHeight:180,border:0,background:'#29231F'}}/>}
   </section>
  </div>,document.body)}
 </>;
}
