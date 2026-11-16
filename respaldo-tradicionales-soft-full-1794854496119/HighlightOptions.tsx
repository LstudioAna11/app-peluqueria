import {HighlightComparison,HighlightComparisonEditor} from './HighlightComparison'; // lst-highlights-comparison-v1
// lst-highlights-grouped-length-v2
import React,{useState} from 'react';
import type {SubService,ServiceVariant} from './App';
import './highlight-options.css';
export const lengths=['Medio','Largo','Extralargo'] as const;
export const intensities=['SOFT','FULL'] as const;
type Length=typeof lengths[number];type Intensity=typeof intensities[number];
type Cell={length:Length;intensity:Intensity;id:string;price:string;minutes:string;base?:ServiceVariant};
const fold=(s:string)=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/extra[ -]?larg[oa]/g,'extralargo');
export const isHighlights=(service:Pick<SubService,'name'|'bookingName'>)=>/balayage|babylights?|hybrid/.test(fold(service.name+' '+(service.bookingName||'')));
export function variantAxes(variant:ServiceVariant):{length:Length;intensity:Intensity|null}|null{
 const name=fold(variant.name);
 const length:Length|null=/\bextralargo\b/.test(name)?'Extralargo':/\b(?:largo|larga|long|l)\b/.test(name)?'Largo':/\b(?:medio|media|medium|m)\b/.test(name)?'Medio':null;
 const intensity:Intensity|null=/\bsoft\b/.test(name)?'SOFT':/\bfull\b/.test(name)?'FULL':null;
 return length?{length,intensity}:null;
}
export function matrixReady(service:SubService):boolean{
 if(!isHighlights(service)||service.variants?.length!==6)return false;
 return lengths.every(length=>intensities.every(intensity=>service.variants!.filter(v=>{const axes=variantAxes(v);return axes?.length===length&&axes.intensity===intensity;}).length===1));
}
export function HighlightOptions({service,selected,onSelect,children}:{service:SubService;selected:ServiceVariant|null|undefined;onSelect:(variant:ServiceVariant)=>void;children:React.ReactNode}){
 if(!matrixReady(service))return <>{children}{isHighlights(service)&&<HighlightComparison key={service.id} service={service}/>}</>;
 const axes=selected?variantAxes(selected):null;
 const name=fold(service.name+' '+(service.bookingName||''));
 const technique=/hybrid/.test(name)?'Hybrid':/babylight/.test(name)?'Babylights':'Balayage';
 return <div className="lst-highlights-options lst-highlights-by-length">
  <div className="lst-highlights-length-cards">{lengths.map(length=><fieldset key={length} data-selected={axes?.length===length}>
   <legend>{technique} {length}</legend>
   <div className="lst-highlights-pair">{intensities.map(intensity=>{
    const variant=service.variants!.find(item=>{const a=variantAxes(item);return a?.length===length&&a.intensity===intensity;})!;
    return <button key={variant.id} type="button" aria-label={technique+' '+length+' · '+intensity+' · '+(intensity==='SOFT'?'Iluminación sutil':'Iluminación completa')} aria-pressed={selected?.id===variant.id} onClick={()=>onSelect(variant)}><strong>{intensity}</strong><span>{intensity==='SOFT'?'Sutil':'Completa'}</span></button>;
   })}</div>
  </fieldset>)}</div>
  <HighlightComparison key={service.id} service={service}/>
 </div>;
}
export function setupDraft(service:SubService):Cell[]|null{
 if(!isHighlights(service))return null;
 if(matrixReady(service))return lengths.flatMap(length=>intensities.map(intensity=>{
  const base=service.variants!.find(v=>{const a=variantAxes(v);return a?.length===length&&a.intensity===intensity;})!;
  return {length,intensity,id:base.id,price:base.price,minutes:String(parseInt(base.duration.match(/\d+/)?.[0]||'',10)||''),base};
 }));
 if(service.variants?.length!==3)return null;
 const originals=lengths.map(length=>service.variants!.filter(v=>{const a=variantAxes(v);return a?.length===length&&!a.intensity;}));
 if(originals.some(items=>items.length!==1))return null;
 return lengths.flatMap((length,i)=>intensities.map(intensity=>{
  const base=originals[i][0];
  return {length,intensity,id:intensity==='FULL'?base.id:'hf-'+crypto.randomUUID(),price:intensity==='FULL'?base.price:'',minutes:intensity==='FULL'?base.duration.match(/\d+/)?.[0]||'':'',base};
 }));
}
export function applySetup(service:SubService,cells:Cell[]):SubService{
 if(cells.length!==6||new Set(cells.map(c=>c.length+':'+c.intensity)).size!==6||new Set(cells.map(c=>c.id)).size!==6)throw Error('Revisa las seis combinaciones.');
 if(cells.some(c=>!c.price.trim()||!/^\d+$/.test(c.minutes)||Number(c.minutes)<5||Number(c.minutes)>1440))throw Error('Completa el precio y una duración de 5 a 1440 minutos para cada opción.');
 return {...service,hasVariants:true,variants:cells.map(c=>{
  const {translations,...base}=c.base||{};
  return {...base,id:c.id,name:c.length+' · '+c.intensity,description:c.intensity==='SOFT'?'Iluminación sutil en zonas seleccionadas.':'Iluminación completa con mayor cantidad de mechas.',price:c.price.trim(),duration:Number(c.minutes)+' min'};
 })};
}
function Editor({service,onApply,initial}:{service:SubService;onApply:(service:SubService)=>void;initial:Cell[]}){
 const [cells,setCells]=useState(initial),[error,setError]=useState(''),[done,setDone]=useState(false);
 const [tabs,setTabs]=useState<Record<Length,Intensity>>({Medio:'SOFT',Largo:'SOFT',Extralargo:'SOFT'});
 const change=(i:number,key:'price'|'minutes',value:string)=>{setDone(false);setCells(previous=>previous.map((cell,index)=>index===i?{...cell,[key]:value}:cell));};
 const name=fold(service.name+' '+(service.bookingName||''));
 const technique=/hybrid/.test(name)?'Hybrid':/babylight/.test(name)?'Babylights':'Balayage';
 return <details className="lst-highlights-editor"><summary>SOFT / FULL dentro de cada largo</summary>
  <p>Cada largo contiene dos opciones: SOFT y FULL. Pulsa cada botón para editar su precio y duración.</p>
  {!matrixReady(service)&&<p>Las opciones actuales se conservan como FULL, con sus identificadores, precios y tiempos. SOFT queda pendiente de completar. Revisa los importes antes de aplicar.</p>}
  <div className="lst-highlights-editor-grid lst-highlights-editor-by-length">{lengths.map(length=>{
   const intensity=tabs[length],i=cells.findIndex(cell=>cell.length===length&&cell.intensity===intensity),cell=cells[i];
   return <section key={length}>
    <strong>{technique} {length}</strong>
    <div className="lst-highlights-editor-tabs" role="group" aria-label={'Opciones de '+technique+' '+length}>{intensities.map(value=><button key={value} type="button" aria-pressed={intensity===value} onClick={()=>setTabs(previous=>({...previous,[length]:value}))}>{value}</button>)}</div>
    <div className="lst-highlights-editor-fields" aria-label={length+' · '+intensity}>
     <label>Precio · {intensity}<input type="text" value={cell.price} onChange={event=>change(i,'price',event.target.value)} placeholder="Precio de esta opción"/></label>
     <label>Duración · {intensity} · minutos<input type="number" min={5} max={1440} step={1} value={cell.minutes} onChange={event=>change(i,'minutes',event.target.value)} placeholder="Completar"/></label>
    </div>
   </section>;
  })}</div>
  {error&&<p role="alert">{error}</p>}{done&&<p role="status">Opciones preparadas. Pulsa «Guardar catálogo» para guardarlas en el servidor.</p>}
  <button type="button" onClick={()=>{try{onApply(applySetup(service,cells));setError('');setDone(true);}catch(value){setError(value instanceof Error?value.message:'Revisa los datos.');}}}>Aplicar opciones al catálogo</button>
 <HighlightComparisonEditor key={service.id} service={service} onApply={onApply}/>
 </details>;
}
export function HighlightsVariantEditor({service,onApply}:{service:SubService;onApply:(service:SubService)=>void}){
 const [initial]=useState(()=>setupDraft(service));
 if(!isHighlights(service))return null;
 if(!initial)return <p className="lst-highlights-setup-note">SOFT/FULL: las opciones deben ser Medio, Largo y Extralargo, o las seis combinaciones de largo e intensidad. Revisa sus nombres antes de configurar.</p>;
 return <Editor service={service} onApply={onApply} initial={initial}/>;
}
