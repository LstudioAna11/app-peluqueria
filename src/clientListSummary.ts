import type {Appointment, ClientRecord} from './App';
const madrid = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const get = (key:string) => parts.find(p=>p.type===key)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
};
const validDay = (value:string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value+'T12:00:00Z'));
const label = (value:string) => new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value.slice(0,10)+'T12:00:00Z'));
export function clientVisitSummary(client:ClientRecord, appointments:Appointment[], now=new Date()):{last:string;next:string} {
  const current=madrid(now);
  const email=client.email.trim().toLowerCase();
  const related=appointments.filter(a=>a.clientId ? !!client.serverId && a.clientId===client.serverId : !!email && a.email.trim().toLowerCase()===email);
  const usable=related.filter(a=>a.lifecycleStatus!=='cancelled' && a.lifecycleStatus!=='no_show' && a.saturdayApproval?.status!=='rejected' && validDay(a.dateKey));
  const past=[...usable.filter(a=>!!a.completedAt).map(a=>a.dateKey),...(client.pastVisits||[]).map(v=>v.date.slice(0,10))].filter(d=>validDay(d)&&d<=current.slice(0,10)).sort();
  const upcoming=usable.filter(a=>!a.completedAt && /^\d{2}:\d{2}$/.test(a.time) && `${a.dateKey}T${a.time}`>=current).sort((a,b)=>`${a.dateKey}T${a.time}`.localeCompare(`${b.dateKey}T${b.time}`))[0];
  return {last:past.length?label(past[past.length-1]):client.ultimaVisita?.trim()||'',next:upcoming?`${label(upcoming.dateKey)} · ${upcoming.time}${upcoming.saturdayApproval?.status==='pending'?' · Pendiente de aceptar':upcoming.advancePayment?.status==='pending'?' · Anticipo pendiente':''}`:''};
}
