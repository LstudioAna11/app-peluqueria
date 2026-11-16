import React,{useState} from 'react';
import type {Appointment,CatalogCategory,SubService} from './App';
export const GRAMS=[10,20,30,40,50] as const;
type Item=NonNullable<Appointment['services']>[number];
const fold=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const isStraighteningSupplement=(s:SubService)=>Boolean(s.staffSupplementFor);
export const isStraightening=(s:SubService)=>!isStraighteningSupplement(s)&&/alisad/.test(fold(s.name+' '+(s.bookingName||'')));
export function parseProductPrice(value:string):number|null{
 const text=value.trim().replace(/\s*€$/,'').trim();
 if(!/^\d{1,4}(?:[.,]\d{1,2})?$/.test(text))return null;
 const n=Number(text.replace(',','.'));return Number.isFinite(n)&&n<=9999.99?n:null;
}
const euros=(n:number)=>n.toFixed(2).replace('.',',')+' €';
export function configureStraighteningProduct(catalog:CatalogCategory[],parentId:string,prices:string[]):CatalogCategory[]{
 const category=catalog.find(c=>c.subservices.some(s=>s.id===parentId));
 const parent=category?.subservices.find(s=>s.id===parentId);
 if(!parent||!isStraightening(parent))throw Error('No se encuentra el servicio de alisado.');
 const amounts=prices.map(parseProductPrice);
 if(prices.length!==5||amounts.some(n=>n===null))throw Error('Introduce un precio válido para cada cantidad de producto.');
 const matches=catalog.flatMap(c=>c.subservices).filter(s=>s.staffSupplementFor===parentId);
 if(matches.length>1)throw Error('Hay suplementos duplicados. Revisa el catálogo antes de continuar.');
 const old=matches[0];
 if(!old&&catalog.some(c=>c.subservices.some(s=>s.id==='lst-product-'+parentId)))throw Error('El identificador del suplemento ya está en uso. No se ha modificado el catálogo.');
 const supplement:SubService={...old,id:old?.id||'lst-product-'+parentId,name:'Producto adicional · Alisado',bookingName:'Producto adicional · Alisado',description:'Suplemento según el producto utilizado. Selección exclusiva del Studio.',duration:'0 min',price:'0 €',active:false,staffSupplementFor:parentId,hasVariants:true,priceType:'fijo',bufferMinutes:0,bufferTime:'0 min',bizumPolicy:'none',bizumAmount:0,variants:GRAMS.map((g,i)=>({id:old?.variants?.find(v=>v.name===g+' g')?.id||'lst-product-'+parentId+'-'+g,name:g+' g',description:'Producto adicional de alisado',duration:'0 min',price:euros(amounts[i]!)}))};
 return catalog.map(c=>({...c,subservices:[...c.subservices.filter(s=>s.id!==supplement.id),...(c.id===category!.id?[supplement]:[])]}));
}
export function setStraighteningProduct(items:Item[],category:CatalogCategory,sub:SubService,variantId:string|null):Item[]{
 if(!sub.staffSupplementFor||!items.some(i=>i.sub.id===sub.staffSupplementFor&&isStraightening(i.sub)))throw Error('Añade primero el servicio de alisado.');
 const remaining=items.filter(i=>i.sub.id!==sub.id&&i.sub.staffSupplementFor!==sub.staffSupplementFor);
 if(variantId===null)return remaining;
 const variant=sub.variants?.find(v=>v.id===variantId);
 if(!variant||!GRAMS.some(g=>variant.name===g+' g')||parseProductPrice(variant.price)===null)throw Error('La tarifa de esta cantidad no está configurada.');
 return [...remaining,{categoryId:category.id,categoryName:category.title,sub:structuredClone(sub),variant:structuredClone(variant)}];
}
export function straighteningProductError(items:Item[]):string{
 const seen=new Set<string>();
 for(const item of items.filter(i=>isStraighteningSupplement(i.sub))){
  const parent=item.sub.staffSupplementFor!;
  if(!items.some(i=>i.sub.id===parent&&isStraightening(i.sub)))return 'El producto adicional necesita su servicio de alisado en la cita. Quita el suplemento o añade el alisado.';
  if(seen.has(parent))return 'Selecciona una sola cantidad de producto adicional por alisado.';
  seen.add(parent);
  if(item.sub.active!==false||item.sub.bizumPolicy!=='none'||item.sub.bufferMinutes!==0||!item.variant||!GRAMS.some(g=>item.variant!.name===g+' g')||item.variant.duration!=='0 min'||parseProductPrice(item.variant.price)===null)return 'Revisa la configuración del producto adicional antes de guardar la cita.';
 }
 return '';
}
const box:React.CSSProperties={border:'1px solid #806340',borderRadius:8,padding:12,color:'#FFF8EE',margin:'10px 0'};
const button:React.CSSProperties={minHeight:44,padding:'8px 12px',border:'1px solid #C5A059',borderRadius:7,background:'#322A25',color:'#E4C687',cursor:'pointer'};
export function StraighteningProductConfig({catalog,service,onChange,disabled=false}:{catalog:CatalogCategory[];service:SubService;onChange:React.Dispatch<React.SetStateAction<CatalogCategory[]>>;disabled?:boolean}){
 const existing=catalog.flatMap(c=>c.subservices).find(s=>s.staffSupplementFor===service.id);
 const signature=JSON.stringify(existing?.variants||[]);
 return isStraightening(service)?<div className="studio-editor-options"><details style={box}><summary style={{cursor:'pointer'}}>Producto adicional · Alisado</summary><ProductPrices key={service.id+signature} catalog={catalog} service={service} onChange={onChange} disabled={disabled}/></details></div>:null;
}
function ProductPrices({catalog,service,onChange,disabled}:{catalog:CatalogCategory[];service:SubService;onChange:React.Dispatch<React.SetStateAction<CatalogCategory[]>>;disabled:boolean}){
 const existing=catalog.flatMap(c=>c.subservices).find(s=>s.staffSupplementFor===service.id);
 const [prices,setPrices]=useState(()=>GRAMS.map(g=>existing?.variants?.find(v=>v.name===g+' g')?.price.replace(/\s*€/,'')||''));
 const [message,setMessage]=useState('');
 const valid=prices.every(p=>parseProductPrice(p)!==null);
 return <div><p style={{fontSize:12,lineHeight:1.6}}>Configura el importe total del suplemento para cada cantidad. Solo lo selecciona el Studio desde la cita. No añade tiempo.</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(90px,1fr))',gap:8}}>{GRAMS.map((g,i)=><label key={g} style={{fontSize:13}}>{g} g · €<input aria-label={'Precio de '+g+' g'} inputMode="decimal" value={prices[i]} disabled={disabled} placeholder="Precio" onChange={e=>setPrices(p=>p.map((v,j)=>j===i?e.target.value:v))} style={{...button,width:'100%',boxSizing:'border-box',marginTop:6}}/></label>)}</div><button type="button" style={{...button,marginTop:12}} disabled={disabled||!valid} onClick={()=>{onChange(previous=>configureStraighteningProduct(previous,service.id,prices));setMessage('Tarifas aplicadas. Pulsa Guardar cambios del catálogo para conservarlas.');}}>Aplicar tarifas</button><p role="status" style={{fontSize:12}}>{message||'Después de aplicar las tarifas, guarda los cambios del catálogo.'}</p></div>;
}
export function StraighteningProductPicker({catalog,items,onChange,disabled=false}:{catalog:CatalogCategory[];items:Item[];onChange:React.Dispatch<React.SetStateAction<Item[]>>;disabled?:boolean}){
 const bases=items.filter(i=>isStraightening(i.sub));
 if(!bases.length)return null;
 return <details style={box} open><summary>Producto adicional · Alisado</summary>{bases.map(base=>{
 const category=catalog.find(c=>c.subservices.some(s=>s.staffSupplementFor===base.sub.id));
 const supplement=category?.subservices.find(s=>s.staffSupplementFor===base.sub.id);
 const selected=items.find(i=>i.sub.staffSupplementFor===base.sub.id);
 return <div key={base.sub.id}><p style={{fontSize:12}}>{base.sub.name} · Añade solo el producto extra utilizado.</p>{supplement&&category?<><div role="group" aria-label={'Cantidad adicional para '+base.sub.name} style={{display:'flex',flexWrap:'wrap',gap:8}}>{GRAMS.map(g=>{
 const variant=supplement.variants?.find(v=>v.name===g+' g');const chosen=selected?.variant?.id===variant?.id;
 return <button key={g} type="button" aria-pressed={!!chosen} disabled={disabled||!variant||parseProductPrice(variant.price)===null} onClick={()=>onChange(previous=>setStraighteningProduct(previous,category,supplement,variant!.id))} style={{...button,background:chosen?'#C49A58':button.background,color:chosen?'#29231F':button.color}}>{g} g <small style={{display:'block'}}>{variant?.price||'Sin tarifa'}</small></button>;
 })}</div>{selected&&<p style={{fontSize:12}}>Añadido: {selected.variant?.name} · {selected.variant?.price} <button type="button" disabled={disabled} style={button} onClick={()=>onChange(previous=>setStraighteningProduct(previous,category,supplement,null))}>Quitar suplemento</button></p>}<small style={{display:'block',marginTop:8}}>El importe se suma una sola vez al total. Guarda los cambios de la cita.</small></>:<p style={{fontSize:12}}>Configura primero los precios en Catálogo → {base.sub.name} → Editar → Opciones → Producto adicional.</p>}</div>;
 })}</details>;
}
