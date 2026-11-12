import React,{useId,useState} from 'react';
import {MessageCircle,Clock3,MapPin,Phone} from 'lucide-react';
import './studio-visit-links.css';
const digits=(value:string)=>String(value||'').replace(/\D/g,'');
export function visitWhatsapp(value:string){const n=digits(value);return /^\d{9,15}$/.test(n)?'https://wa.me/'+(n.length===9?'34':'')+n:'';}
export function visitMap(value:string){try{const url=new URL(value);return url.protocol==='https:'?url.href:'';}catch{return '';}}
export default function StudioVisitLinks({phone,whatsapp,mapsUrl,address,hoursLabel,callLabel,heading,children}:{phone:string;whatsapp:string;mapsUrl:string;address:string;hoursLabel:string;callLabel:string;heading?:React.ReactNode;children:React.ReactNode}){
 const [expanded,setExpanded]=useState(false),id=useId(),wa=visitWhatsapp(whatsapp),map=visitMap(mapsUrl),tel=(String(phone||'').trim().startsWith('+')?'+':'')+digits(phone);
 return <section className="sv-visit" aria-label="Contacto, horarios y ubicación del Studio">
  {heading&&<div className="sv-heading">{heading}</div>}
  <nav className="sv-links" aria-label="Prepara tu visita">
   {wa?<a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle size={25} strokeWidth={1.4} aria-hidden="true"/><span>WhatsApp</span></a>:<span className="sv-unavailable" aria-label="WhatsApp no disponible"><MessageCircle size={25} strokeWidth={1.4} aria-hidden="true"/><span>WhatsApp</span></span>}
   <button type="button" aria-expanded={expanded} aria-controls={id} aria-label={hoursLabel} onClick={()=>setExpanded(v=>!v)}><Clock3 size={25} strokeWidth={1.4} aria-hidden="true"/><span>Horarios</span></button>
   {map?<a href={map} target="_blank" rel="noopener noreferrer"><MapPin size={25} strokeWidth={1.4} aria-hidden="true"/><span>Cómo llegar</span></a>:<span className="sv-unavailable" aria-label="Ubicación no disponible"><MapPin size={25} strokeWidth={1.4} aria-hidden="true"/><span>Cómo llegar</span></span>}
  </nav>
  <div id={id} className="sv-hours" hidden={!expanded} role="region" aria-label={hoursLabel}>{children}</div>
  {address&&<p className="sv-address">{address}</p>}
  {tel&&<a className="sv-call" href={'tel:'+tel}><Phone size={13} strokeWidth={1.5} aria-hidden="true"/>{callLabel}</a>}
 </section>;
}
