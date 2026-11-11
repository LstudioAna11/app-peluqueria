import React,{useEffect,useState} from 'react';
import * as studioApi from './studioApi';
import type {Appointment} from './App';
type Day={day:string;name:string;scope:string;source_url:string;is_open:boolean};
export default function OfficialHolidaysView({onChanged,appointments}:{onChanged?:()=>Promise<unknown>;appointments:Appointment[]}){
 const current=Number(new Intl.DateTimeFormat('en',{timeZone:'Europe/Madrid',year:'numeric'}).format(new Date()));
 const [year,setYear]=useState(current+1),[days,setDays]=useState<Day[]>([]),[state,setState]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=async(target:number)=>{setBusy(true);setError('');try{const data=await studioApi.fetchOfficialHolidays(studioApi.currentToken()!,target);setDays(data.days);setState(data.state);}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar.');}finally{setBusy(false);}};
 useEffect(()=>{void load(year);},[year]);
 const refresh=async()=>{setBusy(true);setError('');try{await studioApi.refreshOfficialHolidays(studioApi.currentToken()!,year);await load(year);await onChanged?.();}catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar.');}finally{setBusy(false);}};
 const toggle=async(day:Day)=>{if(!day.is_open){if(!window.confirm('¿Abrir excepcionalmente el '+day.day+'? Se mantienen los horarios habituales y cualquier cierre manual.'))return;}setBusy(true);setError('');try{await studioApi.setOfficialHolidayOpen(studioApi.currentToken()!,day.day,!day.is_open);await load(year);await onChanged?.();}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}finally{setBusy(false);}};
 const status=busy?'Consultando…':error?'No disponible':state?({complete:'Completo',partial:'Faltan locales',pending:'Pendiente',stale:'Sin actualizar'} as Record<string,string>)[state.status]||'Revisar calendario':'Pendiente';
 return <section aria-label="Calendario automático" style={{border:'1px solid #4B4035',borderRadius:12,padding:16,color:'#FFF8EE'}}>
 <details><summary style={{cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',fontSize:15,color:'#E4C687',minHeight:32}}><span>Festivos automáticos · {year} ▾</span><span role="status" aria-live="polite" style={{fontSize:13,color:state?.status==='complete'&&!error?'#BDE1B8':'#E4C687'}}>{status}</span></summary>
 <div style={{display:'grid',gap:12,marginTop:16,fontSize:14}}>
 <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}><label>Año <select aria-label="Año del calendario de festivos" disabled={busy} value={year} onChange={e=>{setDays([]);setState(null);setYear(Number(e.target.value));}} style={{padding:8,background:'#29231F',color:'#FFF8EE',border:'1px solid #655039',borderRadius:7}}>{Array.from({length:8},(_,i)=>current+i).map(y=><option key={y}>{y}</option>)}</select></label>
 <button type="button" disabled={busy} onClick={refresh} style={{padding:'10px 14px',border:'1px solid #655039',borderRadius:7,color:'#E4C687',background:'transparent',cursor:'pointer'}}>{busy?'Consultando…':'Actualizar calendario'}</button></div>
 {state?.status==='partial'&&<p style={{margin:0,color:'#E4C687',fontSize:13}}>Faltan festivos locales de Elche por confirmar.</p>}
 {error&&<p role="alert" style={{color:'#FFC4B5',margin:0}}>{error}</p>}
 {days.length > 0 && <details key={year} style={{marginTop:12,border:'1px solid #67543C',borderRadius:8}}>
   <summary style={{cursor:'pointer',padding:'12px 14px',color:'#E4C687',fontSize:13,minHeight:44,boxSizing:'border-box'}}>Ver festivos de {year} · {days.length} fechas</summary>
   <div style={{maxHeight:'min(360px,50vh)',overflowY:'auto',padding:'0 14px',overscrollBehavior:'contain'}}>
 {days.map(day=>{const affected=appointments.filter(a=>a.dateKey===day.day&&!a.completedAt&&a.lifecycleStatus!=='cancelled'&&a.lifecycleStatus!=='no_show'&&a.saturdayApproval?.status!=='rejected').length;return <article key={day.day} style={{borderTop:'1px solid #67543C',padding:'10px 0',fontSize:12}}><strong>{day.day.split('-').reverse().join('/')} · {day.name}</strong><p>{day.scope} · {day.is_open?'Apertura excepcional':'Cerrado por festivo'}</p>{affected>0&&!day.is_open&&<p style={{color:'#E4C687'}}>Hay {affected} citas: revísalas. No se han cancelado.</p>}<a href={day.source_url} target="_blank" rel="noreferrer" style={{color:'#E4C687'}}>Publicación oficial</a>{' · '}<button disabled={busy} onClick={()=>void toggle(day)}>{day.is_open?'Volver a cerrar':'Abrir excepcionalmente'}</button></article>})}
   </div>
 </details>}
 <details style={{fontSize:13,color:'#D6CBB8'}}><summary style={{cursor:'pointer',padding:'8px 0'}}>Información del calendario</summary>
 <p>Nacionales, Comunitat Valenciana y locales de Elche. Las citas existentes se conservan.</p>
 {state?.message&&<p>{state.message}</p>}
 {state?.checked_at&&<p>Última consulta: {new Date(state.checked_at).toLocaleDateString('es-ES',{timeZone:'Europe/Madrid'})}. Caché: 28 días tras una consulta válida; 24 horas si falla.</p>}
 <p>Datos agregados por <a href="https://calendariosnacionales.com/es/api/" target="_blank" rel="noreferrer" style={{color:'#E4C687'}}>Calendarios Nacionales</a>, contrastables con el enlace oficial de cada fecha.</p>
 </details>
 </div></details>
 </section>;
}

// lst-compact-closures-v1
