import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, Banknote, CalendarDays, Check, ChevronDown, CreditCard,
  Delete, Gift, Printer, Receipt, RefreshCw, Search, Settings, Smartphone, Wallet,
} from 'lucide-react';
import { attachAppointmentVoucher, currentToken, fetchVouchers, StudioApiError, studioCashRegister } from './studioApi';
import { createSalonQrModules, SALON_QR_LINK } from './ReservationQr';
import type { CashQuickService } from './cashQuickServices';
import './cash-register.css';

type Method = 'cash' | 'card' | 'bizum' | 'transfer' | 'courtesy' | 'mixed';
type Kind = 'sale' | 'refund' | 'cash_in' | 'cash_out' | 'courtesy';
type Shift = {
  id: string; opened_at: string; closed_at: string | null; opening_cents: number;
  counted_cents: number | null; terminal_cents: number | null;
};
type ServiceReceipt = {
  items: [label: string, amountCents: number | null][];
  total_cents: number;
  deposit_cents?: number;
  voucher_cents?: number;
  voucher_kind?: string;
};
type ReceiptServiceDetails = {
  services: { label: string; base: number | null; vat: number | null; total: number | null }[];
  vatRate: string;
};
type ReceiptLine = string | { label: string; value: string; total?: boolean; startsBreakdown?: boolean } | ReceiptServiceDetails;
type TicketVatRate = '21' | '10' | '4';
type ReceiptHeader = {
  fiscalName: string; taxId: string; address: string; phone: string; logo: string; vatRate: TicketVatRate;
};
type PrintableTicket = { title: string; lines: ReceiptLine[]; header: ReceiptHeader; kind: 'receipt' | 'closing'; practice?: boolean };
type Movement = {
  id: string; recorded_at: string; description: string; kind: Kind; method: Method;
  service_receipt?: ServiceReceipt | null;
  discount_cents?: number | null;
  ticket_number?: number | null;
  ticket_client_name?: string | null;
  cash_part_cents?: number | null;
  card_part_cents?: number | null;
  bizum_part_cents?: number | null;
  amount_cents: number; appointment_id: string | null; bank_reference: string | null; invoice_reference: string | null; refunded: boolean;
};
type TicketSearchPage = { tickets: (Movement & { ticket_number: number })[]; nextBefore: number | null };
type Totals = Record<Exclude<Method, 'courtesy' | 'mixed'>, number> & { cashIn: number; cashOut: number; count: number };
type CashState = {
  openShift: Shift | null; shift?: Shift | null; movements: Movement[]; totals?: Totals | null;
  history?: Shift[];
};
type AppointmentSale = {
  id: string; description: string; finalCents: number | null; depositCents: number;
  services?: { label: string; amountCents: number | null }[];
  voucherCents: number; unavailable: boolean; hasUnknownVoucher: boolean;
  giftCard?: { clientId: string; saved: () => Promise<void> };
  giftApplied?: boolean;
};
type Command = { operation: 'open' | 'close' | 'record' | 'record-discount' | 'record-courtesy' | 'record-named' | 'invoice'; id?: string; paymentParts?: PaymentParts; [key: string]: unknown };

const methods: Record<Method, string> = { cash: 'Efectivo', card: 'Tarjeta', bizum: 'Bizum', transfer: 'Transferencia', courtesy: 'Cortesía', mixed: 'Pago combinado' };
const kinds: Record<Kind, string> = { sale: 'Cobro', refund: 'Devolución', cash_in: 'Entrada de efectivo', cash_out: 'Salida de efectivo', courtesy: 'Cortesía' };
const methodButtons = [
  { value: 'card', Icon: CreditCard },
  { value: 'cash', Icon: Banknote },
  { value: 'bizum', Icon: Smartphone },
] as const;
type TenderMethod = (typeof methodButtons)[number]['value'];
type PaymentParts = Record<TenderMethod, number>;
const emptyPaymentParts = { cash: '', card: '', bizum: '' };
const paymentPartOrder = ['cash', 'card', 'bizum'] as const;
const movementButtons = [
  { value: 'sale', label: 'Cobro sin cita', Icon: Receipt },
  { value: 'cash_in', label: 'Entrada de efectivo', Icon: ArrowDownLeft },
  { value: 'cash_out', label: 'Salida de efectivo', Icon: ArrowUpRight },
] as const;
const cashTabs = [
  { id: 'checkout', label: 'Cobrar', Icon: Wallet },
  { id: 'movements', label: 'Movimientos', Icon: Receipt },
  { id: 'closing', label: 'Cierres', Icon: CalendarDays },
  { id: 'settings', label: 'Ajustes', Icon: Settings },
] as const;
type CashTab = (typeof cashTabs)[number]['id'];
type QuickSelection = { serviceId: string; variantId?: string };
const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'delete'];
const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const dateTime = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'short', timeStyle: 'short' });
const madridDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' });
const money = (cents: number) => euro.format(cents / 100);
const date = (timestamp: string) => dateTime.format(new Date(timestamp));
const decimal = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
const ticketNumber = (number: number) => 'T-' + String(number).padStart(6, '0');

function recordedParts(movement: Pick<Movement, 'cash_part_cents' | 'card_part_cents' | 'bizum_part_cents'>): PaymentParts {
  return { cash: movement.cash_part_cents ?? 0, card: movement.card_part_cents ?? 0, bizum: movement.bizum_part_cents ?? 0 };
}

function paymentPartLines(parts: PaymentParts) {
  return paymentPartOrder.filter(method => parts[method] > 0).map(method => ({ label: methods[method], value: money(parts[method]) }));
}

function paymentDescription(movement: Movement) {
  return movement.method === 'mixed'
    ? paymentPartLines(recordedParts(movement)).map(row => `${row.label} ${row.value}`).join(' + ')
    : methods[movement.method];
}

const receiptHeaderKey = 'lst_cash_receipt_header';
const receiptLogoLimit = 600 * 1024;
const receiptLogoTypes = ['image/png', 'image/jpeg', 'image/webp'];

function cleanReceiptLogo(value: unknown): string {
  return typeof value === 'string' && value.length <= Math.ceil(receiptLogoLimit / 3) * 4 + 32
    && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+=*$/i.test(value) ? value : '';
}
const receiptHeaderFields = [
  { key: 'fiscalName', label: 'Nombre fiscal', limit: 100 },
  { key: 'taxId', label: 'NIF', limit: 20 },
  { key: 'address', label: 'Domicilio fiscal, código postal y localidad', limit: 180 },
  { key: 'phone', label: 'Teléfono del salón (opcional)', limit: 30 },
] as const;

function cleanReceiptHeader(value: Partial<ReceiptHeader> | null): ReceiptHeader {
  return {
    fiscalName: typeof value?.fiscalName === 'string' ? value.fiscalName.trim().slice(0, 100) : '',
    taxId: typeof value?.taxId === 'string' ? value.taxId.trim().slice(0, 20).toUpperCase() : '',
    address: typeof value?.address === 'string' ? value.address.trim().slice(0, 180) : '',
    phone: typeof value?.phone === 'string' ? value.phone.trim().slice(0, 30) : '',
    logo: cleanReceiptLogo(value?.logo),
    vatRate: value?.vatRate === '10' || value?.vatRate === '4' ? value.vatRate : '21',
  };
}

function readReceiptHeader(): ReceiptHeader {
  try { return cleanReceiptHeader(JSON.parse(localStorage.getItem(receiptHeaderKey) || 'null')); }
  catch { return cleanReceiptHeader(null); }
}

function ReceiptHeaderSettings({ header, shared, onSaved }: {
  header: ReceiptHeader;
  shared: boolean;
  onSaved: (header: ReceiptHeader) => void;
}) {
  const [draft, setDraft] = useState(header);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [readingLogo, setReadingLogo] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = cleanReceiptHeader(draft);
    if (!values.fiscalName || !values.taxId || !values.address) {
      setError('Completa el nombre fiscal, el NIF y el domicilio.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await request<{ header: ReceiptHeader }>({ operation: 'receipt-header', header: values });
      const stored = cleanReceiptHeader(result.header);
      setDraft(stored);
      onSaved(stored);
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron guardar los datos de impresión.');
    } finally {
      setSaving(false);
    }
  }

  function selectLogo(file: File) {
    setSaved(false);
    if (!receiptLogoTypes.includes(file.type) || file.size > receiptLogoLimit) {
      setError('Elige un logo PNG, JPG o WebP de hasta 600 KB.');
      return;
    }
    setReadingLogo(true);
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setReadingLogo(false);
      const logo = cleanReceiptLogo(reader.result);
      if (logo) setDraft(current => ({ ...current, logo }));
      else setError('No se pudo leer el logo seleccionado.');
    };
    reader.readAsDataURL(file);
  }

  return <section className="cash-card cash-receipt-settings">
    <h3>Datos de impresión del ticket</h3>
    <form className="cash-receipt-settings-form" onSubmit={save} aria-busy={saving}>
      {receiptHeaderFields.map(({ key, label, limit }) => <label className="cash-field" key={key}>
        {label}
        <input type="text" required={key !== 'phone'} maxLength={limit} autoComplete="off" value={draft[key]} disabled={saving}
          onChange={event => {
            setDraft(current => ({ ...current, [key]: event.target.value }));
            setSaved(false);
            setError('');
          }} />
      </label>)}
      <label className="cash-field">IVA incluido en el precio
        <select value={draft.vatRate} disabled={saving} onChange={event => {
          const vatRate = event.target.value as TicketVatRate;
          setDraft(current => ({ ...current, vatRate }));
          setSaved(false);
        }}>
          <option value="21">21 %</option>
          <option value="10">10 %</option>
          <option value="4">4 %</option>
        </select>
      </label>
      <div className="cash-receipt-logo">
        <label className="cash-field">Logo del ticket
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={readingLogo || saving}
            onChange={event => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) selectLogo(file);
            }} />
        </label>
        {draft.logo && <div className="cash-actions">
          <img src={draft.logo} alt="Vista previa del logo del ticket" />
          <button type="button" disabled={readingLogo || saving} onClick={() => {
            setDraft(current => ({ ...current, logo: '' }));
            setSaved(false);
            setError('');
          }}>Quitar logo</button>
        </div>}
        {readingLogo && <p role="status">Cargando logo…</p>}
      </div>
      <button className="cash-primary" disabled={readingLogo || saving}>{saving ? 'Guardando…' : 'Guardar datos de impresión'}</button>
    </form>
    {header.fiscalName && !shared && <p className="cash-pos-note">Pulsa «Guardar datos de impresión» para usar la cabecera de este navegador en todos los dispositivos.</p>}
    {saved && <p role="status">Cabecera guardada para todos los tickets.</p>}
    {error && <p className="cash-message cash-error" role="alert">{error}</p>}
  </section>;
}

function cents(text: string, signed = false): number | null {
  const value = text.trim();
  if (!(signed ? /^-?\d{1,6}([,.]\d{1,2})?$/ : /^\d{1,6}([,.]\d{1,2})?$/).test(value)) return null;
  return Math.round(Number(value.replace(',', '.')) * 100);
}

async function request<T>(body: unknown) {
  const token = currentToken();
  if (!token) throw new Error('Vuelve a iniciar sesión como administradora.');
  return studioCashRegister<T>(token, body);
}

function splitTicketCents(total: number, weights: number[]): number[] {
  if (total === 0) return weights.map(() => 0);
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights;
  const divisor = BigInt(sum);
  let cumulative = 0;
  let allocated = 0;
  return weights.map(weight => {
    cumulative += weight;
    const share = Number((BigInt(total) * BigInt(cumulative) + divisor / 2n) / divisor);
    const amount = share - allocated;
    allocated = share;
    return amount;
  });
}

function makeReceiptServiceDetails(snapshot: ServiceReceipt, vatRate: string, base: number | null): ReceiptServiceDetails {
  const prices = snapshot.items.map(([, amount]) => amount);
  const knownPrices = prices.every((price): price is number => price !== null);
  const canAllocate = knownPrices && (snapshot.total_cents === 0 || prices.some(price => price > 0));
  const allocatedTotals = canAllocate ? splitTicketCents(snapshot.total_cents, prices) : null;
  const totals = allocatedTotals ?? prices;
  const bases = allocatedTotals && base !== null ? splitTicketCents(base, allocatedTotals) : null;
  return {
    vatRate,
    services: snapshot.items.map(([label], index) => ({
      label,
      base: bases?.[index] ?? null,
      vat: bases && allocatedTotals ? allocatedTotals[index] - bases[index] : null,
      total: totals[index],
    })),
  };
}

function printServiceDetails(page: Document, details: ReceiptServiceDetails): HTMLElement {
  const list = page.createElement('section');
  list.className = 'ticket-services';
  for (const service of details.services) {
    const item = page.createElement('div');
    item.className = 'ticket-service';
    const name = page.createElement('p');
    name.className = 'ticket-service-name';
    name.textContent = service.label;
    item.append(name);
    const amounts: [string, number | null][] = [
      ['Base', service.base], ['IVA ' + details.vatRate + ' %', service.vat], ['Total', service.total],
    ];
    const breakdown = page.createElement('dl');
    for (const [label, amount] of amounts) {
      if (amount === null) continue;
      const row = page.createElement('div');
      const caption = page.createElement('dt');
      const value = page.createElement('dd');
      caption.textContent = label;
      value.textContent = money(amount);
      row.append(caption, value);
      breakdown.append(row);
    }
    if (breakdown.childElementCount) item.append(breakdown);
    list.append(item);
  }
  return list;
}

function printTicketFooter(page: Document) {
  const footer = page.createElement('footer');
  footer.className = 'ticket-footer';
  const thanks = page.createElement('p');
  thanks.textContent = 'Gracias por su visita';
  const { side, modules } = createSalonQrModules();
  const namespace = 'http://www.w3.org/2000/svg';
  const qr = page.createElementNS(namespace, 'svg');
  qr.setAttribute('viewBox', `0 0 ${side} ${side}`);
  qr.setAttribute('role', 'img');
  qr.setAttribute('aria-label', 'QR para reservar en L’Studio Ana');
  const back = page.createElementNS(namespace, 'rect');
  back.setAttribute('width', String(side));
  back.setAttribute('height', String(side));
  back.setAttribute('fill', '#fff');
  const pattern = page.createElementNS(namespace, 'path');
  pattern.setAttribute('d', modules);
  pattern.setAttribute('fill', '#000');
  pattern.setAttribute('shape-rendering', 'crispEdges');
  qr.append(back, pattern);
  const link = page.createElement('a');
  link.href = SALON_QR_LINK;
  link.setAttribute('aria-label', 'Abrir reservas de L’Studio Ana');
  link.append(qr);
  footer.append(link, thanks);
  page.body.append(footer);
}

function movementTicket(movement: Movement, header: ReceiptHeader, practice = false): PrintableTicket {
  const snapshot = movement.service_receipt;
  const discount = movement.discount_cents ?? 0;
  const lines: ReceiptLine[] = [
    { label: 'Fecha', value: date(movement.recorded_at) },
    practice ? { label: 'N.º de prueba', value: 'PRUEBA-' + movement.ticket_number } : movement.ticket_number
      ? { label: 'N.º de ticket', value: ticketNumber(movement.ticket_number) }
      : { label: 'Movimiento', value: movement.id.slice(0, 8).toUpperCase() },
    ...(movement.ticket_client_name ? ['Cliente · ' + movement.ticket_client_name] : []),
    ...(movement.invoice_reference ? ['Factura asociada ' + movement.invoice_reference] : []),
  ];

  const totalCents = snapshot?.total_cents ?? movement.amount_cents;
  const baseCents = Math.round(totalCents * 100 / (100 + Number(header.vatRate)));

  if (snapshot && snapshot.items.length > 1) {
    lines.push(makeReceiptServiceDetails(snapshot, header.vatRate, baseCents));
  } else {
    lines.push(snapshot?.items[0]?.[0] || movement.description);
  }

  if (discount > 0) lines.push({ label: 'Descuento aplicado', value: money(-discount) });
  if (snapshot?.deposit_cents) lines.push({ label: 'Anticipo aplicado', value: money(-snapshot.deposit_cents) });
  if (snapshot?.voucher_cents) lines.push({
    label: snapshot.voucher_kind === 'gift' ? 'Tarjeta regalo aplicada' : 'Bono aplicado',
    value: money(-snapshot.voucher_cents),
  });
  if (snapshot && totalCents !== movement.amount_cents) lines.push({
    label: 'Saldo cobrado', value: money(movement.amount_cents),
  });

  lines.push(
    ...(movement.bank_reference ? [`Referencia ${movement.bank_reference}`] : []),
    ...(movement.refunded ? ['Cobro devuelto'] : []),
    { label: 'Base sin IVA', value: money(baseCents), startsBreakdown: true },
    { label: 'IVA ' + header.vatRate + ' %', value: money(totalCents - baseCents) },
    { label: 'Total con IVA', value: money(totalCents), total: true },
    { label: 'Método de pago', value: methods[movement.method] },
  );
  if (movement.method === 'mixed') lines.push(...paymentPartLines(recordedParts(movement)));
  return { title: 'L’Studio Ana · Justificante de caja', lines, header, kind: 'receipt', practice };
}

function closingTicket(header: ReceiptHeader, opening: number, totals: Record<TenderMethod, number>, practice = false): PrintableTicket {
  return {
    title: 'L’Studio Ana · Cierre de caja',
    kind: 'closing',
    header,
    practice,
    lines: [
      { label: 'Fondo inicial', value: money(opening) },
      { label: 'Efectivo', value: money(totals.cash) },
      { label: 'Tarjeta', value: money(totals.card) },
      { label: 'Bizum', value: money(totals.bizum) },
      { label: 'Total', value: money(totals.cash + totals.card + totals.bizum), total: true },
    ],
  };
}

function writeCashDocument(page: Document, { title, lines, header, kind, practice }: PrintableTicket) {
  page.head.replaceChildren();
  page.body.replaceChildren();
  page.title = title;
  const css = page.createElement('style');
  css.textContent = `
    @page { margin: 4mm }
    body { font: 11pt system-ui; color: #000; width: 100%; max-width: 70mm; margin: 0 auto; overflow-wrap: anywhere }
    h1 { font-size: 14pt }
    p { margin: 5px 0; break-inside: avoid }
    .amount-row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px }
    .amount-row span:last-child { flex: none; white-space: nowrap; font-variant-numeric: tabular-nums }
    .amount-total { margin-block: 7px; padding-top: 4px; border-top: 1px solid #111; font-weight: 700 }
    .ticket-brand { margin: 0 0 7px; text-align: center; font: bold 18pt Georgia, serif }
    .ticket-brand img { display: block; max-width: min(100%, 38mm); max-height: 22mm; width: auto; height: auto; margin: 0 auto }
    .ticket-issuer { margin-block: 6px; break-inside: avoid }
    .ticket-issuer p { margin-block: 2px }
    .ticket-document { border-block: 1px solid #111; margin-block: 9px; padding: 4px 0; break-inside: avoid }
    .ticket-document h2 { margin: 0; font-size: 11pt }
    .ticket-document p { margin: 2px 0 0; font-size: 9pt }
  `;
  // The driver supplies the roll length; the printable ticket fits the 58 mm roll with 3 mm margins.
  css.textContent += `
    @page { size: portrait; margin: 3mm }
    body { max-width: 52mm; font-size: 9pt }
    .ticket-brand { font-size: 15pt }
    .ticket-brand img { max-width: min(100%, 38mm) }
    .ticket-document h2 { font-size: 9pt }
    .ticket-document p { font-size: 8pt }
    .ticket-practice { margin-block: 4px; padding: 3px; border: 1px solid #000; text-align: center; font-weight: 700 }
    .amount-row { gap: 4px }
    .amount-row span:first-child { min-width: 0 }
    p { margin: 2px 0 }
    .ticket-brand { margin-bottom: 4px }
    .ticket-brand img { max-height: 17mm }
    .ticket-issuer { margin-block: 3px }
    .ticket-issuer p { margin-block: 1px }
    .ticket-document { margin-block: 5px; padding-block: 3px }
    .amount-breakdown-start { margin-top: 3mm }
    .amount-total { margin-block: 4px; padding-top: 3px }
    .ticket-services { margin-block: 4px; border-top: 1px solid #111 }
    .ticket-service { padding-block: 3px; break-inside: avoid }
    .ticket-service + .ticket-service { border-top: 1px dotted #777 }
    .ticket-service-name { margin: 0 0 2px; font-weight: 700 }
    .ticket-service dl, .ticket-service dd { margin: 0 }
    .ticket-service dl { font-size: 8pt; line-height: 1.15; font-variant-numeric: tabular-nums }
    .ticket-service dl div { display: flex; justify-content: space-between; gap: 4px }
    .ticket-service dl div:last-child { font-weight: 700 }
    .ticket-footer { margin-top: 4px; padding-top: 6mm; border-top: 1px solid #111; text-align: center; break-inside: avoid }
    .ticket-footer p { font-weight: 700; margin: 1px 0 0 }
    .ticket-footer svg { display: block; width: 27mm; height: 27mm; margin: 0 auto }
    .ticket-footer a { display: block; color: #000; text-decoration: none }
  `;
  page.head.append(css);
  const heading = page.createElement('h1');
  heading.className = 'ticket-brand';
  let logo: HTMLImageElement | undefined;
  if (header.logo) {
    logo = page.createElement('img');
    logo.alt = 'L’Studio Ana';
    logo.src = header.logo;
    heading.append(logo);
  } else {
    heading.textContent = 'L’Studio Ana';
  }
  page.body.append(heading);
  if (practice) {
    const mark = page.createElement('p');
    mark.className = 'ticket-practice';
    mark.textContent = 'PRUEBA · SIN COBRO REAL';
    page.body.append(mark);
  }
  const issuer = page.createElement('div');
  issuer.className = 'ticket-issuer';
  for (const text of [header.fiscalName, header.taxId && 'NIF ' + header.taxId, header.address, header.phone && 'Tel. ' + header.phone]) {
    if (!text) continue;
    const row = page.createElement('p');
    row.textContent = text;
    issuer.append(row);
  }
  page.body.append(issuer);
  const documentType = page.createElement('div');
  documentType.className = 'ticket-document';
  const subtitle = page.createElement('h2');
  subtitle.textContent = kind === 'closing' ? 'Cierre de caja' : 'Justificante de caja';
  documentType.append(subtitle);
  if (kind === 'receipt') {
    const qualifier = page.createElement('p');
    qualifier.textContent = 'Sin validez como factura';
    documentType.append(qualifier);
  }
  page.body.append(documentType);
  for (const line of lines) {
    if (typeof line !== 'string' && 'services' in line) {
      page.body.append(printServiceDetails(page, line));
      continue;
    }
    const row = page.createElement('p');
    if (typeof line === 'string') {
      row.textContent = line;
    } else {
      row.className = line.total ? 'amount-row amount-total' : 'amount-row';
      if (line.startsBreakdown) row.classList.add('amount-breakdown-start');
      for (const text of [line.label, line.value]) {
        const span = page.createElement('span');
        span.textContent = text;
        row.append(span);
      }
    }
    page.body.append(row);
  }
  if (kind === 'receipt') printTicketFooter(page);
  return { heading, logo };
}

async function printSlip(ticket: PrintableTicket) {
  const frame = document.createElement('iframe');
  frame.className = 'cash-print-frame';
  frame.title = ticket.title;
  const host = document.querySelector('dialog.cash-ticket-preview[open]')
    ?? document.querySelector('dialog.appointment-cash-dialog[open]') ?? document.body;
  host.append(frame);
  try {
    const page = frame.contentDocument;
    const printer = frame.contentWindow;
    if (!page || !printer) throw new Error('No se pudo abrir la impresión.');
    const { heading, logo } = writeCashDocument(page, ticket);
    if (logo) {
      const ready = logo.complete ? logo.naturalWidth > 0 : await new Promise<boolean>(resolve => {
        const image = logo;
        const timeout = window.setTimeout(() => resolve(false), 1200);
        image.addEventListener('load', () => { window.clearTimeout(timeout); resolve(true); }, { once: true });
        image.addEventListener('error', () => { window.clearTimeout(timeout); resolve(false); }, { once: true });
      });
      if (!ready) heading.textContent = 'L’Studio Ana';
    }
    if (!frame.isConnected) return;
    printer.addEventListener('afterprint', () => frame.remove(), { once: true });
    printer.focus();
    printer.print();
    // Some browsers omit afterprint when the user cancels.
    window.setTimeout(() => frame.remove(), 300000);
  } catch (error) {
    frame.remove();
    throw error;
  }
}

function TicketPreview({ ticket, onClose }: { ticket: PrintableTicket; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [error, setError] = useState('');

  useEffect(() => {
    const modal = dialog.current;
    const iframe = frame.current;
    if (!modal || !iframe) return;
    if (!modal.open) modal.showModal();
    close.current?.focus();
    try {
      const page = iframe.contentDocument;
      if (!page) throw new Error('No se pudo abrir la vista previa.');
      const { heading, logo } = writeCashDocument(page, ticket);
      function fit() {
        if (iframe && page) iframe.style.height = Math.max(170, page.body.scrollHeight + 20) + 'px';
      }
      function fallbackLogo() {
        heading.textContent = 'L’Studio Ana';
        fit();
      }
      if (logo) {
        if (logo.complete && logo.naturalWidth === 0) fallbackLogo();
        else {
          logo.addEventListener('load', fit, { once: true });
          logo.addEventListener('error', fallbackLogo, { once: true });
        }
      }
      fit();
      return () => {
        logo?.removeEventListener('load', fit);
        logo?.removeEventListener('error', fallbackLogo);
      };
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo abrir la vista previa.');
    }
  }, [ticket]);

  async function printPreview() {
    setError('');
    try { await printSlip(ticket); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo abrir la impresión.'); }
  }

  return <dialog ref={dialog} className="appointment-cash-dialog cash-ticket-preview"
    aria-labelledby={titleId}
    onCancel={event => event.stopPropagation()}
    onClose={event => { event.stopPropagation(); onClose(); }}>
    <header className="appointment-cash-dialog-header">
      <h2 id={titleId}>{ticket.kind === 'closing' ? 'Vista previa del cierre' : 'Vista previa del ticket'}</h2>
      <button type="button" ref={close} onClick={() => dialog.current?.close()}>Cerrar</button>
    </header>
    <div className="cash-ticket-preview-body">
      <iframe ref={frame} title="Ticket de 58 mm" />
      {error && <p className="cash-message cash-error" role="alert">{error}</p>}
    </div>
    <footer><button type="button" className="cash-primary" onClick={() => void printPreview()}>
      <Printer size={17} aria-hidden="true" />Imprimir ticket
    </button></footer>
  </dialog>;
}

function TicketSearch({ onPreview, previewDisabled }: {
  onPreview: (movement: Movement) => void;
  previewDisabled: boolean;
}) {
  const [query, setQuery] = useState('');
  const [day, setDay] = useState('');
  const [results, setResults] = useState<TicketSearchPage & {
    criteria: { query: string; day: string | null };
  }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function findTickets(criteria: { query: string; day: string | null }, before?: number) {
    if (busy) return;
    setBusy(true);
    setError('');
    if (before === undefined) setResults(undefined);
    try {
      const page = await request<TicketSearchPage>({
        operation: 'ticket-search', ...criteria, before,
      });
      setResults(current => ({
        criteria,
        tickets: before === undefined ? page.tickets : [...(current?.tickets ?? []), ...page.tickets],
        nextBefore: page.nextBefore,
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron buscar tickets.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="cash-card cash-ticket-search">
    <h3><Search size={18} aria-hidden="true" />Buscar tickets</h3>
    <form className="cash-form" aria-busy={busy} onSubmit={event => {
      event.preventDefault();
      if (query.trim() || day) void findTickets({ query: query.trim(), day: day || null });
    }}>
      <label>Número de ticket o cliente
        <input type="search" maxLength={160} placeholder="T-000123 o nombre" value={query}
          onChange={event => setQuery(event.target.value)} />
      </label>
      <label>Fecha del ticket
        <input type="date" value={day} onChange={event => setDay(event.target.value)} />
      </label>
      <button type="submit" className="cash-primary" disabled={busy || (!query.trim() && !day)}>Buscar</button>
    </form>
    {busy && <p className="cash-pos-note" role="status">Buscando tickets…</p>}
    {error && <p className="cash-message cash-error" role="alert">{error}</p>}
    {results?.tickets.length === 0 && <p className="cash-pos-note" role="status">No se encontraron tickets.</p>}
    {!!results?.tickets.length && <>
      <ul className="cash-movements">
        {results.tickets.map(movement => <li key={movement.id}>
          <div className="cash-movement-line">
            <div className="cash-movement-info">
              <strong>Ticket {ticketNumber(movement.ticket_number)}{movement.ticket_client_name ? ' · ' + movement.ticket_client_name : ''}</strong>
              <small>{date(movement.recorded_at)} · {kinds[movement.kind]} · {paymentDescription(movement)}{movement.refunded ? ' · Devuelto' : ''}</small>
              <p>{movement.description}</p>
            </div>
            <strong className="cash-movement-amount">{money(movement.kind === 'refund' ? -movement.amount_cents : movement.amount_cents)}</strong>
          </div>
          <div className="cash-actions">
            <button type="button" aria-haspopup="dialog" disabled={previewDisabled}
              onClick={() => onPreview(movement)}>Vista previa</button>
          </div>
        </li>)}
      </ul>
      {results.nextBefore !== null && <div className="cash-actions">
        <button type="button" disabled={busy} onClick={() => void findTickets(results.criteria, results.nextBefore!)}>Ver más tickets</button>
      </div>}
    </>}
  </section>;
}

type ClosingReportDay = Record<TenderMethod, number> & { day: string; shifts: number };

function ClosingReport() {
  const today = madridDay.format();
  const [from, setFrom] = useState(() => today.slice(0, 7) + '-01');
  const [to, setTo] = useState(today);
  const [days, setDays] = useState<ClosingReportDay[]>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const totals = { shifts: 0, cash: 0, card: 0, bizum: 0 };
  for (const row of days ?? []) {
    totals.shifts += row.shifts;
    totals.cash += row.cash;
    totals.card += row.card;
    totals.bizum += row.bizum;
  }

  async function report(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setDays(undefined);
    if (!from || !to || from > to || Date.parse(to) - Date.parse(from) > 365 * 86400000) {
      setError('Selecciona un periodo válido de hasta 366 días.');
      return;
    }
    setBusy(true);
    try {
      const result = await request<{ days: ClosingReportDay[] }>({ operation: 'closing-report', from, to });
      setDays(result.days);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo consultar el historial de cierres.');
    } finally {
      setBusy(false);
    }
  }

  function downloadCsv() {
    if (!days?.length) return;
    const rows = [['Fecha de cierre', 'Turnos', 'Efectivo (€)', 'Tarjeta (€)', 'Bizum (€)', 'Total (€)'],
      ...days.map(row => [row.day, row.shifts, decimal(row.cash), decimal(row.card), decimal(row.bizum), decimal(row.cash + row.card + row.bizum)]),
      ['Total', totals.shifts, decimal(totals.cash), decimal(totals.card), decimal(totals.bizum), decimal(totals.cash + totals.card + totals.bizum)],
    ];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `cierres-${from}-a-${to}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <details className="cash-card cash-closing-report">
    <summary><CalendarDays size={18} aria-hidden="true" />Historial de cierres por fechas</summary>
    <form className="cash-form" aria-busy={busy} onSubmit={report}>
      <label>Desde<input type="date" required value={from} disabled={busy} onChange={event => {
        setFrom(event.target.value); setDays(undefined); setError('');
      }} /></label>
      <label>Hasta<input type="date" required value={to} disabled={busy} onChange={event => {
        setTo(event.target.value); setDays(undefined); setError('');
      }} /></label>
      <button className="cash-primary" disabled={busy}>Ver cierres</button>
    </form>
    {busy && <p className="cash-pos-note" role="status">Consultando cierres…</p>}
    {error && <p className="cash-message cash-error" role="alert">{error}</p>}
    {days?.length === 0 && <p className="cash-pos-note" role="status">No hay turnos cerrados en estas fechas.</p>}
    {!!days?.length && <>
      <p className="cash-pos-note">Importes por día de cierre. Las devoluciones se restan del método de pago correspondiente.</p>
      <div className="cash-closing-table">
        <table aria-label="Importes diarios de los turnos cerrados">
          <thead><tr><th scope="col">Fecha de cierre</th><th scope="col">Turnos</th><th scope="col">Efectivo</th>
            <th scope="col">Tarjeta</th><th scope="col">Bizum</th><th scope="col">Total</th></tr></thead>
          <tbody>{days.map(row => <tr key={row.day}>
            <th scope="row">{row.day.split('-').reverse().join('/')}</th><td>{row.shifts}</td><td>{money(row.cash)}</td>
            <td>{money(row.card)}</td><td>{money(row.bizum)}</td><td>{money(row.cash + row.card + row.bizum)}</td>
          </tr>)}</tbody>
          <tfoot><tr>
            <th scope="row">Total del periodo</th><td>{totals.shifts}</td><td>{money(totals.cash)}</td>
            <td>{money(totals.card)}</td><td>{money(totals.bizum)}</td><td>{money(totals.cash + totals.card + totals.bizum)}</td>
          </tr></tfoot>
        </table>
      </div>
      <div className="cash-actions"><button type="button" onClick={downloadCsv}>Descargar CSV de cierres</button></div>
    </>}
  </details>;
}

function CashServiceShortcuts({ services, selection, disabled, onSelect }: {
  services: CashQuickService[];
  selection?: QuickSelection;
  disabled: boolean;
  onSelect: (service: CashQuickService, variantId?: string) => void;
}) {
  const shortcuts = services.slice(0, 6);
  const others = services.slice(6);
  const selected = services.find(service => service.id === selection?.serviceId);
  const variant = selected?.variants.find(item => item.id === selection?.variantId);
  return <fieldset className="cash-choice-group cash-shortcuts" disabled={disabled}>
    <legend>Servicios rápidos</legend>
    <div className="cash-shortcut-buttons">
      {shortcuts.map(service => <button type="button" key={service.id}
        aria-pressed={selection?.serviceId === service.id} onClick={() => onSelect(service)}>
        <span>{service.label}</span>
        <small>{service.variants.length ? 'Elegir variante' : service.priceCents === null ? 'Precio manual' : money(service.priceCents)}</small>
      </button>)}
    </div>
    {!!others.length && <label className="cash-field">Más servicios
      <select value={others.some(service => service.id === selected?.id) ? selected?.id : ''} onChange={event => {
        const service = others.find(item => item.id === event.target.value);
        if (service) onSelect(service);
      }}>
        <option value="" disabled>Elige otro servicio</option>
        {others.map(service => <option key={service.id} value={service.id}>{service.label}</option>)}
      </select>
    </label>}
    {!!selected?.variants.length && <label className="cash-field">Variante de {selected.label}
      <select value={selection?.variantId ?? ''} onChange={event => onSelect(selected, event.target.value || undefined)}>
        <option value="">Elige una variante</option>
        {selected.variants.map(item => <option key={item.id} value={item.id}>
          {item.label}{item.priceCents === null ? '' : ' · ' + money(item.priceCents)}
        </option>)}
      </select>
    </label>}
    {selected && (selected.variants.length ? variant?.priceCents === null : selected.priceCents === null)
      && <p className="cash-pos-note">Introduce el precio acordado en el campo Importe.</p>}
  </fieldset>;
}

function Amount({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label>{label}<input inputMode="decimal" maxLength={10} required {...props} /></label>;
}

function Keypad({ label, value, onChange, disabled }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  function press(key: string) {
    if (key === 'delete') {
      onChange(value.slice(0, -1));
      return;
    }
    const current = value.trim().replace('.', ',');
    const next = key === ',' && !current ? '0,' : current + key;
    if (/^\d{1,6}(,\d{0,2})?$/.test(next)) onChange(next);
  }

  return <div className="cash-keypad-wrap">
    <div className="cash-keypad-entry">
      <label>{label}<span className="cash-number">
        <input required inputMode="decimal" maxLength={9} placeholder="0,00" value={value} disabled={disabled}
          onChange={event => onChange(event.target.value)} />
        <span aria-hidden="true">€</span>
      </span></label>
      <button type="button" className="cash-quiet" disabled={disabled || !value} onClick={() => onChange('')}>Borrar importe</button>
    </div>
    <div className="cash-keypad" aria-label="Teclado de importes" role="group">
      {keypad.map(key => <button type="button" key={key} disabled={disabled}
        aria-label={key === 'delete' ? 'Borrar último dígito' : key === ',' ? 'Coma decimal' : key}
        onClick={() => press(key)}>{key === 'delete' ? <Delete size={19} aria-hidden="true" /> : key}</button>)}
    </div>
  </div>;
}

function CashPractice({ header, onExit }: { header: ReceiptHeader; onExit: () => void }) {
  const [opening, setOpening] = useState('0');
  const [openingCents, setOpeningCents] = useState<number>();
  const [sales, setSales] = useState<(Movement & { method: TenderMethod })[]>([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [method, setMethod] = useState<TenderMethod>('card');
  const [counted, setCounted] = useState('');
  const [terminal, setTerminal] = useState('');
  const [closing, setClosing] = useState<{ counted: number; terminal: number | null }>();
  const [preview, setPreview] = useState<PrintableTicket>();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);

  const totals = { cash: 0, card: 0, bizum: 0 };
  for (const sale of sales) totals[sale.method] += sale.amount_cents;
  const amountCents = cents(amount);
  const countedCents = cents(counted);
  const terminalCents = terminal.trim() ? cents(terminal) : null;
  const expected = (openingCents ?? 0) + totals.cash;
  const summary: [string, number][] = [
    ['Fondo inicial', openingCents ?? 0], ['Efectivo', totals.cash], ['Tarjeta', totals.card], ['Bizum', totals.bizum],
    ['Efectivo esperado', expected],
  ];
  if (closing) {
    summary.push(['Efectivo contado', closing.counted], ['Diferencia de efectivo', closing.counted - expected]);
    if (closing.terminal !== null) summary.push(['Diferencia de tarjeta', closing.terminal - totals.card]);
  }

  return <section className="cash-register" aria-label="Caja de prueba">
    <section className="cash-card cash-practice-banner">
      <div>
        <h2 ref={heading} tabIndex={-1}>Modo de prueba</h2>
        <p>Simula aquí los cobros sin usar dinero ni el datáfono. Al salir se descarta la prueba.</p>
      </div>
      <button type="button" onClick={onExit}>Salir del modo de prueba</button>
    </section>
    {openingCents === undefined ? <form className="cash-card cash-opening" onSubmit={event => {
      event.preventDefault();
      const value = cents(opening);
      if (value !== null) setOpeningCents(value);
    }}>
      <div><h3>Abrir turno de prueba</h3></div>
      <Amount label="Fondo inicial de prueba (€)" value={opening} onChange={event => setOpening(event.target.value)} />
      <button className="cash-primary" disabled={cents(opening) === null}>Abrir caja de prueba</button>
    </form> : <>
      {!closing && <form className="cash-card" onSubmit={event => {
        event.preventDefault();
        if (amountCents === null || amountCents < 1) return;
        const sale = {
          id: crypto.randomUUID(), recorded_at: new Date().toISOString(), kind: 'sale' as const, method,
          amount_cents: amountCents, description: description.trim() || 'Servicio de prueba',
          appointment_id: null, bank_reference: null, invoice_reference: null, refunded: false,
        };
        setSales(current => [...current, { ...sale, ticket_number: current.length + 1 }]);
        setAmount('');
        setDescription('');
      }}>
        <h3>Simular un cobro</h3>
        <div className="cash-pos">
          <div className="cash-pos-main">
            <label className="cash-field">Concepto de prueba
              <input maxLength={200} placeholder="Servicio de prueba" value={description} onChange={event => setDescription(event.target.value)} />
            </label>
            <fieldset className="cash-choice-group">
              <legend>Método de pago simulado</legend>
              <div className="cash-method-buttons">
                {methodButtons.map(({ value, Icon }) => <label key={value} className="cash-choice cash-method">
                  <input type="radio" name="practice-payment-method" value={value} checked={method === value} onChange={() => setMethod(value)} />
                  <Icon size={19} aria-hidden="true" />{methods[value]}
                </label>)}
              </div>
            </fieldset>
          </div>
          <div className="cash-pos-amount">
            <Keypad label="Importe de prueba" value={amount} onChange={setAmount} disabled={false} />
            <button className="cash-primary" disabled={amountCents === null || amountCents < 1}>Registrar cobro de prueba</button>
          </div>
        </div>
      </form>}
      {!!sales.length && <section className="cash-card">
        <h3>Tickets de prueba</h3>
        <ul className="cash-movements">
          {[...sales].reverse().map(sale => <li key={sale.id}>
            <div className="cash-movement-line">
              <div className="cash-movement-info">
                <strong>{sale.description}</strong>
                <small>PRUEBA-{sale.ticket_number} · {methods[sale.method]}</small>
              </div>
              <strong className="cash-movement-amount">{money(sale.amount_cents)}</strong>
            </div>
            <div className="cash-actions">
              <button type="button" aria-haspopup="dialog" onClick={() => setPreview(movementTicket(sale, header, true))}>Vista previa</button>
            </div>
          </li>)}
        </ul>
      </section>}
      <section className="cash-card">
        <h3>{closing ? 'Cierre de prueba realizado' : 'Cierre de prueba'}</h3>
        <dl className="cash-summary">{summary.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{money(value)}</dd></div>)}</dl>
        {closing ? <button type="button" aria-haspopup="dialog" onClick={() => setPreview(closingTicket(header, openingCents, totals, true))}>
          Vista previa del cierre de prueba
        </button> : <form className="cash-form" onSubmit={event => {
          event.preventDefault();
          if (countedCents !== null && (!terminal.trim() || terminalCents !== null)) setClosing({ counted: countedCents, terminal: terminalCents });
        }}>
          <div>
            <Amount label="Efectivo contado de prueba (€)" value={counted} onChange={event => setCounted(event.target.value)} />
            {countedCents !== null && <p className="cash-pos-note">Diferencia de efectivo {money(countedCents - expected)}</p>}
          </div>
          <div>
            <Amount label="Total simulado del datáfono (€)" required={false} value={terminal} onChange={event => setTerminal(event.target.value)} />
            {terminalCents !== null && <p className="cash-pos-note">Diferencia de tarjeta {money(terminalCents - totals.card)}</p>}
          </div>
          <button className="cash-primary" disabled={countedCents === null || (!!terminal.trim() && terminalCents === null)}>Cerrar caja de prueba</button>
        </form>}
      </section>
    </>}
    {preview && <TicketPreview ticket={preview} onClose={() => setPreview(undefined)} />}
  </section>;
}

function GiftCardPicker({ clientId, disabled, onApply }: {
  clientId: string;
  disabled: boolean;
  onApply: (voucherId: string) => void;
}) {
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    const token = currentToken();
    if (!token) { setError('Vuelve a iniciar sesión.'); setLoading(false); return; }
    async function load(token: string) {
      const first = await fetchVouchers(token, clientId, 0, true);
      const pages = [first];
      for (let page = 1; page * 12 < first.total && alive; page++) {
        pages.push(await fetchVouchers(token, clientId, page, true));
      }
      return pages.flatMap(page => page.vouchers.filter(voucher => voucher.kind === 'gift').map(voucher => ({
        id: voucher.id,
        label: `${voucher.title} · ${money(voucher.price_cents - voucher.used_cents - voucher.held_cents)} disponibles`,
      })));
    }
    setLoading(true);
    setError('');
    setSelected('');
    void load(token)
      .then(items => { if (alive) setOptions(items); })
      .catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : 'No se pudieron consultar las tarjetas regalo.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [clientId, reload]);

  if (loading) return <p role="status">Consultando tarjetas regalo…</p>;
  if (error) return <><p role="alert">{error}</p>
    <button type="button" disabled={disabled} onClick={() => setReload(value => value + 1)}>Volver a consultar</button></>;
  if (!options.length) return <p>Esta clienta no tiene tarjetas regalo con saldo disponible.</p>;

  return <>
    <label className="cash-field">Tarjeta regalo de la clienta<select value={selected} disabled={disabled} onChange={event => setSelected(event.target.value)}>
      <option value="">Elige una tarjeta regalo</option>
      {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select></label>
    <button type="button" disabled={disabled || !selected} onClick={() => onApply(selected)}>Aplicar al saldo</button>
  </>;
}

export function AppointmentCashDialog({ appointment, clientName, onClose, onOpenCash, onReturnToAgenda }: {
  appointment: AppointmentSale;
  clientName: string;
  onClose: () => void;
  onOpenCash: () => void;
  onReturnToAgenda: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    closeButton.current?.focus();
  }, []);

  return <dialog ref={ref} className="appointment-cash-dialog" aria-labelledby="appointment-cash-dialog-title"
    onClose={onClose} onCancel={event => { if (saving) event.preventDefault(); }}>
    <header className="appointment-cash-dialog-header">
      <div>
        <h2 id="appointment-cash-dialog-title">Cobro de cita</h2>
        {clientName && <p>{clientName}</p>}
      </div>
      <button ref={closeButton} type="button" aria-label="Cerrar cobro" disabled={saving}
        onClick={() => ref.current?.close()}>Cerrar <span aria-hidden="true">×</span></button>
    </header>
    <div className="appointment-cash-dialog-body">
      <CashRegister appointment={appointment} onOpenCash={onOpenCash} openAgenda={onReturnToAgenda} onSavingChange={setSaving} hideTitle />
    </div>
  </dialog>;
}

export default function CashRegister({ appointment, onOpenCash, openAppointment, openAgenda, onSavingChange, hideTitle = false, quickServices = [] }: {
  appointment?: AppointmentSale;
  onOpenCash?: () => void;
  openAppointment?: (id: string) => void;
  openAgenda?: () => void;
  onSavingChange?: (saving: boolean) => void;
  hideTitle?: boolean;
  quickServices?: CashQuickService[];
}) {
  const appointmentId = appointment?.id;
  const [state, setState] = useState<CashState>();
  const [cashTab, setCashTab] = useState<CashTab>('checkout');
  const cashPanelId = useId();
  const [selection, setSelection] = useState<{ shiftId?: string; before?: string }>({});
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ticketPreview, setTicketPreview] = useState<PrintableTicket>();
  const [practice, setPractice] = useState(false);
  const [receiptHeader, setReceiptHeader] = useState(readReceiptHeader);
  const [receiptHeaderLoading, setReceiptHeaderLoading] = useState(true);
  const [receiptHeaderShared, setReceiptHeaderShared] = useState(false);
  const [confirmedSale, setConfirmedSale] = useState<{ movement: Movement; receivedCents: number | null }>();
  const confirmedSaleSection = useRef<HTMLElement>(null);
  const confirmationTitleId = useId();
  const [retry, setRetry] = useState<Command>();
  const lock = useRef(false);
  const [opening, setOpening] = useState('');
  const [counted, setCounted] = useState('');
  const [terminal, setTerminal] = useState('');
  const [kind, setKind] = useState<(typeof movementButtons)[number]['value']>('sale');
  const [giftMode, setGiftMode] = useState(false);
  const [giftBusy, setGiftBusy] = useState(false);
  useEffect(() => {
    onSavingChange?.(busy || giftBusy);
  }, [busy, giftBusy, onSavingChange]);
  const [giftError, setGiftError] = useState('');
  const [method, setMethod] = useState<TenderMethod | 'mixed'>('card');
  const [paymentDraft, setPaymentDraft] = useState(emptyPaymentParts);
  const [description, setDescription] = useState('');
  const [ticketClientName, setTicketClientName] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [invoiceReference, setInvoiceReference] = useState('');
  const [invoiceEdit, setInvoiceEdit] = useState<{ id: string; value: string }>();
  const [finalAmountDraft, setFinalAmount] = useState<string>();
  const hasServiceTotal = Boolean(appointment?.services?.length && appointment.finalCents != null &&
    appointment.services.every(item => item.amountCents !== null));
  const finalAmount = hasServiceTotal || finalAmountDraft === undefined
    ? (appointment?.finalCents == null ? '' : decimal(appointment.finalCents))
    : finalAmountDraft;
  const [movementAmount, setMovementAmount] = useState('');
  const [quickSelection, setQuickSelection] = useState<QuickSelection>();
  const [cashReceived, setCashReceived] = useState('');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountInput, setDiscountInput] = useState('');

  const applyReceiptHeader = useCallback((header: ReceiptHeader) => {
    setReceiptHeader(header);
    setReceiptHeaderShared(true);
    // Keep the last shared header available on a device if a later request fails.
    try { localStorage.setItem(receiptHeaderKey, JSON.stringify(header)); } catch { /* Optional cache. */ }
  }, []);

  useEffect(() => {
    let active = true;
    request<{ header: ReceiptHeader | null }>({ operation: 'receipt-header' })
      .then(result => {
        if (active && result.header) applyReceiptHeader(cleanReceiptHeader(result.header));
      })
      .catch(() => { /* Keep this device's last known header. */ })
      .finally(() => { if (active) setReceiptHeaderLoading(false); });
    return () => { active = false; };
  }, [applyReceiptHeader]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    request<CashState>({ operation: 'state', appointmentId, ...selection })
      .then(result => { if (active) setState(result); })
      .catch(reason => {
        if (active) {
          setState(undefined);
          setError(reason instanceof Error ? reason.message : 'No se pudo consultar la caja.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [appointmentId, selection, reload]);

  useEffect(() => {
    if (confirmedSale) confirmedSaleSection.current?.focus();
  }, [confirmedSale]);

  async function send(command: Command) {
    if (lock.current) return;
    lock.current = true;
    const payload = { ...command, id: command.id || crypto.randomUUID() };
    const isRecord = payload.operation === 'record' || payload.operation === 'record-discount' || payload.operation === 'record-courtesy' || payload.operation === 'record-named';
    setBusy(true);
    setError('');
    setNotice('');
    if (isRecord || payload.operation === 'close') setConfirmedSale(undefined);
    try {
      const result = await request<{ ok: boolean; shiftId?: string; movement?: Omit<Movement, 'refunded'> }>(payload);
      if (!result.ok) throw new Error('La caja no ha confirmado el guardado.');
      if ((payload.operation === 'record-discount' || payload.operation === 'record-courtesy') &&
        result.movement?.discount_cents !== command.discountCents) {
        throw new Error('La caja no ha confirmado el descuento.');
      }
      if (payload.operation === 'record-named' && result.movement?.ticket_client_name !== command.ticketClientName) {
        throw new Error('La caja no ha confirmado el nombre del ticket.');
      }
      if (command.paymentParts) {
        const savedParts = result.movement && recordedParts(result.movement);
        const requestedParts = command.paymentParts;
        if (result.movement?.method !== 'mixed' || !savedParts || paymentPartOrder.some(method => savedParts[method] !== requestedParts[method])) {
          throw new Error('La caja no ha confirmado el reparto del cobro.');
        }
      }
      setRetry(undefined);
      const sale = isRecord && result.movement && (result.movement.kind === 'sale' || result.movement.kind === 'courtesy') && result.movement.id === payload.id
        ? { ...result.movement, refunded: false }
        : undefined;
      if (sale) setConfirmedSale({
        movement: sale,
        receivedCents: sale.method === 'cash' || (sale.method === 'mixed' && recordedParts(sale).cash > 0) ? cents(cashReceived) : null,
      });
      if (payload.operation === 'close' && result.shiftId) {
        setSelection({ shiftId: result.shiftId });
        setCashTab('closing');
        setCounted('');
        setTerminal('');
      }
      if (payload.operation === 'open') setOpening('');
      if (isRecord) {
        setDiscountInput('');
        setMovementAmount('');
        setQuickSelection(undefined);
        setCashReceived('');
        setPaymentDraft(emptyPaymentParts);
        setDescription('');
        setTicketClientName('');
        setBankReference('');
        setInvoiceReference('');
      }
      if (payload.operation === 'invoice') setInvoiceEdit(undefined);
      if (!sale) setNotice({ open: 'Caja abierta.', close: 'Cierre guardado.', record: 'Movimiento registrado.', 'record-discount': 'Cobro registrado.', 'record-courtesy': 'Cortesía registrada.', 'record-named': 'Cobro registrado.', invoice: 'Número de factura actualizado.' }[payload.operation]);
      setLoading(true);
      setReload(value => value + 1);
    } catch (reason) {
      const rejected = reason instanceof StudioApiError && reason.status < 500;
      setRetry(rejected ? undefined : payload);
      setError(rejected ? reason.message : 'No se pudo comprobar el guardado. Reintenta esta misma operación antes de registrar otra.');
      if (rejected && reason.status === 409) {
        setLoading(true);
        setReload(value => value + 1);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const shift = state?.shift;
  const activeShift = state?.openShift;
  const totals = state?.totals;
  const blocked = busy || giftBusy || loading || !!retry;
  const expected = shift && totals ? shift.opening_cents + totals.cash + totals.cashIn - totals.cashOut : 0;
  const appointmentCourtesy = state?.movements.some(movement => movement.kind === 'courtesy');
  const appointmentPaid = appointmentCourtesy || state?.movements.some(movement => movement.kind === 'sale' && !movement.refunded);
  const final = cents(finalAmount);
  const dueBeforeDiscount = appointment && final !== null ? final - appointment.depositCents - appointment.voucherCents : null;
  const parsedDiscount = cents(discountInput);
  const discountCents = appointment && final !== null && parsedDiscount !== null
    ? (discountType === 'percent' ? Math.round(final * parsedDiscount / 10000) : parsedDiscount)
    : 0;
  const isCourtesy = !!appointment && appointment.depositCents === 0 && appointment.voucherCents === 0 &&
    final !== null && final > 0 && discountCents === final;
  const discountError = !discountInput.trim() ? ''
    : parsedDiscount === null || (discountType === 'percent' && parsedDiscount > 10000)
      ? (discountType === 'percent' ? 'Introduce un porcentaje de hasta el 100 %.' : 'Introduce un importe válido.')
      : dueBeforeDiscount === null || (!isCourtesy && discountCents >= dueBeforeDiscount)
        ? 'El descuento debe dejar un saldo mayor que cero después del anticipo o bono.'
        : parsedDiscount > 0 && discountCents === 0 ? 'El descuento debe ser de al menos 0,01 €.' : '';
  const finalAfterDiscount = final === null ? null : final - discountCents;
  const due = dueBeforeDiscount === null ? null : dueBeforeDiscount - discountCents;
  const activeSale = appointment ? due : cents(movementAmount);
  const mixedSale = kind === 'sale' && method === 'mixed' && !giftMode && !isCourtesy;
  const cashPart = paymentDraft.cash.trim() ? cents(paymentDraft.cash) : 0;
  const cardPart = paymentDraft.card.trim() ? cents(paymentDraft.card) : 0;
  const bizumPart = paymentDraft.bizum.trim() ? cents(paymentDraft.bizum) : 0;
  const parts = cashPart !== null && cardPart !== null && bizumPart !== null ? { cash: cashPart, card: cardPart, bizum: bizumPart } : null;
  const allocated = parts ? parts.cash + parts.card + parts.bizum : null;
  const unallocated = activeSale !== null && allocated !== null ? activeSale - allocated : null;
  const mixedError = !mixedSale ? ''
    : !parts ? 'Introduce importes válidos, con hasta dos decimales.'
    : activeSale === null || activeSale <= 0 || unallocated === null ? 'Indica primero el total del cobro.'
    : unallocated !== 0 ? `${unallocated > 0 ? 'Faltan' : 'Sobran'} ${money(Math.abs(unallocated))} por repartir.`
    : paymentPartOrder.filter(method => parts[method] > 0).length < 2 ? 'Usa al menos dos métodos de pago.' : '';
  const cashDue = kind !== 'sale' || giftMode || isCourtesy ? null
    : method === 'cash' ? activeSale : mixedSale ? cashPart : null;
  const receivedCents = cents(cashReceived);
  const changeCents = cashDue !== null && receivedCents !== null ? receivedCents - cashDue : null;
  const receivedInvalid = !!cashDue && !!cashReceived.trim() && (receivedCents === null || (changeCents !== null && changeCents < 0));


  async function applyGiftCard(voucherId: string) {
    const token = currentToken();
    if (!token || !appointment?.giftCard || blocked || lock.current) return;
    lock.current = true;
    setGiftBusy(true);
    setGiftError('');
    setNotice('');
    try {
      await attachAppointmentVoucher(token, appointment.id, voucherId);
      await appointment.giftCard.saved();
      setGiftMode(false);
      setNotice('Tarjeta regalo aplicada. Comprueba el saldo pendiente.');
    } catch (reason) {
      setGiftError(reason instanceof Error ? reason.message : 'No se pudo comprobar la tarjeta regalo.');
    } finally {
      setGiftBusy(false);
      lock.current = false;
    }
  }

  function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeShift || blocked || discountError || mixedError || (kind === 'sale' && giftMode)) return;
    if (isCourtesy && appointment) {
      if (window.confirm(`¿Registrar la cita como cortesía con un descuento de ${money(discountCents)} y un saldo de 0 €?`)) {
        void send({
          operation: 'record-courtesy', shiftId: activeShift.id, appointmentId: appointment.id,
          description: appointment.description, discountCents,
        });
      }
      return;
    }
    const amountCents = activeSale;
    if (amountCents === null || amountCents <= 0) {
      setError('Introduce un importe pendiente mayor que cero.');
      return;
    }
    if (receivedInvalid) {
      setError('Revisa el efectivo recibido antes de registrar el cobro.');
      return;
    }
    const selectedMethod = kind === 'sale' ? method : 'cash';
    const paymentParts = mixedSale && parts ? parts : undefined;
    const split = paymentParts && paymentPartLines(paymentParts).map(row => `${row.label} ${row.value}`).join(' + ');
    if (kind === 'sale' && !window.confirm(split
      ? `¿Registrar el cobro de ${money(amountCents)} con este reparto? ${split}.`
      : `¿Registrar ${money(amountCents)} ya cobrados por ${methods[selectedMethod]}?`)) return;
    const name = !appointment && kind === 'sale' ? ticketClientName.trim() : '';
    void send({
      operation: discountCents > 0 ? 'record-discount' : name ? 'record-named' : 'record',
      ...(name ? { ticketClientName: name } : {}),
      kind, method: selectedMethod, shiftId: activeShift.id, amountCents, paymentParts,
      appointmentId, finalCents: appointment ? finalAfterDiscount : undefined,
      ...(discountCents > 0 ? { discountCents } : {}), description: appointment?.description || description.trim(),
      ...(kind === 'sale' ? { bankReference, invoiceReference } : {}),
    });
  }

  function close(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shift || !totals || blocked) return;
    const amountCents = cents(counted);
    const terminalCents = terminal.trim() ? cents(terminal, true) : null;
    if (amountCents === null || (terminal.trim() && terminalCents === null)) {
      setError('Revisa el efectivo contado y el importe del datáfono.');
      return;
    }
    if (!window.confirm(`¿Cerrar caja con ${money(amountCents)} en efectivo? Diferencia: ${money(amountCents - expected)}.`)) return;
    void send({ operation: 'close', shiftId: shift.id, amountCents, terminalCents, movementCount: totals.count });
  }

  async function print(ticket: PrintableTicket) {
    try { await printSlip(ticket); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo abrir la impresión.'); }
  }

  function printMovement(movement: Movement) {
    void print(movementTicket(movement, receiptHeader));
  }

  function cashSummary() {
    if (!shift || !totals) return [];
    const rows: [string, number][] = [
      ['Fondo inicial', shift.opening_cents], ['Efectivo', totals.cash],
      ['Tarjeta', totals.card], ['Bizum', totals.bizum],
      ...(totals.transfer === 0 ? [] : [['Transferencias', totals.transfer] as [string, number]]),
      ['Entradas de efectivo', totals.cashIn], ['Salidas de efectivo', totals.cashOut], ['Efectivo esperado', expected],
    ];
    if (shift.counted_cents !== null) rows.push(['Efectivo contado', shift.counted_cents], ['Diferencia de efectivo', shift.counted_cents - expected]);
    if (shift.terminal_cents !== null) rows.push(['Total del datáfono', shift.terminal_cents], ['Diferencia de tarjeta', shift.terminal_cents - totals.card]);
    return rows;
  }

  const closingDelta = cents(counted);
  const terminalDelta = cents(terminal, true);
  const movementLabel = movementButtons.find(item => item.value === kind)?.label;
  const dashboard = !appointment && shift && totals;
  const receipt = confirmedSale && (state?.movements.find(movement => movement.id === confirmedSale.movement.id) || confirmedSale.movement);
  const confirmedReceived = confirmedSale?.receivedCents ?? null;
  const latestTicket = !appointment && !loading && state?.movements.find(movement =>
    movement.kind === 'sale' || movement.kind === 'refund' || movement.kind === 'courtesy');

  function changeViewedShift(shiftId?: string) {
    if (shiftId === selection.shiftId) return;
    setConfirmedSale(undefined);
    setCashReceived('');
    setCounted('');
    setTerminal('');
    setInvoiceEdit(undefined);
    setLoading(true);
    setSelection({ ...selection, shiftId });
  }

  function selectCashTab(tab: CashTab) {
    if (tab === 'checkout') changeViewedShift();
    setCashTab(tab);
  }

  const shiftPicker = !appointment && state && <div className="cash-card cash-shift-picker">
    <label className="cash-history">
      <span>Turno de caja</span>
      <select value={selection.shiftId || ''} disabled={blocked} onChange={event => changeViewedShift(event.target.value || undefined)}>
        <option value="">{activeShift ? 'Caja actual' : 'Caja actual · sin turno abierto'}</option>
        {shift?.closed_at && !state.history?.some(item => item.id === shift.id) &&
          <option value={shift.id}>Cierre · {date(shift.closed_at)}</option>}
        {state.history?.map(item => <option key={item.id} value={item.id}>Cierre · {date(item.closed_at!)}</option>)}
      </select>
    </label>
    {(state.history?.length === 30 || selection.before) && <div className="cash-actions">
      {state.history?.length === 30 && <button type="button" disabled={blocked} onClick={() =>
        setSelection({ ...selection, before: state.history?.[29]?.opened_at })}>Cierres anteriores</button>}
      {selection.before && <button type="button" disabled={blocked} onClick={() =>
        setSelection({ ...selection, before: undefined })}>Cierres recientes</button>}
    </div>}
  </div>;

  function pickQuickService(service: CashQuickService, variantId?: string) {
    const variant = service.variants.find(item => item.id === variantId);
    const price = service.variants.length ? variant?.priceCents : service.priceCents;
    setQuickSelection({ serviceId: service.id, variantId: variant?.id });
    setDescription((service.label + (variant ? ' · ' + variant.label : '')).slice(0, 200));
    setMovementAmount(price == null ? '' : decimal(price));
    setCashReceived('');
    setPaymentDraft(emptyPaymentParts);
  }

  if (!appointment && practice) return <CashPractice header={receiptHeader} onExit={() => {
    setPractice(false);
    setReload(value => value + 1);
  }} />;

  return <section className={`cash-register${appointment ? ' cash-register-appointment' : ''}`}
    aria-label={appointment ? 'Cobro de cita' : 'Caja'} aria-busy={loading || busy || giftBusy}>
    <header className="cash-heading">
      <div className="cash-title">
        {!hideTitle && <div className="cash-title-icon"><Wallet size={23} aria-hidden="true" /></div>}
        <div>
          {!hideTitle && <h2>{appointment ? 'Cobro de cita' : 'Caja'}</h2>}
          {state && <span className={`cash-status${activeShift ? ' cash-status-open' : ''}`}>
            {activeShift ? `Caja abierta · ${date(activeShift.opened_at)}` : 'Caja cerrada'}
          </span>}
        </div>
      </div>
      <div className="cash-heading-actions">
        {!appointment && activeShift && <button type="button" className="cash-close-shortcut" disabled={blocked} onClick={() => {
          changeViewedShift();
          selectCashTab('closing');
          document.getElementById(cashPanelId + '-tab-closing')?.focus();
        }}><Wallet size={16} aria-hidden="true" />Cerrar turno</button>}
        <button type="button" className="cash-refresh" disabled={blocked} onClick={() => { setError(''); setReload(value => value + 1); }}>
          <RefreshCw size={16} aria-hidden="true" /> Actualizar
        </button>
      </div>
    </header>
    {!appointment && <div className="cash-tabs" role="tablist" aria-label="Secciones de Caja">
      {cashTabs.map(({ id, label, Icon }, index) => <button type="button" role="tab" key={id}
        id={cashPanelId + '-tab-' + id} aria-controls={cashPanelId + '-panel-' + id}
        aria-selected={cashTab === id} tabIndex={cashTab === id ? 0 : -1} onClick={() => selectCashTab(id)}
        onKeyDown={event => {
          const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
          if (!direction && event.key !== 'Home' && event.key !== 'End') return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? cashTabs.length - 1
            : (index + direction + cashTabs.length) % cashTabs.length;
          const tab = cashTabs[next].id;
          selectCashTab(tab);
          document.getElementById(cashPanelId + '-tab-' + tab)?.focus();
        }}><Icon size={19} aria-hidden="true" />{label}</button>)}
    </div>}
    {ticketPreview && <TicketPreview ticket={ticketPreview} onClose={() => setTicketPreview(undefined)} />}
    {loading && <p className="cash-message" role="status">Consultando caja…</p>}
    {error && <p className="cash-message cash-error" role="alert">{error}</p>}
    {notice && <p className="cash-message cash-success" role="status"><Check size={16} aria-hidden="true" />{notice}</p>}
    {retry && <button type="button" disabled={busy} onClick={() => void send(retry)}>Reintentar guardado</button>}
    <div className="cash-panel" hidden={!appointment && cashTab !== 'checkout'}
      role={appointment ? undefined : 'tabpanel'} id={appointment ? undefined : cashPanelId + '-panel-checkout'}
      aria-labelledby={appointment ? undefined : cashPanelId + '-tab-checkout'}>
    {receipt && !receipt.refunded && <section className="cash-card cash-sale-confirmation" ref={confirmedSaleSection}
      tabIndex={-1} aria-labelledby={confirmationTitleId}>
      <div className="cash-sale-confirmation-summary" role="status">
        <span className="cash-sale-confirmation-icon"><Check size={24} aria-hidden="true" /></span>
        <div><h3 id={confirmationTitleId}>{receipt.kind === 'courtesy' ? 'Cortesía registrada' : 'Cobro registrado'}</h3>
          <p><strong>{money(receipt.amount_cents)}</strong>{receipt.kind !== 'courtesy' && ' · ' + paymentDescription(receipt)}</p>
          {receipt.ticket_number && <p>Ticket {ticketNumber(receipt.ticket_number)}</p>}
          {!!receipt.discount_cents && <p>Descuento aplicado {money(receipt.discount_cents)}</p>}
          {confirmedReceived !== null && <p>Recibido {money(confirmedReceived)} · Cambio {money(confirmedReceived - (receipt.method === 'mixed' ? recordedParts(receipt).cash : receipt.amount_cents))}</p>}
        </div>
      </div>
      <div className="cash-actions">
        <button type="button" className="cash-primary" disabled={receiptHeaderLoading} onClick={() => printMovement(receipt)}>
          <Printer size={17} aria-hidden="true" />Imprimir ticket
        </button>
        <button type="button" aria-haspopup="dialog" disabled={receiptHeaderLoading} onClick={() => setTicketPreview(movementTicket(receipt, receiptHeader))}>Vista previa</button>
        {openAgenda && <button type="button" onClick={openAgenda}>Volver a la agenda</button>}
      </div>
    </section>}
    {state && <>
      {!appointment && !selection.shiftId && !activeShift && <form className="cash-card cash-opening" onSubmit={event => {
        event.preventDefault();
        const amountCents = cents(opening);
        if (amountCents === null) { setError('Indica el fondo inicial en euros.'); return; }
        void send({ operation: 'open', amountCents });
      }}>
        <div><h3>Abrir un turno</h3><p>Cuenta el efectivo del cajón para empezar.</p></div>
        <Amount label="Fondo inicial (€)" value={opening} onChange={event => setOpening(event.target.value)} placeholder="0,00" disabled={blocked} />
        <button className="cash-primary" disabled={blocked}>Abrir caja</button>
      </form>}

      {dashboard && !selection.shiftId && !shift.closed_at && <section className="cash-overview" aria-label="Resumen de caja">
        {([
          [Receipt, 'Cobros del turno', totals.cash + totals.card + totals.bizum + totals.transfer],
          [Banknote, 'Efectivo esperado', expected],
          [CreditCard, 'Tarjeta', totals.card],
          [Smartphone, 'Bizum', totals.bizum],
        ] as const).map(([Icon, label, amount]) => <div className="cash-metric" key={label}>
          <div><span>{label}</span><Icon size={19} aria-hidden="true" /></div>
          <strong>{money(amount)}</strong>
        </div>)}
      </section>}

      {!!appointment?.services?.length && <section className="cash-card cash-service-breakdown" aria-label="Desglose de servicios">
        <h3>Servicios de la cita</h3>
        <dl>
          {appointment.services.map((service, index) => <div key={index}>
            <dt>{service.label}</dt><dd>{service.amountCents === null ? 'Por confirmar' : money(service.amountCents)}</dd>
          </div>)}
          {appointment.finalCents !== null && <div className="cash-service-total">
            <dt>Total servicios</dt><dd>{money(appointment.finalCents)}</dd>
          </div>}
        </dl>
      </section>}

      {appointment && !activeShift && <div className="cash-message">
        <span>Abre caja para registrar un cobro.</span>
        {onOpenCash && <button type="button" onClick={onOpenCash}>Ir a caja</button>}
      </div>}
      {appointment && appointmentPaid && !receipt && <p className="cash-message cash-success"><Check size={16} aria-hidden="true" />{appointmentCourtesy ? 'Esta cita ya está registrada como cortesía.' : 'El saldo de esta cita ya tiene un cobro registrado.'}</p>}
      {appointment?.hasUnknownVoucher && !appointmentPaid && <p className="cash-message">Actualiza la cita y comprueba el saldo del bono antes de cobrar.</p>}
      {appointment?.unavailable && !appointmentPaid && <p className="cash-message">Comprueba el estado de la cita, su aprobación y el anticipo antes de cobrar.</p>}

      {activeShift && (appointment ? !appointmentPaid && !appointment.unavailable && !appointment.hasUnknownVoucher : !selection.shiftId && shift?.id === activeShift.id) &&
        <form className="cash-card cash-pos" onSubmit={record}>
          <div className="cash-pos-main">
            <h3>{appointment ? 'Registrar saldo' : kind === 'sale' ? 'Cobrar sin cita' : 'Nuevo movimiento'}</h3>
            {!appointment && <>
              <fieldset className="cash-choice-group" disabled={blocked}>
                <legend>Operación</legend>
                <div className="cash-operation-buttons">
                  {movementButtons.map(({ value, label, Icon }) => <label key={value} className="cash-choice">
                    <input type="radio" name="cash-movement-kind" value={value} checked={kind === value} onChange={() => {
                      setKind(value);
                      setGiftMode(false);
                      setCashReceived('');
                      if (quickSelection) {
                        setQuickSelection(undefined);
                        setDescription('');
                        setMovementAmount('');
                        setPaymentDraft(emptyPaymentParts);
                      }
                    }} />
                    <span><Icon size={17} aria-hidden="true" />{label}</span>
                  </label>)}
                </div>
              </fieldset>
              {kind === 'sale' && !!quickServices.length && <CashServiceShortcuts services={quickServices}
                selection={quickSelection} disabled={blocked} onSelect={pickQuickService} />}
              <label className="cash-field">Concepto<input required maxLength={200} value={description} placeholder={kind === 'sale' ? 'Ej. Champú' : 'Motivo del movimiento'}
                disabled={blocked} onChange={event => setDescription(event.target.value)} /></label>
              {kind === 'sale' && <label className="cash-field">Nombre del cliente (opcional)
                <input type="text" maxLength={160} value={ticketClientName} disabled={blocked}
                  onChange={event => setTicketClientName(event.target.value)} />
              </label>}
            </>}
            {appointment && <div className="cash-appointment-breakdown">
              <div><span>Anticipo confirmado</span><strong>{money(appointment.depositCents)}</strong></div>
              <div><span>{appointment.giftApplied ? 'Tarjeta regalo aplicada' : 'Bono aplicado'}</span><strong>{money(appointment.voucherCents)}</strong></div>
            </div>}
            {kind === 'sale' && <>
              <fieldset className="cash-choice-group cash-sale-methods" disabled={blocked || isCourtesy}>
                <legend>Método de pago</legend>
                <div className="cash-method-buttons">
                  {methodButtons.map(({ value, Icon }) => <label key={value} className="cash-choice cash-method">
                    <input type="radio" name={appointment ? 'appointment-payment-method' : 'cash-payment-method'} value={value}
                      checked={method === value && !giftMode} onChange={() => { setGiftMode(false); setMethod(value); setCashReceived(''); }} />
                    <span><Icon size={23} aria-hidden="true" />{methods[value]}</span>
                  </label>)}
                  <label className="cash-choice cash-method">
                    <input type="radio" name={appointment ? 'appointment-payment-method' : 'cash-payment-method'} value="mixed"
                      checked={method === 'mixed' && !giftMode} onChange={() => { setGiftMode(false); setMethod('mixed'); setCashReceived(''); }} />
                    <span><Wallet size={23} aria-hidden="true" />{methods.mixed}</span>
                  </label>
                  <button type="button" className="cash-gift-button" aria-pressed={giftMode}
                    onClick={() => { setGiftMode(value => !value); setGiftError(''); setCashReceived(''); }}>
                    <Gift size={23} aria-hidden="true" />Tarjeta regalo
                  </button>
                </div>
              </fieldset>
              {mixedSale && <fieldset className="cash-choice-group cash-payment-parts" disabled={blocked}>
                <legend>Reparte el importe</legend>
                <div>
                  {paymentPartOrder.map(value => <Amount key={value} label={methods[value] + ' (€)'} required={false}
                    value={paymentDraft[value]} placeholder="0,00" onChange={event => setPaymentDraft({ ...paymentDraft, [value]: event.target.value })} />)}
                </div>
                <p className="cash-pos-note" role="status">{mixedError || 'Importe repartido: ' + money(allocated ?? 0)}</p>
              </fieldset>}
              {giftMode && <div className="cash-gift-panel">
                {appointment?.giftApplied && <p>Esta cita ya tiene una tarjeta regalo aplicada por {money(appointment.voucherCents)}.</p>}
                {appointment?.giftCard ? <GiftCardPicker key={appointment.giftCard.clientId} clientId={appointment.giftCard.clientId}
                  disabled={blocked} onApply={id => void applyGiftCard(id)} /> : appointment
                  ? <p>{appointment.giftApplied ? 'Elige otro método si queda un saldo pendiente.' : 'La cita debe estar activa, sin finalizar y vinculada a una clienta.'}</p>
                  : <><p>Aplica la tarjeta regalo desde la cita de la clienta.</p>
                    {openAgenda && <button type="button" onClick={openAgenda}>Ir a la agenda</button>}</>}
                {giftBusy && <p role="status">Aplicando tarjeta regalo…</p>}
                {giftError && <p role="alert">{giftError}</p>}
              </div>}
              {!giftMode && !isCourtesy && (method === 'card' || (mixedSale && !!cardPart)) &&
                <p className="cash-pos-note">Cuando el datáfono apruebe {mixedSale ? 'la parte de tarjeta' : 'el pago'}, registra el cobro aquí.</p>}
              {!giftMode && !isCourtesy && <details className="cash-optional">
                <summary>Referencia y factura <span>Opcional</span><ChevronDown size={16} aria-hidden="true" /></summary>
                <div className="cash-optional-fields">
                  <label className="cash-field">Referencia de operación (opcional)<input maxLength={80} value={bankReference} disabled={blocked}
                    onChange={event => setBankReference(event.target.value)} /></label>
                  <label className="cash-field">Número de factura (opcional)<input maxLength={80} value={invoiceReference} disabled={blocked}
                    onChange={event => setInvoiceReference(event.target.value)} /></label>
                </div>
              </details>}
            </>}
          </div>
          <div className="cash-pos-amount">
            {!hasServiceTotal && <Keypad label={appointment ? 'Precio total antes del descuento de caja' : 'Importe'} value={appointment ? finalAmount : movementAmount}
              onChange={appointment ? setFinalAmount : setMovementAmount} disabled={blocked} />}
            {appointment && dueBeforeDiscount !== null && (dueBeforeDiscount > 0 || discountInput) && <details className="cash-checkout-discount">
              <summary><span>{discountCents > 0 && !discountError ? 'Descuento aplicado · ' + money(discountCents) : 'Aplicar descuento'}</span>
                <ChevronDown size={16} aria-hidden="true" /></summary>
              <div className="cash-checkout-discount-fields">
                <label className="cash-field">Tipo de descuento<select value={discountType} disabled={blocked}
                  onChange={event => { setDiscountType(event.target.value === 'percent' ? 'percent' : 'amount'); setDiscountInput(''); }}>
                  <option value="amount">Euros (€)</option><option value="percent">Porcentaje (%)</option>
                </select></label>
                <Amount label={discountType === 'percent' ? 'Descuento (%)' : 'Descuento (€)'} required={false}
                  value={discountInput} onChange={event => { setDiscountInput(event.target.value); setGiftMode(false); }} disabled={blocked}
                  placeholder="0,00" aria-invalid={!!discountError || undefined} />
                {discountInput && <button type="button" className="cash-quiet" disabled={blocked}
                  onClick={() => setDiscountInput('')}>Quitar descuento</button>}
              </div>
            </details>}
            {discountError && <p className="cash-pos-note cash-discount-error" role="status">{discountError}</p>}
            {appointment && <div className="cash-due"><span>Saldo</span><strong>{due === null || discountError ? '—' : money(Math.max(0, due))}</strong></div>}
            {!discountError && due !== null && due <= 0 && <p className="cash-pos-note">{isCourtesy ? 'Se anotará como cortesía por 0 €.' : due === 0 ? 'La cita está cubierta.' : 'Revisa el precio final y los importes ya aplicados.'}</p>}
            {cashDue !== null && cashDue > 0 && !discountError && <div className="cash-tender">
              <div className="cash-tender-input">
                <Amount label="Efectivo recibido (€)" required={false} value={cashReceived} disabled={blocked}
                  aria-invalid={receivedInvalid || undefined} placeholder="Opcional"
                  onChange={event => setCashReceived(event.target.value)} />
                <button type="button" disabled={blocked} onClick={() => setCashReceived(decimal(cashDue))}>Importe exacto</button>
              </div>
              <div className={`cash-due cash-change${receivedInvalid ? ' cash-change-short' : ''}`} role="status">
                <span>{changeCents !== null && changeCents < 0 ? 'Faltan' : 'Cambio'}</span>
                <strong>{changeCents === null ? '—' : money(Math.abs(changeCents))}</strong>
              </div>
              {cashReceived.trim() && receivedCents === null && <p className="cash-pos-note">Introduce un importe válido, con hasta dos decimales.</p>}
            </div>}
            <button className="cash-primary" disabled={blocked || (kind === 'sale' && giftMode) || activeSale === null || (activeSale <= 0 && !isCourtesy) || receivedInvalid || !!discountError || !!mixedError}>
              <Check size={17} aria-hidden="true" />
              <span>{isCourtesy ? 'Registrar cortesía' : kind === 'sale' ? 'Registrar cobro' : `Registrar ${movementLabel?.toLowerCase()}`}</span>
              {!appointment && activeSale !== null && activeSale > 0 && <strong>{money(activeSale)}</strong>}
            </button>
          </div>
        </form>}

    </>}
    </div>

    <div className="cash-panel" hidden={!appointment && cashTab !== 'movements'}
      role={appointment ? undefined : 'tabpanel'} id={appointment ? undefined : cashPanelId + '-panel-movements'}
      aria-labelledby={appointment ? undefined : cashPanelId + '-tab-movements'}>
      {!appointment && <>
        <TicketSearch previewDisabled={receiptHeaderLoading} onPreview={movement => setTicketPreview(movementTicket(movement, receiptHeader))} />
        {shiftPicker}
        {state && !shift && !loading && <p className="cash-card cash-empty">No hay un turno seleccionado. Puedes buscar un ticket o elegir un turno anterior.</p>}
      </>}
      {state && (appointment || shift) && <section className="cash-card cash-activity">
        <div className="cash-activity-heading">
          <div className="cash-section-heading"><h3>Movimientos</h3><span>{state.movements.length}</span></div>
          {latestTicket && <button type="button" aria-haspopup="dialog" disabled={receiptHeaderLoading}
            onClick={() => setTicketPreview(movementTicket(latestTicket, receiptHeader))}>Vista previa del último ticket</button>}
        </div>
        {state.movements.length === 0 && <div className="cash-empty"><Receipt size={21} aria-hidden="true" /><p>Todavía no hay movimientos.</p></div>}
        {state.movements.length > 0 && <ul className="cash-movements">{state.movements.map(movement =>
          <li key={movement.id}>
            <div className="cash-movement-line">
              <div className="cash-movement-icon"><Receipt size={18} aria-hidden="true" /></div>
              <div className="cash-movement-info">
                <strong>{movement.description}</strong>
                <small>{kinds[movement.kind]} · {date(movement.recorded_at)} · {paymentDescription(movement)}{movement.refunded ? ' · Devuelto' : ''}</small>
                {movement.ticket_number && <p>Ticket {ticketNumber(movement.ticket_number)}</p>}
                {movement.bank_reference && <p>Referencia {movement.bank_reference}</p>}
                {movement.invoice_reference && <p>Factura {movement.invoice_reference}</p>}
              </div>
              <strong className="cash-movement-amount">{money(movement.kind === 'refund' || movement.kind === 'cash_out' ? -movement.amount_cents : movement.amount_cents)}</strong>
            </div>
            {(movement.kind === 'sale' || movement.kind === 'refund' || movement.kind === 'courtesy') && <div className="cash-actions">
              {!appointment && openAppointment && movement.appointment_id && <button type="button" onClick={() => openAppointment(movement.appointment_id!)}>Ver cita</button>}
              <button type="button" aria-haspopup="dialog" disabled={receiptHeaderLoading} onClick={() => setTicketPreview(movementTicket(movement, receiptHeader))}>Vista previa</button>
              <button type="button" disabled={receiptHeaderLoading} onClick={() => printMovement(movement)}><Printer size={15} aria-hidden="true" />Imprimir justificante</button>
              {movement.kind !== 'courtesy' && <button type="button" disabled={blocked}
                onClick={() => setInvoiceEdit({ id: movement.id, value: movement.invoice_reference || '' })}>Número de factura</button>}
              {movement.kind === 'sale' && !movement.refunded && activeShift && <button type="button" disabled={blocked} onClick={() => {
                if (window.confirm(`¿Registrar la devolución completa de ${money(movement.amount_cents)} ya realizada por ${paymentDescription(movement)}?`)) {
                  void send({ operation: 'record', kind: 'refund', shiftId: activeShift.id, originalId: movement.id });
                }
              }}>Registrar devolución</button>}
            </div>}
            {invoiceEdit?.id === movement.id && <form className="cash-form" onSubmit={event => {
              event.preventDefault();
              void send({ operation: 'invoice', id: movement.id, invoiceReference: invoiceEdit.value });
            }}>
              <label className="cash-field">Número de factura emitida<input maxLength={80} autoFocus value={invoiceEdit.value} disabled={blocked}
                onChange={event => setInvoiceEdit({ id: movement.id, value: event.target.value })} /></label>
              <div className="cash-actions">
                <button className="cash-primary" disabled={blocked}>Guardar número</button>
                <button type="button" disabled={blocked} onClick={() => setInvoiceEdit(undefined)}>Cancelar</button>
              </div>
            </form>}
          </li>)}</ul>}
      </section>}

    </div>

    {!appointment && <div className="cash-panel" role="tabpanel" id={cashPanelId + '-panel-closing'}
      aria-labelledby={cashPanelId + '-tab-closing'} hidden={cashTab !== 'closing'}>
      {shiftPicker}
      {state && !shift && !loading && <p className="cash-card cash-empty">No hay un turno abierto. Elige un cierre anterior o consulta el historial por fechas.</p>}
      {dashboard && (shift.closed_at ? <section className="cash-card cash-close">
        <h3>Cierre de caja</h3>
        <p>Apertura {date(shift.opened_at)} · Cierre {date(shift.closed_at)}</p>
        <dl className="cash-summary">{cashSummary().map(([label, amount]) =>
          <div key={label}><dt>{label}</dt><dd>{money(amount)}</dd></div>)}</dl>
        <button type="button" disabled={receiptHeaderLoading}
          onClick={() => void print(closingTicket(receiptHeader, shift.opening_cents, totals))}>
          <Printer size={16} aria-hidden="true" />Imprimir cierre
        </button>
      </section> : <section className="cash-card cash-close" key={shift.id}>
        <h3>Cierre de caja</h3>
        <dl className="cash-summary">{cashSummary().map(([label, amount]) =>
          <div key={label}><dt>{label}</dt><dd>{money(amount)}</dd></div>)}</dl>
        <form className="cash-form" onSubmit={close}>
          <div>
            <Amount label="Efectivo contado (€)" value={counted} onChange={event => setCounted(event.target.value)} disabled={blocked} />
            {closingDelta !== null && <p className="cash-pos-note">Diferencia de efectivo {money(closingDelta - expected)}</p>}
          </div>
          <div>
            <Amount label="Total del datáfono (€) · opcional" required={false} value={terminal} onChange={event => setTerminal(event.target.value)} disabled={blocked} />
            {terminalDelta !== null && <p className="cash-pos-note">Diferencia de tarjeta {money(terminalDelta - totals.card)}</p>}
          </div>
          <button className="cash-primary" disabled={blocked}>Cerrar caja</button>
        </form>
      </section>)}
      <ClosingReport />
    </div>}
    {!appointment && <div className="cash-panel" role="tabpanel" id={cashPanelId + '-panel-settings'}
      aria-labelledby={cashPanelId + '-tab-settings'} hidden={cashTab !== 'settings'}>
      {!receiptHeaderLoading && <ReceiptHeaderSettings
        header={receiptHeader} shared={receiptHeaderShared} onSaved={applyReceiptHeader} />}
      <section className="cash-card cash-settings-practice">
        <div><h3>Practicar con Caja</h3><p>Ensaya el cobro, el ticket y el cierre sin guardar movimientos reales.</p></div>
        <button type="button" disabled={blocked || receiptHeaderLoading} onClick={() => setPractice(true)}>Modo de prueba</button>
      </section>
    </div>}
  </section>;
}
