import React,{useState} from 'react';
import type {Appointment} from './App';
import {exactPrice} from './promotionPricing';
import {applyAppointmentDiscount,clearAppointmentDiscount,discountMoney,type DiscountableLine,type AppointmentDiscount} from './appointmentDiscounts';
type Props<T extends DiscountableLine>={item:T;name:string;locked?:boolean;allowPriceEdit?:boolean;onChange:(item:T)=>void};
const button:React.CSSProperties={minHeight:44,padding:'8px 12px',border:'1px solid #B9955F',borderRadius:6,color:'#E4C687',background:'transparent',cursor:'pointer',fontSize:12};
type Line=NonNullable<Appointment['services']>[number];
export default function AppointmentDiscountEditor({item,name,locked=false,allowPriceEdit=false,onChange}:Props<Line>){
 const [open,setOpen]=useState(false),[kind,setKind]=useState<AppointmentDiscount['kind']>('percent'),[value,setValue]=useState(''),[error,setError]=useState('');
 let preview:Line|null=null,validation='';try{preview=applyAppointmentDiscount(item,kind,value);}catch(e){validation=(e as Error).message;}
 const discount=item.appointmentDiscount;
 const priceMode=kind==='price';
 const fixedPrice=discount?.kind==='price';
 const openEditor=(newKind:AppointmentDiscount['kind'])=>{
  const currentPrice=exactPrice(item.variant?.price??item.sub.price);
  setKind(newKind);setValue(newKind==='price'&&currentPrice!==null?currentPrice.toFixed(2).replace('.',','):'');setError('');setOpen(true);
 };
 return <div style={{marginTop:6}}>
  <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:8}}>
   <span style={{color:'#E4C687'}}>{discount&&<del style={{color:'#C8B79E',marginRight:7}}>{discount.originalPrice}</del>}<strong>{item.variant?.price??item.sub.price}</strong>{discount&&<small> · {fixedPrice?'Precio de esta cita':discount.kind==='gift'?'Obsequio':discount.kind==='percent'?'−'+discount.value+' %':'−'+discountMoney(discount.value)}</small>}</span>
   {allowPriceEdit&&<button type="button" disabled={locked} aria-expanded={open&&priceMode} aria-label={'Editar precio de '+name} style={button} onClick={()=>openEditor('price')}>Editar precio</button>}
   <button type="button" disabled={locked||fixedPrice&&!allowPriceEdit} aria-expanded={open&&!priceMode} aria-label={'Aplicar descuento a '+name} style={button} onClick={()=>openEditor('percent')}>Aplicar descuento</button>
   {discount&&!locked&&(!fixedPrice||allowPriceEdit)&&<button type="button" style={button} onClick={()=>{onChange(clearAppointmentDiscount(item));setOpen(false);setError('');}}>{fixedPrice?'Restaurar tarifa':'Quitar descuento'}</button>}
  </div>
  {locked&&<small style={{display:'block',color:'#C8B79E'}}>Esta cita tiene anticipo, bono o promoción. Revisa su cobro antes de cambiar el precio.</small>}
  {open&&!locked&&<section aria-label={(priceMode?'Precio de ':'Descuento de ')+name} style={{border:'1px solid #806340',borderRadius:7,padding:10,marginTop:8,display:'grid',gap:8}}>
   {!priceMode&&<label>Tipo de descuento<select aria-label={'Tipo de descuento de '+name} value={kind} onChange={e=>{setKind(e.target.value as AppointmentDiscount['kind']);setError('');}} style={{display:'block',width:'100%',minHeight:44,background:'#322A25',color:'#FFF8EE',border:'1px solid #B9955F',borderRadius:6,padding:8}}><option value="percent">Porcentaje (%)</option><option value="amount">Importe (€)</option><option value="gift">Obsequio · 0 €</option></select></label>}
   {kind!=='gift'&&<label>{priceMode?'Precio final (€)':kind==='percent'?'Porcentaje':'Euros a descontar'}<input aria-label={(priceMode?'Nuevo precio de ':'Valor del descuento de ')+name} inputMode="decimal" type="text" value={value} onChange={e=>{setValue(e.target.value);setError('');}} placeholder={priceMode?'Ej. 28,00':kind==='percent'?'Ej. 10':'Ej. 5,00'} style={{display:'block',width:'100%',boxSizing:'border-box',minHeight:44,padding:8,background:'#322A25',color:'#FFF8EE',border:'1px solid #B9955F',borderRadius:6}}/></label>}
   <p style={{margin:0,color:'#E4C687'}}>{preview?'Precio final: '+discountMoney(preview.appointmentDiscount!.finalAmount):validation}</p>
   <small style={{color:'#C8B79E'}}>Solo para esta cita. Conserva la duración y no cambia el precio del catálogo.</small>
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" style={button} disabled={!preview} onClick={()=>{try{onChange(applyAppointmentDiscount(item,kind,value));setOpen(false);setError('');}catch(e){setError((e as Error).message);}}}>{priceMode?'Aplicar precio':'Aplicar a este servicio'}</button><button type="button" style={button} onClick={()=>{setOpen(false);setError('');}}>Cancelar</button></div>
   {error&&<p role="alert">{error}</p>}
  </section>}
 </div>;
}
