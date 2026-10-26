import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as studioApi from './studioApi';
import { Promotion, isVisiblePromotion, madridToday, safePromotionImage, promotionServiceIds } from './promotions';
import './promotions.css';
type BookingServiceOption = { id: string; label: string };
type PromoBookingProps = { onReserve?: (promotion: Promotion) => boolean; serviceOptions?: BookingServiceOption[] };

export function PromotionsPortal({ promotions = [], onReserve, serviceOptions = [] }: { promotions?: Promotion[] } & PromoBookingProps) {
  const [today, setToday] = useState(madridToday);
  useEffect(() => { const id = window.setInterval(() => setToday(madridToday()), 60000); return () => clearInterval(id); }, []);
  const visible = promotions.filter(p => isVisiblePromotion(p, today));
  if (!visible.length) return null;
  return <section className="lst-promotions" aria-label="Promociones del Studio"><h2>Un motivo más para cuidarte</h2><p>Las promociones del Studio, aquí para ti.</p><div className="lst-promo-grid">{visible.map(p => <article className="lst-promo-card" key={p.id}>
    {safePromotionImage(p.imageUrl) && <img src={safePromotionImage(p.imageUrl)} alt="" loading="lazy" decoding="async" />}
    <div className="lst-promo-body"><h3>{p.title}</h3><p>{p.description}</p>{p.price && <strong className="lst-promo-price">{p.price}</strong>}{p.endDate && <p>Hasta el {p.endDate.split('-').reverse().join('/')}</p>}{promotionServiceIds(p).length > 0 && <div><strong>Servicios incluidos</strong><ul>{promotionServiceIds(p).map(id => <li key={id}>{serviceOptions.find(s => s.id === id)?.label || 'Servicio no disponible'}</li>)}</ul></div>}{p.conditions && <details><summary>Condiciones</summary><p>{p.conditions}</p></details>}{onReserve && promotionServiceIds(p).length > 0 && (
      promotionServiceIds(p).every(id => serviceOptions.some(service => service.id === id))
        ? <button type="button" onClick={() => onReserve(p)}>Reservar promoción</button>
        : <p>El servicio de esta promoción no está disponible para reservar ahora.</p>
    )}</div>
  </article>)}</div></section>;
}

function PromotionEditorDialog({ children, busy, onClose }: { children: React.ReactNode; busy: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current; if (el && !el.open) el.showModal(); }, []);
  return createPortal(<dialog ref={ref} className="lst-promotions lst-promo-dialog lst-promo-editor"
    aria-label="Editar promoción" onCancel={e => { if (busy) e.preventDefault(); }} onClose={onClose}>
    <header className="lst-promo-editor-header"><h2>Tu promoción</h2><button type="button" disabled={busy} onClick={onClose}>Cerrar</button></header>
    {children}
  </dialog>, document.body);
}

const blank = (): Promotion => ({ id: crypto.randomUUID(), title: '', description: '', imageUrl: '', price: '', conditions: '', startDate: '', endDate: '', active: false });
export default function PromotionsView({ onSaved, serviceOptions = [] }: { onSaved?: () => Promise<unknown>; serviceOptions?: BookingServiceOption[] }) {
  const [catalogOptions, setCatalogOptions] = useState<BookingServiceOption[]>([]);
  const options = serviceOptions.length ? serviceOptions : catalogOptions;
  const [items, setItems] = useState<Promotion[]>([]);
  const [draft, setDraft] = useState<Promotion | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  const baseline = useRef('[]');
  const token = () => { const t = studioApi.currentToken(); if (!t || studioApi.storedRole() !== 'admin') throw new Error('Vuelve a iniciar sesión como administradora.'); return t; };
  const load = async () => {
    setError('');
    try { const data = await studioApi.syncAll<{ settings?: { promotions?: Promotion[] }; catalog?: { category?: { title?: string; subservices?: { id: string; name: string; active?: boolean }[] } }[] }>(token());
      if (!data.settings) throw new Error('No se pudo leer la configuración.');
      setCatalogOptions((data.catalog || []).flatMap(row => (row.category?.subservices || []).filter(sub => sub.active !== false).map(sub => ({ id: sub.id, label: (row.category?.title || '') + ' · ' + sub.name }))));
      const list = Array.isArray(data.settings.promotions) ? data.settings.promotions : [];
      setItems(list); baseline.current = JSON.stringify(list); setLoaded(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar las promociones.'); }
  };
  useEffect(() => { void load(); }, []);
  const persist = async (next: Promotion[]) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const t = token();
      const before = await studioApi.syncAll<{ settings?: Record<string, unknown> }>(t);
      if (!before.settings) throw new Error('No se pudo leer la configuración.');
      if (JSON.stringify(before.settings.promotions || []) !== baseline.current) throw new Error('Las promociones han cambiado en otro dispositivo. Cierra el formulario y recarga la lista antes de guardar.');
      await studioApi.pushSettings(t, { ...before.settings, promotions: next });
      const after = await studioApi.syncAll<{ settings?: { promotions?: Promotion[] } }>(t);
      if (JSON.stringify(after.settings?.promotions) !== JSON.stringify(next)) throw new Error('No se pudo verificar el guardado. Recarga la lista antes de reintentar.');
      setItems(next); baseline.current = JSON.stringify(next); setDraft(null);
      setMessage('Promociones guardadas.');
      if (onSaved) { try { await onSaved(); } catch { setMessage('Guardado correcto. Actualiza la app para renovar la vista del portal.'); } }
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <section className="lst-promotions"><h2>Promociones</h2><p>Crea una propuesta que apetezca. Las clientas verán solo las promociones activas dentro de sus fechas.</p>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {!loaded ? <button onClick={() => void load()}>Cargar promociones</button> : <>
      <button disabled={busy || !!draft} onClick={() => { setMessage(''); setDraft(blank()); }}>Nueva promoción</button>{' '}
      <button disabled={busy || !!draft} onClick={() => void load()}>Recargar lista</button>
      {draft && <PromotionEditorDialog busy={busy} onClose={() => { if (!busy) setDraft(null); }}>{error && <p role="alert">{error}</p>}<form onSubmit={e => { e.preventDefault(); if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) { setError('La fecha final debe ser igual o posterior a la inicial.'); return; } if (draft.imageUrl && !safePromotionImage(draft.imageUrl)) { setError('Usa una URL de imagen HTTPS o una ruta de la app.'); return; } const selectedIds = promotionServiceIds(draft); if (selectedIds.some(id => !options.some(s => s.id === id))) { setError('Retira o sustituye los servicios que ya no están disponibles.'); return; } const value = { ...draft, bookingServiceIds: selectedIds, bookingServiceId: undefined, title: draft.title.trim() }; if (!value.title) { setError('Escribe un título.'); return; } void persist(items.some(p => p.id === value.id) ? items.map(p => p.id === value.id ? value : p) : [...items, value]); }}>
        <fieldset disabled={busy}><legend>{items.some(p => p.id === draft.id) ? 'Editar promoción' : 'Nueva promoción'}</legend>

        <section className="lst-promo-service-picker"><h3>Servicios incluidos en la promoción</h3>
          <p>Añade uno, dos, tres o más servicios. Se reservarán juntos.</p>
          <select aria-label="Añadir servicio a la promoción" value="" onChange={e => {
            const id = e.target.value;
            if (id) setDraft({ ...draft, bookingServiceIds: [...promotionServiceIds(draft), id], bookingServiceId: undefined });
          }}>
            <option value="">+ Añadir servicio del catálogo</option>
            {options.filter(s => !promotionServiceIds(draft).includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          {!options.length && <p role="status">No se han cargado servicios activos. Cierra el editor y pulsa Recargar lista.</p>}
          <ul>{promotionServiceIds(draft).map(id => <li key={id}>
            <span>{options.find(s => s.id === id)?.label || 'Servicio no disponible — retíralo o sustitúyelo'}</span>
            <button type="button" aria-label={'Quitar ' + (options.find(s => s.id === id)?.label || 'servicio')} onClick={() => setDraft({ ...draft, bookingServiceIds: promotionServiceIds(draft).filter(value => value !== id), bookingServiceId: undefined })}>Quitar</button>
          </li>)}</ul>
          <p>{promotionServiceIds(draft).length ? promotionServiceIds(draft).length + ' servicios seleccionados' : 'Sin reserva directa: promoción informativa.'}</p>
          <small>Se mantienen los precios del catálogo. La clienta revisará variantes y complementos antes de elegir su cita.</small>
        </section>
        {(['title','description','imageUrl','price','conditions','startDate','endDate'] as const).map(key => <label key={key}>{({ title:'Título', description:'Descripción', imageUrl:'Enlace de imagen (opcional)', price:'Precio o ventaja (ej. 49 € / −15 %)', conditions:'Condiciones', startDate:'Desde (opcional)', endDate:'Hasta (opcional)' })[key]}
          {key === 'description' || key === 'conditions' ? <textarea maxLength={3000} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /> : <input required={key === 'title'} maxLength={key === 'imageUrl' ? 2000 : 200} type={key === 'startDate' || key === 'endDate' ? 'date' : 'text'} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} />}
        </label>)}
        <label><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} /> Publicar en el portal durante las fechas indicadas</label>
        <div className="lst-promo-editor-actions"><button type="submit">{busy ? 'Guardando…' : 'Guardar promoción'}</button>{' '}<button type="button" onClick={() => setDraft(null)}>Cancelar</button></div>
        </fieldset><h3>Vista previa (cuando esté vigente)</h3><PromotionsPortal serviceOptions={options} promotions={[{ ...draft, active: true, startDate: '', endDate: '' }]} /></form></PromotionEditorDialog>}
      {!items.length && <p>Todavía no tienes promociones.</p>}
      <div className="lst-promo-grid">{items.map(p => <article className="lst-promo-card lst-promo-body" key={p.id}><h3>{p.title}</h3><p>{!p.active ? 'Borrador / pausada' : isVisiblePromotion(p) ? 'Visible en el portal' : p.startDate > madridToday() ? 'Programada' : 'Finalizada'}</p><p>{p.price}</p>
        <button disabled={busy || !!draft} onClick={() => setDraft({ ...p })}>Editar</button>{' '}<button disabled={busy || !!draft} onClick={() => void persist(items.map(x => x.id === p.id ? { ...x, active: !x.active } : x))}>{p.active ? 'Pausar' : 'Activar'}</button>{' '}<button disabled={busy || !!draft} onClick={() => { if (window.confirm(`¿Eliminar «${p.title}»?`)) void persist(items.filter(x => x.id !== p.id)); }}>Eliminar</button>
      </article>)}</div>
    </>}
  </section>;
}

export function PromotionsPortalButton({ promotions = [], onReserve, serviceOptions = [] }: { promotions?: Promotion[] } & PromoBookingProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState(madridToday);
  useEffect(() => {
    if (!open) return;
    setToday(madridToday());
    const timer = window.setInterval(() => setToday(madridToday()), 60000);
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    return () => window.clearInterval(timer);
  }, [open]);
  const count = promotions.filter(p => isVisiblePromotion(p, today)).length;
  return <>
    <button type="button" aria-label="Ver promociones" aria-haspopup="dialog"
      className={open ? 'lst-bottom-active' : ''} onClick={() => setOpen(true)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 13 13 20a2 2 0 0 1-2.83 0L2 11.83V2h9.83L20 10.17a2 2 0 0 1 0 2.83Z" />
        <circle cx="7" cy="7" r="1" />
      </svg>
      <span>Promos</span>
    </button>
    {open && createPortal(<dialog ref={dialog} className="lst-promotions lst-promo-dialog" aria-label="Promociones del Studio"
      onClose={() => setOpen(false)}>
      <button type="button" autoFocus onClick={() => dialog.current?.close()}>Cerrar promociones</button>
      {count ? <PromotionsPortal promotions={promotions} serviceOptions={serviceOptions} onReserve={onReserve ? promotion => {
        if (onReserve(promotion)) { dialog.current?.close(); setOpen(false); return true; }
        return false;
      } : undefined} /> : <><h2>Promociones</h2><p>Ahora mismo no hay promociones activas. Las próximas aparecerán aquí.</p></>}
    </dialog>, document.body)}
  </>;
}
