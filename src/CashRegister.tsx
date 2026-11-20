import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { currentToken, StudioApiError, studioCashRegister } from './studioApi';
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
  voucherCents: number; unavailable: boolean; hasUnknownVoucher: boolean;
};
type Command = { operation: 'open' | 'close' | 'record' | 'invoice'; id?: string; [key: string]: unknown };

const methods: Record<Method, string> = { cash: 'Efectivo', card: 'Tarjeta · CaixaBank', bizum: 'Bizum', transfer: 'Transferencia' };
const kinds: Record<Kind, string> = { sale: 'Cobro', refund: 'Devolución', cash_in: 'Entrada de efectivo', cash_out: 'Salida de efectivo' };
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
  document.body.append(frame);
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

export default function CashRegister({ appointment, onOpenCash, openAppointment }: {
  appointment?: AppointmentSale;
  onOpenCash?: () => void;
  openAppointment?: (id: string) => void;
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
  const [opening, setOpening] = useState('');
  const [counted, setCounted] = useState('');
  const [terminal, setTerminal] = useState('');
  const [kind, setKind] = useState<Exclude<Kind, 'refund'>>('sale');
  const [method, setMethod] = useState<Method>('card');
  const [description, setDescription] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [invoiceReference, setInvoiceReference] = useState('');
  const [invoiceEdit, setInvoiceEdit] = useState<{ id: string; value: string }>();
  const [finalAmount, setFinalAmount] = useState(appointment?.finalCents == null ? '' : decimal(appointment.finalCents));
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
  const blocked = busy || loading || !!retry;
  const expected = shift && totals ? shift.opening_cents + totals.cash + totals.cashIn - totals.cashOut : 0;
  const appointmentPaid = state?.movements.some(movement => movement.kind === 'sale' && !movement.refunded);
  const final = cents(finalAmount);
  const due = appointment && final !== null ? final - appointment.depositCents - appointment.voucherCents : null;

  function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeShift || blocked) return;
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
      ['Fondo inicial', shift.opening_cents], ['Efectivo neto', totals.cash],
      ['Tarjeta neta', totals.card], ['Bizum neto', totals.bizum], ['Transferencias netas', totals.transfer],
      ['Entradas de efectivo', totals.cashIn], ['Salidas de efectivo', totals.cashOut], ['Efectivo esperado', expected],
    ];
    if (shift.counted_cents !== null) rows.push(['Efectivo contado', shift.counted_cents], ['Diferencia de efectivo', shift.counted_cents - expected]);
    if (shift.terminal_cents !== null) rows.push(['Total del datáfono', shift.terminal_cents], ['Diferencia de tarjeta', shift.terminal_cents - totals.card]);
    return rows;
  }

  return <section className="cash-register" aria-label={appointment ? 'Cobro de cita' : 'Caja'}>
    <header className="cash-heading">
      <h2>{appointment ? 'Cobro de cita' : 'Caja'}</h2>
      <button type="button" disabled={blocked} onClick={() => { setError(''); setReload(value => value + 1); }}>Actualizar</button>
    </header>
    {loading && <p role="status">Consultando caja…</p>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {retry && <button type="button" disabled={busy} onClick={() => void send(retry)}>Reintentar guardado</button>}
    {!loading && state && <>
      {!appointment && <>
        <nav className="cash-heading" aria-label="Turnos de caja">
          <label>Turno<select value={selection.shiftId || ''} disabled={blocked} onChange={event => {
            setCounted('');
            setTerminal('');
            setSelection({ ...selection, shiftId: event.target.value || undefined });
          }}>
            <option value="">Caja actual</option>
            {shift?.closed_at && !state.history?.some(item => item.id === shift.id) &&
              <option value={shift.id}>Cierre · {date(shift.closed_at)}</option>}
            {state.history?.map(item => <option key={item.id} value={item.id}>Cierre · {date(item.closed_at!)}</option>)}
          </select></label>
          <div className="cash-actions">
            {state.history?.length === 30 && <button type="button" disabled={blocked} onClick={() =>
              setSelection({ ...selection, before: state.history?.[29]?.opened_at })}>Cierres anteriores</button>}
            {selection.before && <button type="button" disabled={blocked} onClick={() => setSelection({ ...selection, before: undefined })}>Cierres recientes</button>}
          </div>
        </nav>
        {!selection.shiftId && !activeShift && <form className="cash-card cash-form" onSubmit={event => {
          event.preventDefault();
          const amountCents = cents(opening);
          if (amountCents === null) { setError('Indica el fondo inicial en euros.'); return; }
          void send({ operation: 'open', amountCents });
        }}>
          <Amount label="Fondo inicial (€)" value={opening} onChange={event => setOpening(event.target.value)} placeholder="0,00" disabled={blocked} />
          <button disabled={blocked}>Abrir caja</button>
        </form>}
        {shift && totals && <section className="cash-card">
          <h3>{shift.closed_at ? 'Cierre de caja' : 'Caja abierta'}</h3>
          <p>Apertura {date(shift.opened_at)}{shift.closed_at ? ` · Cierre ${date(shift.closed_at)}` : ''}</p>
          <dl className="cash-summary">{cashSummary().map(([label, amount]) =>
            <div key={label}><dt>{label}</dt><dd>{money(amount)}</dd></div>)}</dl>
          {shift.closed_at && <button type="button" onClick={() => print('L’Studio Ana · Cierre de caja', [
            `Apertura ${date(shift.opened_at)}`, `Cierre ${date(shift.closed_at!)}`,
            ...cashSummary().map(([label, amount]) => `${label}  ${money(amount)}`),
          ])}>Imprimir cierre</button>}
        </section>}
      </>}

      {appointment && !activeShift && <p>Abre caja para registrar un cobro. {onOpenCash && <button type="button" onClick={onOpenCash}>Ir a caja</button>}</p>}
      {appointment && appointmentPaid && <p>El saldo de esta cita ya tiene un cobro registrado.</p>}
      {appointment?.hasUnknownVoucher && !appointmentPaid && <p>Actualiza la cita y comprueba el saldo del bono antes de cobrar.</p>}
      {appointment?.unavailable && !appointmentPaid && <p>Comprueba el estado de la cita, su aprobación y el anticipo antes de cobrar.</p>}

      {activeShift && (appointment ? !appointmentPaid && !appointment.unavailable && !appointment.hasUnknownVoucher : shift?.id === activeShift.id) &&
        <form className="cash-card cash-form" onSubmit={record}>
          <h3>{appointment ? 'Registrar saldo' : 'Nuevo movimiento'}</h3>
          {!appointment && <>
            <label>Tipo<select value={kind} disabled={blocked} onChange={event => setKind(event.target.value as typeof kind)}>
              <option value="sale">Cobro sin cita</option><option value="cash_in">Entrada de efectivo</option><option value="cash_out">Salida de efectivo</option>
            </select></label>
            <label>Concepto<input required maxLength={200} value={description} disabled={blocked} onChange={event => setDescription(event.target.value)} /></label>
            <Amount label="Importe (€)" value={movementAmount} disabled={blocked} onChange={event => setMovementAmount(event.target.value)} />
          </>}
          {appointment && <>
            <Amount label="Precio final tras descuentos (€)" value={finalAmount} disabled={blocked} onChange={event => setFinalAmount(event.target.value)} />
            <p className="cash-wide">Anticipo confirmado {money(appointment.depositCents)} · Bono aplicado {money(appointment.voucherCents)}
              {due !== null && <> · <strong>Saldo {money(Math.max(0, due))}</strong></>}</p>
            {due !== null && due <= 0 && <p className="cash-wide">{due === 0 ? 'La cita está cubierta. No queda importe por cobrar.' : 'Revisa el precio final y los importes ya aplicados.'}</p>}
          </>}
          {kind === 'sale' && <>
            <label>Método<select value={method} disabled={blocked} onChange={event => setMethod(event.target.value as Method)}>
              {Object.entries(methods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            {method === 'card' && <p className="cash-wide">Teclea el importe en el datáfono de CaixaBank y registra el cobro cuando lo apruebe.</p>}
            <label>Referencia de operación (opcional)<input maxLength={80} value={bankReference} disabled={blocked} onChange={event => setBankReference(event.target.value)} /></label>
            <label>Número de factura (opcional)<input maxLength={80} value={invoiceReference} disabled={blocked} onChange={event => setInvoiceReference(event.target.value)} /></label>
          </>}
          <button disabled={blocked || (!!appointment && (due === null || due <= 0))}>{kind === 'sale' ? 'Registrar cobro' : 'Registrar movimiento'}</button>
        </form>}

      {(appointment || shift) && <section className="cash-card">
        <h3>Movimientos</h3>
        {state.movements.length === 0 && <p>Todavía no hay movimientos.</p>}
        <ul className="cash-movements">{state.movements.map(movement =>
          <li key={movement.id}>
            <div><strong>{kinds[movement.kind]} · {money(movement.amount_cents)}</strong>
              <p>{movement.description}</p>
              <small>{date(movement.recorded_at)} · {methods[movement.method]}{movement.refunded ? ' · Devuelto' : ''}</small>
              {movement.bank_reference && <p>Referencia {movement.bank_reference}</p>}
              {movement.invoice_reference && <p>Factura {movement.invoice_reference}</p>}
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
              ])}>Imprimir justificante</button>
              <button type="button" disabled={blocked} onClick={() => setInvoiceEdit({ id: movement.id, value: movement.invoice_reference || '' })}>Número de factura</button>
              {movement.kind === 'sale' && !movement.refunded && activeShift && <button type="button" disabled={blocked} onClick={() => {
                if (window.confirm(`¿Registrar una devolución completa de ${money(movement.amount_cents)} ya realizada por ${methods[movement.method]}?`)) {
                  void send({ operation: 'record', kind: 'refund', shiftId: activeShift.id, originalId: movement.id });
                }
              }}>Registrar devolución</button>}
            </div>}
            {invoiceEdit?.id === movement.id && <form className="cash-form cash-wide" onSubmit={event => {
              event.preventDefault();
              void send({ operation: 'invoice', id: movement.id, invoiceReference: invoiceEdit.value });
            }}>
              <label>Número de factura emitida<input maxLength={80} autoFocus value={invoiceEdit.value} disabled={blocked}
                onChange={event => setInvoiceEdit({ id: movement.id, value: event.target.value })} /></label>
              <button disabled={blocked}>Guardar número</button>
              <button type="button" disabled={blocked} onClick={() => setInvoiceEdit(undefined)}>Cancelar</button>
            </form>}
          </li>)}</ul>
      </section>}

      {shift && totals && !shift.closed_at && <form className="cash-card cash-form" onSubmit={close}>
        <h3>Cerrar caja</h3>
        <Amount label="Efectivo contado (€)" value={counted} onChange={event => setCounted(event.target.value)} disabled={blocked} />
        <Amount label="Total del datáfono (€) · opcional" required={false} value={terminal} onChange={event => setTerminal(event.target.value)} disabled={blocked} />
        {terminal.trim() && cents(terminal, true) !== null && <p className="cash-wide">Diferencia de tarjeta {money(cents(terminal, true)! - totals.card)}</p>}
        <button disabled={blocked}>Cerrar caja</button>
      </form>}
    </>}
  </section>;
}
