import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Package, Plus } from 'lucide-react';
import { prepareCatalogImage } from './catalogImage';
import { studioProducts } from './studioApi';
import { offlineConsultation } from './offlineSession';
import './products.css';

const brands = ['Balmain Hair', 'Authentic Beauty Concept', 'BlondMe Care', 'Revivre Essence', 'STMNT'];
const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
type ProductCard = { id: string; brand: string; name: string; microtext: string; active: boolean; imageUrl: string | null };
type Product = ProductCard & { sku: string; price_cents: number; stock: number };
type RoutineItem = { product: ProductCard; note: string };
type StockMovement = { id: string; delta: number; note: string; created_at: string };
type ProductPage = { items: Product[]; total: number; pageSize: number };
const errorText = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';

function ProductThumbnail({ product }: { product: ProductCard }) {
  return <div className="lst-product-thumb">{product.imageUrl
    ? <img src={product.imageUrl} alt="" loading="lazy" />
    : <Package size={21} aria-hidden="true" />}</div>;
}

function useProducts({ search, brand = '', activeOnly = false, page = 0, revision = 0, enabled = true }:
  { search: string; brand?: string; activeOnly?: boolean; page?: number; revision?: number; enabled?: boolean }) {
  const [result, setResult] = useState<ProductPage>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let valid = true;
    setLoading(true);
    setError('');
    const timer = window.setTimeout(() => {
      studioProducts<ProductPage>({ operation: 'list', search, brand, activeOnly, page }).then(
        data => { if (valid) setResult(data); },
        failure => { if (valid) { setResult(undefined); setError(errorText(failure)); } },
      ).finally(() => { if (valid) setLoading(false); });
    }, search ? 220 : 0);
    return () => { valid = false; window.clearTimeout(timer); };
  }, [search, brand, activeOnly, page, revision, enabled]);
  return { result, error, loading };
}

function ProductEditor({ product, onSaved, onClose }: { product?: Product; onSaved: () => void; onClose: () => void }) {
  const [saved, setSaved] = useState(product);
  const [productId] = useState(() => product?.id ?? crypto.randomUUID());
  const [photo, setPhoto] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const get = (key: string) => String(fields.get(key) ?? '');
    setBusy(true);
    setError('');
    try {
      const image = photo ? await prepareCatalogImage(photo, true) : undefined;
      const { item } = await studioProducts<{ item: Product }>({
        operation: 'save', productId, create: !saved, sku: get('sku'), brand: get('brand'),
        name: get('name'), microtext: get('microtext'), priceCents: Math.round(Number(get('price')) * 100),
        active: fields.has('active'),
      });
      setSaved(item);
      onSaved();
      if (image) {
        try {
          await studioProducts({ operation: 'photo', productId, dataUrl: image.dataUrl });
        } catch (failure) {
          setError('La ficha se guardó. ' + errorText(failure));
          return;
        }
        onSaved();
      }
      onClose();
    } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }
  return <form className="lst-products-panel" onSubmit={save}>
    <h3>{product ? 'Editar producto' : 'Nuevo producto'}</h3>
    <fieldset disabled={busy} className="lst-product-fields">
      <label>Marca<input name="brand" required maxLength={80} list="lst-product-brands" defaultValue={product?.brand} /></label>
      <datalist id="lst-product-brands">{brands.map(brand => <option key={brand} value={brand} />)}</datalist>
      <label>Nombre y formato<input name="name" required maxLength={120} placeholder="Champú hidratante · 250 ml" defaultValue={product?.name} /></label>
      <label>Referencia (SKU)<input name="sku" required maxLength={60} defaultValue={product?.sku} /></label>
      <label>Precio (€)<input name="price" type="number" min="0" max="99999.99" step="0.01" required defaultValue={product ? product.price_cents / 100 : ''} /></label>
      <label className="lst-product-wide">Microtexto<textarea name="microtext" rows={2} maxLength={240} placeholder="Para qué sirve y qué aporta al cabello" defaultValue={product?.microtext} /></label>
      <div className="lst-product-photo-field lst-product-wide">
        {saved?.imageUrl && <ProductThumbnail product={saved} />}
        <label>{saved?.imageUrl ? 'Cambiar foto' : 'Foto del producto'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setPhoto(event.currentTarget.files?.[0])} /></label>
      </div>
      <label className="lst-product-check"><input type="checkbox" name="active" defaultChecked={product?.active ?? true} /> Producto activo</label>
    </fieldset>
    {error && <p role="alert">{error}</p>}
    <div className="lst-product-actions"><button className="lst-product-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar producto'}</button>
      <button type="button" disabled={busy} onClick={onClose}>Cancelar</button></div>
  </form>;
}

function ProductStock({ product, onSaved, onClose }: { product: Product; onSaved: () => void; onClose: () => void }) {
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState<{ requestId: string; delta: number; note: string }>();
  useEffect(() => {
    let valid = true;
    studioProducts<{ items: StockMovement[] }>({ operation: 'stock-history', productId: product.id }).then(
      ({ items }) => { if (valid) { setHistory(items); setHistoryError(''); } },
      failure => { if (valid) setHistoryError(errorText(failure)); },
    );
    return () => { valid = false; };
  }, [product.id, revision]);
  async function adjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const delta = Number(fields.get('units')) * (fields.get('type') === 'out' ? -1 : 1);
    const note = String(fields.get('note') ?? '').trim();
    const request = pending?.delta === delta && pending.note === note ? pending : { requestId: crypto.randomUUID(), delta, note };
    setPending(request);
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const result = await studioProducts<{ stock: number }>({ operation: 'stock', productId: product.id, ...request });
      setPending(undefined);
      setStatus(`Movimiento registrado. Existencias actuales: ${result.stock} ud.`);
      form.reset();
      setRevision(value => value + 1);
      onSaved();
    } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }
  return <section className="lst-products-panel">
    <h3>Stock · {product.name}</h3>
    <form onSubmit={adjust}>
      <fieldset className="lst-product-fields" disabled={busy}>
        <label>Movimiento<select name="type"><option value="in">Entrada</option><option value="out">Salida</option></select></label>
        <label>Unidades<input name="units" type="number" min="1" max="999999" step="1" required /></label>
        <label className="lst-product-wide">Motivo  (opcional)<input name="note" maxLength={240} placeholder="Recepción de pedido o venta en el salón" /></label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
      <div className="lst-product-actions"><button className="lst-product-primary" disabled={busy}>Registrar movimiento</button>
        <button type="button" disabled={busy} onClick={onClose}>Cerrar</button></div>
    </form>
    <h4>Últimos movimientos</h4>
    {historyError ? <p role="alert">{historyError}</p> : history.length ? <ul className="lst-stock-history">{history.map(item =>
      <li key={item.id}><strong>{item.delta > 0 ? '+' : ''}{item.delta} ud.</strong>
        <span>{item.note || (item.delta > 0 ? 'Entrada' : 'Salida')}</span>
        <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })}</time></li>)}</ul>
      : <p>Sin movimientos.</p>}
  </section>;
}

export default function ProductInventory() {
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<'new' | Product | null>(null);
  const [stock, setStock] = useState<Product | null>(null);
  const offline = offlineConsultation();
  const { result, error, loading } = useProducts({ search, brand, page, revision, enabled: !offline });
  const refresh = () => setRevision(value => value + 1);
  return <section className="lst-products">
    <header className="lst-products-head"><h2>Productos</h2>
      {!offline && <button type="button" className="lst-product-primary" onClick={() => { setStock(null); setEditor('new'); }}><Plus size={17} aria-hidden="true" /> Nuevo producto</button>}</header>
    {offline ? <p>Conéctate para consultar el inventario.</p> : <>
      {editor && <ProductEditor key={editor === 'new' ? editor : editor.id} product={editor === 'new' ? undefined : editor} onSaved={refresh} onClose={() => setEditor(null)} />}
      {stock && <ProductStock key={stock.id} product={stock} onSaved={refresh} onClose={() => setStock(null)} />}
      <div className="lst-product-fields">
        <label>Buscar producto<input type="search" placeholder="Nombre, marca o referencia" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label>
        <label>Marca<select value={brand} onChange={event => { setBrand(event.target.value); setPage(0); }}><option value="">Todas las marcas</option>{brands.map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      {error && <p role="alert">{error} <button type="button" onClick={refresh}>Reintentar</button></p>}
      {loading && <p role="status">Cargando productos…</p>}
      {!loading && result?.items.length === 0 && <p>{search || brand ? 'No hay productos con esta búsqueda.' : 'Añade tu primer producto para empezar el inventario.'}</p>}
      <ul className="lst-inventory-list">{result?.items.map(product => <li className="lst-products-panel" key={product.id}>
        <div className="lst-product-desc"><ProductThumbnail product={product} /><div><small>{product.brand} · {product.sku}</small>
          <h3>{product.name}</h3>{product.microtext && <p>{product.microtext}</p>}</div></div>
        <div className="lst-product-metrics"><strong>{euro.format(product.price_cents / 100)}</strong><span>{product.stock ? `${product.stock} ud.` : 'Agotado'}</span>{!product.active && <small>Archivado</small>}</div>
        <div className="lst-product-actions">
          <button type="button" onClick={() => { setStock(null); setEditor(product); }}>Editar</button>
          <button type="button" onClick={() => { setEditor(null); setStock(product); }}>Mover stock</button>
        </div>
      </li>)}</ul>
      {!!result && result.total > result.pageSize && <div className="lst-product-actions">
        <button type="button" disabled={loading || page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
        <span>Página {page + 1} de {Math.ceil(result.total / result.pageSize)}</span>
        <button type="button" disabled={loading || (page + 1) * result.pageSize >= result.total} onClick={() => setPage(page + 1)}>Siguiente</button>
      </div>}
    </>}
  </section>;
}

function RoutineList({ items, onEdit, onRemove }: { items: RoutineItem[]; onEdit?: (item: RoutineItem) => void; onRemove?: (item: RoutineItem) => void }) {
  return <ul className="lst-routine-list">{items.map(item => <li key={item.product.id}>
    <div className="lst-product-desc"><ProductThumbnail product={item.product} /><div><small>{item.product.brand}{!item.product.active && ' · Archivado'}</small>
      <h4>{item.product.name}</h4>{item.product.microtext && <p>{item.product.microtext}</p>}</div></div>
    {item.note && <p className="lst-routine-note"><strong>Cómo usarlo</strong>{item.note}</p>}
    {(onEdit || onRemove) && <div className="lst-product-actions">
      {onEdit && item.product.active && <button type="button" onClick={() => onEdit(item)}>Editar indicación</button>}
      {onRemove && <button type="button" onClick={() => onRemove(item)}>Quitar de la rutina</button>}
    </div>}
  </li>)}</ul>;
}

export function ClientProductRoutine({ clientId }: { clientId?: string }) {
  const admin = Boolean(clientId);
  const offline = offlineConsultation();
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [revision, setRevision] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<ProductCard | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const catalogue = useProducts({ search, page, activeOnly: true, enabled: admin && adding && !offline });
  useEffect(() => {
    if (offline) return;
    let valid = true;
    setLoading(true);
    setLoadError('');
    studioProducts<{ items: RoutineItem[] }>({ operation: admin ? 'routine' : 'my-routine', clientId }).then(
      data => { if (valid) setItems(data.items); },
      failure => { if (valid) setLoadError(errorText(failure)); },
    ).finally(() => { if (valid) setLoading(false); });
    return () => { valid = false; };
  }, [admin, clientId, offline, revision]);

  function edit(product: ProductCard, indication = '') {
    setSelection(product);
    setNote(indication);
    setAdding(false);
    setFeedback('');
    setError('');
  }
  async function change(product: ProductCard, remove = false) {
    if (busy) return;
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await studioProducts({ operation: remove ? 'unrecommend' : 'recommend', clientId, productId: product.id, note });
      setRevision(value => value + 1);
      setFeedback(remove ? 'Producto retirado de la rutina.' : 'Recomendación guardada en el Pasaporte.');
      setSelection(null);
    } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }

  return <section className="lst-products lst-routine">
    {!admin && <h3>Productos recomendados</h3>}
    {offline ? <p>Conéctate para consultar los productos de la rutina.</p> : <>
      {loading && <p role="status">Cargando rutina…</p>}
      {loadError && <p role="alert">{loadError} <button type="button" onClick={() => setRevision(value => value + 1)}>Reintentar</button></p>}
      {!loading && !loadError && !items.length && <p>{admin ? 'Aún no hay productos en esta rutina.' : 'Aquí verás los productos que te recomiende el salón.'}</p>}
      <RoutineList items={items} onEdit={admin && !busy ? item => edit(item.product, item.note) : undefined}
        onRemove={admin && !busy ? item => { if (window.confirm(`¿Quitar ${item.product.name} de esta rutina?`)) void change(item.product, true); } : undefined} />
      {admin && <>
        {!adding && !selection && <button type="button" onClick={() => { setAdding(true); setPage(0); }}>Añadir producto</button>}
        {adding && <div className="lst-products-panel">
          <label>Buscar en el inventario<input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label>
          {catalogue.loading && <p role="status">Buscando…</p>}
          {catalogue.error && <p role="alert">{catalogue.error}</p>}
          {!catalogue.loading && !catalogue.error && catalogue.result?.items.length === 0 && <p>No hay productos activos que coincidan.</p>}
          {!catalogue.loading && !!catalogue.result?.items.length && <ul className="lst-product-picker">{catalogue.result.items.map(product =>
            <li key={product.id}><button type="button" onClick={() => edit(product, items.find(item => item.product.id === product.id)?.note)}>{product.brand} · {product.name} <small>{product.sku}</small></button></li>)}</ul>}
          {!!catalogue.result && catalogue.result.total > catalogue.result.pageSize && <div className="lst-product-actions">
            <button type="button" disabled={catalogue.loading || page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
            <button type="button" disabled={catalogue.loading || (page + 1) * catalogue.result.pageSize >= catalogue.result.total} onClick={() => setPage(page + 1)}>Siguiente</button>
          </div>}
          <button type="button" onClick={() => setAdding(false)}>Cancelar</button>
        </div>}
        {selection && <form className="lst-products-panel" onSubmit={event => { event.preventDefault(); void change(selection); }}>
          <h4>{selection.name}</h4>
          <label>Indicación para esta clienta (opcional)<textarea maxLength={500} rows={3} value={note} disabled={busy} onChange={event => setNote(event.target.value)} placeholder="Cantidad, frecuencia o paso de la rutina" /></label>
          <div className="lst-product-actions"><button className="lst-product-primary" disabled={busy}>Guardar recomendación</button>
            <button type="button" disabled={busy} onClick={() => setSelection(null)}>Cancelar</button></div>
        </form>}
        {feedback && <p role="status">{feedback}</p>}
        {error && <p role="alert">{error}</p>}
      </>}
    </>}
  </section>;
}
