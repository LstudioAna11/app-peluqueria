import React from 'react';
import type {ClientRecord} from './App';
import type {RepeatPortalDraft} from './portalFeatureData';
import './appointment-repeat-card.css';
const RepeatBookingCard=React.lazy(()=>import('./PortalFeatures').then(m=>({default:m.RepeatBookingCard})));
export function hasPreviousVisit(client?:ClientRecord|null){return !!client?.serverId&&!!client.pastVisits?.some(visit=>{const raw=String(visit.date||'').trim(),match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw),iso=match?`${match[3]}-${match[2]}-${match[1]}`:raw.slice(0,10),date=Date.parse(iso+'T12:00:00Z');return Number.isFinite(date)&&date<=Date.now()&&!!String(visit.service||'').trim();});}
export default function AppointmentRepeatCard({client,showPrices,onProceed,onCatalog,children}:{client?:ClientRecord|null;showPrices:boolean;onProceed:(draft:RepeatPortalDraft)=>void;onCatalog:()=>void;children:React.ReactNode}){
 if(!hasPreviousVisit(client))return <>{children}</>;
 return <section className="arc-card" aria-label="Repetir los servicios de mi última cita"><h3>¿Repetimos tu última visita?</h3><p>Recupera los mismos servicios y elige una nueva fecha.</p><React.Suspense fallback={<p role="status">Preparando el acceso a tu última cita…</p>}><RepeatBookingCard clientId={client!.serverId} showPrices={showPrices} onProceed={onProceed} onCatalog={onCatalog} buttonLabel="Agendar los mismos servicios"/></React.Suspense><button className="arc-other" type="button" onClick={onCatalog}>Prefiero elegir otros servicios →</button></section>;
}
