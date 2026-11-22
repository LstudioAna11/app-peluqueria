import { productDescriptionCopy } from './productDescriptionCopy';
import spanish from './portalSpanish';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Eye, Package, Plus, X, ZoomIn } from 'lucide-react';
import { prepareCatalogImage } from './catalogImage';
import { studioProducts } from './studioApi';
import { offlineConsultation } from './offlineSession';
import './products.css';

const brands = ['Balmain Hair', 'Authentic Beauty Concept', 'BlondMe Care', 'Revivre Essence', 'STMNT'];
const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
type ProductCard = { id: string; brand: string; name: string; microtext: string; active: boolean; imageUrl: string | null };
type Product = ProductCard & { sku: string; barcode: string; price_cents: number; stock: number; sort_position: number };
type RoutineItem = { product: ProductCard; note: string };
type StockMovement = { id: string; delta: number; note: string; created_at: string };
type ProductPage = { items: Product[]; total: number; pageSize: number };
const routineChanged = 'lst-product-routine-changed';
const errorText = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';

function ProductThumbnail({ product }: { product: ProductCard }) {
  return <span className="lst-product-thumb">{product.imageUrl
    ? <img src={product.imageUrl} alt="" loading="lazy" />
    : <Package size={21} aria-hidden="true" />}</span>;
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
        operation: 'save', productId, create: !saved, sku: get('sku'), brand: get('brand'), barcode: get('barcode'),
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
      <label>Código de barras (opcional)<input name="barcode" maxLength={64} defaultValue={product?.barcode ?? ''} spellCheck={false} /></label>
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
  const [preview, setPreview] = useState<ProductCard | null>(null);
  const [zoomProduct, setZoomProduct] = useState<ProductCard | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState('');
  const [moveMessage, setMoveMessage] = useState('');
  const offline = offlineConsultation();
  const { result, error, loading } = useProducts({ search, brand, page, revision, enabled: !offline });
  const refresh = () => setRevision(value => value + 1);
  const filtered = Boolean(search.trim() || brand);
  const clearFilters = () => { setSearch(''); setBrand(''); setPage(0); };

  async function moveProduct(product: Product, index: number, direction: -1 | 1) {
    if (!result || loading || moving || filtered) return;
    const destination = page * result.pageSize + index + direction;
    if (destination < 0 || destination >= result.total) return;
    setMoving(true);
    setMoveError('');
    setMoveMessage('');
    try {
      const { moved } = await studioProducts<{ moved: boolean }>({
        operation: 'reorder', productId: product.id, direction, position: product.sort_position,
        neighborPosition: result.items[index + direction]?.sort_position,
      });
      if (moved) {
        setPage(Math.floor(destination / result.pageSize));
        setMoveMessage(`${product.name} · posición ${destination + 1}`);
      }
    } catch (failure) { setMoveError(errorText(failure)); }
    finally { refresh(); setMoving(false); }
  }

  return <section className="lst-products">
    <header className="lst-products-head"><h2>Productos</h2>
      {!offline && <button type="button" className="lst-product-primary" onClick={() => { setStock(null); setEditor('new'); }}><Plus size={17} aria-hidden="true" /> Nuevo producto</button>}</header>
    {offline ? <p>Conéctate para consultar el inventario.</p> : <>
      {editor && <ProductEditor key={editor === 'new' ? editor : editor.id} product={editor === 'new' ? undefined : editor} onSaved={refresh} onClose={() => setEditor(null)} />}
      {stock && <ProductStock key={stock.id} product={stock} onSaved={refresh} onClose={() => setStock(null)} />}
      <div className="lst-product-fields">
        <label>Buscar producto<input type="search" placeholder="Nombre, marca, SKU o código de barras" value={search} disabled={moving} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label>
        <label>Marca<select value={brand} disabled={moving} onChange={event => { setBrand(event.target.value); setPage(0); }}><option value="">Todas las marcas</option>{brands.map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      {error && <p role="alert">{error} <button type="button" onClick={refresh}>Reintentar</button></p>}
      {loading && <p role="status">Cargando productos…</p>}
      {filtered && <div className="lst-product-actions"><button type="button" onClick={clearFilters}>Ver todos para ordenar</button></div>}
      {moveError && <p role="alert">{moveError}</p>}
      <p className="lst-product-order-status" role="status">{moveMessage}</p>
      {!loading && result?.items.length === 0 && <p>{search || brand ? 'No hay productos con esta búsqueda.' : 'Añade tu primer producto para empezar el inventario.'}</p>}
      <ul className="lst-inventory-list">{result?.items.map((product, index) => <li className="lst-products-panel" key={product.id}>
        <div className="lst-product-desc"><ProductPhoto product={product} onOpen={() => setZoomProduct(product)} /><div><small>{product.brand} · {product.sku}{product.barcode && <> · {product.barcode}</>}</small>
          <h3>{product.name}</h3>{product.microtext && <p>{product.microtext}</p>}</div></div>
        <div className="lst-product-metrics"><strong>{euro.format(product.price_cents / 100)}</strong><span>{product.stock ? `${product.stock} ud.` : 'Agotado'}</span>{!product.active && <small>Archivado</small>}</div>
        <div className="lst-product-actions">
          {!filtered && result.total > 1 && <div className="lst-product-actions lst-product-order" role="group" aria-label={`Ordenar ${product.name}`}>
            <button type="button" aria-label={`Subir ${product.name}`} title="Subir tarjeta"
              aria-disabled={loading || moving || page * result.pageSize + index === 0}
              onClick={() => void moveProduct(product, index, -1)}><ArrowUp size={17} aria-hidden="true" /></button>
            <button type="button" aria-label={`Bajar ${product.name}`} title="Bajar tarjeta"
              aria-disabled={loading || moving || page * result.pageSize + index + 1 >= result.total}
              onClick={() => void moveProduct(product, index, 1)}><ArrowDown size={17} aria-hidden="true" /></button>
          </div>}
          <button type="button" onClick={() => setPreview(product)}><Eye size={16} aria-hidden="true" /> Vista previa</button>
          <button type="button" onClick={() => { setStock(null); setEditor(product); }}>Editar</button>
          <button type="button" onClick={() => { setEditor(null); setStock(product); }}>Mover stock</button>
        </div>
      </li>)}</ul>
      {!!result && result.total > result.pageSize && <div className="lst-product-actions">
        <button type="button" disabled={loading || moving || page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
        <span>Página {page + 1} de {Math.ceil(result.total / result.pageSize)}</span>
        <button type="button" disabled={loading || moving || (page + 1) * result.pageSize >= result.total} onClick={() => setPage(page + 1)}>Siguiente</button>
      </div>}
      {preview && <ProductRecommendationPreview product={preview} onClose={() => setPreview(null)} />}
      {zoomProduct && <ProductPhotoDialog product={zoomProduct} onClose={() => setZoomProduct(null)} />}
    </>}
  </section>;
}

function ProductDialog({ title, closeLabel, onClose, children, photo = false }: {
  title: string; closeLabel: string; onClose: () => void; children: ReactNode; photo?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  return <dialog className={`lst-products lst-product-preview${photo ? ' lst-product-photo-dialog' : ''}`} ref={dialog} aria-labelledby={titleId}
    onClose={event => { if (event.target === event.currentTarget) onClose(); }}>
    <header className="lst-products-head"><h2 id={titleId}>{title}</h2>
      <button type="button" className="lst-product-preview-close" aria-label={closeLabel} onClick={() => dialog.current?.close()}>
        <X size={19} aria-hidden="true" />
      </button>
    </header>
    {children}
  </dialog>;
}

function ProductRecommendationPreview({ product, onClose }: { product: ProductCard; onClose: () => void }) {
  const [note, setNote] = useState('');
  return <ProductDialog title="Vista previa" closeLabel="Cerrar vista previa" onClose={onClose}>
    <div className="lst-product-preview-portal">
      <p className="lst-product-preview-location">Pasaporte · Mi cabello</p>
      <ProductRoutineSection portal t={spanishText}><RoutineList t={spanishText} items={[{ product, note: note.trim() }]} interactive /></ProductRoutineSection>
    </div>
    {!product.active && <p>Activa este producto para que pueda mostrarse en el Pasaporte.</p>}
    <label>Indicación de prueba (opcional)
      <textarea rows={2} maxLength={500} value={note} onChange={event => setNote(event.target.value)}
        placeholder="Ej. Aplica de medios a puntas tras el lavado" />
    </label>
  </ProductDialog>;
}

type Translate = (key: string) => string;
const spanishText: Translate = (key) => spanish[key];

function ProductPhoto({ product, onOpen, t = spanishText }: { product: ProductCard; onOpen: () => void; t?: Translate }) {
  if (!product.imageUrl) return <ProductThumbnail product={product} />;

  return <button type="button" className="lst-product-photo-button" aria-haspopup="dialog"
    aria-label={t('productZoomNamed').replace('{name}', () => product.name)} title={t('productZoom')} onClick={onOpen}>
    <ProductThumbnail product={product} />
    <span className="lst-product-photo-icon"><ZoomIn size={14} aria-hidden="true" /></span>
  </button>;
}

function ProductPhotoDialog({ product, onClose, t = spanishText }: { product: ProductCard; onClose: () => void; t?: Translate }) {
  if (!product.imageUrl) return null;
  return <ProductDialog title={product.name} closeLabel={t('productClosePhoto')} onClose={onClose} photo>
    <img className="lst-product-photo-enlarged" src={product.imageUrl} alt={`${product.name} · ${product.brand}`} />
  </ProductDialog>;
}

function ProductRecommendationDetail({ item, onClose, t, locale }: { item: RoutineItem; onClose: () => void; t: Translate; locale?: string }) {
  const [photoOpen, setPhotoOpen] = useState(false);
  return <ProductDialog title={item.product.name} closeLabel={t('productCloseDetails')} onClose={onClose}>
    <div className="lst-product-desc"><ProductPhoto product={item.product} t={t} onOpen={() => setPhotoOpen(true)} /><small>{item.product.brand}</small></div>
    <section className="lst-recommendation-info">
      <h3>{t('productApply')}</h3>
      <p>{item.note.trim() || t('productApplyFallback')}</p>
    </section>
    <section className="lst-recommendation-info">
      <h3>{t('productResults')}</h3>
      <p>{productDescriptionCopy(item.product.microtext, locale).trim() || t('productResultsFallback')}</p>
    </section>
    {photoOpen && <ProductPhotoDialog product={item.product} t={t} onClose={() => setPhotoOpen(false)} />}
  </ProductDialog>;
}

function ProductRoutineSection({ portal, children, t }: { portal: boolean; children: ReactNode; t: Translate }) {
  return <section className={`lst-products lst-routine${portal ? ' lst-routine-customer' : ''}`}>
    {portal && <h3>{t('productsRecommended')}</h3>}
    {children}
  </section>;
}

function RoutineList({ items, interactive = false, showArchived = false, onEdit, onRemove, t, locale }: {
  t: Translate; locale?: string; items: RoutineItem[]; interactive?: boolean; showArchived?: boolean;
  onEdit?: (item: RoutineItem) => void; onRemove?: (item: RoutineItem) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const openItem = interactive ? items.find(item => item.product.id === openId) : undefined;
  const openPhoto = interactive ? items.find(item => item.product.id === photoId)?.product : undefined;

  return <>
    <ul className="lst-routine-list">{items.map(item => <li key={item.product.id} className={interactive ? 'lst-routine-clickable' : undefined}>
      {interactive ? <div className="lst-recommendation-row">
        <ProductPhoto product={item.product} t={t} onOpen={() => setPhotoId(item.product.id)} />
        <button type="button" className="lst-recommendation-card" aria-haspopup="dialog"
          aria-label={t('productUseNamed').replace('{name}', () => item.product.name)} onClick={() => setOpenId(item.product.id)}>
          <span className="lst-recommendation-summary">
            <small>{item.product.brand}</small>
            <strong>{item.product.name}</strong>
            {item.product.microtext && <span>{productDescriptionCopy(item.product.microtext, locale)}</span>}
            <span className="lst-recommendation-link">{t('productUse')} <ChevronRight size={15} aria-hidden="true" /></span>
          </span>
        </button>
      </div> : <>
        <div className="lst-product-desc"><ProductThumbnail product={item.product} /><div><small>{item.product.brand}{showArchived && !item.product.active && ' · Archivado'}</small>
          <h4>{item.product.name}</h4>{item.product.microtext && <p>{item.product.microtext}</p>}</div></div>
        {item.note && <p className="lst-routine-note"><strong>Cómo aplicarlo</strong>{item.note}</p>}
        {(onEdit || onRemove) && <div className="lst-product-actions">
          {onEdit && item.product.active && <button type="button" onClick={() => onEdit(item)}>Editar indicación</button>}
          {onRemove && <button type="button" onClick={() => onRemove(item)}>Quitar de la rutina</button>}
        </div>}
      </>}
    </li>)}</ul>
    {openItem && <ProductRecommendationDetail item={openItem} t={t} locale={locale} onClose={() => setOpenId(null)} />}
    {openPhoto && <ProductPhotoDialog product={openPhoto} t={t} onClose={() => setPhotoId(null)} />}
  </>;
}

export function ClientProductRoutine({ clientId, t = spanishText, locale }: { clientId?: string; t?: Translate; locale?: string }) {
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
  useEffect(() => {
    if (!clientId) return;
    const refresh = (event: Event) => {
      if ((event as CustomEvent<string>).detail === clientId) setRevision(value => value + 1);
    };
    window.addEventListener(routineChanged, refresh);
    return () => window.removeEventListener(routineChanged, refresh);
  }, [clientId]);

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
      window.dispatchEvent(new CustomEvent(routineChanged, { detail: clientId }));
      setFeedback(remove ? 'Producto retirado de la rutina.' : 'Recomendación guardada en el Pasaporte.');
      setSelection(null);
    } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }

  return <ProductRoutineSection portal={!admin} t={t}>
    {offline ? <p>{t('productOffline')}</p> : <>
      {loading && <p role="status">{t('productLoading')}</p>}
      {loadError && <p role="alert">{admin ? loadError : t('productLoadError')} <button type="button" onClick={() => setRevision(value => value + 1)}>{t('portalRetry')}</button></p>}
      {!loading && !loadError && !items.length && <p>{admin ? 'Aún no hay productos en esta rutina.' :t('productNone')}</p>}
      <RoutineList t={t} locale={admin ? undefined : locale} items={items} interactive={!admin} showArchived={admin} onEdit={admin && !busy ? item => edit(item.product, item.note) : undefined}
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
          <label>Cómo aplicarlo para esta clienta (opcional)<textarea maxLength={500} rows={3} value={note} disabled={busy} onChange={event => setNote(event.target.value)} placeholder="Cantidad, frecuencia o paso de la rutina" /></label>
          <div className="lst-product-actions"><button className="lst-product-primary" disabled={busy}>Guardar recomendación</button>
            <button type="button" disabled={busy} onClick={() => setSelection(null)}>Cancelar</button></div>
        </form>}
        {feedback && <p role="status">{feedback}</p>}
        {error && <p role="alert">{error}</p>}
      </>}
    </>}
  </ProductRoutineSection>;
}
