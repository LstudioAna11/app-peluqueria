import React from 'react';
import {searchHelpTopics} from './portalSearchHelp';
import './search-answers.css';
type Service={id:string;name:string;duration:string;price:string;includes:string;hasVariants:boolean};
export default function SearchAnswers({query,services,resultCount,showPrices,whatsapp,onAppointments,onHome}:{query:string;services:Service[];resultCount:number;showPrices:boolean;whatsapp:string;onAppointments:()=>void;onHome:()=>void}){
 const topics=searchHelpTopics(query);if(!topics.length&&resultCount>0)return null;
 const phone=String(whatsapp||'').replace(/\D/g,''),wa=/^\d{9,15}$/.test(phone)?'https://wa.me/'+(phone.length===9?'34':'')+phone:'';
 const safeText=(text:string)=>showPrices?text:text.replace(/(?:\d[\d.,]*\s*(?:€|euros?\b)|(?:€|EUR)\s*\d[\d.,]*)/gi,'importe a consultar');
 const serviceTopics=topics.some(t=>['price','duration','includes'].includes(t));
 return <aside className="sa-answers" aria-label="Respuestas a dudas frecuentes"><h3>{topics.length?'Dudas frecuentes':'¿No encuentras lo que buscas?'}</h3>
 {topics.includes('appointments')&&<div><p>En «Mis citas» puedes consultar las opciones de cambio y cancelación disponibles para tu reserva. Si no aparece la opción que necesitas, contacta con Ana.</p><button type="button" onClick={onAppointments}>Ir a Mis citas →</button></div>}
 {topics.includes('booking')&&<p>Busca un servicio, abre su ficha y elige sus opciones y complementos. Después podrás consultar las fechas y horas disponibles para tu selección.</p>}
 {topics.includes('payment')&&<p>Si tu cita requiere un anticipo, consulta el importe y las instrucciones en tu reserva. Para dudas sobre un pago o una devolución, contacta con Ana.</p>}
 {topics.includes('hours')&&<div><p>El horario del Studio está disponible en Inicio. La disponibilidad de una cita se consulta al elegir los servicios y la fecha.</p><button type="button" onClick={onHome}>Consultar horarios en Inicio →</button></div>}
 {topics.includes('choice')&&<p>Busca el nombre de los servicios que quieres comparar y revisa sus fichas. Si no sabes cuál elegir, Ana puede ayudarte antes de reservar.</p>}
 {topics.includes('assessment')&&<p>Para molestias del cuero cabelludo o dudas sobre la idoneidad de un tratamiento, consulta con Ana antes de reservar. Este buscador no realiza diagnósticos.</p>}
 {topics.includes('price')&&!showPrices&&<p>Los precios no se muestran en el portal. Consulta con Ana el importe del servicio que necesitas.</p>}
 {serviceTopics&&services.length>0&&<div className="sa-services">{services.slice(0,6).map(s=><article key={s.id}><strong>{s.name}</strong>{topics.includes('duration')&&<p>{s.hasVariants?'La duración depende de la opción que elijas. Consulta la ficha del servicio.':s.duration?'Duración indicada: '+s.duration:'Consulta la duración con Ana.'}</p>}{topics.includes('price')&&showPrices&&<p>{s.hasVariants?'Consulta el importe de cada opción en la ficha.':s.price?'Precio indicado: '+s.price:'Consulta el precio con Ana.'}</p>}{topics.includes('includes')&&<p>{s.includes?safeText(s.includes):'Consulta la ficha para ver qué incluye. Si no está indicado, confírmalo con Ana.'}</p>}</article>)}{services.length>6&&<p>Hay más coincidencias en los servicios de abajo. Busca un nombre más concreto para acotar.</p>}</div>}
 {serviceTopics&&services.length===0&&!(topics.length===1&&topics[0]==='price'&&!showPrices)&&<p>Añade el nombre del servicio a tu búsqueda, por ejemplo «cuánto dura un corte» o «qué incluye el peinado». Las respuestas se basan en su ficha.</p>}
 {!topics.length&&<p>Prueba con un nombre de servicio o una duda concreta. Si no aparece una respuesta clara, consulta con Ana.</p>}
 {wa&&<a href={wa} target="_blank" rel="noopener noreferrer">Consultar con Ana por WhatsApp ↗</a>}
 </aside>;
}
