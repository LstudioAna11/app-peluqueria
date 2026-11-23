import { Suspense, lazy, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowRight, BookOpen, CalendarPlus, ChevronDown, Gift, NotebookPen, UserRound, X } from 'lucide-react';
import type { ClientRecord } from './App';
import { ClientPermissionStatus } from './ClientPermissions';
import { ClientPhotoGallery } from './DeferredFeatures';
import { ClientProductRoutine } from './Products';
import './client-record-detail.css';

const ClubProfile = lazy(() => import('./ClubAdmin').then(module => ({ default: module.ClubProfile })));
const MemoriesAdmin = lazy(() => import('./MemoriesAdmin'));

const tabs = [
  { id: 'passport', label: 'Pasaporte', Icon: BookOpen },
  { id: 'contact', label: 'Datos y acceso', Icon: UserRound },
  { id: 'notes', label: 'Notas internas', Icon: NotebookPen },
  { id: 'club', label: 'Club y recuerdos', Icon: Gift },
] as const;
type Tab = typeof tabs[number]['id'];

type ClientRecordDetailProps = {
  client: ClientRecord;
  fichaNumber: string;
  visits: { last: string; next: string };
  statusBusy: number | null;
  onClose: () => void;
  onBook: () => void;
  onOpenPassport: () => void;
  onEditContact: () => void;
  onSaveNotes: (notes: string) => void;
  onChangeStatus: () => void;
  onDelete: () => void;
};

export default function ClientRecordDetail({
  client, fichaNumber, visits, statusBusy, onClose, onBook, onOpenPassport, onEditContact, onSaveNotes, onChangeStatus, onDelete,
}: ClientRecordDetailProps) {
  const [tab, setTab] = useState<Tab>('passport');
  const [visited, setVisited] = useState<Tab[]>(['passport']);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const tabButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const fullName = [client.nombre,client.apellidos].filter(Boolean).join(' ');
  const initials = ((client.nombre.trim()[0] || 'C') + (client.apellidos.trim()[0] || '')).toUpperCase();
  const historyCount = client.pastVisits?.length ?? 0;
  const phone = client.telefono?.replace(/[^+\d]/g,'');
  const canCall = !!phone && phone.replace(/\D/g,'').length >= 9;

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);

  function selectTab(next: Tab) {
    setTab(next);
    setVisited(previous => previous.includes(next) ? previous : [...previous,next]);
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % tabs.length; break;
      case 'ArrowLeft': next = (index + tabs.length - 1) % tabs.length; break;
      case 'Home': next = 0; break;
      case 'End': next = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    selectTab(tabs[next].id);
    tabButtons.current[next]?.focus();
  }

  return <section id={`client-details-${client.idNum}`} className="lst-client-record" aria-labelledby={`${id}-name`}>
    <header className="lst-client-record-header">
      <div className="lst-client-record-avatar" aria-hidden="true">{initials}</div>
      <div className="lst-client-record-identity">
        <span className="lst-client-record-kicker">Ficha {fichaNumber === 'Pendiente' ? 'pendiente de numerar' : `#${fichaNumber}`}</span>
        <h3 id={`${id}-name`} ref={heading} tabIndex={-1}>{fullName}</h3>
        <span className="lst-client-record-status" data-archived={!!client.archivedAt}>
          {client.archivedAt ? 'De baja' : 'Activa'}
        </span>
      </div>
      <button className="lst-client-record-close" type="button" onClick={onClose} aria-label={`Cerrar ficha de ${fullName}`}>
        <X size={18} aria-hidden="true"/><span>Cerrar</span>
      </button>
      {!client.archivedAt && <button type="button" className="lst-client-record-primary lst-client-record-book" onClick={onBook}>
        <CalendarPlus size={18} aria-hidden="true"/> Nueva cita
      </button>}
    </header>

    <dl className="lst-client-record-visits">
      <div><dt>Próxima cita</dt><dd>{visits.next || 'Sin cita reservada'}</dd></div>
      <div><dt>Última visita</dt><dd>{visits.last || 'Sin visitas registradas'}</dd></div>
      <div><dt>Historial</dt><dd>{historyCount} {historyCount === 1 ? 'visita' : 'visitas'}</dd></div>
    </dl>

    <div className="lst-client-record-tabs" role="tablist" aria-label="Apartados de la ficha">
      {tabs.map(({id: key,label,Icon},index) => (
        <button type="button" role="tab" key={key} ref={element => { tabButtons.current[index] = element; }}
          id={`${id}-tab-${key}`} aria-controls={`${id}-panel-${key}`} aria-selected={tab === key}
          tabIndex={tab === key ? 0 : -1} onClick={() => selectTab(key)} onKeyDown={event => handleTabKey(event,index)}>
          <Icon size={17} aria-hidden="true"/>{label}
        </button>
      ))}
    </div>

    <div id={`${id}-panel-passport`} className="lst-client-record-panel" role="tabpanel"
      aria-labelledby={`${id}-tab-passport`} hidden={tab !== 'passport'}>
      <button type="button" className="lst-client-record-passport" onClick={onOpenPassport}>
        <BookOpen size={21} aria-hidden="true"/>
        <span><strong>Abrir pasaporte capilar</strong><small>ADN capilar, diagnóstico e historial de visitas</small></span>
        <ArrowRight size={18} aria-hidden="true"/>
      </button>
      <details className="lst-client-record-fold">
        <summary>Recomendaciones de productos<ChevronDown size={16} aria-hidden="true"/></summary>
        <div className="lst-client-record-fold-content">
          {client.serverId ? <ClientProductRoutine clientId={client.serverId}/> : <p>Guarda la ficha en el servidor para asignar productos.</p>}
        </div>
      </details>
      <ClientPhotoGallery clientId={client.serverId} editable/>
    </div>

    <div id={`${id}-panel-contact`} className="lst-client-record-panel" role="tabpanel"
      aria-labelledby={`${id}-tab-contact`} hidden={tab !== 'contact'}>
      {visited.includes('contact') && <>
        <div className="lst-client-record-actions">
          <button type="button" className="lst-client-record-button" onClick={onEditContact}>Editar datos y acceso</button>
          {canCall && <a className="lst-client-record-button" href={`tel:${phone}`}>Llamar</a>}
        </div>
        <dl className="lst-client-record-contact">
          <div><dt>Email</dt><dd>{client.email || 'Sin registrar'}{client.emailHolderId && <small>Email familiar vinculado</small>}</dd></div>
          <div><dt>Teléfono</dt><dd>{client.telefono || 'Sin registrar'}</dd></div>
          <div><dt>PIN de acceso</dt><dd>{client.pinAcceso || 'Sin registrar'}</dd></div>
          <div><dt>Fecha de nacimiento</dt><dd>{client.fechaNacimiento || 'Sin registrar'}</dd></div>
        </dl>
        <ClientPermissionStatus clientId={client.serverId}/>
        <details className="lst-client-record-fold">
          <summary>Gestión de la ficha<ChevronDown size={16} aria-hidden="true"/></summary>
          <div className="lst-client-record-fold-content">
            {client.registroId && <p>Registro {client.registroId}</p>}
            {client.archivedAt && <p>De baja desde {new Date(client.archivedAt).toLocaleDateString('es-ES')}.</p>}
            <div className="lst-client-record-actions">
              <button type="button" className="lst-client-record-button" disabled={statusBusy !== null} onClick={onChangeStatus}>
                {statusBusy === client.idNum ? 'Guardando…' : client.archivedAt ? 'Reactivar clienta' : 'Dar de baja'}
              </button>
              <button type="button" className="lst-client-record-button lst-client-record-delete" disabled={statusBusy !== null}
                onClick={onDelete}>Eliminar ficha definitivamente</button>
            </div>
          </div>
        </details>
      </>}
    </div>

    <div id={`${id}-panel-notes`} className="lst-client-record-panel" role="tabpanel"
      aria-labelledby={`${id}-tab-notes`} hidden={tab !== 'notes'}>
      {noteDraft === null ? <>
        <p className="lst-client-record-notes">{client.formulasAplicadas || 'Sin fórmulas ni notas registradas.'}</p>
        <div className="lst-client-record-actions">
          <button type="button" className="lst-client-record-button" onClick={() => setNoteDraft(client.formulasAplicadas)}>
            Editar fórmulas y notas
          </button>
        </div>
      </> : <form className="lst-client-record-note-form" onSubmit={event => {
        event.preventDefault();
        onSaveNotes(noteDraft);
        setNoteDraft(null);
      }}>
        <label htmlFor={`${id}-notes`}>Fórmulas y notas de uso interno</label>
        <textarea id={`${id}-notes`} value={noteDraft} rows={5} onChange={event => setNoteDraft(event.target.value)}/>
        <div className="lst-client-record-actions">
          <button type="submit" className="lst-client-record-primary">Guardar notas</button>
          <button type="button" className="lst-client-record-button" onClick={() => setNoteDraft(null)}>Cancelar</button>
        </div>
      </form>}
    </div>

    <div id={`${id}-panel-club`} className="lst-client-record-panel" role="tabpanel"
      aria-labelledby={`${id}-tab-club`} hidden={tab !== 'club'}>
      {visited.includes('club') && <>
        <Suspense fallback={<p role="status">Abriendo Club…</p>}><ClubProfile clientId={client.serverId}/></Suspense>
        <Suspense fallback={<p role="status">Abriendo recuerdos…</p>}><MemoriesAdmin clientId={client.serverId} clientName={fullName}/></Suspense>
      </>}
    </div>
  </section>;
}
