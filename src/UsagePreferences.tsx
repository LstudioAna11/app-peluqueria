import React,{useEffect,useRef,useState} from 'react';
import {chooseUsage,readUsagePreference,retryUsageChoice,usageCall,USAGE_EVENT,type UsagePreference} from './usagePrivacy';
type Doc={version:number;title:string;body:string;enabled:boolean};
const control:React.CSSProperties={minHeight:44,padding:'9px 13px',border:'1px solid #B9955F',borderRadius:8,background:'#322A25',color:'#E4C687',fontSize:13,cursor:'pointer',flex:'1 1 140px'};
export default function UsagePreferences({prompt=false}:{prompt?:boolean}){
 const [preference,setPreference]=useState<UsagePreference|null>(readUsagePreference),[open,setOpen]=useState(false),[doc,setDoc]=useState<Doc|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const mounted=useRef(false),lock=useRef(false);
 const load=async()=>{try{const next=await usageCall<Doc>('document');if(mounted.current)setDoc(next);}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se pudo abrir el texto.');}};
 useEffect(()=>{mounted.current=true;const change=()=>{const value=readUsagePreference();setPreference(value);if(value?.state!=='pending')setError('');};window.addEventListener(USAGE_EVENT,change);window.addEventListener('storage',change);return()=>{mounted.current=false;window.removeEventListener(USAGE_EVENT,change);window.removeEventListener('storage',change);};},[]);
 useEffect(()=>{if((prompt&&(!preference||preference.state==='pending')||open)&&!doc){const timer=setTimeout(()=>void load(),0);return()=>clearTimeout(timer);}},[prompt,!!preference,open,!!doc]);
 const choose=async(allowed:boolean)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{await chooseUsage(allowed,doc?.version||1);if(mounted.current)setPreference(readUsagePreference());}
  catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se pudo confirmar la elección.');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 if(prompt&&preference&&preference.state!=='pending')return null;
 const contents=<div style={{display:'grid',gap:10,paddingTop:prompt?0:12}}>
  <p style={{margin:0,fontSize:13,lineHeight:1.6}}>¿Nos permites contar el uso desde la app y el navegador? Es opcional y no afecta a tus reservas.</p>
  {!prompt&&<p style={{margin:0,color:'#D6CBB8',fontSize:12}}>{preference?.state==='accepted'?'Estadísticas activadas en este navegador.':preference?.state==='pending'?'Las estadísticas están detenidas mientras se confirma tu elección.':'Estadísticas desactivadas en este navegador.'}</p>}
  {doc&&<details style={{fontSize:12,lineHeight:1.6,color:'#D6CBB8'}}><summary style={{cursor:'pointer',minHeight:32}}>Leer información · versión {doc.version}</summary><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{doc.body}</p></details>}
  {doc&&!doc.enabled&&<small>El Studio todavía no ha activado esta opción. Puedes mantenerla rechazada.</small>}
  {preference?.state==='pending'?<button type="button" style={control} disabled={busy} onClick={()=>void choose(preference.allowed)}>{busy?'Confirmando…':'Reintentar guardar mi elección'}</button>:preference?.state==='accepted'?<button type="button" style={control} disabled={busy} onClick={()=>void choose(false)}>{busy?'Retirando…':'Retirar permiso de estadísticas'}</button>:<div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button type="button" style={control} disabled={busy||!doc?.enabled} onClick={()=>void choose(true)}>Aceptar estadísticas</button><button type="button" style={control} disabled={busy} onClick={()=>void choose(false)}>Rechazar estadísticas</button></div>}
  {preference?.state==='pending'&&preference.allowed&&<button type="button" style={control} disabled={busy} onClick={()=>void choose(false)}>Rechazar estadísticas</button>}
  {error&&<p role="alert" style={{margin:0,fontSize:12,lineHeight:1.6,color:'#FFB4A9'}}>{error} <button type="button" style={{...control,display:'block',marginTop:6}} disabled={busy} onClick={()=>{setError('');void load();}}>Actualizar este apartado</button></p>}
  <small style={{color:'#D6CBB8',lineHeight:1.5}}>Tu elección corresponde a este navegador. Puedes cambiarla en Avisos → Estadísticas de uso. Si no eliges, las estadísticas siguen desactivadas.</small>
 </div>;
 return prompt?<section aria-label="Estadísticas opcionales" style={{padding:14,border:'1px solid #806340',borderRadius:10,color:'#FFF8EE',background:'#2D2621'}}>{contents}</section>:<details open={open} onToggle={event=>setOpen(event.currentTarget.open)} style={{padding:12,border:'1px solid #806340',borderRadius:10,color:'#FFF8EE',marginBottom:16}}><summary style={{cursor:'pointer',color:'#E4C687',minHeight:32}}>Estadísticas de uso · Opcional</summary>{open&&contents}</details>;
}
