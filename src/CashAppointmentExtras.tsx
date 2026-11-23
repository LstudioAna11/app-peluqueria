import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { studioProducts } from './studioApi';
import type { CashQuickService } from './cashQuickServices';

type Product = { id: string; name: string; brand: string; sku: string; price_cents: number; stock: number };
type ProductPage = { items: Product[]; total: number; pageSize: number };
export type CashExtra = {
  kind: 'service' | 'product'; id: string; variantId?: string; label: string;
  unitCents: number; quantity: number; stock?: number;
};
export const cashExtraKey = (line: CashExtra) => JSON.stringify([line.kind, line.id, line.variantId ?? '']);

export function CashAppointmentExtras({ services, lines, disabled, money, parseCents, onChange }: {
  services: CashQuickService[]; lines: CashExtra[]; disabled: boolean;
  money: (cents: number) => string; parseCents: (value: string) => number | null;
  onChange: (update: (previous: CashExtra[]) => CashExtra[]) => void;
}) {
  const [mode, setMode] = useState<'service' | 'product'>();
  const [search, setSearch] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [price, setPrice] = useState('');
  const [page, setPage] = useState(0);
  const [products, setProducts] = useState<ProductPage>();
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const selected = services.find(service => service.id === serviceId);
  const variant = selected?.variants.find(option => option.id === variantId);
  const chosen = selected?.variants.length ? variant : selected;
  const servicePrice = chosen?.priceCents ?? parseCents(price);

  useEffect(() => {
    if (mode !== 'product') return;
    let active = true;
    const timeout = window.setTimeout(() => {
      studioProducts<ProductPage>({ operation: 'list', search, page, activeOnly: true }).then(
        result => { if (active) setProducts(result); },
        reason => { if (active) setError(reason instanceof Error ? reason.message : 'No se pudieron consultar los productos.'); },
      );
    }, 180);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [mode, search, page, reload]);

  function selectMode(next: typeof mode) {
    setMode(next);
    setSearch('');
    setProducts(undefined);
    setError('');
    setPage(0);
  }

  function add(line: CashExtra) {
    onChange(previous => {
      const key = cashExtraKey(line);
      const existing = previous.find(item => cashExtraKey(item) === key);
      if (existing) return previous.map(item => item === existing && item.quantity < Math.min(line.stock ?? 99, 99)
        ? { ...line, quantity: item.quantity + 1 } : item);
      return previous.length < 24 ? [...previous, line] : previous;
    });
  }

  return <div className="cash-appointment-additions">
    {!mode && <button type="button" disabled={disabled} onClick={() => selectMode('product')}>
      <Plus size={17} aria-hidden="true" /> Añadir servicio o producto
    </button>}
    {mode && <div className="cash-addition-picker" aria-label="Añadir al cobro">
      <div className="cash-actions">
        <button type="button" aria-pressed={mode === 'product'} disabled={disabled} onClick={() => mode !== 'product' && selectMode('product')}>Productos</button>
        <button type="button" aria-pressed={mode === 'service'} disabled={disabled} onClick={() => mode !== 'service' && selectMode('service')}>Servicios</button>
        <button type="button" disabled={disabled} onClick={() => selectMode(undefined)}>Cerrar selector</button>
      </div>
      {mode === 'product' ? <>
        <label>Buscar producto<input value={search} disabled={disabled} placeholder="Nombre, SKU o código de barras" onChange={event => {
          setSearch(event.target.value); setProducts(undefined); setError(''); setPage(0);
        }} /></label>
        {error ? <p role="alert">{error} <button type="button" disabled={disabled} onClick={() => { setError(''); setReload(value => value + 1); }}>Reintentar</button></p>
          : !products ? <p role="status">Buscando productos…</p>
          : products.items.length ? <ul className="cash-addon-list">{products.items.map(product => {
            const quantity = lines.find(item => item.kind === 'product' && item.id === product.id)?.quantity ?? 0;
            return <li key={product.id}><span><strong>{product.name}</strong><small>{product.brand} · {money(product.price_cents)} · {product.stock} ud.</small></span>
              <button type="button" disabled={disabled || quantity >= Math.min(99, product.stock) || (!quantity && lines.length >= 24)}
                aria-label={`Añadir ${product.name}`} onClick={() => add({
                  id: product.id, kind: 'product', label: product.name, unitCents: product.price_cents, stock: product.stock, quantity: 1,
                })}>{quantity ? `Añadir otra (${quantity})` : 'Añadir'}</button></li>;
          })}</ul> : <p>No se encontraron productos.</p>}
        {products && products.total > products.pageSize && <div className="cash-actions">
          <button type="button" disabled={disabled || page === 0} onClick={() => { setProducts(undefined); setPage(page - 1); }}>Anterior</button>
          <button type="button" disabled={disabled || (page + 1) * products.pageSize >= products.total}
            onClick={() => { setProducts(undefined); setPage(page + 1); }}>Siguiente</button>
        </div>}
      </> : <>
        <label>Servicio<select value={serviceId} disabled={disabled} onChange={event => {
          setServiceId(event.target.value); setVariantId(''); setPrice('');
        }}><option value="">Selecciona un servicio</option>
          {services.map(service => <option key={service.id} value={service.id}>{service.label}</option>)}
        </select></label>
        {!!selected?.variants.length && <label>Opción<select value={variantId} disabled={disabled}
          onChange={event => { setVariantId(event.target.value); setPrice(''); }}><option value="">Selecciona una opción</option>
          {selected.variants.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select></label>}
        {chosen && (chosen.priceCents === null ? <label>Importe confirmado (€)<input value={price} inputMode="decimal" disabled={disabled}
          placeholder="0,00" onChange={event => setPrice(event.target.value)} /></label> : <p>Precio {money(chosen.priceCents)}</p>)}
        <button type="button" disabled={disabled || !chosen || servicePrice === null || servicePrice < 1 ||
          lines.some(line => line.kind === 'service' && line.id === serviceId && line.variantId === (variant?.id || undefined)) || lines.length >= 24}
          onClick={() => {
            if (!selected || !chosen || servicePrice === null) return;
            add({ kind:'service', id: selected.id, variantId: variant?.id, label: selected.label + (variant ? ' · ' + variant.label : ''), unitCents: servicePrice, quantity:1 });
            selectMode(undefined);
          }}>Añadir servicio</button>
      </>}
      {lines.length >= 24 && <p role="status">El cobro admite hasta 24 líneas adicionales.</p>}
    </div>}
  </div>;
}
