import React from 'react';
import type {BusinessConfig} from './App';
import {STUDIO_WEEK_DAYS,studioReadWeek,studioImportErrors,studioLegacyHours,type StudioHourSpan} from './weeklyHours';
export default function WeeklyHoursEditor({config,setConfig}:{config:BusinessConfig;setConfig:React.Dispatch<React.SetStateAction<BusinessConfig>>}){
 const week=studioReadWeek(config),errors=studioImportErrors(config);
 const change=(day:string,spans:StudioHourSpan[])=>{setConfig(previous=>({...previous,weeklyHours:{...studioReadWeek(previous),[day]:spans}}));};
 return <section aria-label="Horario habitual por días" style={{display:'grid',gap:14}}>
  <style>{`.studio-weekday {display:grid;grid-template-columns:135px minmax(0,1fr);gap:16px;border:1px solid #4B4035;background:#29231F;border-radius:10px;padding:16px;} .studio-weekday button,.studio-weekday input {min-height:44px;padding:9px 12px;box-sizing:border-box;border:1px solid #655039;border-radius:7px;background:#322A25;color:#FFF8EE;font-size:14px;} .studio-weekday button{cursor:pointer;} .studio-weekday button:disabled{opacity:.5;cursor:default;} .studio-weekday input:focus-visible,.studio-weekday button:focus-visible{outline:2px solid #E4C687;outline-offset:3px;} .studio-week-tramo{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;} .studio-week-tramo label{display:grid;gap:5px;color:#D6CBB8;font-size:13px;} @media(max-width:650px){.studio-weekday{grid-template-columns:1fr;gap:10px;}.studio-weekday input{font-size:16px;}}`}</style>
  <p style={{margin:0,fontSize:14,lineHeight:1.6,color:'#D6CBB8'}}>Este horario define los huecos habituales de reserva. Los cierres puntuales se gestionan en Vacaciones y festivos. Las citas existentes se conservan.</p>
  {errors.length>0&&<div role="alert" style={{padding:14,border:'1px solid #A66E57',borderRadius:8,color:'#F5C7B8'}}>{errors.map((error,i)=><p key={i} style={{margin:'4px 0'}}>{error}</p>)}<p style={{fontSize:13}}>Corrige los horarios antes de guardar. Cierre a las 00:00 significa final de ese día.</p></div>}
  {STUDIO_WEEK_DAYS.map(({key,label})=>{const spans=Array.isArray(week?.[key])?week[key]:[];return <article className="studio-weekday" key={key}>
   <div><h4 style={{margin:'0 0 8px',fontSize:16,color:'#FFF8EE'}}>{label}</h4><button type="button" aria-pressed={spans.length>0} disabled={config.weeklyHours===undefined&&errors.length>0} onClick={()=>change(key,spans.length?[]:[{start:'10:00',end:'18:00'}])} style={{color:spans.length?'#BDE1B8':'#E4C687'}}>{spans.length?'Abierto':'Cerrado'}</button></div>
   <div style={{display:'grid',gap:12}}>
    {config.weeklyHours===undefined&&errors.length>0 ? <label style={{color:'#D6CBB8',fontSize:13}}>Horario anterior<input type="text" aria-label={'Horario anterior de '+label} value={studioLegacyHours(config,Number(key))} disabled={key==='0'} onChange={event=>{const field=key==='1'?'scheduleMonday':key==='2'||key==='3'?'scheduleTueWed':key==='4'||key==='5'?'scheduleThuFri':'scheduleSaturday';setConfig(previous=>({...previous,[field]:event.target.value}));}} style={{display:'block',width:'100%',marginTop:6}}/></label> : <>
    {spans.map((span,index)=><div className="studio-week-tramo" key={index}>
      <label>Apertura<input type="time" aria-label={`${label}, apertura del tramo ${index+1}`} value={span.start} step={60} onChange={e=>change(key,spans.map((item,i)=>i===index?{...item,start:e.target.value}:item))}/></label>
      <label>Cierre<input type="time" aria-label={`${label}, cierre del tramo ${index+1}`} value={span.end} step={60} onChange={e=>change(key,spans.map((item,i)=>i===index?{...item,end:e.target.value}:item))}/></label>
      <button type="button" aria-label={`Quitar tramo ${index+1} de ${label}`} onClick={()=>change(key,spans.filter((_,i)=>i!==index))}>Quitar tramo</button>
    </div>)}
    {!spans.length&&<p style={{margin:0,color:'#D6CBB8',fontSize:14}}>Sin reservas habituales este día.</p>}
    {spans.length>0&&<button type="button" disabled={spans.length>=8} onClick={()=>change(key,[...spans,{start:'',end:''}])} style={{justifySelf:'start',color:'#E4C687'}}>+ Añadir tramo</button>}
    </>}
   </div>
  </article>;})}
  <p style={{margin:0,fontSize:13,color:'#D6CBB8',lineHeight:1.6}}>Cierre a las 00:00 indica final del día. Los tramos no pueden solaparse. Pulsa «Guardar cambios» para aplicar el horario al portal y a la agenda.</p>
 </section>;
}
