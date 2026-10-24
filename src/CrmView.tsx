import React, { useState, useEffect, useRef } from 'react';
import { Home, Scissors, CalendarDays, User, LogOut, BookOpen, ArrowRight, ArrowLeft, UserRoundSearch, Sparkles, Info, ChevronLeft, ChevronRight, ChevronDown, ImagePlus, Trash2, Globe, MapPin, MessageCircle, Clock3, Instagram, Facebook, Music2 } from 'lucide-react';
import * as studioApi from './studioApi';
import type { StudioEmployee, BusinessConfig, ServiceVariant, Appointment, StylingPolicy, FinishKind, ServiceTranslation, SubService, CatalogCategory, ClientRecord, LostDemandRecord, FeedbackRecord, HolidayBlock } from './App';
interface Props {
  appointments: Appointment[];
  bizConfig: BusinessConfig;
  crmView: "resumen" | "clientas" | "servicios" | "informes";
  dashboardEnd: string;
  dashboardStart: string;
  formatDateKey: (d: Date) => string;
  isActiveAppointment: (appointment: Appointment) => boolean;
  isDateBlockedByHoliday: (dateKey: string) => boolean;
  listaClientes: ClientRecord[];
  lostDemandsList: LostDemandRecord[];
  setAdminTab: React.Dispatch<React.SetStateAction<"agenda" | "clients" | "catalog" | "config" | "detractors" | "crm" | "demands" | "holidays">>;
  setAgendaSidePanel: React.Dispatch<React.SetStateAction<"pending" | "day" | null>>;
  setClientStatusFilter: React.Dispatch<React.SetStateAction<"active" | "all" | "archived">>;
  setCrmView: React.Dispatch<React.SetStateAction<"resumen" | "clientas" | "servicios" | "informes">>;
  setDashboardEnd: React.Dispatch<React.SetStateAction<string>>;
  setDashboardStart: React.Dispatch<React.SetStateAction<string>>;
  setPendingPanelFilter: React.Dispatch<React.SetStateAction<"all" | "approval" | "payment">>;
  timeBlocks: { id: string; dateKey: string; time: string; durationMinutes: number; reason: string; }[];
  trafficEvents: { id: string; type: string; visitor: string; session: string; at: string; source: string; }[];
  workingRanges: (date: Date) => { start: number; end: number; }[];
}
export default function CrmView(props: Props) {
 const { appointments, bizConfig, crmView, dashboardEnd, dashboardStart, formatDateKey, isActiveAppointment, isDateBlockedByHoliday, listaClientes, lostDemandsList, setAdminTab, setAgendaSidePanel, setClientStatusFilter, setCrmView, setDashboardEnd, setDashboardStart, setPendingPanelFilter, timeBlocks, trafficEvents, workingRanges }=props;
 return ((() => {
            const valid = /^\d{4}-\d{2}-\d{2}$/.test(dashboardStart) && /^\d{4}-\d{2}-\d{2}$/.test(dashboardEnd) && dashboardStart <= dashboardEnd && (Date.parse(dashboardEnd) - Date.parse(dashboardStart)) / 86400000 <= 366;
            const inPeriod = appointments.filter(item => valid && item.dateKey >= dashboardStart && item.dateKey <= dashboardEnd);
            const booked = inPeriod.filter(item => item.lifecycleStatus !== 'cancelled' && item.lifecycleStatus !== 'no_show' && item.saturdayApproval?.status !== 'pending' && item.saturdayApproval?.status !== 'rejected' && item.advancePayment?.status !== 'pending');
            const serviceCounts = new Map<string, { name: string; count: number }>();
            booked.forEach(appointment => {
              if (!appointment.services?.length) return;
              const seen = new Set<string>();
              appointment.services.forEach(item => {
                const key = item.sub.id || item.sub.name;
                if (seen.has(key)) return; seen.add(key);
                const current = serviceCounts.get(key) || { name: item.sub.name, count: 0 };
                serviceCounts.set(key, { ...current, count: current.count + 1 });
              });
            });
            const channelRows = [
              { name: 'Portal de clientas', count: inPeriod.filter(item => item.bookingChannel === 'portal').length },
              { name: 'Agenda de Ana', count: inPeriod.filter(item => item.bookingChannel === 'admin').length },
              { name: 'Sin canal registrado', count: inPeriod.filter(item => !item.bookingChannel).length }
            ];
            const completedInPeriod = booked.filter(item => !!item.completedAt && !!item.email.trim());
            const attendedEmails = new Set(completedInPeriod.map(item => item.email.trim().toLowerCase()));
            let returning = 0;
            attendedEmails.forEach(email => {
              const first = completedInPeriod.filter(item => item.email.trim().toLowerCase() === email).sort((a,b) => (a.dateKey + a.time).localeCompare(b.dateKey + b.time))[0];
              if (appointments.some(item => item.completedAt && isActiveAppointment(item) && item.email.trim().toLowerCase() === email && item.id !== first.id && (item.dateKey + item.time) < (first.dateKey + first.time))) returning++;
            });
            const monthlyClients = new Map<string,number>();
            listaClientes.forEach(client => {
              if (!client.createdAt || !Number.isFinite(Date.parse(client.createdAt))) return;
              const month = formatDateKey(new Date(client.createdAt)).slice(0,7);
              monthlyClients.set(month, (monthlyClients.get(month) || 0) + 1);
            });
            const newClientsInPeriod = listaClientes.filter(client => client.createdAt && valid && formatDateKey(new Date(client.createdAt)) >= dashboardStart && formatDateKey(new Date(client.createdAt)) <= dashboardEnd).length;
            const monthlyClientsRows = Array.from(monthlyClients.entries()).sort((a,b) => b[0].localeCompare(a[0])).slice(0,12);
            const ranking = Array.from(serviceCounts.values()).sort((a,b) => b.count - a.count);
            const minutes = (time: string) => { const [h,m] = time.split(':').map(Number); return h * 60 + m; };
            const days: { date: string; available: number; occupied: number }[] = [];
            if (valid) for (const day = new Date(dashboardStart + 'T12:00:00'); formatDateKey(day) <= dashboardEnd; day.setDate(day.getDate() + 1)) {
              const key = formatDateKey(day); const available = new Set<number>(); const occupied = new Set<number>();
              if (!isDateBlockedByHoliday(key)) workingRanges(day).forEach(range => { for (let m = range.start; m < range.end; m++) available.add(m); });
              timeBlocks.filter(block => block.dateKey === key).forEach(block => { const start = minutes(block.time); for (let m = start; m < start + block.durationMinutes; m++) available.delete(m); });
              booked.filter(item => item.dateKey === key).forEach(item => { const start = minutes(item.time); for (let m = start; m < start + (item.durationMinutes || 45); m++) if (available.has(m)) occupied.add(m); });
              days.push({ date: key, available: available.size, occupied: occupied.size });
            }
            const demandInPeriod = valid ? lostDemandsList.filter(item => {
              const key = item.observedAt ? formatDateKey(new Date(item.observedAt)) : /^\d{2}\/\d{2}\/\d{4}$/.test(item.date) ? item.date.split('/').reverse().join('-') : item.date.slice(0,10);
              return key >= dashboardStart && key <= dashboardEnd && item.reason === 'sin_disponibilidad';
            }) : [];
            const capacity = days.reduce((sum,day) => sum + day.available,0);
            const occupied = days.reduce((sum,day) => sum + day.occupied,0);
            const spanDays = valid ? Math.round((Date.parse(dashboardEnd) - Date.parse(dashboardStart)) / 86400000) + 1 : 0;
            const previousEndDate = new Date(dashboardStart + 'T12:00:00'); previousEndDate.setDate(previousEndDate.getDate() - 1);
            const previousStartDate = new Date(previousEndDate); previousStartDate.setDate(previousStartDate.getDate() - spanDays + 1);
            const previousFrom = valid ? formatDateKey(previousStartDate) : '';
            const previousTo = valid ? formatDateKey(previousEndDate) : '';
            const previousBooked = appointments.filter(item => valid && item.dateKey >= previousFrom && item.dateKey <= previousTo && item.lifecycleStatus !== 'cancelled' && item.lifecycleStatus !== 'no_show' && item.saturdayApproval?.status !== 'pending' && item.saturdayApproval?.status !== 'rejected' && item.advancePayment?.status !== 'pending');
            let previousCapacity = 0; let previousOccupied = 0;
            if (valid) for (const day = new Date(previousStartDate); day <= previousEndDate; day.setDate(day.getDate() + 1)) {
              const key = formatDateKey(day); const available = new Set<number>(); const taken = new Set<number>();
              if (!isDateBlockedByHoliday(key)) workingRanges(day).forEach(range => { for (let m = range.start; m < range.end; m++) available.add(m); });
              timeBlocks.filter(block => block.dateKey === key).forEach(block => { const start = minutes(block.time); for (let m = start; m < start + block.durationMinutes; m++) available.delete(m); });
              previousBooked.filter(item => item.dateKey === key).forEach(item => { const start = minutes(item.time); for (let m = start; m < start + (item.durationMinutes || 45); m++) if (available.has(m)) taken.add(m); });
              previousCapacity += available.size; previousOccupied += taken.size;
            }
            const previousDemand = lostDemandsList.filter(item => { const key = item.observedAt ? formatDateKey(new Date(item.observedAt)) : /^\d{2}\/\d{2}\/\d{4}$/.test(item.date) ? item.date.split('/').reverse().join('-') : item.date.slice(0,10); return valid && key >= previousFrom && key <= previousTo && item.reason === 'sin_disponibilidad'; }).length;
            const comparison = [
              { label: 'Citas confirmadas y realizadas', current: booked.length, previous: previousBooked.length, unit: 'citas' },
              { label: 'Ocupación', current: capacity ? Math.round(occupied / capacity * 100) : null, previous: previousCapacity ? Math.round(previousOccupied / previousCapacity * 100) : null, unit: 'puntos porcentuales' },
              { label: 'Búsquedas sin hueco', current: demandInPeriod.length, previous: previousDemand, unit: 'intentos' }
            ];
            const completedCount = booked.filter(item => !!item.completedAt).length;
            const cancelledCount = inPeriod.filter(item => item.lifecycleStatus === 'cancelled').length;
            const noShowCount = inPeriod.filter(item => item.lifecycleStatus === 'no_show').length;
            const pendingCount = inPeriod.filter(item => isActiveAppointment(item) && !item.completedAt && (item.saturdayApproval?.status === 'pending' || item.advancePayment?.status === 'pending')).length;
            const periodLabel = valid ? `${dashboardStart.split('-').reverse().join('/')} – ${dashboardEnd.split('-').reverse().join('/')}` : 'Selecciona un periodo válido';
            const occupancy = capacity ? Math.round(occupied / capacity * 100) : null;
            const top = Math.max(1, ...ranking.map(item => item.count));
            const metricCard = (label: string, value: string | number, help: string, accent = '#E4C687') => <article className="crm-card crm-metric" key={label}><span className="crm-label">{label}</span><strong style={{color: accent}}>{value}</strong><small>{help}</small></article>;
            const compareCards = <div className="crm-grid crm-three">{comparison.map(metric => <article className="crm-card" key={metric.label}><span className="crm-label">{metric.label}</span><div className="crm-comparison"><strong>{metric.current ?? '—'}{metric.unit === 'puntos porcentuales' && metric.current !== null ? '%' : ''}</strong><span>antes {metric.previous ?? '—'}{metric.unit === 'puntos porcentuales' && metric.previous !== null ? '%' : ''}</span></div><div className="crm-bars">{[{label:'Ahora',value:metric.current,color:'#E4C687'},{label:'Antes',value:metric.previous,color:'#AFA394'}].map(bar => <div key={bar.label} className="crm-bar-row"><span>{bar.label}</span><div className="crm-track"><div style={{background:bar.color,width:`${bar.value === null ? 0 : Math.min(100,bar.value / (metric.unit === 'puntos porcentuales' ? 100 : Math.max(metric.current || 0,metric.previous || 0,1))*100)}%`}} /></div></div>)}</div><small>{metric.current === null || metric.previous === null ? 'No hay horario suficiente para comparar' : `${metric.current - metric.previous > 0 ? '+' : ''}${metric.current - metric.previous} ${metric.unit === 'puntos porcentuales' ? 'puntos de ocupación' : metric.unit} frente al periodo anterior`}</small></article>)}</div>;
            return <section className="studio-crm-report crm-visual">
              <style>{`
                .crm-visual {color:#FFF8EE;display:flex;flex-direction:column;gap:18px;font-size:14px}
                .crm-visual h2,.crm-visual h3,.crm-visual h4,.crm-visual p{margin:0}
                .crm-visual h2{color:#E4C687;font-size:29px;font-weight:400;letter-spacing:.02em}
                .crm-visual h3{color:#FFF8EE;font-size:18px;font-weight:500;letter-spacing:.01em}
                .crm-visual h4{color:#E4C687;font-size:15px;font-weight:500}
                .crm-visual small{display:block;color:#D6CBB8;font-size:12px;line-height:1.6}
                .crm-visual button,.crm-visual a{font-family:inherit}
                .crm-heading,.crm-section-title{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
                .crm-heading p{color:#D6CBB8;margin-top:7px;line-height:1.6}
                .crm-period-badge{padding:9px 13px;background:#3E342C;border:1px solid #655039;border-radius:30px;color:#E4C687;font-size:12px}
                .crm-toolbar{padding:14px;background:#322A25;border:1px solid #655039;border-radius:13px;display:flex;flex-wrap:wrap;gap:12px;align-items:end}
                .crm-shortcuts{display:flex;gap:6px;flex-wrap:wrap;margin-right:auto}
                .crm-visual .crm-button{min-height:40px;padding:9px 14px;border:1px solid #806340;border-radius:8px;color:#FFF8EE;background:#29231F;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:13px}
                .crm-visual .crm-button:hover{background:#4A3C2F;border-color:#E4C687}
                .crm-visual .crm-gold{background:#C49A58;color:#221D19;font-weight:600}
                .crm-toolbar label{color:#D6CBB8;font-size:11px;display:flex;flex-direction:column;gap:5px}
                .crm-toolbar input{color-scheme:dark;min-height:40px;box-sizing:border-box;background:#221D19;border:1px solid #655039;border-radius:7px;padding:7px 10px;color:#FFF8EE;font-size:13px}
                .crm-tabs{display:flex;gap:6px;padding:5px;background:#221D19;border:1px solid #655039;border-radius:12px;flex-wrap:wrap}
                .crm-tabs button{flex:1;min-width:110px;min-height:43px;border:1px solid transparent;border-radius:8px;background:transparent;color:#D6CBB8;font-size:13px;cursor:pointer;display:flex;gap:7px;align-items:center;justify-content:center}
                .crm-tabs button[aria-selected=true]{background:#C49A58;color:#221D19;font-weight:600}
                .crm-tabs button:focus-visible,.crm-button:focus-visible{outline:2px solid #FFF8EE;outline-offset:3px}
                .crm-grid{display:grid;gap:12px}.crm-four{grid-template-columns:repeat(4,minmax(0,1fr))}.crm-three{grid-template-columns:repeat(3,minmax(0,1fr))}.crm-two{grid-template-columns:repeat(2,minmax(0,1fr))}
                .crm-card{border:1px solid #655039;border-radius:13px;background:linear-gradient(140deg,#382F28,#2D2621);padding:18px;min-width:0;box-sizing:border-box}
                .crm-label{color:#E5D8C4;font-size:12px;line-height:1.5;display:block}
                .crm-metric strong{display:block;font-size:35px;font-weight:500;line-height:1.2;margin:10px 0 7px}
                .crm-track{height:9px;border-radius:20px;background:#181512;overflow:hidden}.crm-track>div{height:100%;border-radius:20px}
                .crm-ranking{display:flex;flex-direction:column;gap:16px;margin-top:18px}.crm-ranking-row{display:grid;grid-template-columns:25px minmax(0,1fr) 35px;align-items:start;gap:10px}.crm-ranking-row>span{color:#CBB79B;font-size:12px}.crm-ranking-row strong{font-size:13px;color:#E4C687;text-align:right}.crm-ranking-row p{font-size:13px;margin-bottom:8px;line-height:1.5}
                .crm-actions{display:flex;flex-direction:column;gap:9px;margin-top:16px}.crm-actions button{width:100%;justify-content:space-between!important;text-align:left}
                .crm-status{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.crm-status span{padding:7px 10px;border-radius:7px;background:#221D19;border:1px solid #655039;color:#D6CBB8;font-size:12px}
                .crm-comparison{display:flex;align-items:baseline;gap:12px;margin:13px 0}.crm-comparison strong{color:#E4C687;font-size:28px}.crm-comparison span{font-size:12px;color:#D6CBB8}.crm-bars{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}.crm-bar-row{display:grid;grid-template-columns:40px 1fr;gap:9px;align-items:center;font-size:11px;color:#D6CBB8}
                .crm-empty{padding:25px 10px;text-align:center;color:#D6CBB8;font-size:13px}.crm-note{font-size:12px;color:#D6CBB8;line-height:1.7}.crm-notes{border:1px dashed #655039;border-radius:10px;padding:13px;color:#D6CBB8;font-size:12px;line-height:1.7}.crm-notes summary{cursor:pointer;color:#E4C687}.crm-notes p{margin-top:10px}.crm-table{width:100%;border-collapse:collapse;font-size:12px}.crm-table td,.crm-table th{padding:11px 8px;border-bottom:1px solid #554535;text-align:left}.crm-table th{color:#E4C687;font-weight:500}.crm-table td{color:#E5D8C4}
                @media(max-width:1000px){.crm-four{grid-template-columns:repeat(2,minmax(0,1fr))}.crm-three{grid-template-columns:1fr}}
                @media(max-width:620px){.crm-two{grid-template-columns:1fr}.crm-card{padding:14px}.crm-metric strong{font-size:28px}.crm-toolbar label{flex:1}.crm-toolbar input{width:100%}}
                @media print{body *{visibility:hidden!important}.studio-crm-report,.studio-crm-report *{visibility:visible!important}.studio-crm-report{position:absolute!important;left:0;top:0;width:100%!important;background:white!important;padding:16px;box-sizing:border-box}.crm-visual *{color:#221D19!important;background:transparent!important;box-shadow:none!important}.crm-visual button,.crm-toolbar,.crm-tabs,.studio-crm-export{display:none!important}.crm-card{break-inside:avoid}.crm-track{border:1px solid #999}}
              `}</style>
              <header className="crm-heading"><div><small>L’STUDIO ANA · SEGUIMIENTO DEL STUDIO</small><h2>Tu Studio, de un vistazo</h2><p>Qué está pasando y dónde poner tu atención.</p></div><span className="crm-period-badge">{periodLabel}</span></header>
              <div className="crm-toolbar"><div className="crm-shortcuts">{[{label:'Últimos 7 días',days:7},{label:'Últimos 30 días',days:30},{label:'Este mes',days:0}].map(item => <button key={item.label} type="button" className="crm-button" onClick={() => {const end=new Date();const start=new Date(end);if(item.days)start.setDate(start.getDate()-item.days+1);else start.setDate(1);setDashboardStart(formatDateKey(start));setDashboardEnd(formatDateKey(end));}}>{item.label}</button>)}</div><label>Desde<input type="date" value={dashboardStart} max={dashboardEnd || undefined} onChange={e=>setDashboardStart(e.target.value)} /></label><label>Hasta<input type="date" value={dashboardEnd} min={dashboardStart || undefined} onChange={e=>setDashboardEnd(e.target.value)} /></label></div>
              {!valid && <p role="alert" className="crm-note">Elige fechas válidas, con un máximo de un año.</p>}
              <nav className="crm-tabs" role="tablist" aria-label="Secciones del CRM">{([{id:'resumen',label:'Resumen',icon:CalendarDays},{id:'clientas',label:'Clientas',icon:User},{id:'servicios',label:'Servicios',icon:Scissors},{id:'informes',label:'Informes',icon:BookOpen}] as const).map(tab=><button type="button" role="tab" id={`crm-tab-${tab.id}`} aria-selected={crmView === tab.id} aria-controls="crm-content" onClick={()=>setCrmView(tab.id)} key={tab.id}><tab.icon size={16}/>{tab.label}</button>)}</nav>
              <div id="crm-content" role="tabpanel" aria-labelledby={`crm-tab-${crmView}`} style={{display:'flex',flexDirection:'column',gap:16}}>
              {crmView === 'resumen' && <>
                <div className="crm-grid crm-four">{metricCard('Citas confirmadas y realizadas',valid ? booked.length : '—','Según la fecha de la cita')}{metricCard('Servicios finalizados',valid ? completedCount : '—','Citas marcadas como realizadas','#BDE1B8')}{metricCard('Agenda ocupada',occupancy === null ? '—' : occupancy+'%',capacity ? `${(occupied/60).toFixed(1)} de ${(capacity/60).toFixed(1)} horas del horario` : 'Sin horario para calcular')}{metricCard('Fichas nuevas',valid ? newClientsInPeriod : '—','Altas registradas en estas fechas')}</div>
                <div className="crm-grid crm-two"><section className="crm-card"><div className="crm-section-title"><h3>¿Qué necesita tu atención?</h3><Clock3 size={18} color="#E4C687"/></div><div className="crm-actions"><button className="crm-button" type="button" onClick={()=>{setAdminTab('agenda');setPendingPanelFilter('all');setAgendaSidePanel('pending');}}>Revisar solicitudes y pagos <span>→</span></button><button className="crm-button" type="button" onClick={()=>setAdminTab('demands')}>Ver oportunidades de reserva <span>→</span></button><button className="crm-button" type="button" onClick={()=>setAdminTab('detractors')}>Leer opiniones de clientas <span>→</span></button></div><div className="crm-status"><span>{valid ? pendingCount : '—'} pendientes en el periodo</span><span>{valid ? demandInPeriod.length : '—'} búsquedas sin hueco</span><span>{valid ? cancelledCount : '—'} canceladas</span><span>{valid ? noShowCount : '—'} ausencias</span></div><small style={{marginTop:10}}>Los accesos abren sus apartados completos; las cifras corresponden al periodo seleccionado.</small></section>
                <section className="crm-card"><div className="crm-section-title"><h3>Los servicios que más se reservan</h3><Scissors size={18} color="#E4C687"/></div><div className="crm-ranking">{ranking.slice(0,4).map((item,i)=><div className="crm-ranking-row" key={item.name}><span>{String(i+1).padStart(2,'0')}</span><div><p>{item.name}</p><div className="crm-track"><div style={{width:`${item.count/top*100}%`,background:'#C49A58'}}/></div></div><strong>{item.count}</strong></div>)}</div>{!ranking.length && <p className="crm-empty">Todavía no hay servicios desglosados en este periodo.</p>}<button className="crm-button" type="button" style={{marginTop:16}} onClick={()=>setCrmView('servicios')}>Ver todos los servicios →</button></section></div>
                <div className="crm-section-title"><h3>Frente al periodo anterior</h3><small>{valid ? `${previousFrom.split('-').reverse().join('/')} – ${previousTo.split('-').reverse().join('/')}` : 'Sin comparación disponible'}</small></div>{compareCards}
              </>}
              {crmView === 'clientas' && <>
                <div className="crm-grid crm-three">{metricCard('Clientas atendidas',valid ? attendedEmails.size : '—','Personas con visita realizada y email')}{metricCard('Clientas que repiten',valid ? returning : '—','Ya tenían una visita realizada anterior','#BDE1B8')}{metricCard('Fichas nuevas',valid ? newClientsInPeriod : '—','Altas en el periodo; no primeras visitas')}</div>
                <div className="crm-grid crm-two"><section className="crm-card"><h3>Tu comunidad</h3><div className="crm-status"><span>{listaClientes.filter(c=>!c.archivedAt).length} activas</span><span>{listaClientes.filter(c=>!!c.archivedAt).length} de baja</span></div><small style={{margin:'12px 0'}}>Total de fichas actuales, independiente de las fechas del informe.</small><button className="crm-button crm-gold" type="button" onClick={()=>{setAdminTab('clients');setClientStatusFilter('active');}}>Abrir fichas de clientes →</button></section><section className="crm-card"><h3>Nuevas fichas por mes</h3><small style={{marginTop:7}}>Últimos 12 meses con altas registradas. Histórico completo.</small><div className="crm-ranking">{monthlyClientsRows.map(([month,count])=><div key={month}><div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:7,fontSize:12}}><span>{new Date(month+'-01T12:00:00').toLocaleDateString('es-ES',{month:'short',year:'numeric'})}</span><strong style={{color:'#E4C687'}}>{count}</strong></div><div className="crm-track"><div style={{width:`${count/Math.max(1,...monthlyClientsRows.map(row=>row[1]))*100}%`,background:'#C49A58'}}/></div></div>)}</div>{!monthlyClientsRows.length && <p className="crm-empty">Sin fechas de alta registradas.</p>}</section></div>
                <p className="crm-note">Las visitas y repeticiones se identifican por email. Las citas sin email no cuentan como personas únicas; no se infieren visitas que no estén registradas.</p>
              </>}
              {crmView === 'servicios' && <div className="crm-grid crm-two"><section className="crm-card"><h3>Ranking de servicios</h3><small style={{marginTop:7}}>Un servicio cuenta una vez por cita, agrupando variantes.</small><div className="crm-ranking">{ranking.map((item,i)=><div className="crm-ranking-row" key={item.name}><span>{i+1}</span><div><p>{item.name}</p><div className="crm-track"><div style={{width:`${item.count/top*100}%`,background:'#C49A58'}}/></div></div><strong>{item.count}</strong></div>)}</div>{!ranking.length && <p className="crm-empty">No hay servicios desglosados en estas fechas.</p>}{booked.some(item=>!item.services?.length) && <small style={{marginTop:15}}>Las citas antiguas sin desglose no entran en este ranking.</small>}</section><section className="crm-card"><h3>¿De dónde llegan las reservas?</h3><small style={{marginTop:7}}>Incluye todas las citas del periodo, también pendientes y canceladas.</small><div className="crm-ranking">{channelRows.map(row=><div key={row.name}><div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:8}}><span>{row.name}</span><strong style={{color:'#E4C687'}}>{row.count}</strong></div><div className="crm-track"><div style={{width:`${row.count/Math.max(1,inPeriod.length)*100}%`,background:row.name === 'Sin canal registrado' ? '#AFA394' : '#C49A58'}}/></div></div>)}</div>{!inPeriod.length && <p className="crm-empty">No hay citas en este periodo.</p>}</section></div>}
              {crmView === 'informes' && <>
                <section className="crm-card"><div className="crm-section-title"><h3>Exporta tu resumen</h3><BookOpen size={18} color="#E4C687"/></div><small style={{margin:'8px 0 14px'}}>El CSV incluye comparación, servicios y ocupación diaria del periodo. El PDF imprime la vista que tienes abierta.</small>
                            <div className="studio-crm-export" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button type="button" disabled={!valid} onClick={() => {
                const rows: (string | number)[][] = [
                  ['Informe CRM', bizConfig.name], ['Desde', dashboardStart], ['Hasta', dashboardEnd], ['Periodo anterior', previousFrom, previousTo],
                  ['Métrica', 'Actual', 'Anterior', 'Unidad'], ...comparison.map(item => [item.label, item.current ?? 'Sin datos', item.previous ?? 'Sin datos', item.unit]),
                  ['Horas reservadas', (occupied / 60).toFixed(2)], ['Horas disponibles', (capacity / 60).toFixed(2)],
                  ['Servicios', 'Citas'], ...ranking.map(item => [item.name, item.count]),
                  ['Ocupación diaria', 'Minutos reservados', 'Minutos disponibles', 'Porcentaje'], ...days.map(day => [day.date, day.occupied, day.available, day.available ? (day.occupied / day.available * 100).toFixed(1) : 'Sin horario']),
                  ['Nota', 'Datos locales; ocupación histórica calculada con el horario actual. Actividad web acumulada excluida de este informe por fechas.']
                ];
                const cell = (value: string | number) => { let text = String(value); if (/^[=+@-]/.test(text)) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"'; };
                const csv = '\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n');
                const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
                const link = document.createElement('a'); link.href = url; link.download = `CRM-${dashboardStart}-${dashboardEnd}.csv`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
              }} style={{ padding: '10px 16px', background: '#322A25', color: '#FFF8EE', border: '1px solid #C5A059', borderRadius: '8px', cursor: 'pointer' }}>Descargar CSV</button>
              <button type="button" disabled={!valid} onClick={() => window.print()} style={{ padding: '10px 16px', background: '#322A25', color: '#FFF8EE', border: '1px solid #C5A059', borderRadius: '8px', cursor: 'pointer' }}>Imprimir esta vista / PDF</button>
            </div>

                </section>
                <div className="crm-section-title"><h3>Ocupación día a día</h3><span className="crm-period-badge">{occupancy === null ? 'Sin horario' : occupancy+'% de ocupación'}</span></div>
                <div className="crm-card" style={{overflowX:'auto'}}><table className="crm-table"><thead><tr><th>Fecha</th><th>Reservadas</th><th>Horario disponible</th><th>Ocupación</th></tr></thead><tbody>{days.map(day=><tr key={day.date}><td>{day.date.split('-').reverse().join('/')}</td><td>{(day.occupied/60).toFixed(1)} h</td><td>{(day.available/60).toFixed(1)} h</td><td style={{minWidth:150}}><div style={{display:'flex',alignItems:'center',gap:10}}><div className="crm-track" style={{flex:1}}><div style={{width:`${day.available ? day.occupied/day.available*100 : 0}%`,background:'#C49A58'}}/></div><span>{day.available ? Math.round(day.occupied/day.available*100)+'%' : '—'}</span></div></td></tr>)}</tbody></table>{!days.length && <p className="crm-empty">Selecciona un periodo válido.</p>}</div>
                <details className="crm-notes"><summary>Actividad de este navegador</summary><p>Estos datos son locales e incluyen tus pruebas. No representan todas las visitas a la web ni se filtran por las fechas del informe.</p><div className="crm-status"><span>{trafficEvents.filter(item=>item.type === 'visit').length} visitas locales</span><span>{trafficEvents.filter(item=>item.type === 'login').length} accesos locales</span><span>{trafficEvents.filter(item=>item.type === 'booking').length} reservas locales</span></div></details>
              </>}
              </div>
              <details className="crm-notes"><summary>Cómo leer estos datos</summary><p>Periodo: fecha de la cita, excepto altas, que usan la fecha de creación de la ficha. Las citas confirmadas incluyen las realizadas; las finalizadas muestran cuántas has marcado como realizadas. La ocupación usa el horario actual, descuenta cierres y bloqueos y cuenta los solapamientos una sola vez; no mide capacidad por profesional. Son registros disponibles en esta app, no facturación ni estadísticas completas de la web.</p></details>
            </section>;
          })());
}
