import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, Banknote, Check, ChevronDown, CreditCard,
  Delete, Gift, History, Printer, Receipt, RefreshCw, Smartphone, Wallet,
} from 'lucide-react';
import { attachAppointmentVoucher, currentToken, fetchVouchers, StudioApiError, studioCashRegister } from './studioApi';
import './cash-register.css';

type Method = 'cash' | 'card' | 'bizum' | 'transfer';
type Kind = 'sale' | 'refund' | 'cash_in' | 'cash_out';
type Shift = {
  id: string; opened_at: string; closed_at: string | null; opening_cents: number;
  counted_cents: number | null; terminal_cents: number | null;
};
type Movement = {
  id: string; recorded_at: string; description: string; kind: Kind; method: Method;
  amount_cents: number; appointment_id: string | null; bank_reference: string | null; invoice_reference: string | null; refunded: boolean;
};
type Totals = Record<Method, number> & { cashIn: number; cashOut: number; count: number };
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
type Command = { operation: 'open' | 'close' | 'record' | 'invoice'; id?: string; [key: string]: unknown };

const methods: Record<Method, string> = { cash: 'Efectivo', card: 'Tarjeta', bizum: 'Bizum', transfer: 'Transferencia' };
const kinds: Record<Kind, string> = { sale: 'Cobro', refund: 'Devolución', cash_in: 'Entrada de efectivo', cash_out: 'Salida de efectivo' };
const methodButtons = [
  { value: 'card', Icon: CreditCard },
  { value: 'cash', Icon: Banknote },
  { value: 'bizum', Icon: Smartphone },
] as const;
const movementButtons = [
  { value: 'sale', label: 'Cobro sin cita', Icon: Receipt },
  { value: 'cash_in', label: 'Entrada de efectivo', Icon: ArrowDownLeft },
  { value: 'cash_out', label: 'Salida de efectivo', Icon: ArrowUpRight },
] as const;
const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'delete'];
const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const dateTime = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'short', timeStyle: 'short' });
const money = (cents: number) => euro.format(cents / 100);
const date = (timestamp: string) => dateTime.format(new Date(timestamp));
const decimal = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

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

function printSlip(title: string, lines: string[]) {
  const frame = document.createElement('iframe');
  frame.className = 'cash-print-frame';
  frame.title = title;
  const host = document.querySelector('dialog.appointment-cash-dialog[open]') ?? document.body;
  host.append(frame);
  try {
    const page = frame.contentDocument;
    const printer = frame.contentWindow;
    if (!page || !printer) throw new Error('No se pudo abrir la impresión.');
    page.title = title;
    const css = page.createElement('style');
    css.textContent = '@page{margin:4mm}body{font:11pt system-ui;color:#000;width:100%;max-width:70mm;margin:0 auto;overflow-wrap:anywhere}h1{font-size:14pt}p{margin:5px 0}';
    page.head.append(css);
    const heading = page.createElement('h1');
    heading.textContent = title;
    page.body.append(heading);
    for (const line of lines) {
      const row = page.createElement('p');
      row.textContent = line;
      page.body.append(row);
    }
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

export function AppointmentCashDialog({ appointment, clientName, onClose, onOpenCash }: {
  appointment: AppointmentSale;
  clientName: string;
  onClose: () => void;
  onOpenCash: () => void;
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
      <CashRegister appointment={appointment} onOpenCash={onOpenCash} onSavingChange={setSaving} hideTitle />
    </div>
  </dialog>;
}

export default function CashRegister({ appointment, onOpenCash, openAppointment, openAgenda, onSavingChange, hideTitle = false }: {
  appointment?: AppointmentSale;
  onOpenCash?: () => void;
  openAppointment?: (id: string) => void;
  openAgenda?: () => void;
  onSavingChange?: (saving: boolean) => void;
  hideTitle?: boolean;
}) {
  const appointmentId = appointment?.id;
  const [state, setState] = useState<CashState>();
  const [selection, setSelection] = useState<{ shiftId?: string; before?: string }>({});
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState<Command>();
  const lock = useRef(false);
  const closingPanel = useRef<HTMLDetailsElement>(null);
  const [opening, setOpening] = useState('');
  const [counted, setCounted] = useState('');
  const [terminal, setTerminal] = useState('');
  const [kind, setKind] = useState<Exclude<Kind, 'refund'>>('sale');
  const [giftMode, setGiftMode] = useState(false);
  const [giftBusy, setGiftBusy] = useState(false);
  useEffect(() => {
    onSavingChange?.(busy || giftBusy);
  }, [busy, giftBusy, onSavingChange]);
  const [giftError, setGiftError] = useState('');
  const [method, setMethod] = useState<(typeof methodButtons)[number]['value']>('card');
  const [description, setDescription] = useState('');
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

  async function send(command: Command) {
    if (lock.current) return;
    lock.current = true;
    const payload = { ...command, id: command.id || crypto.randomUUID() };
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await request<{ ok: boolean; shiftId?: string }>(payload);
      if (!result.ok) throw new Error('La caja no ha confirmado el guardado.');
      setRetry(undefined);
      if (payload.operation === 'close' && result.shiftId) {
        setSelection({ shiftId: result.shiftId });
        setCounted('');
        setTerminal('');
      }
      if (payload.operation === 'open') setOpening('');
      if (payload.operation === 'record') {
        setMovementAmount('');
        setDescription('');
        setBankReference('');
        setInvoiceReference('');
      }
      if (payload.operation === 'invoice') setInvoiceEdit(undefined);
      setNotice({ open: 'Caja abierta.', close: 'Cierre guardado.', record: 'Movimiento registrado.', invoice: 'Número de factura actualizado.' }[payload.operation]);
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
  const appointmentPaid = state?.movements.some(movement => movement.kind === 'sale' && !movement.refunded);
  const final = cents(finalAmount);
  const due = appointment && final !== null ? final - appointment.depositCents - appointment.voucherCents : null;

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
    if (!activeShift || blocked || (kind === 'sale' && giftMode)) return;
    const amountCents = appointment ? due : cents(movementAmount);
    if (amountCents === null || amountCents <= 0) {
      setError('Introduce un importe pendiente mayor que cero.');
      return;
    }
    const selectedMethod = kind === 'sale' ? method : 'cash';
    if (kind === 'sale' && !window.confirm(`¿Registrar ${money(amountCents)} ya cobrados por ${methods[selectedMethod]}?`)) return;
    void send({
      operation: 'record', kind, method: selectedMethod, shiftId: activeShift.id, amountCents,
      appointmentId, finalCents: appointment ? final : undefined, description: appointment?.description || description.trim(),
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

  function print(title: string, lines: string[]) {
    try { printSlip(title, lines); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo abrir la impresión.'); }
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
  const activeSale = appointment ? due : cents(movementAmount);
  const movementLabel = movementButtons.find(item => item.value === kind)?.label;
  const dashboard = !appointment && shift && totals;

  return <section className={`cash-register${appointment ? ' cash-register-appointment' : ''}`}
    aria-label={appointment ? 'Cobro de cita' : 'Caja'} aria-busy={loading || busy || giftBusy}>
    <header className="cash-heading">
      <div className="cash-title">
        {!hideTitle && <div className="cash-title-icon"><Wallet size={23} aria-hidden="true" /></div>}
        <div>
          {!hideTitle && <h2>{appointment ? 'Cobro de cita' : 'Caja'}</h2>}
          {state && <span className={`cash-status${activeShift && !shift?.closed_at ? ' cash-status-open' : ''}`}>
            {shift?.closed_at ? `Cierre · ${date(shift.closed_at)}` : activeShift ? `Caja abierta · ${date(activeShift.opened_at)}` : 'Caja cerrada'}
          </span>}
        </div>
      </div>
      <div className="cash-heading-actions">
        {!appointment && state && <label className="cash-history">
          <History size={17} aria-hidden="true" />
          <span className="cash-sr-only">Turno de caja</span>
          <select value={selection.shiftId || ''} disabled={blocked} onChange={event => {
            setCounted('');
            setTerminal('');
            setSelection({ ...selection, shiftId: event.target.value || undefined });
          }}>
            <option value="">Caja actual</option>
            {shift?.closed_at && !state.history?.some(item => item.id === shift.id) &&
              <option value={shift.id}>Cierre · {date(shift.closed_at)}</option>}
            {state.history?.map(item => <option key={item.id} value={item.id}>Cierre · {date(item.closed_at!)}</option>)}
          </select>
        </label>}
        {dashboard && !shift.closed_at && <button type="button" disabled={blocked} onClick={() => {
          const panel = closingPanel.current;
          if (!panel) return;
          panel.open = true;
          panel.querySelector('summary')?.focus();
          panel.scrollIntoView({ block: 'nearest' });
        }}>Cerrar turno</button>}
        <button type="button" className="cash-refresh" disabled={blocked} onClick={() => { setError(''); setReload(value => value + 1); }}>
          <RefreshCw size={16} aria-hidden="true" /> Actualizar
        </button>
      </div>
    </header>
    {loading && <p className="cash-message" role="status">Consultando caja…</p>}
    {error && <p className="cash-message cash-error" role="alert">{error}</p>}
    {notice && <p className="cash-message cash-success" role="status"><Check size={16} aria-hidden="true" />{notice}</p>}
    {retry && <button type="button" disabled={busy} onClick={() => void send(retry)}>Reintentar guardado</button>}
    {!loading && state && <>
      {!appointment && (state.history?.length === 30 || selection.before) && <div className="cash-actions">
        {state.history?.length === 30 && <button type="button" disabled={blocked} onClick={() =>
          setSelection({ ...selection, before: state.history?.[29]?.opened_at })}>Cierres anteriores</button>}
        {selection.before && <button type="button" disabled={blocked} onClick={() => setSelection({ ...selection, before: undefined })}>Cierres recientes</button>}
      </div>}

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

      {dashboard && <section className="cash-overview" aria-label="Resumen de caja">
        {([
          [Banknote, 'Efectivo esperado', expected],
          [CreditCard, 'Tarjeta', totals.card],
          [Receipt, 'Cobros del turno', totals.cash + totals.card + totals.bizum + totals.transfer],
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
      {appointment && appointmentPaid && <p className="cash-message cash-success"><Check size={16} aria-hidden="true" />El saldo de esta cita ya tiene un cobro registrado.</p>}
      {appointment?.hasUnknownVoucher && !appointmentPaid && <p className="cash-message">Actualiza la cita y comprueba el saldo del bono antes de cobrar.</p>}
      {appointment?.unavailable && !appointmentPaid && <p className="cash-message">Comprueba el estado de la cita, su aprobación y el anticipo antes de cobrar.</p>}

      {activeShift && (appointment ? !appointmentPaid && !appointment.unavailable && !appointment.hasUnknownVoucher : shift?.id === activeShift.id) &&
        <form className="cash-card cash-pos" onSubmit={record}>
          <div className="cash-pos-main">
            <h3>{appointment ? 'Registrar saldo' : 'Nuevo movimiento'}</h3>
            {!appointment && <>
              <fieldset className="cash-choice-group" disabled={blocked}>
                <legend>Operación</legend>
                <div className="cash-operation-buttons">
                  {movementButtons.map(({ value, label, Icon }) => <label key={value} className="cash-choice">
                    <input type="radio" name="cash-movement-kind" value={value} checked={kind === value} onChange={() => { setKind(value); setGiftMode(false); }} />
                    <span><Icon size={17} aria-hidden="true" />{label}</span>
                  </label>)}
                </div>
              </fieldset>
              <label className="cash-field">Concepto<input required maxLength={200} value={description} placeholder={kind === 'sale' ? 'Ej. Champú' : 'Motivo del movimiento'}
                disabled={blocked} onChange={event => setDescription(event.target.value)} /></label>
            </>}
            {appointment && <div className="cash-appointment-breakdown">
              <div><span>Anticipo confirmado</span><strong>{money(appointment.depositCents)}</strong></div>
              <div><span>{appointment.giftApplied ? 'Tarjeta regalo aplicada' : 'Bono aplicado'}</span><strong>{money(appointment.voucherCents)}</strong></div>
            </div>}
            {kind === 'sale' && <>
              <fieldset className="cash-choice-group" disabled={blocked}>
                <legend>Método de pago</legend>
                <div className="cash-method-buttons">
                  {methodButtons.map(({ value, Icon }) => <label key={value} className="cash-choice cash-method">
                    <input type="radio" name={appointment ? 'appointment-payment-method' : 'cash-payment-method'} value={value}
                      checked={method === value && !giftMode} onChange={() => { setGiftMode(false); setMethod(value); }} />
                    <span><Icon size={23} aria-hidden="true" />{methods[value]}</span>
                  </label>)}
                  <button type="button" className="cash-gift-button" aria-pressed={giftMode}
                    onClick={() => { setGiftMode(value => !value); setGiftError(''); }}>
                    <Gift size={23} aria-hidden="true" />Tarjeta regalo
                  </button>
                </div>
              </fieldset>
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
              {!giftMode && method === 'card' && <p className="cash-pos-note">Cuando el datáfono apruebe el pago, registra el cobro aquí.</p>}
              {!giftMode && <details className="cash-optional">
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
            {!hasServiceTotal && <Keypad label={appointment ? 'Precio final tras descuentos' : 'Importe'} value={appointment ? finalAmount : movementAmount}
              onChange={appointment ? setFinalAmount : setMovementAmount} disabled={blocked} />}
            {appointment && <div className="cash-due"><span>Saldo</span><strong>{due === null ? '—' : money(Math.max(0, due))}</strong></div>}
            {due !== null && due <= 0 && <p className="cash-pos-note">{due === 0 ? 'La cita está cubierta.' : 'Revisa el precio final y los importes ya aplicados.'}</p>}
            <button className="cash-primary" disabled={blocked || (kind === 'sale' && giftMode) || activeSale === null || activeSale <= 0}>
              <Check size={17} aria-hidden="true" />
              <span>{kind === 'sale' ? 'Registrar cobro' : `Registrar ${movementLabel?.toLowerCase()}`}</span>
              {!appointment && activeSale !== null && activeSale > 0 && <strong>{money(activeSale)}</strong>}
            </button>
          </div>
        </form>}

      {(appointment || shift) && <section className="cash-card cash-activity">
        <div className="cash-section-heading"><h3>Movimientos</h3><span>{state.movements.length}</span></div>
        {state.movements.length === 0 && <div className="cash-empty"><Receipt size={21} aria-hidden="true" /><p>Todavía no hay movimientos.</p></div>}
        {state.movements.length > 0 && <ul className="cash-movements">{state.movements.map(movement =>
          <li key={movement.id}>
            <div className="cash-movement-line">
              <div className="cash-movement-icon"><Receipt size={18} aria-hidden="true" /></div>
              <div className="cash-movement-info">
                <strong>{movement.description}</strong>
                <small>{kinds[movement.kind]} · {date(movement.recorded_at)} · {methods[movement.method]}{movement.refunded ? ' · Devuelto' : ''}</small>
                {movement.bank_reference && <p>Referencia {movement.bank_reference}</p>}
                {movement.invoice_reference && <p>Factura {movement.invoice_reference}</p>}
              </div>
              <strong className="cash-movement-amount">{money(movement.kind === 'refund' || movement.kind === 'cash_out' ? -movement.amount_cents : movement.amount_cents)}</strong>
            </div>
            {(movement.kind === 'sale' || movement.kind === 'refund') && <div className="cash-actions">
              {!appointment && openAppointment && movement.appointment_id && <button type="button" onClick={() => openAppointment(movement.appointment_id!)}>Ver cita</button>}
              <button type="button" onClick={() => print('L’Studio Ana · Justificante de caja', [
                'Sin validez como factura', `${kinds[movement.kind]} · ${date(movement.recorded_at)}`,
                movement.description, `${methods[movement.method]}  ${money(movement.amount_cents)}`,
                `Movimiento ${movement.id.slice(0, 8).toUpperCase()}`,
                ...(movement.bank_reference ? [`Referencia ${movement.bank_reference}`] : []),
                ...(movement.refunded ? ['Cobro devuelto'] : []),
                ...(movement.invoice_reference ? [`Factura ${movement.invoice_reference}`] : []),
              ])}><Printer size={15} aria-hidden="true" />Imprimir justificante</button>
              <button type="button" disabled={blocked} onClick={() => setInvoiceEdit({ id: movement.id, value: movement.invoice_reference || '' })}>Número de factura</button>
              {movement.kind === 'sale' && !movement.refunded && activeShift && <button type="button" disabled={blocked} onClick={() => {
                if (window.confirm(`¿Registrar una devolución completa de ${money(movement.amount_cents)} ya realizada por ${methods[movement.method]}?`)) {
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

      {dashboard && (shift.closed_at ? <section className="cash-card cash-close">
        <h3>Cierre de caja</h3>
        <p>Apertura {date(shift.opened_at)} · Cierre {date(shift.closed_at)}</p>
        <dl className="cash-summary">{cashSummary().map(([label, amount]) =>
          <div key={label}><dt>{label}</dt><dd>{money(amount)}</dd></div>)}</dl>
        <button type="button" onClick={() => print('L’Studio Ana · Cierre de caja', [
          `Apertura ${date(shift.opened_at)}`, `Cierre ${date(shift.closed_at!)}`,
          ...cashSummary().map(([label, amount]) => `${label}  ${money(amount)}`),
        ])}><Printer size={16} aria-hidden="true" />Imprimir cierre</button>
      </section> : <details className="cash-card cash-close" key={shift.id} ref={closingPanel}>
        <summary><span><Wallet size={19} aria-hidden="true" />Cierre de caja</span><ChevronDown size={19} aria-hidden="true" /></summary>
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
      </details>)}
    </>}
  </section>;
}
