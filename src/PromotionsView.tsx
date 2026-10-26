import React, { useEffect, useRef, useState } from 'react';
import * as studioApi from './studioApi';
import { Promotion, isVisiblePromotion, madridToday, safePromotionImage } from './promotions';
import './promotions.css';

export function PromotionsPortal({ promotions = [] }: { promotions?: Promotion[] }) {
  const [today, setToday] = useState(madridToday);
  useEffect(() => { const id = window.setInterval(() => setToday(madridToday()), 60000); return () => clearInterval(id); }, []);
  const visible = promotions.filter(p => isVisiblePromotion(p, today));
  if (!visible.length) return null;
  return <section className="lst-promotions" aria-label="Promociones del Studio"><h2>Un motivo más para cuidarte</h2><p>Las promociones del Studio, aquí para ti.</p><div className="lst-promo-grid">{visible.map(p => <article className="lst-promo-card" key={p.id}>
    {safePromotionImage(p.imageUrl) && <img src={safePromotionImage(p.imageUrl)} alt="" loading="lazy" decoding="async" />}
    <div className="lst-promo-body"><h3>{p.title}</h3><p>{p.description}</p>{p.price && <strong className="lst-promo-price">{p.price}</strong>}{p.endDate && <p>Hasta el {p.endDate.split('-').reverse().join('/')}</p>}{p.conditions && <details><summary>Condiciones</summary><p>{p.conditions}</p></details>}</div>
  </article>)}</div></section>;
}

const blank = (): Promotion => ({ id: crypto.randomUUID(), title: '', description: '', imageUrl: '', price: '', conditions: '', startDate: '', endDate: '', active: false });
export default function PromotionsView({ onSaved }: { onSaved?: () => Promise<unknown> }) {
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
    try { const data = await studioApi.syncAll<{ settings?: { promotions?: Promotion[] } }>(token());
      if (!data.settings) throw new Error('No se pudo leer la configuración.');
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
      {draft && <form onSubmit={e => { e.preventDefault(); if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) { setError('La fecha final debe ser igual o posterior a la inicial.'); return; } if (draft.imageUrl && !safePromotionImage(draft.imageUrl)) { setError('Usa una URL de imagen HTTPS o una ruta de la app.'); return; } const value = { ...draft, title: draft.title.trim() }; if (!value.title) { setError('Escribe un título.'); return; } void persist(items.some(p => p.id === value.id) ? items.map(p => p.id === value.id ? value : p) : [...items, value]); }}>
        <fieldset disabled={busy}><legend>{items.some(p => p.id === draft.id) ? 'Editar promoción' : 'Nueva promoción'}</legend>
        {(['title','description','imageUrl','price','conditions','startDate','endDate'] as const).map(key => <label key={key}>{({ title:'Título', description:'Descripción', imageUrl:'Enlace de imagen (opcional)', price:'Precio o ventaja (ej. 49 € / −15 %)', conditions:'Condiciones', startDate:'Desde (opcional)', endDate:'Hasta (opcional)' })[key]}
          {key === 'description' || key === 'conditions' ? <textarea maxLength={3000} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /> : <input required={key === 'title'} maxLength={key === 'imageUrl' ? 2000 : 200} type={key === 'startDate' || key === 'endDate' ? 'date' : 'text'} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} />}
        </label>)}
        <label><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} /> Publicar en el portal durante las fechas indicadas</label>
        <button type="submit">{busy ? 'Guardando…' : 'Guardar promoción'}</button>{' '}<button type="button" onClick={() => setDraft(null)}>Cancelar</button>
        </fieldset><h3>Vista previa (cuando esté vigente)</h3><PromotionsPortal promotions={[{ ...draft, active: true, startDate: '', endDate: '' }]} /></form>}
      {!items.length && <p>Todavía no tienes promociones.</p>}
      <div className="lst-promo-grid">{items.map(p => <article className="lst-promo-card lst-promo-body" key={p.id}><h3>{p.title}</h3><p>{!p.active ? 'Borrador / pausada' : isVisiblePromotion(p) ? 'Visible en el portal' : p.startDate > madridToday() ? 'Programada' : 'Finalizada'}</p><p>{p.price}</p>
        <button disabled={busy || !!draft} onClick={() => setDraft({ ...p })}>Editar</button>{' '}<button disabled={busy || !!draft} onClick={() => void persist(items.map(x => x.id === p.id ? { ...x, active: !x.active } : x))}>{p.active ? 'Pausar' : 'Activar'}</button>{' '}<button disabled={busy || !!draft} onClick={() => { if (window.confirm(`¿Eliminar «${p.title}»?`)) void persist(items.filter(x => x.id !== p.id)); }}>Eliminar</button>
      </article>)}</div>
    </>}
  </section>;
}

export function PromotionsPortalButton({ promotions = [] }: { promotions?: Promotion[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  const count = promotions.filter(p => isVisiblePromotion(p)).length;
  return <div className="lst-promotions"><button type="button" style={{width:'100%'}} onClick={() => setOpen(true)}>Promociones · Descubre lo que tenemos para ti</button>
    {open && <dialog ref={dialog} aria-label="Promociones del Studio" onClose={() => setOpen(false)} style={{background:'#221d19',color:'#fff8ee',border:'1px solid #c99e52',borderRadius:16,width:'min(640px, calc(100% - 48px))',maxHeight:'85vh',padding:20}}>
      <button type="button" autoFocus onClick={() => dialog.current?.close()}>Volver a mi portal</button>
      {count ? <PromotionsPortal promotions={promotions} /> : <><h2>Promociones</h2><p>Ahora mismo no hay promociones activas. Las próximas aparecerán aquí.</p></>}
    </dialog>}
  </div>;
}
