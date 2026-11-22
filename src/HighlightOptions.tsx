// lst-traditional-three-lengths-v2
import {highlightFamily,highlightTechniqueLabel} from './highlightFamily'; // lst-traditional-soft-full-v1
import {HighlightComparison,HighlightComparisonEditor} from './HighlightComparison'; // lst-highlights-comparison-v1
// lst-highlights-grouped-length-v2
import React,{useState} from 'react';
import type {SubService,ServiceVariant} from './App';
import { catalogLabel } from './portalCatalogLabels';
import './highlight-options.css';
export const lengths=['Medio','Largo','Extralargo'] as const;
export const intensities=['SOFT','FULL'] as const;
type Length=typeof lengths[number];type Intensity=typeof intensities[number];
type Cell={length:Length;intensity:Intensity;id:string;price:string;minutes:string;base?:ServiceVariant};
const fold=(s:string)=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/extra[ -]?larg[oa]/g,'extralargo');
export const isHighlights=(service:Pick<SubService,'name'|'bookingName'>)=>(highlightFamily(service.name+' '+(service.bookingName||''))!==null) || isTraditionalHighlights(service);

function isTraditionalHighlights(service:Pick<SubService,'name'|'bookingName'>):boolean { const name=fold(service.name+' '+(service.bookingName||'')); return /\bmechas?\b/.test(name)&&/\btradicional(?:es)?\b/.test(name); }
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
export function HighlightOptions({service,selected,onSelect,children,language = 'es',title}:{language?:string;title?:string;service:SubService;selected:ServiceVariant|null|undefined;onSelect:(variant:ServiceVariant)=>void;children:React.ReactNode}){
 if(!matrixReady(service))return <>{children}{isHighlights(service)&&<HighlightComparison key={service.id} service={service} language={language} title={title}/>}</>;
 const axes=selected?variantAxes(selected):null;
 const name=fold(service.name+' '+(service.bookingName||''));
 const technique=title || (isTraditionalHighlights(service) ? 'Mechas tradicionales' : highlightTechniqueLabel(name));
 const localizedLength = {Medio:'medium', Largo:'long', Extralargo:'extraLong'} as const;
 return <div className="lst-highlights-options lst-highlights-by-length">
  <div className="lst-highlights-length-cards">{lengths.map(length=><fieldset key={length} data-selected={axes?.length===length}>
   <legend>{technique} · {catalogLabel(language, localizedLength[length])}</legend>
   <div className="lst-highlights-pair">{intensities.map(intensity=>{
    const variant=service.variants!.find(item=>{const a=variantAxes(item);return a?.length===length&&a.intensity===intensity;})!;
    return <button key={variant.id} type="button" aria-label={technique+' · '+catalogLabel(language, localizedLength[length])+' · '+intensity+' · '+catalogLabel(language, intensity==='SOFT'?'softLight':'fullLight')} aria-pressed={selected?.id===variant.id} onClick={()=>onSelect(variant)}><strong>{intensity}</strong><span>{catalogLabel(language, intensity==='SOFT'?'soft':'full')}</span></button>;
   })}</div>
  </fieldset>)}</div>
  <HighlightComparison key={service.id} service={service} language={language} title={title}/>
 </div>;
}
export function setupDraft(service:SubService):Cell[]|null{
 if(!isHighlights(service))return null;
 const traditional=isTraditionalHighlights(service);
 const variants=traditional?(service.variants||[]).filter(v=>! /\b(?:corto|corta|short)\b/.test(fold(v.name))):(service.variants||[]);
 const source={...service,variants};
 if(matrixReady(source))return lengths.flatMap(length=>intensities.map(intensity=>{
  const base=variants.find(v=>{const a=variantAxes(v);return a?.length===length&&a.intensity===intensity;})!;
  return {length,intensity,id:base.id,price:base.price,minutes:String(parseInt(base.duration.match(/\d+/)?.[0]||'',10)||''),base};
 }));
 if(variants.length!==3)return null;
 const originals=lengths.map(length=>variants.filter(v=>{
  const a=variantAxes(v);
  return a?a.length===length&&!a.intensity:traditional&&length==='Extralargo'&&/\bextra\b/.test(fold(v.name))&&!/\b(?:soft|full)\b/.test(fold(v.name));
 }));
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
type EditorProps = {
 service: SubService;
 onApply: (service: SubService) => void;
 renderBreakdown?: (variant: ServiceVariant) => React.ReactNode;
};
function Editor({service,onApply,initial,renderBreakdown}:EditorProps & {initial:Cell[]}){
 const [cells,setCells]=useState(initial),[error,setError]=useState(''),[done,setDone]=useState(false);
 const [tabs,setTabs]=useState<Record<Length,Intensity>>({Medio:'SOFT',Largo:'SOFT',Extralargo:'SOFT'});
 const change=(i:number,key:'price'|'minutes',value:string)=>{setDone(false);setCells(previous=>previous.map((cell,index)=>index===i?{...cell,[key]:value}:cell));};
 const name=fold(service.name+' '+(service.bookingName||''));
 const technique=isTraditionalHighlights(service) ? 'Mechas tradicionales' : (highlightTechniqueLabel(name));
 return <details className="lst-highlights-editor" open={isTraditionalHighlights(service)}>
  {isTraditionalHighlights(service)&&service.variants?.some(v=>/\b(?:corto|corta|short)\b/.test(fold(v.name)))&&<p>Corto quedará fuera de Mechas tradicionales al aplicar estas opciones. Puedes mantenerlo por separado en Parciales · Corto. Revisa precios y completa los tiempos de SOFT y FULL antes de aplicar y guardar.</p>}
<summary>SOFT / FULL dentro de cada largo</summary>
  <p>Cada largo contiene dos opciones: SOFT y FULL. Pulsa cada botón para editar su precio y duración.</p>
  {!matrixReady(service)&&<p>Las opciones actuales se conservan como FULL, con sus identificadores, precios y tiempos. SOFT queda pendiente de completar. Revisa los importes antes de aplicar.</p>}
  <div className="lst-highlights-editor-grid lst-highlights-editor-by-length">{lengths.map(length=>{
   const intensity=tabs[length],i=cells.findIndex(cell=>cell.length===length&&cell.intensity===intensity),cell=cells[i];
   return <section key={length}>
    <strong>{technique} {length}</strong>
    <div className="lst-highlights-editor-tabs" role="group" aria-label={'Opciones de '+technique+' '+length}>{intensities.map(value=><button key={value} type="button" aria-pressed={intensity===value} onClick={()=>setTabs(previous=>({...previous,[length]:value}))}>{value}</button>)}</div>
    <div className="lst-highlights-editor-fields" aria-label={length+' · '+intensity}>
     <label>Precio · {intensity}<input type="text" value={cell.price} onChange={event=>change(i,'price',event.target.value)} placeholder="Precio de esta opción"/></label>
     {renderBreakdown && cells.filter(option=>option.length===length).map(option=>{
      const variant=service.variants?.find(item=>item.id===option.id);
      return variant && <div key={option.id} hidden={option.intensity!==intensity} className="lst-highlights-breakdown">
       {renderBreakdown(variant)}
      </div>;
     })}
     <label>Duración · {intensity} · minutos<input type="number" min={5} max={1440} step={1} value={cell.minutes} onChange={event=>change(i,'minutes',event.target.value)} placeholder="Completar"/></label>
    </div>
   </section>;
  })}</div>
  {error&&<p role="alert">{error}</p>}{done&&<p role="status">Opciones preparadas. Pulsa «Guardar catálogo» para guardarlas en el servidor.</p>}
  <button type="button" onClick={()=>{try{onApply(applySetup(service,cells));setError('');setDone(true);}catch(value){setError(value instanceof Error?value.message:'Revisa los datos.');}}}>Aplicar opciones al catálogo</button>
 <HighlightComparisonEditor key={service.id} service={service} onApply={onApply}/>
 </details>;
}
export function HighlightsVariantEditor({service,onApply,renderBreakdown}:EditorProps){
 const [initial]=useState(()=>setupDraft(service));
 if(!isHighlights(service))return null;
 if(!initial)return <p className="lst-highlights-setup-note">SOFT/FULL: las opciones deben ser Medio, Largo y Extralargo, o las seis combinaciones de largo e intensidad. Revisa sus nombres antes de configurar.</p>;
 return <Editor service={service} onApply={onApply} initial={initial} renderBreakdown={renderBreakdown}/>;
}
