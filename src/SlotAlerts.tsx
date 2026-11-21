import { useEffect, useRef, useState } from 'react';
import { slotAlert } from './studioApi';
import './slotAlerts.css';

type Selection = { id: string; variantId: string | null; name: string };
type RequestStatus = { services: string | null };
type AlertRow = {
  client_id: string;
  requested_day: string;
  services: string;
  updated_at: string;
  studio_clients: { first_name: string; last_name: string | null; phone: string | null };
};

const formatDay = (day: string) => new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'long', timeZone: 'Europe/Madrid',
}).format(new Date(day + 'T12:00:00Z'));

export function SlotAlertRequest({ day, selection, allowRequest }: {
  day: string; selection: Selection[]; allowRequest: boolean;
}) {
  const [saved, setSaved] = useState<string | null>();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    slotAlert<RequestStatus>({ operation: 'status', day })
      .then(result => { if (active) setSaved(result.services); })
      .catch(() => { /* The user can still try requesting an alert. */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [day]);

  async function update(operation: 'save' | 'cancel') {
    setBusy(true);
    setError('');
    try {
      const result = await slotAlert<RequestStatus>(operation === 'save'
        ? { operation, day, whatsapp: true, services: selection.map(({ id, variantId }) => ({ id, variantId })) }
        : { operation, day });
      setSaved(result.services);
      setConfirm(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo actualizar el aviso.');
    } finally {
      setBusy(false);
    }
  }

  if (!saved && !allowRequest) return null;
  return <section className="slot-alert-card" aria-label="Aviso si se libera un hueco">
    {saved && !confirm ? <>
      <strong role="status">Aviso solicitado para el {formatDay(day)}</strong>
      <p>{saved}</p>
      <button type="button" className="studio-btn-ghost" disabled={busy} onClick={() => void update('cancel')}>Retirar aviso</button>
    </> : confirm ? <>
      <strong>Aviso para el {formatDay(day)}</strong>
      <p>{selection.map(service => service.name).join(' + ')}</p>
      <p>Al confirmar, pides que te contactemos por WhatsApp al número de tu ficha si aparece un hueco para estos servicios.</p>
      <div className="slot-alert-actions">
        <button type="button" className="studio-btn-ghost" disabled={busy} onClick={() => setConfirm(false)}>Volver</button>
        <button type="button" className="studio-btn-ghost" disabled={busy || !allowRequest} onClick={() => void update('save')}>Confirmar aviso por WhatsApp</button>
      </div>
    </> : <>
      <p>¿Te interesa esta fecha? Puedes pedirnos que te avisemos por WhatsApp si se libera un hueco.</p>
      <button type="button" className="slot-alert-primary" disabled={loading} onClick={() => setConfirm(true)}>Avísame si hay un hueco</button>
    </>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

export function SlotAlertList({ refresh }: { refresh: number }) {
  const [offset, setOffset] = useState(0);
  const [managed, setManaged] = useState(false);
  const [rows, setRows] = useState<AlertRow[]>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    setRows(undefined);
    setError('');
    slotAlert<{ alerts: AlertRow[] }>({ operation: 'list', offset, managed })
      .then(result => { if (active) setRows(result.alerts); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'No se pudieron consultar los avisos.'); });
    return () => { active = false; };
  }, [offset, refresh, managed, reload]);

  function show(value: boolean) {
    if (managed === value) return;
    setRows(undefined);
    setError('');
    setNotice('');
    setOffset(0);
    setManaged(value);
  }

  async function updateStatus(row: AlertRow) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await slotAlert<{ ok: true }>({
        operation: 'manage', clientId: row.client_id, day: row.requested_day,
        updatedAt: row.updated_at, managed: !managed,
      });
      setNotice(managed ? 'Solicitud devuelta a pendientes.' : 'Solicitud marcada como gestionada.');
      if (rows?.length === 1 && offset > 0) setOffset(offset - 30);
      setRows(undefined);
      setReload(value => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo actualizar la solicitud.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <section className="slot-alert-list" aria-label="Solicitudes de aviso">
    <div className="ld-inline ld-filters" role="group" aria-label="Estado del aviso">
      <button type="button" aria-pressed={!managed} disabled={busy} onClick={() => show(false)}>Pendientes</button>
      <button type="button" aria-pressed={managed} disabled={busy} onClick={() => show(true)}>Gestionadas</button>
    </div>
    {!managed && <p>Si tienes un hueco para la fecha y el servicio que pidió la clienta, abre el mensaje y revisa el horario antes de enviarlo.</p>}
    {notice && <p role="status">{notice}</p>}
    {error && <p className="ld-error" role="alert">{error}</p>}
    {!rows && !error && <p role="status">Consultando avisos…</p>}
    {rows?.length === 0 && <p role="status">{managed ? 'No hay solicitudes gestionadas en esta página.' : 'No hay solicitudes pendientes en esta página.'}</p>}
    {rows?.map(row => {
      const client = row.studio_clients;
      const name = [client.first_name, client.last_name].filter(Boolean).join(' ');
      const digits = (client.phone ?? '').replace(/\D/g, '');
      const number = digits.length === 9 ? '34' + digits : digits.replace(/^00/, '');
      const date = formatDay(row.requested_day);
      const message = `Hola ${client.first_name}, soy Ana de L’Studio Ana. Me pediste que te avisara si quedaba un hueco para ${row.services} el ${date}. Ahora tengo disponibilidad. ¿Quieres que te confirme qué horas quedan?`;
      return <article className="slot-alert-card" key={row.client_id + '/' + row.requested_day}>
        <strong>{name}</strong><p>{date} · {row.services}</p>
        <div className="slot-alert-actions">
          {!managed && (number.length >= 9 ? <a className="ld-link" href={'https://wa.me/' + number + '?text=' + encodeURIComponent(message)}
            target="_blank" rel="noopener noreferrer">Preparar WhatsApp ↗</a> : <p>Sin teléfono disponible.</p>)}
          <button type="button" disabled={busy} onClick={() => void updateStatus(row)}>
            {managed ? 'Volver a pendientes' : 'Marcar como gestionada'}
          </button>
        </div>
      </article>;
    })}
    <div className="ld-pagination">
      {offset > 0 && <button type="button" disabled={busy || (!rows && !error)} onClick={() => setOffset(offset - 30)}>Anterior</button>}
      {rows?.length === 30 && <button type="button" disabled={busy} onClick={() => setOffset(offset + 30)}>Siguiente</button>}
    </div>
  </section>;
}
