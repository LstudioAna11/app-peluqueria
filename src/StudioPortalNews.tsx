import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,X,Tag} from 'lucide-react';
import {StudioNews} from './DeferredFeatures';
import {isVisiblePromotion,madridToday,promotionServiceIds,safePromotionImage,type Promotion} from './promotions';
import './studio-promo-news.css';
type Option={id:string;label:string};
type Props={promotions?:Promotion[];serviceOptions?:Option[];promotionServiceOptions?:Option[];onService?:(id:string,action:'service'|'booking')=>void;onReserve?:(promotion:Promotion)=>boolean};
const dateLabel=(date:string)=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(date+'T12:00:00Z'));
export default function StudioPortalNews({promotions=[],serviceOptions=[],promotionServiceOptions=serviceOptions,onService,onReserve}:Props){
 const [today,setToday]=useState(madridToday),[selectedId,setSelectedId]=useState<string|null>(null);
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')setToday(madridToday());};const timer=window.setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);};},[]);
 const visible=promotions.filter(p=>isVisiblePromotion(p,today));
 const selected=visible.find(p=>p.id===selectedId);
 useEffect(()=>{const el=dialog.current;if(selected){if(el&&!el.open)el.showModal();}else if(selectedId){el?.close();setSelectedId(null);}},[selectedId,selected]);
 const close=()=>{dialog.current?.close();setSelectedId(null);trigger.current?.focus();};
 const reserve=()=>{const current=promotions.find(p=>p.id===selectedId);if(!current||!isVisiblePromotion(current,madridToday())){setToday(madridToday());close();return;}if(onReserve?.(current))close();};
 const cards=visible.length?<div className="spn-list" aria-label="Promociones vigentes">{visible.map(p=><article className="spn-card" key={p.id}>
  {safePromotionImage(p.imageUrl)&&<img src={safePromotionImage(p.imageUrl)} alt="" loading="lazy" decoding="async"/>}
  <div className="spn-body"><small className="spn-kind"><Tag size={13} aria-hidden="true"/> Promoción</small><h3>{p.title}</h3>{p.price&&<strong className="spn-benefit">{p.price}</strong>}{p.endDate&&<p className="spn-until">Disponible hasta el {dateLabel(p.endDate)}</p>}
  <button type="button" aria-haspopup="dialog" aria-label={'Ver promoción: '+p.title} onClick={event=>{if(!isVisiblePromotion(p,madridToday())){setToday(madridToday());return;}trigger.current=event.currentTarget;setSelectedId(p.id);}}>Ver promoción <ArrowRight size={15} aria-hidden="true"/></button></div>
 </article>)}</div>:null;
 return <><StudioNews serviceOptions={serviceOptions} onService={onService} promotionCards={cards}/>
 {selected&&<dialog ref={dialog} className="spn-dialog" aria-labelledby="spn-title" onClose={()=>{setSelectedId(null);trigger.current?.focus();}}><header><span className="spn-kind">Promoción del Studio</span><button type="button" aria-label="Cerrar promoción" onClick={close}><X size={21} aria-hidden="true"/></button></header>{safePromotionImage(selected.imageUrl)&&<img src={safePromotionImage(selected.imageUrl)} alt=""/>}<h2 id="spn-title">{selected.title}</h2>{selected.description&&<p>{selected.description}</p>}{selected.price&&<strong className="spn-benefit">{selected.price}</strong>}{selected.endDate&&<p className="spn-until">Disponible hasta el {dateLabel(selected.endDate)}</p>}{promotionServiceIds(selected).length>0&&<><h3>Servicios incluidos</h3><ul>{promotionServiceIds(selected).map(id=><li key={id}>{promotionServiceOptions.find(s=>s.id===id)?.label||'Servicio no disponible'}</li>)}</ul></>}{selected.conditions&&<><h3>Condiciones</h3><p>{selected.conditions}</p></>}{onReserve&&promotionServiceIds(selected).length>0&&(promotionServiceIds(selected).every(id=>promotionServiceOptions.some(s=>s.id===id))?<button type="button" className="spn-reserve" onClick={reserve}>Reservar promoción <ArrowRight size={16} aria-hidden="true"/></button>:<p>El servicio de esta promoción no está disponible para reservar ahora.</p>)}</dialog>}</>;
}
