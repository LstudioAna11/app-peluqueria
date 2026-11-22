import { useEffect, useRef, useState } from 'react';
import { currentToken, fetchPackBreakdowns, savePackBreakdown, StudioApiError, type PackBreakdownItem } from './studioApi';
import './packBreakdown.css';

const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const emptyItems: PackBreakdownItem[] = [];
type Breakdown = { variantId: string; items: PackBreakdownItem[] };
type DraftItem = { id: number; label: string; amount: string };

function breakdownError(error: unknown, fallback: string) {
  if (error instanceof StudioApiError && error.status === 404) {
    return 'La función studio-api publicada aún no admite el desglose interno.';
  }
  return error instanceof Error ? error.message : fallback;
}

export function usePackBreakdowns(serviceId: string | null) {
  const [result, setResult] = useState<{ serviceId: string; breakdowns: Breakdown[]; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  const token = currentToken();
  useEffect(() => {
    if (!serviceId || !token) return;
    let active = true;
    fetchPackBreakdowns(token, serviceId).then(
      ({ breakdowns }) => { if (active) setResult({ serviceId, breakdowns }); },
      (error: unknown) => { if (active) setResult({ serviceId, breakdowns: [], error: breakdownError(error, 'No se pudo cargar el desglose.') }); },
    );
    return () => { active = false; };
  }, [serviceId, token, attempt]);

  const current = result?.serviceId === serviceId ? result : undefined;
  return {
    loading: !current && !!token,
    error: token ? current?.error : 'Accede a la intranet para consultar el desglose.',
    retry: () => { setResult(undefined); setAttempt(previous => previous + 1); },
    items: (variantId: string) => current?.breakdowns.find(row => row.variantId === variantId)?.items ?? emptyItems,
    save: async (variantId: string, items: PackBreakdownItem[]) => {
      if (!serviceId || !token || currentToken() !== token) throw new Error('La sesión ha cambiado.');
      await savePackBreakdown(token, serviceId, variantId, items);
      const confirmation = await fetchPackBreakdowns(token, serviceId).catch(() => {
        throw new Error('No se pudo comprobar el guardado. El desglose sigue en edición para que puedas reintentar.');
      });
      const confirmed = confirmation.breakdowns.find(row => row.variantId === variantId)?.items ?? emptyItems;
      if (confirmed.length !== items.length || confirmed.some((row, index) => row.label !== items[index].label || row.cents !== items[index].cents)) {
        throw new Error('El servidor no devolvió los importes guardados. Reintenta con «Guardar desglose».');
      }
      setResult(previous => previous?.serviceId === serviceId
        ? { serviceId, breakdowns: [...previous.breakdowns.filter(row => row.variantId !== variantId), { variantId, items: confirmed }] }
        : previous);
    },
  };
}

export function PackBreakdownCard({ variantId = '', title, breakdowns }: {
  variantId?: string; title: string; breakdowns: ReturnType<typeof usePackBreakdowns>;
}) {
  const [draft, setDraft] = useState<DraftItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const nextId = useRef(0);
  const items = breakdowns.items(variantId);
  const total = items.reduce((sum, item) => sum + item.cents, 0);
  const edit = () => {
    setError('');
    setNotice('');
    setDraft(items.length ? items.map(item => ({
      id: nextId.current++, label: item.label, amount: (item.cents / 100).toFixed(2).replace('.', ','),
    })) : [{ id: nextId.current++, label: '', amount: '' }]);
  };
  const save = async () => {
    if (saving || !draft) return;
    const rows: PackBreakdownItem[] = [];
    for (const row of draft) {
      const label = row.label.trim(), amount = row.amount.trim().replace(/\s*€$/, '').trim();
      if (!label && !amount) continue;
      if (!label || !/^\d{1,5}(?:[,.]\d{1,2})?$/.test(amount)) {
        setError('Escribe un servicio y un importe válido en cada fila, por ejemplo 27,50.');
        return;
      }
      rows.push({ label, cents: Math.round(Number(amount.replace(',', '.')) * 100) });
    }
    setSaving(true);
    setError('');
    try {
      await breakdowns.save(variantId, rows);
      setDraft(null);
      setNotice(rows.length ? 'Desglose guardado.' : 'Desglose eliminado.');
    } catch (cause) {
      setError(breakdownError(cause, 'No se pudo guardar el desglose.'));
    } finally {
      setSaving(false);
    }
  };

  return <aside className="studio-pack-breakdown" aria-label={`Desglose interno de ${title}`}>
    <strong className="studio-pack-breakdown-title">Desglose interno</strong>
    {breakdowns.loading && <p role="status">Cargando desglose…</p>}
    {breakdowns.error && <p role="alert">{breakdowns.error} <button type="button" onClick={breakdowns.retry}>Reintentar</button></p>}
    {!breakdowns.error && !breakdowns.loading && <>
      {draft ? <>
        <div className="studio-pack-breakdown-editor">
          {draft.map((item, index) => <div className="studio-pack-breakdown-row" key={item.id}>
            <input aria-label={`Servicio ${index + 1}`} placeholder="Ej. Mechas" value={item.label} maxLength={80} disabled={saving}
              onChange={event => setDraft(previous => previous?.map(row => row.id === item.id ? { ...row, label: event.target.value } : row) ?? null)} />
            <input aria-label={`Importe en euros ${index + 1}`} placeholder="0,00 €" inputMode="decimal" value={item.amount} maxLength={10} disabled={saving}
              onChange={event => setDraft(previous => previous?.map(row => row.id === item.id ? { ...row, amount: event.target.value } : row) ?? null)} />
            <button type="button" disabled={saving} aria-label={`Quitar fila ${index + 1}`}
              onClick={() => setDraft(previous => previous?.filter(row => row.id !== item.id) ?? null)}>×</button>
          </div>)}
          <button type="button" disabled={saving || draft.length >= 16}
            onClick={() => setDraft([...draft, { id: nextId.current++, label: '', amount: '' }])}>+ Añadir servicio</button>
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="studio-pack-breakdown-actions">
          <button type="button" disabled={saving} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar desglose'}</button>
          <button type="button" disabled={saving} onClick={() => setDraft(null)}>Cancelar</button>
        </div>
      </> : <>
        {notice && <p role="status">{notice}</p>}
        {items.length > 0 && <dl>
          {items.map((item, index) => <div key={index}><dt>{item.label}</dt><dd>{money.format(item.cents / 100)}</dd></div>)}
          <div className="studio-pack-breakdown-total"><dt>Total</dt><dd>{money.format(total / 100)}</dd></div>
        </dl>}
        <button type="button" onClick={edit}>{items.length ? 'Editar desglose' : '+ Añadir desglose'}</button>
      </>}
    </>}
  </aside>;
}
