import {highlightTechniqueLabel} from './highlightFamily'; // lst-traditional-soft-full-v1
import {useEffect,useRef,useState} from 'react';
import type {SubService} from './App';
import * as studioApi from './studioApi';
import {prepareCatalogImage} from './catalogImage';
import {verifyCatalogPhotoUrl} from './catalogPhotoDrafts';
import { catalogLabel } from './portalCatalogLabels';
import './highlight-comparison.css';
type Pair={soft?:string;full?:string};
type ComparedService=SubService&{highlightComparison?:Pair};
const photo=(value:unknown)=>{try{if(typeof value!=='string')return '';const url=new URL(value);return url.protocol==='https:'?url.href:'';}catch{return '';}};
const label=(service:SubService)=>/\bmechas?\b/i.test(service.name+' '+(service.bookingName||''))&&/\btradicional(?:es)?\b/i.test(service.name+' '+(service.bookingName||'')) ? 'Mechas tradicionales' : (highlightTechniqueLabel(service.name+' '+(service.bookingName||'')));
export function HighlightComparison({service,language = 'es',title}:{service:ComparedService;language?:string;title?:string}){
 const [open,setOpen]=useState(false);
 const soft=photo(service.highlightComparison?.soft),full=photo(service.highlightComparison?.full);
 return <div className="lst-highlight-comparison">
  <div className="lst-highlight-explanations"><p><strong>SOFT · {catalogLabel(language, 'soft')}. </strong>{catalogLabel(language, 'softExplanation')}</p><p><strong>FULL · {catalogLabel(language, 'full')}. </strong>{catalogLabel(language, 'fullExplanation')}</p></div>
  {soft&&full&&<details onToggle={event=>setOpen(event.currentTarget.open)}><summary>{catalogLabel(language, 'compare')}</summary>
   {open&&<><div className="lst-highlight-photo-pair">{([{kind:'SOFT',url:soft,text:catalogLabel(language, 'softLight')},{kind:'FULL',url:full,text:catalogLabel(language, 'fullLight')}]).map(item=><figure key={item.kind}><img src={item.url} alt={(title || label(service))+' · '+item.kind+' · '+item.text} loading="lazy" decoding="async"/><figcaption><strong>{item.kind}</strong> · {item.text}</figcaption></figure>)}</div><p className="lst-highlight-image-note">{catalogLabel(language, 'exampleNote')}</p></>}
  </details>}
 </div>;
}
export function HighlightComparisonEditor({service,onApply}:{service:ComparedService;onApply:(service:SubService)=>void}){
 const [busy,setBusy]=useState<'soft'|'full'|null>(null),[message,setMessage]=useState(''),[error,setError]=useState('');
 const live=useRef(true),locked=useRef(false),latest=useRef({service,onApply});latest.current={service,onApply};
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const upload=async(kind:'soft'|'full',file:File|undefined)=>{
  if(!file||locked.current)return;
  setError('');setMessage('');
  const token=studioApi.currentToken(),serviceId=service.id;
  if(!studioApi.serverConfigured||!token||studioApi.storedRole()!=='admin'){setError('Vuelve a entrar en la intranet para subir la foto.');return;}
  locked.current=true;setBusy(kind);
  try{
   const prepared=await prepareCatalogImage(file);
   const uploaded=await studioApi.uploadServiceImage(token,prepared.dataUrl);
   if(!uploaded?.ok||!photo(uploaded.url))throw Error('No se ha recibido una dirección válida para la imagen.');
   await verifyCatalogPhotoUrl(uploaded.url);
   if(!live.current||latest.current.service.id!==serviceId)return;
   if(studioApi.currentToken()!==token||studioApi.storedRole()!=='admin')throw Error('La sesión ha cambiado. Vuelve a entrar antes de guardar.');
   const current=latest.current.service;
   latest.current.onApply({...current,highlightComparison:{...current.highlightComparison,[kind]:uploaded.url}} as ComparedService);
   setMessage('Foto de '+kind.toUpperCase()+' preparada. Pulsa «Guardar catálogo» para publicarla. La comparativa aparecerá cuando estén las dos fotos.');
  }catch(value){if(live.current)setError(value instanceof Error?value.message:'No se pudo subir la foto.');}
  finally{locked.current=false;if(live.current)setBusy(null);}
 };
 const remove=(kind:'soft'|'full')=>{
  if(locked.current)return;
  const current=latest.current.service;
  const pair={...current.highlightComparison};delete pair[kind];
  latest.current.onApply({...current,highlightComparison:pair} as ComparedService);
  setError('');setMessage('Imagen retirada de la comparativa. Pulsa «Guardar catálogo» para publicar el cambio.');
 };
 return <details className="lst-highlight-comparison-editor"><summary>Fotos de ejemplo · SOFT y FULL</summary>
  <p>Añade dos trabajos de {label(service)}, con largo y tono similares. Las fotos se mostrarán juntas en «Ver la diferencia» cuando ambas estén añadidas y guardes el catálogo.</p>
  <div className="lst-highlight-upload-pair">{(['soft','full'] as const).map(kind=>{
   const url=photo(service.highlightComparison?.[kind]);
   return <div key={kind}><strong>{kind.toUpperCase()}</strong>{url&&<img src={url} alt={'Foto actual de '+kind.toUpperCase()} loading="lazy"/>}
    <label>{busy===kind?'Subiendo foto…':url?'Cambiar foto':'Añadir foto'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!!busy} onChange={event=>{const file=event.target.files?.[0];event.target.value='';void upload(kind,file);}}/></label>
    {url&&<button type="button" disabled={!!busy} onClick={()=>remove(kind)}>Retirar de la comparativa</button>}
   </div>;
  })}</div>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 </details>;
}
