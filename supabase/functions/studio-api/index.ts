import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// Promotion pricing is bundled here: no additional deployment file required.
interface PromotionDiscount {
  promotionId: string; title: string; serviceId: string; serviceName: string; variantName: string;
  percent: number; originalAmount: number; finalAmount: number; discountAmount: number;
  startDate: string; endDate: string; totalBefore: number | null; totalAfter: number | null; orientative: boolean;
}
function exactPrice(value: unknown): number | null {
  const text = String(value ?? '').trim().replace(/\s/g, '').replace(/€/g, '');
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null;
  const amount = Number(text.replace(',', '.'));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}
function calculatePromotionDiscount(promo: any, selection: any[], catalog: any[], date = '', today = ''): PromotionDiscount {
  if (!promo || promo.active !== true) throw new Error('La promoción ya no está activa.');
  for (const day of [date, today].filter(Boolean)) {
    if ((promo.startDate && day < promo.startDate) || (promo.endDate && day > promo.endDate)) throw new Error('La fecha debe estar dentro de la vigencia de la promoción.');
  }
  const ids: string[] = Array.from(new Set(Array.isArray(promo.bookingServiceIds) ? promo.bookingServiceIds : promo.bookingServiceId ? [promo.bookingServiceId] : []));
  if (!ids.length || !ids.every(id => selection.some(item => item?.sub?.id === id))) throw new Error('La reserva debe incluir todos los servicios de la promoción.');
  if (new Set(selection.map(item => item?.sub?.id)).size !== selection.length) throw new Error('Hay servicios repetidos en la reserva.');
  const serviceId = String(promo.discountServiceId || '');
  const percent = Number(promo.discountPercent);
  if (!ids.includes(serviceId) || !Number.isFinite(percent) || percent <= 0 || percent > 100) throw new Error('La promoción no tiene un descuento válido configurado.');
  const selected = selection.find(item => item?.sub?.id === serviceId);
  const sub = catalog.find(item => item?.id === serviceId && item.active !== false);
  if (!selected || !sub) throw new Error('El servicio con descuento ya no está disponible.');
  const variant = sub.hasVariants && sub.variants?.length ? sub.variants.find((item: any) => item.id === selected.variant?.id) : null;
  if (sub.hasVariants && sub.variants?.length && !variant) throw new Error('Elige la variante del servicio para calcular el descuento.');
  const amount = exactPrice(variant?.price ?? sub.price);
  if (amount === null || (!variant && sub.priceType && sub.priceType !== 'fijo')) throw new Error('El servicio con descuento necesita un precio cerrado para aplicar la promoción.');
  let totalCents = 0;
  let unknownPrice = false;
  let orientative = false;
  for (const item of selection) {
    const service = catalog.find(sub => sub.id === item?.sub?.id && sub.active !== false);
    if (!service) throw new Error('Hay servicios no disponibles en la promoción.');
    const option = service.hasVariants && service.variants?.length ? service.variants.find((v: any) => v.id === item.variant?.id) : null;
    if (service.hasVariants && service.variants?.length && !option) throw new Error('Elige las variantes de todos los servicios antes de continuar.');
    const price = exactPrice(option?.price ?? service.price);
    if (price === null) unknownPrice = true;
    else totalCents += Math.round(price * 100);
    if (price === null || (service.priceType && service.priceType !== 'fijo')) orientative = true;
  }
  const cents = Math.round(amount * 100);
  const finalCents = Math.round(cents * (100 - percent) / 100);
  return { promotionId: promo.id, title: promo.title, serviceId, serviceName: sub.bookingName?.trim() || sub.name, variantName: variant?.name || '', percent, originalAmount: cents / 100, finalAmount: finalCents / 100, discountAmount: (cents - finalCents) / 100, startDate: promo.startDate || '', endDate: promo.endDate || '', totalBefore: unknownPrice ? null : totalCents / 100, totalAfter: unknownPrice ? null : (totalCents - (cents - finalCents)) / 100, orientative };
}


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Los errores internos (esquema, políticas, restricciones) se registran en el
// servidor; la clienta solo recibe un mensaje genérico.
const GENERIC_ERROR = "No se pudo completar la operación. Inténtalo de nuevo.";
const failed = (err: unknown, where = "studio-api") => {
  console.error(`[${where}]`, err instanceof Error ? err.message : JSON.stringify(err));
  return { error: GENERIC_ERROR };
};

const STUDIO_LOCATION = "Carrer Porta d'Alacant 11, Bajo, 03202 Elx (Alicante), España";
const DEFAULT_PORTAL_URL = "https://lstudioana.es";
const STUDIO_NOTIFY_EMAIL = "lstudioana@gmail.com";
const MADRID_TZ = "Europe/Madrid";

const escHtml = (value: string) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmtDateMadrid = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: MADRID_TZ });

const fmtTimeMadrid = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: MADRID_TZ });

const emailLayout = (title: string, bodyHtml: string) => `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#29231F;font-family:'Garet','Poppins',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#29231F;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#322A25;border:1px solid rgba(212,175,55,.35);border-radius:14px;">
        <tr><td style="padding:22px 22px 6px;text-align:center;">
          <p style="margin:0;color:#C99E52;font-size:13px;letter-spacing:2px;">L'STUDIO ANA</p>
          <h1 style="margin:10px 0 0;color:#FFF8EE;font-size:20px;font-weight:600;line-height:1.3;">${escHtml(title)}</h1>
        </td></tr>
        <tr><td style="padding:12px 22px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#29231F;border:1px solid rgba(212,175,55,.25);border-radius:10px;">
            <tr><td style="padding:16px;color:#FFF8EE;font-size:15px;line-height:1.7;">${bodyHtml}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:8px 22px 20px;" align="center">
          <p style="margin:0;color:#D6CBB8;font-size:12px;line-height:1.7;">${escHtml(STUDIO_LOCATION)}</p>
        </td></tr>
      </table>
      <p style="max-width:480px;margin:14px auto 0;color:#8A7E6E;font-size:11px;line-height:1.6;text-align:center;">
        Recibes este correo porque tienes una reserva activa en L'Studio Ana.
      </p>
    </td></tr>
  </table>
</body>
</html>`;

const howToGetThereLink = () =>
  `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STUDIO_LOCATION)}" target="_blank" style="color:#E4C687;">Cómo llegar</a>`;

const viewButton = (portalUrl: string, appointmentId: string) => {
  const url = `${portalUrl}?cita=${encodeURIComponent(appointmentId)}`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
  <tr><td align="center" style="padding:4px 0 12px;">
    <a href="${escHtml(url)}" style="display:inline-block;background:linear-gradient(135deg,#C99E52 0%,#B3823B 100%);color:#29231F;text-decoration:none;font-weight:600;font-size:14px;padding:13px 26px;border-radius:9px;">Ver mi cita</a>
  </td></tr>
  <tr><td align="center">${howToGetThereLink()}</td></tr>
</table>`;
};

// Match the concise appointment names used by the portal, without changing its creative titles.
const normalizeNotificationName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[¿?¡!.,]/g, '').replace(/\s+/g, ' ').trim();
const KNOWN_NOTIFICATION_NAMES: Record<string, string> = {
  'tu cabello en su mejor version': 'Styling & Peinados',
  'tu cabello ha cambiado y no sabes por que': 'Diagnóstico capilar con microcámara'
};
const notificationBookingName = (snapshot: any, current?: any): string => {
  const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  return text(current?.bookingName) || text(snapshot?.bookingName)
    || KNOWN_NOTIFICATION_NAMES[normalizeNotificationName(text(current?.name) || text(snapshot?.name))]
    || text(current?.name) || text(snapshot?.name) || 'Servicio';
};
const formatNotificationServices = (services: unknown, fallback: unknown, catalog: any[] = []): string => {
  if (Array.isArray(services) && services.length) {
    return services.map(item => {
      const current = item?.sub?.id ? catalog.find(service => service.id === item.sub.id) : undefined;
      const name = notificationBookingName(item?.sub, current);
      const variant = typeof item?.variant?.name === 'string' ? item.variant.name.trim() : '';
      return name + (variant ? ' · ' + variant : '');
    }).join(' + ');
  }
  let text = String(fallback || '').replace(/^(RESERVADO|PENDIENTE (?:SÁBADO|VALORACIÓN|BIZUM))\s*/, '');
  const replacements = catalog.filter(service => typeof service?.name === 'string' && service.name.trim()).sort((a,b) => b.name.length - a.name.length);
  for (const service of replacements) text = text.split(service.name).join(notificationBookingName(service, service));
  text = text.replace(/¿?Tu cabello ha cambiado y no sabes por qu[eé]\??/gi, 'Diagnóstico capilar con microcámara').replace(/Tu cabello,? en su mejor versi[oó]n/gi, 'Styling & Peinados');
  return text.trim() || 'Servicios del Studio';
};
const appointmentNotificationServices = async (admin: ReturnType<typeof createClient>, services: unknown, fallback: unknown): Promise<string> => {
  const { data, error } = await admin.from('studio_catalog').select('category');
  if (error) console.error('[notification-service-names]', error.message);
  const catalog = (data || []).flatMap((row: any) => row.category?.subservices || []);
  return formatNotificationServices(services, fallback, catalog);
};

const promotionNotificationSuffix = (promo: any): string => promo && typeof promo.finalAmount === 'number'
  ? ` · Promoción ${promo.title}: −${promo.percent} % solo en ${promo.serviceName}${promo.variantName ? ' (' + promo.variantName + ')' : ''}: ${Number(promo.originalAmount).toFixed(2)} € → ${Number(promo.finalAmount).toFixed(2)} €` : '';

const detailsTable = (startsAt: string, servicesText: string, professional?: string | null) => {
  const rows = [
    `<tr><td style="padding:4px 0;color:#D6CBB8;width:92px;">Fecha</td><td style="padding:4px 0;color:#FFF8EE;">${escHtml(fmtDateMadrid(startsAt))}</td></tr>`,
    `<tr><td style="padding:4px 0;color:#D6CBB8;">Hora</td><td style="padding:4px 0;color:#FFF8EE;">${escHtml(fmtTimeMadrid(startsAt))}h</td></tr>`,
    `<tr><td style="padding:4px 0;color:#D6CBB8;">Servicios</td><td style="padding:4px 0;color:#FFF8EE;">${escHtml(servicesText)}</td></tr>`,
  ];
  if (professional) rows.push(`<tr><td style="padding:4px 0;color:#D6CBB8;">Profesional</td><td style="padding:4px 0;color:#FFF8EE;">${escHtml(professional)}</td></tr>`);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table>`;
};

// Operator-only keys never leave the server for a client session: the master
// PIN grants administration access, so a clienta must never receive it.
const CLIENT_FORBIDDEN_SETTINGS = ["masterPin", "workerSecret", "serviceKey", "accessToken"];
const settingsForClient = (configuration: unknown): unknown => {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) return configuration ?? null;
  const safe: Record<string, unknown> = { ...(configuration as Record<string, unknown>) };
  for (const key of CLIENT_FORBIDDEN_SETTINGS) delete safe[key];
  // Never send drafts, scheduled or expired promotions to a client.
  if (Array.isArray(safe.promotions)) {
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: MADRID_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    safe.promotions = safe.promotions.filter((p: any) => p && p.active === true && typeof p.title === 'string' && p.title.trim() && (!p.startDate || p.startDate <= today) && (!p.endDate || p.endDate >= today));
  }
  return safe;
};

const validEmail = (value: unknown): string | null => {
  const email = String(value ?? "").toLowerCase().trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

// starts_at del proyecto conserva la hora de agenda como texto ISO UTC.
// Convertir SOLO al programar avisos, sin cambiar las citas existentes ni el portal.
function notificationInstant(wallIso: string): string {
  const wall = wallIso.slice(0, 19);
  const target = Date.parse(wall + 'Z');
  if (!Number.isFinite(target)) throw new Error('Fecha de cita no válida');
  let guess = target;
  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' }).formatToParts(new Date(guess));
    const values = Object.fromEntries(parts.map(p => [p.type,p.value]));
    const represented = Date.parse(`${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}Z`);
    const adjustment = target - represented;
    if (!adjustment) return new Date(guess).toISOString();
    guess += adjustment;
  }
  throw new Error('La hora de cita coincide con un cambio horario no válido');
}
const notificationConfirmed = (appt: any) => !!appt && !appt.completed_at &&
  !['cancelled','no_show'].includes(appt.lifecycle_status) &&
  ['accepted','not_required'].includes(appt.approval_status || 'not_required') &&
  ['received','paid','confirmed','not_required'].includes(appt.deposit_status || 'not_required');

async function enqueueReminderJobs(admin: ReturnType<typeof createClient>, ctx: any, channel: 'push'|'whatsapp') {
  if (!ctx.confirmed) return;
  const start = Date.parse(notificationInstant(ctx.startsAt));
  const now = Date.now();
  if (start <= now) return;
  const recipients = channel === 'push'
    ? (await admin.from('studio_push_subscriptions').select('id').eq('client_id',ctx.clientId || '00000000-0000-0000-0000-000000000000')).data || []
    : ctx.clientPhone ? [{id:null}] : [];
  const reminderHours = channel === 'whatsapp' ? [1] : [24,2];
  const moments: {kind:string;at:number}[] = [
    ...(channel === 'push' ? [{kind:ctx.isUpdate ? 'update':'confirmation',at:now}] : []),
    ...reminderHours.map(hours => ({kind:`reminder_${hours}h`,at:start-hours*3600000})).filter(m => m.at > now)
  ];
  for (const recipient of recipients) for (const moment of moments) {
    const key = `${channel}:${moment.kind}:${ctx.apptId}:${ctx.startsAt}:${recipient.id || ctx.clientPhone}`;
    const {error} = await admin.from('studio_notification_jobs').upsert({
      idempotency_key:key, appointment_id:ctx.apptId, channel, kind:moment.kind,
      subscription_id:recipient.id, client_id:ctx.clientId || null, to_phone:ctx.clientPhone || null,
      expected_starts_at:ctx.startsAt, scheduled_at:new Date(moment.at).toISOString(),
      payload:{clientName:ctx.clientName,servicesText:ctx.servicesText},status:'scheduled'
    },{onConflict:'idempotency_key',ignoreDuplicates:true});
    if (error) throw new Error(`No se pudo programar ${channel}: ${error.message}`);
    // Reactivar únicamente pendientes anulados, nunca mensajes ya enviados.
    await admin.from('studio_notification_jobs').update({status:'scheduled',scheduled_at:new Date(moment.at).toISOString(),last_error:null})
      .eq('idempotency_key',key).eq('status','skipped');
  }
}
async function cancelNotificationJobs(admin: ReturnType<typeof createClient>, id:string) {
  const {error}=await admin.from('studio_notification_jobs').update({status:'skipped',last_error:'Cita cancelada, modificada o pendiente'})
    .eq('appointment_id',id).in('status',['scheduled','failed']);
  if(error) console.error('Cancelar recordatorios:',error.message);
}
async function kickDispatcher(admin: ReturnType<typeof createClient>) {
  const {data}=await admin.from('studio_email_config').select('worker_secret').eq('id',true).maybeSingle();
  if(!data?.worker_secret) { console.error('Falta worker_secret; no se inicia envío inmediato');return; }
  const task=fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/email-dispatch`,{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${Deno.env.get('STUDIO_BACKEND_KEY')}`},
    body:JSON.stringify({workerSecret:data.worker_secret}),signal:AbortSignal.timeout(25000)
  }).then(async r=>{if(!r.ok)console.error('email-dispatch:',r.status,await r.text());}).catch(e=>console.error('email-dispatch:',e.message));
  const runtime=(globalThis as any).EdgeRuntime;
  if(runtime?.waitUntil) runtime.waitUntil(task); else await task;
}

// E.164 normalisation for Spanish/international numbers: digits only, Spain
// assumed when the client saved a 9-digit local number.
const validPhoneE164 = (value: unknown): string | null => {
  const raw = String(value ?? "").replace(/[^+\d]/g, "");
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.length === 9) return `+34${digits}`;
  if (digits.startsWith("34") && digits.length === 11) return `+${digits}`;
  return null;
};

const whatsAppMessageText = (opts: {
  kind: "confirmation" | "request_received" | "update" | "cancellation";
  clientName: string;
  startsAt: string;
  servicesText: string;
  portalUrl: string;
  pending?: string | null;
  apptIdToken?: string;
}) => {
  const date = fmtDateMadrid(opts.startsAt);
  const time = fmtTimeMadrid(opts.startsAt);
  const header = opts.kind === "request_received"
    ? `Hola, ${opts.clientName}. Hemos recibido tu solicitud en L'Studio Ana.`
    : opts.kind === "update"
      ? `Hola, ${opts.clientName}. Tu cita en L'Studio Ana ha sido modificada.`
      : opts.kind === "cancellation"
        ? `Hola, ${opts.clientName}. Tu cita en L'Studio Ana ha sido cancelada.`
        : `Hola, ${opts.clientName}. Tu cita en L'Studio Ana está confirmada.`;
  const pendingLine = opts.pending ? `\nPendiente: ${opts.pending}. Te enviaremos la confirmación definitiva cuando se complete.` : "";
  return `${header}\nFecha: ${date}\nHora: ${time}\nServicios: ${opts.servicesText}\nDirección: ${STUDIO_LOCATION}${pendingLine}\nPuedes consultar y gestionar tu cita aquí: ${opts.portalUrl}?cita=${opts.apptIdToken ?? ""}\n¡Te esperamos!`;
};

interface WhatsAppSchedulingContext {
  apptId: string;
  startsAt: string;
  clientName: string;
  clientPhone: string | null;
  servicesText: string;
  confirmed: boolean;
  isUpdate?: boolean;
  kindOverride?: "confirmation" | "request_received" | "update" | "cancellation";
}

// Schedule WhatsApp reminders only (no immediate confirmation, no 24h).
// Cancellations are still sent immediately. Emails and push are unaffected.
const scheduleAppointmentWhatsApp = async (admin: ReturnType<typeof createClient>, ctx: WhatsAppSchedulingContext) => {
  if (ctx.kindOverride === 'cancellation') {
    await cancelAppointmentWhatsApp(admin, ctx.apptId, { cancelled: true });
    return;
  }
  if (!ctx.confirmed) return;
  await enqueueReminderJobs(admin, ctx, 'whatsapp').catch(error => console.error('Programar WhatsApp:',error));
};

const cancelAppointmentWhatsApp = async (admin: ReturnType<typeof createClient>, apptId: string, opts: { cancelled?: boolean } = {}) => {
  await admin.from("studio_whatsapp_outbox")
    .update({ status: "skipped", last_error: "Cita cancelada o modificada" })
    .eq("appointment_id", apptId)
    .in("status", ["scheduled", "failed"]);
  if (opts.cancelled) {
    const { data: appt } = await admin.from("studio_appointments")
      .select("id, starts_at, services, client_snapshot")
      .eq("id", apptId).maybeSingle();
    const snap = ((appt?.client_snapshot || {}) as Record<string, unknown>);
    const phone = validPhoneE164(snap.phone);
    if (appt && phone) {
      const { data: cfg } = await admin.from("studio_whatsapp_config").select("portal_url").eq("id", true).maybeSingle();
      const portalUrl = ((cfg as { portal_url?: string | null } | null)?.portal_url || DEFAULT_PORTAL_URL).replace(/\/+$/, "");
      const text = whatsAppMessageText({
        kind: "cancellation",
        clientName: String(snap.clientName ?? ""),
        startsAt: notificationInstant(appt.starts_at),
        servicesText: await appointmentNotificationServices(admin, appt.services, snap.serviceSubcategory),
        portalUrl,
        apptIdToken: apptId,
      });
      await admin.from("studio_whatsapp_outbox").upsert({
        idempotency_key: `cancellation:${apptId}`,
        appointment_id: apptId,
        kind: "cancellation",
        to_phone: phone,
        template_name: "appointment_confirmation_v1",
        body_text: text,
        scheduled_at: new Date().toISOString(),
        status: "scheduled",
      }, { onConflict: "idempotency_key", ignoreDuplicates: true });
    }
  }
};

interface SchedulingContext {
  apptId: string;
  startsAt: string;
  clientName: string;
  clientEmail: string | null;
  servicesText: string;
  professional?: string | null;
  confirmed: boolean;
  isUpdate?: boolean;
}

// Schedule or update every email that depends on the current state of an
// appointment. Idempotent: unique idempotency keys prevent duplicates when an
// operation is retried.
const scheduleAppointmentEmails = async (admin: ReturnType<typeof createClient>, ctx: SchedulingContext) => {
  ctx = { ...ctx, startsAt: notificationInstant(ctx.startsAt) };
  const { data: cfg } = await admin.from("studio_email_config").select("portal_url").eq("id", true).maybeSingle();
  const portalUrl = ((cfg as { portal_url?: string | null } | null)?.portal_url || DEFAULT_PORTAL_URL).replace(/\/+$/, "");
  const now = Date.now();
  const startMs = new Date(ctx.startsAt).getTime();

  const upsert = async (kind: string, idempotencyKey: string, subject: string, bodyHtml: string, scheduledAt: string, to: string) => {
    if (!validEmail(to)) return;
    await admin.from("studio_email_outbox").upsert({
      idempotency_key: idempotencyKey,
      appointment_id: ctx.apptId,
      kind,
      to_email: to,
      subject,
      body_html: bodyHtml,
      scheduled_at: scheduledAt,
      status: "scheduled",
    }, { onConflict: "idempotency_key", ignoreDuplicates: true });
  };

  // Every booking notice also lands in the Studio inbox as a copy. Both
  // recipients get their own idempotency key, so a retry never duplicates.
  const deliver = (kind: string, keyPrefix: string, subject: string, bodyHtml: string, scheduledAt: string) =>
    Promise.all([
      upsert(kind, `${keyPrefix}:client:${ctx.apptId}${keySuffix}`, subject, bodyHtml, scheduledAt, ctx.clientEmail ?? ""),
      upsert(kind, `${keyPrefix}:studio:${ctx.apptId}${keySuffix}`, `[Studio] ${subject}`, bodyHtml, scheduledAt, STUDIO_NOTIFY_EMAIL),
    ]);

  // Keys include the start time: a rescheduled appointment gets fresh messages
  // instead of colliding with the superseded ones.
  const keySuffix = `:${ctx.startsAt}`;

  if (!ctx.confirmed) {
    await deliver("request_received", "req", "Hemos recibido tu solicitud en L'Studio Ana",
      emailLayout("Solicitud recibida",
        `<p style="margin:0 0 12px;color:#FFF8EE;">Hola <strong>${escHtml(ctx.clientName)}</strong>,</p>
         <p style="margin:0 0 12px;color:#FFF8EE;">Tu solicitud está en revisión. Te enviaremos la confirmación definitiva cuando se completen los pasos pendientes (aprobación de Ana o el anticipo de la reserva).</p>
         ${detailsTable(ctx.startsAt, ctx.servicesText, ctx.professional)}
         ${viewButton(portalUrl, ctx.apptId)}`),
      new Date().toISOString());
    return;
  }

  const confirmationKind = ctx.isUpdate ? "update" : "confirmation";
  const confirmationTitle = ctx.isUpdate ? "Tu cita ha sido modificada" : "Tu cita está confirmada";
  const confirmationSubject = ctx.isUpdate
    ? "Tu cita en L'Studio Ana ha sido modificada"
    : "Tu cita en L'Studio Ana está confirmada";
  await deliver(confirmationKind, confirmationKind, confirmationSubject,
    emailLayout(confirmationTitle,
      `<p style="margin:0 0 12px;color:#FFF8EE;">Hola <strong>${escHtml(ctx.clientName)}</strong>,</p>
       ${detailsTable(ctx.startsAt, ctx.servicesText, ctx.professional)}
       ${viewButton(portalUrl, ctx.apptId)}`),
    new Date().toISOString());

  for (const [kind, hours, subject] of [
    ["reminder_48h", 48, "Tu cita en L'Studio Ana es dentro de 48 horas"],
    ["reminder_24h", 24, "Mañana te esperamos en L'Studio Ana"],
  ] as const) {
    const sendAt = startMs - hours * 3600_000;
    if (sendAt <= now) continue;
    await deliver(kind, kind, subject,
      emailLayout(hours === 48 ? "Tu cita es dentro de 48 horas" : "Mañana te esperamos",
        `<p style="margin:0 0 12px;color:#FFF8EE;">Hola <strong>${escHtml(ctx.clientName)}</strong>,</p>
         ${detailsTable(ctx.startsAt, ctx.servicesText, ctx.professional)}
         <p style="margin:12px 0 0;color:#D6CBB8;">Puedes consultar, modificar o cancelar tu cita desde el portal, según las condiciones de reserva.</p>
         ${viewButton(portalUrl, ctx.apptId)}`),
      new Date(sendAt).toISOString());
  }
};

const cancelAppointmentEmails = async (admin: ReturnType<typeof createClient>, apptId: string, opts: { cancelled?: boolean } = {}) => {
  await admin.from("studio_email_outbox")
    .update({ status: "skipped", last_error: "Cita cancelada o modificada" })
    .eq("appointment_id", apptId)
    .in("status", ["scheduled", "failed"]);
  if (opts.cancelled) {
    const { data: appt } = await admin.from("studio_appointments")
      .select("id, starts_at, services, client_snapshot")
      .eq("id", apptId).maybeSingle();
    const snap = ((appt?.client_snapshot || {}) as Record<string, unknown>);
    const email = validEmail(snap.email);
    if (appt && email) {
      await admin.from("studio_email_outbox").upsert({
        idempotency_key: `cancellation:${apptId}`,
        appointment_id: apptId,
        kind: "cancellation",
        to_email: email,
        subject: "Tu cita en L'Studio Ana ha sido cancelada",
        body_html: emailLayout("Tu cita ha sido cancelada",
          `<p style="margin:0 0 12px;color:#FFF8EE;">Hola <strong>${escHtml(String(snap.clientName ?? ""))}</strong>,</p>
           <p style="margin:0 0 12px;color:#FFF8EE;">Tu cita ha quedado cancelada y el hueco liberado en la agenda del Studio. Los recordatorios pendientes han sido anulados.</p>
           ${detailsTable(notificationInstant(appt.starts_at), await appointmentNotificationServices(admin, appt.services, snap.serviceSubcategory))}
           <p style="margin:12px 0 0;color:#D6CBB8;">Si quieres reservar otro día, puedes hacerlo desde el portal.</p>`),
        scheduled_at: new Date().toISOString(),
        status: "scheduled",
      }, { onConflict: "idempotency_key", ignoreDuplicates: true });
    }
  }
};

const sendViaWhatsAppCloud = async (accessToken: string, phoneNumberId: string, to: string, templateName: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/^\+/, ""), type: "template", template: { name: templateName, language: { code: "es" } } }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: (payload as { error?: { message?: string } }).error?.message || `Error ${response.status}` };
    return { ok: true, id: (payload as { messages?: { id?: string }[] }).messages?.[0]?.id || "" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error de red" };
  }
};

// ---------- Web Push (RFC 8291 / RFC 8292) ----------

const b64uToBytes = (value: string): Uint8Array => {
  const padding = 4 - (value.length % 4 || 4);
  const base64 = (value + "=".repeat(padding % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
};

const bytesToB64u = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const concatBytes = (...parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
};

const hkdfBits = async (salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, lengthBytes: number): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey("raw", ikm as unknown as ArrayBuffer, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: salt as unknown as ArrayBuffer, info: info as unknown as ArrayBuffer }, key, lengthBytes * 8);
  return new Uint8Array(bits);
};

// aes128gcm content encoding (RFC 8188) with ECDH P-256 key agreement (RFC 8291).
const encryptAes128Gcm = async (p256dh: string, auth: string, plaintext: Uint8Array): Promise<Uint8Array> => {
  const clientPubRaw = b64uToBytes(p256dh);
  const authSecret = b64uToBytes(auth);
  const serverKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const clientPubKey = await crypto.subtle.importKey("raw", clientPubRaw as unknown as ArrayBuffer, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedBits = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientPubKey }, serverKeys.privateKey, 256));
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));

  const ikm = await hkdfBits(
    authSecret,
    sharedBits,
    concatBytes(new TextEncoder().encode("WebPush: info\x00"), clientPubRaw, serverPubRaw),
    32,
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdfBits(salt, ikm, new TextEncoder().encode("Content-Encoding: aes128gcm\x00"), 16);
  const nonce = await hkdfBits(salt, ikm, new TextEncoder().encode("Content-Encoding: nonce\x00"), 12);

  const recordPlaintext = concatBytes(plaintext, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", cek as unknown as ArrayBuffer, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({
    name: "AES-GCM", iv: nonce as unknown as ArrayBuffer, additionalData: new Uint8Array(0), tagLength: 128,
  }, aesKey, recordPlaintext as unknown as ArrayBuffer));

  const header = concatBytes(
    salt,
    new Uint8Array([0x00, 0x00, 0x10, 0x00]),
    new Uint8Array([serverPubRaw.length]),
    serverPubRaw,
  );
  return concatBytes(header, ciphertext);
};

// Signs the VAPID JWT (ES256) and posts the encrypted message to the push service.
const sendWebPush = async (admin: ReturnType<typeof createClient>, endpoint: string, p256dh: string, auth: string, payload: Record<string, unknown>): Promise<{ ok: true; messageId: string | null } | { ok: false; error: string; expired: boolean }> => {
  try {
    const { data: cfg } = await admin.from("studio_push_config").select("public_key, private_key, subject").eq("id", true).maybeSingle();
    const row = (cfg ?? {}) as Record<string, unknown>;
    if (!row.private_key || !row.public_key || !row.subject) return { ok: false, error: "Configuración push del servidor incompleta (claves VAPID)", expired: false };

    const audience = new URL(endpoint).origin;
    const header = bytesToB64u(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
    const claims = bytesToB64u(new TextEncoder().encode(JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 3600,
      sub: String(row.subject),
    })));
    const privRaw = b64uToBytes(String(row.private_key));
    let vapidKey: CryptoKey;
    if (privRaw.length === 32) {
      vapidKey = await crypto.subtle.importKey("jwk", {
        kty: "EC", crv: "P-256",
        x: bytesToB64u(b64uToBytes(String(row.public_key)).slice(1, 33)), y: bytesToB64u(b64uToBytes(String(row.public_key)).slice(33, 65)), d: bytesToB64u(privRaw),
      } as JsonWebKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    } else {
      vapidKey = await crypto.subtle.importKey("pkcs8", privRaw as unknown as ArrayBuffer, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    }
    const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, vapidKey, new TextEncoder().encode(`${header}.${claims}`));
    const vapidToken = `${header}.${claims}.${bytesToB64u(new Uint8Array(signature))}`;

    const encrypted = await encryptAes128Gcm(p256dh, auth, new TextEncoder().encode(JSON.stringify(payload)));

    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(12000),
      method: "POST",
      headers: {
        Authorization: `vapid t=${vapidToken}, k=${String(row.public_key)}`,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: String(Math.min(86400, Math.max(1, Number(payload.ttlSeconds) || 86400))),
        Urgency: "high",
      },
      body: encrypted as unknown as ArrayBuffer,
    });

    if (response.status === 404 || response.status === 410) {
      return { ok: false, error: `Suscripción caducada (${response.status})`, expired: true };
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, error: `Error ${response.status} del servicio push: ${text.slice(0, 200)}`, expired: false };
    }
    return { ok: true, messageId: response.headers.get("location") || null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error de red", expired: false };
  }
};

// Sends a push to every device of a clienta and records each attempt in the
// outbox. Idempotent per appointment+kind, cleans up expired subscriptions.
const sendAppointmentPush = async (admin: ReturnType<typeof createClient>, ctx: { apptId: string; clientId: string | null; clientName: string; startsAt: string; servicesText: string; confirmed: boolean; isUpdate?: boolean }) => {
  if (ctx.confirmed && ctx.clientId) await enqueueReminderJobs(admin,ctx,'push');
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("STUDIO_BACKEND_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const action = url.pathname.replace(/\/+$/, "").split("/").pop() || "";
    const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));

    // ---------- health ----------
    if (action === "health") return json({ ok: true, version: "studio-api-promotions-20261026", promotionDiscount: true });

    // ---------- auth ----------
    if (action === "auth") {
      const pin = String(body.pin ?? "").trim();
      if (!/^\d{4}$/.test(pin)) return json({ error: "PIN no válido" }, 400);

      // Limita los intentos por origen para que nadie pueda probar los 10.000 PIN.
      const callerIp = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconocido";
      const ipDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`auth:${callerIp}`));
      const bucket = Array.from(new Uint8Array(ipDigest)).map((b) => b.toString(16).padStart(2, "0")).join("");
      const { data: allowed, error: limitError } = await admin.rpc("studio_auth_take_attempt" as never, {
        p_bucket: bucket,
        p_limit: 10,
        p_window_seconds: 900,
      } as never);
      if (!limitError && allowed === false) {
        return json({ error: "Demasiados intentos. Inténtalo de nuevo en unos minutos." }, 429);
      }

      const { data: config } = await admin.from("studio_settings").select("configuration").eq("id", true).maybeSingle();
      const masterPin = String((config?.configuration as any)?.masterPin ?? "0000");

      if (pin === masterPin) {
        const { data, error } = await admin.from("api_tokens").insert({ role: "admin" }).select("token, expires_at").single();
        if (error) return json({ error: "No se pudo iniciar sesión" }, 500);
        return json({ role: "admin", token: data.token, expiresAt: data.expires_at });
      }

      const { data: client } = await admin.from("studio_clients").select("id, whatsapp_consent").eq("legacy_id", Number(pin)).maybeSingle();
      if (client) {
        const { data, error } = await admin.from("api_tokens").insert({ role: "client", client_id: client.id }).select("token, expires_at").single();
        if (error) return json({ error: "No se pudo iniciar sesión" }, 500);
        return json({ role: "client", token: data.token, clientId: client.id, expiresAt: data.expires_at, whatsappConsent: Boolean((client as { whatsapp_consent?: boolean }).whatsapp_consent) });
      }
      return json({ error: "PIN incorrecto" }, 401);
    }

    // ---------- public catalog (read-only, sin datos de clientas ni citas) ----------
    if (action === "public-catalog") {
      const { data: catalog, error } = await admin.from("studio_catalog").select("id, category").order("sort_order");
      if (error) return json(failed(error), 500);
      const { data: settings } = await admin.from("studio_settings").select("configuration").eq("id", true).maybeSingle();
      const employees = ((settings?.configuration as Record<string, unknown> | null)?.employees ?? []) as { id?: string; name?: string; role?: string; photo?: string; status?: string }[];
      const activeEmployees = employees.filter((e) => e.status === "active" && e.name?.trim())
        .map((e) => ({ id: e.id || "", name: e.name || "", role: e.role || "", photo: e.photo || "", status: "active" }));
      return json({ catalog: catalog ?? [], employees: activeEmployees });
    }

    // ---------- token check ----------
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Falta autenticación" }, 401);

    const { data: tokenRow } = await admin.from("api_tokens").select("token, role, client_id, expires_at").eq("token", token).maybeSingle();
    if (!tokenRow || new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return json({ error: "Sesión caducada" }, 401);
    }
    const isAdmin = tokenRow.role === "admin";

    // ---------- sync (read everything for this space) ----------
    if (action === "sync") {
      const { data: catalog } = await admin.from("studio_catalog").select("id, category").order("sort_order");
      const { data: settings } = await admin.from("studio_settings").select("configuration").eq("id", true).maybeSingle();
      const { data: closures } = await admin.from("studio_closures").select("id, start_date, end_date, type, reason");
      const { data: blocks } = await admin.from("studio_time_blocks").select("id, starts_at, ends_at, reason");
      const { data: clients } = await admin.from("studio_clients").select("id, legacy_id, registration_id, first_name, last_name, email, phone, birth_date, created_at");
      const { data: passports } = await admin.from("studio_passports").select("client_id, hair_diagnosis, home_care, last_visit_text, next_visit_text");
      const { data: visits } = await admin.from("studio_visits").select("id, client_id, visit_date, service, stylist, shared_notes");
      const { data: appts } = await admin.from("studio_appointments").select("*").order("starts_at");
      const { data: feedback } = await admin.from("studio_feedback").select("id, rating, comment, resolved_at, created_at, client_id");

      if (isAdmin) {
        return json({
          role: "admin",
          catalog: catalog ?? [],
          settings: settings?.configuration ?? null,
          closures: closures ?? [],
          timeBlocks: blocks ?? [],
          clients: (clients ?? []).map((c: any) => ({
            ...c,
            passport: passports?.find(p => p.client_id === c.id) ?? null,
            visits: (visits ?? []).filter(v => v.client_id === c.id),
            notes: null,
          })),
          appointments: appts ?? [],
          feedback: feedback ?? [],
        });
      }

      const my = (appts ?? []).filter((a: any) => a.client_id === tokenRow.client_id);
      const me = (clients ?? []).find((c: any) => c.id === tokenRow.client_id);
      const myPassport = passports?.find(p => p.client_id === tokenRow.client_id) ?? null;
      const myVisits = (visits ?? []).filter(v => v.client_id === tokenRow.client_id);
      return json({
        role: "client",
        clientId: tokenRow.client_id,
        catalog: catalog ?? [],
        settings: settingsForClient(settings?.configuration ?? null),
        closures: closures ?? [],
        timeBlocks: blocks ?? [],
        me: me ?? null,
        passport: myPassport,
        visits: myVisits,
        appointments: my,
      });
    }

    // ---------- admin-only mutations ----------
    if (action === "email-status") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const appointmentId = String(body.appointmentId ?? "");
      if (!appointmentId) return json({ error: "Falta la cita" }, 400);
      const { data: cfg, error: cfgErr } = await admin.from("studio_email_config").select("worker_secret").eq("id", true).maybeSingle();
      if (cfgErr) return json(failed(cfgErr), 500);
      const { data: emails, error } = await admin
        .from("studio_email_outbox")
        .select("id, kind, to_email, subject, status, scheduled_at, sent_at, provider, provider_message_id, last_error, attempts, created_at")
        .eq("appointment_id", appointmentId)
        .order("created_at");
      if (error) return json(failed(error), 500);
      return json({ emails: emails ?? [] });
    }

    if (action === "email-config") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const { data: cfg, error } = await admin.from("studio_email_config").select("provider, from_email, portal_url, service_key").eq("id", true).maybeSingle();
      if (error) return json(failed(error), 500);
      const row = (cfg ?? {}) as Record<string, unknown>;
      return json({
        providerConfigured: Boolean(row.service_key && row.from_email),
        provider: (row.provider as string) ?? null,
        fromEmail: (row.from_email as string) ?? null,
        portalUrl: (row.portal_url as string) ?? null,
      });
    }

    if (action === "whatsapp-consent" && req.method === "PUT") {
      // Client scope: a clienta saves her own consent. Admin can set it for any client.
      const consent = Boolean(body.consent);
      let targetClientId = tokenRow.client_id as string | null;
      if (isAdmin && body.clientId) targetClientId = String(body.clientId);
      if (!targetClientId) return json({ error: "Falta la clienta" }, 400);
      const { error } = await admin.from("studio_clients").update({ whatsapp_consent: consent }).eq("id", targetClientId);
      if (error) return json(failed(error), 500);
      return json({ ok: true, whatsappConsent: consent });
    }

    if (action === "whatsapp-retry" && req.method === "POST") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const appointmentId = String(body.appointmentId ?? "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appointmentId)) {
        return json({ error: "Cita no válida" }, 400);
      }
      const { data: retried, error } = await admin.rpc("studio_reenqueue_whatsapp_confirmation" as never, { p_appointment_id: appointmentId } as never);
      if (error) return json(failed(error), 500);
      await kickDispatcher(admin);
      return json({ ok: true, retried: Number(retried) || 0 });
    }

    if (action === "whatsapp-status") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const appointmentId = String(body.appointmentId ?? "");
      if (!appointmentId) return json({ error: "Falta la cita" }, 400);
      const { data: messages, error } = await admin
        .from("studio_whatsapp_outbox")
        .select("id, kind, to_phone, status, scheduled_at, sent_at, delivered_at, read_at, provider, provider_message_id, body_text, last_error, attempts, created_at")
        .eq("appointment_id", appointmentId)
        .order("created_at");
      if (error) return json(failed(error), 500);
      const {data:jobs,error:jobError}=await admin.from('studio_notification_jobs').select('*').eq('appointment_id',appointmentId).eq('channel','whatsapp').order('scheduled_at');
      if(jobError)return json(failed(jobError), 500);
      return json({messages:[...(messages||[]),...(jobs||[]).map((j:any)=>({...j,status:['delivered','read'].includes(j.provider_delivery_status) ? j.provider_delivery_status:j.status,body_text:`Recordatorio de cita ${j.kind === 'reminder_24h' ? '24 horas' : j.kind === 'reminder_1h' ? '1 hora' : '2 horas'} antes`,sent_at:j.sent_at,provider:j.provider,provider_message_id:j.provider_message_id,delivered_at:null,read_at:null}))]});
    }

    if (action === "whatsapp-config") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const { data: cfg, error } = await admin.from("studio_whatsapp_config").select("provider, access_token, phone_number_id, template_name, studio_phone, portal_url, notification_templates").eq("id", true).maybeSingle();
      if (error) return json(failed(error), 500);
      const row = (cfg ?? {}) as Record<string, unknown>;
      const missing: string[] = [];
      if (!row.provider || !row.phone_number_id || !row.access_token) missing.push("Credenciales de WhatsApp Business Platform (proveedor, phone_number_id y token de sistema)");
      if (!row.template_name) missing.push("Plantilla aprobada por Meta para las confirmaciones");
      if (!row.studio_phone) missing.push("Número de WhatsApp del Studio verificado");
      return json({
        providerConfigured: missing.length === 0,
        missing,
        provider: (row.provider as string) ?? null,
        templateName: (row.template_name as string) ?? null,
        studioPhone: (row.studio_phone as string) ?? null,
        portalUrl: (row.portal_url as string) ?? null,
      });
    }

    if (action === "service-image" && req.method === "POST") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const dataUrl = String(body.dataUrl ?? "");
      const match = /^data:(image\/(png|jpeg|webp));base64,(.+)$/.exec(dataUrl);
      if (!match) return json({ error: "Formato de imagen no soportado" }, 400);
      const [, mime, , base64] = match;
      const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
      if (bytes.length > 4 * 1024 * 1024) return json({ error: "La imagen supera 4 MB" }, 400);
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const path = `services/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await admin.storage.from("service-images").upload(path, bytes, {
        contentType: mime, upsert: false,
      });
      if (upErr) return json(failed(upErr), 500);
      const { data: pub } = admin.storage.from("service-images").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (typeof publicUrl !== "string" || !publicUrl.trim()) {
        return json({ error: "La foto se ha subido, pero no se pudo obtener su dirección pública." }, 500);
      }
      return json({ ok: true, url: publicUrl, path });
    }

    if (action === "service-image" && req.method === "DELETE") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const path = String(body.path ?? "");
      if (!/^services\/[a-f0-9-]+\.(png|jpe?g|webp)$/.test(path)) return json({ error: "Ruta no válida" }, 400);
      const { error } = await admin.storage.from("service-images").remove([path]);
      if (error) return json(failed(error), 500);
      return json({ ok: true });
    }

    if (action === "catalog" && req.method === "PUT") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const rows = (body.catalog as any[]).map((category, index) => ({
        id: String(category.id),
        sort_order: index,
        category,
      }));
      const { error } = await admin.from("studio_catalog").upsert(rows, { onConflict: "id" });
      if (error) return json(failed(error), 500);
      const keep = new Set(rows.map(row => row.id));
      const { data: existing } = await admin.from("studio_catalog").select("id");
      const stale = (existing ?? []).filter(row => !keep.has(row.id)).map(row => row.id);
      if (stale.length) await admin.from("studio_catalog").delete().in("id", stale);
      return json({ ok: true });
    }

    if (action === "settings" && req.method === "PUT") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const { error } = await admin.from("studio_settings").upsert({ id: true, configuration: body.settings }, { onConflict: "id" });
      if (error) return json(failed(error), 500);
      // Si se cambió el PIN maestro, invalidar todas las demás sesiones admin.
      const incomingPin = (body.settings as Record<string, unknown>)?.masterPin;
      if (typeof incomingPin === "string" && /^\d{4}$/.test(incomingPin) && incomingPin !== "0000") {
        await admin.from("api_tokens")
          .delete()
          .eq("role", "admin")
          .neq("token", token);
      }
      return json({ ok: true });
    }

    if (action === "client" && req.method === "POST") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const pin = String(body.pin ?? "").trim();
      if (!/^\d{4}$/.test(pin)) return json({ error: "PIN de clienta no válido" }, 400);
      const legacyId = Number(body.idNum) || Math.floor(Math.random() * 8999) + 1000;
      const { data: client, error } = await admin.from("studio_clients").insert({
        legacy_id: legacyId,
        registration_id: body.registroId ?? null,
        email: String(body.email ?? "").toLowerCase().trim() || `clienta${legacyId}@lstudio.local`,
        first_name: body.nombre ?? "",
        last_name: body.apellidos ?? "",
        phone: body.telefono ?? "",
      }).select("id").single();
      if (error) return json(failed(error), 500);
      await admin.from("studio_passports").upsert({
        client_id: client.id,
        hair_diagnosis: body.dniCapilar ?? "",
        home_care: body.prescripcionCasa ?? "",
        last_visit_text: body.ultimaVisita ?? "",
        next_visit_text: body.proximaVisitaSugerida ?? "",
      }, { onConflict: "client_id" });
      return json({ ok: true, id: client.id, legacyId });
    }

    if (action === "passport" && req.method === "PUT") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const { error } = await admin.from("studio_passports").upsert({
        client_id: body.clientId,
        hair_diagnosis: body.dniCapilar ?? "",
        home_care: body.prescripcionCasa ?? "",
        last_visit_text: body.ultimaVisita ?? "",
        next_visit_text: body.proximaVisitaSugerida ?? "",
      }, { onConflict: "client_id" });
      if (error) return json(failed(error), 500);
      if (Array.isArray(body.pastVisits)) {
        await admin.from("studio_visits").delete().eq("client_id", body.clientId);
        if (body.pastVisits.length) {
          await admin.from("studio_visits").insert(body.pastVisits.map((visit: any) => ({
            client_id: body.clientId,
            visit_date: visit.date ?? "",
            service: visit.service ?? "",
            stylist: visit.stylist ?? "",
            shared_notes: visit.notes ?? "",
          })));
        }
      }
      return json({ ok: true });
    }

    if (action === "closure" && req.method === "POST") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const { data, error } = await admin.from("studio_closures").insert({
        start_date: body.startDate, end_date: body.endDate, type: body.type ?? "vacaciones", reason: body.reason ?? "",
      }).select("id").single();
      if (error) return json(failed(error), 500);
      return json({ ok: true, id: data.id });
    }

    if (action === "closure" && req.method === "DELETE") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      await admin.from("studio_closures").delete().eq("id", body.id);
      return json({ ok: true });
    }

    if (action === "timeblock" && req.method === "POST") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const { data, error } = await admin.from("studio_time_blocks").insert({
        starts_at: `${body.dateKey}T${body.time}:00`,
        ends_at: `${body.dateKey}T${body.time}:00`,
        reason: body.reason ?? "",
      }).select("id").single();
      if (error) return json(failed(error), 500);
      return json({ ok: true, id: data.id });
    }

    if (action === "timeblock" && req.method === "DELETE") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      await admin.from("studio_time_blocks").delete().eq("id", body.id);
      return json({ ok: true });
    }

    // ---------- appointments (admin or client) ----------
    if (action === "appointment" && req.method === "POST") {
      const startsAt = `${body.dateKey}T${body.time}:00`;
      const duration = Number(body.durationMinutes) || 45;

      // Aplicar las mismas condiciones editables del catálogo en el servidor.
      if (Array.isArray(body.services) && body.services.length) {
        const {data:rows,error:catalogError}=await admin.from('studio_catalog').select('category');
        if(catalogError)return json(failed(catalogError), 500);
        const catalog=(rows || []).flatMap((r:any)=>r.category?.subservices || []);
        const selected=body.services.map((item:any)=>({sub:catalog.find((sub:any)=>sub.id === item?.sub?.id),variant:item.variant}));
        if(selected.some((item:any)=>!item.sub || item.sub.active === false))return json({error:'Hay servicios no disponibles en la reserva'},422);
        if(selected.some((i:any)=>i.sub.isCutGoService) && selected.some((i:any)=>i.sub.isStylingService && !i.sub.isCutGoService))return json({error:'Elige peinado o Cut & Go, no ambas modalidades'},422);
        for(const kind of ['styling','toner']) {
          const flag=kind === 'styling' ? 'isStylingService':'isTonerService';
          const policy=kind+'Policy'; const ids=kind+'AllowedIds';
          const compatible=(owner:any,candidate:any)=>candidate.id !== owner.id && candidate[flag] && candidate.active !== false && (!candidate.isCutGoService || kind === 'styling' && owner.allowCutGo) && (!Array.isArray(owner[ids]) || owner[ids].includes(candidate.id));
          for(const item of selected) {
            if(!item.sub[flag] && item.sub[policy] === 'required' && !selected.some((i:any)=>compatible(item.sub,i.sub)))return json({error:`Completa ${item.sub.name} con un complemento compatible de ${kind === 'styling' ? 'peinado':'matiz'}`},422);
            if(item.sub[flag] && item.sub.hasVariants && item.sub.variants?.length && !item.sub.variants.some((v:any)=>v.id === item.variant?.id))return json({error:`Selecciona una variante válida de ${item.sub.name}`},422);
          }
        }
        for(const item of selected.filter((i:any)=>i.sub.isCutGoService)) {
          if(!selected.some((i:any)=>!i.sub.isStylingService && i.sub.allowCutGo && (!Array.isArray(i.sub.stylingAllowedIds) || i.sub.stylingAllowedIds.includes(item.sub.id))))return json({error:'Cut & Go no está permitido para estos servicios'},422);
        }
      }

      // Las puertas de aprobación y pago se recalculan en el servidor: una clienta
      // no puede declarar su propia cita como aprobada o pagada.
      let approvalStatus = body.approval?.status ?? "not_required";
      let approvalReason = body.approval?.reason ?? null;
      let depositStatus = body.advancePayment?.status ?? "not_required";
      let depositAmount = body.advancePayment?.amount ?? null;
      let depositReference = body.advancePayment?.reference ?? null;
      if (!isAdmin) {
        const { data: cfgRow } = await admin.from("studio_settings").select("configuration").eq("id", true).maybeSingle();
        const cfg = (cfgRow?.configuration ?? {}) as Record<string, any>;
        const { data: catRows } = await admin.from("studio_catalog").select("category");
        const catalogSubs = (catRows ?? []).flatMap((r: any) => r.category?.subservices ?? []);
        const needsAssessment = Array.isArray(body.services) && body.services.some((item: any) => {
          const sub = catalogSubs.find((s: any) => s.id === item?.sub?.id);
          return !!sub?.requiresAssessment;
        });
        const isSaturday = new Date(`${body.dateKey}T12:00:00`).getDay() === 6;
        const needsApproval = needsAssessment || isSaturday;
        approvalStatus = needsApproval ? "pending" : "not_required";
        approvalReason = needsApproval
          ? (needsAssessment && isSaturday ? "both" : needsAssessment ? "assessment" : "saturday")
          : null;

        const depositEnabled = cfg.advancePaymentEnabled !== false;
        const threshold = Number(cfg.advancePaymentThresholdMinutes);
        const needsDeposit = !needsApproval && depositEnabled
          && Number.isFinite(threshold) && duration > threshold;
        depositStatus = needsDeposit ? "pending" : "not_required";
        depositAmount = needsDeposit ? (cfg.depositAmount ?? null) : null;
        depositReference = needsDeposit && body.advancePayment?.reference
          ? String(body.advancePayment.reference).slice(0, 64)
          : null;
      }
      // Validate professional: if provided, must match an active employee.
      let validatedProfId: string | null = null;
      let validatedProfName: string | null = null;
      if (typeof body.professionalId === 'string' && body.professionalId) {
        const { data: profCfg } = await admin.from('studio_settings').select('configuration').eq('id', true).maybeSingle();
        const employees = ((profCfg?.configuration ?? {}) as Record<string, any>)?.employees as { id: string; name: string; status: string }[] | undefined;
        const match = (employees || []).find((e) => e.id === body.professionalId && e.status === 'active');
        if (!match) return json({ error: 'Profesional no disponible' }, 422);
        validatedProfId = match.id;
        validatedProfName = match.name.trim();
      }

      const lifecycleStatus = isAdmin ? (body.lifecycleStatus ?? "active") : "active";
      const bookingClientId = isAdmin ? (body.clientId ?? null) : (tokenRow.client_id ?? null);

      // Server-side conflict validation (source of truth)
      const rpc = admin.rpc("studio_appointment_conflict" as never, {} as never);
      const conflicts = typeof rpc?.catch === "function" ? await rpc.catch(() => ({ data: null })) : { data: null };
      void conflicts;

      const check = await admin
        .from("studio_appointments")
        .select("id, starts_at, duration_minutes, lifecycle_status, booking_channel")
        .gte("starts_at", new Date(new Date(startsAt).getTime() - 14 * 3600_000).toISOString())
        .lte("starts_at", new Date(new Date(startsAt).getTime() + 14 * 3600_000).toISOString());
      if (check.error) return json(failed(check.error), 500);

      const toMin = (iso: string) => {
        const d = new Date(iso);
        return d.getHours() * 60 + d.getMinutes();
      };
      const startMin = toMin(startsAt + "Z");
      const overlap = (check.data ?? []).some((a: any) => {
        if (a.lifecycle_status === "cancelled" || a.lifecycle_status === "no_show") return false;
        const aStart = toMin(a.starts_at);
        const aEnd = aStart + (a.duration_minutes ?? 45);
        return startMin < aEnd && startMin + duration > aStart;
      });
      if (overlap && !isAdmin) {
        return json({ error: "Ese hueco acaba de ocuparse. Elige otra hora." }, 409);
      }

      let promotionOrigin: { id: string; title: string } | null = null;
      if (body.promotionOriginId || body.promotionId) {
        const requestedId = body.promotionOriginId || body.promotionId;
        if (body.promotionId && body.promotionOriginId && body.promotionId !== body.promotionOriginId) return json({ error: 'Las referencias de promoción no coinciden.' }, 422);
        const { data: cfg, error: cfgError } = await admin.from('studio_settings').select('configuration').eq('id', true).maybeSingle();
        if (cfgError) return json({ error: 'No se pudo comprobar la promoción.' }, 503);
        const promos = (cfg?.configuration as any)?.promotions;
        const promo = Array.isArray(promos) ? promos.find((item: any) => item.id === requestedId) : null;
        const today = new Intl.DateTimeFormat('sv-SE', { timeZone: MADRID_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        if (!promo || !promo.active || (promo.startDate && today < promo.startDate) || (promo.endDate && today > promo.endDate)) return json({ error: 'La promoción ya no está vigente.' }, 422);
        const requiredIds = Array.isArray(promo.bookingServiceIds) ? promo.bookingServiceIds : promo.bookingServiceId ? [promo.bookingServiceId] : [];
        if (!requiredIds.length || !requiredIds.every((id: string) => Array.isArray(body.services) && body.services.some((item: any) => item?.sub?.id === id))) return json({ error: 'Completa los servicios incluidos en la promoción.' }, 422);
        promotionOrigin = { id: promo.id, title: promo.title };
      }
      let promotionDiscount: ReturnType<typeof calculatePromotionDiscount> | null = null;
      if (body.promotionId) {
        const [{ data: settingsRow, error: settingsError }, { data: catalogRows, error: catalogError }] = await Promise.all([
          admin.from('studio_settings').select('configuration').eq('id', true).maybeSingle(),
          admin.from('studio_catalog').select('category')
        ]);
        if (settingsError || catalogError) return json({ error: 'No se pudo comprobar la promoción. Reintenta.' }, 503);
        const promos = (settingsRow?.configuration as any)?.promotions;
        const promo = Array.isArray(promos) ? promos.find((item: any) => item.id === body.promotionId) : null;
        const currentCatalog = (catalogRows || []).flatMap((row: any) => row.category?.subservices || []);
        const today = new Intl.DateTimeFormat('sv-SE', { timeZone: MADRID_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        try { promotionDiscount = calculatePromotionDiscount(promo, Array.isArray(body.services) ? body.services : [], currentCatalog, String(body.dateKey || ''), today); }
        catch (error) { return json({ error: error instanceof Error ? error.message : 'Promoción no válida.' }, 422); }
      }
      const { data: created, error } = await admin.from("studio_appointments").insert({
        source_legacy_id: body.id ? String(body.id) : null,
        client_id: bookingClientId,
        starts_at: startsAt,
        duration_minutes: duration,
        booking_channel: isAdmin && body.bookingChannel === "admin" ? "admin" : "portal",
        lifecycle_status: lifecycleStatus,
        approval_status: approvalStatus,
        approval_reason: approvalReason,
        approval_reference: isAdmin ? (body.approval?.reference ?? null) : null,
        deposit_status: depositStatus,
        deposit_amount: depositAmount,
        deposit_reference: depositReference,
        services: body.services ?? [],
        client_snapshot: { ...(body.clientSnapshot ?? {
          clientName: body.clientName ?? "",
          phone: body.phone ?? "",
          email: body.email ?? "",
          serviceCategory: body.serviceCategory ?? "",
          serviceSubcategory: body.serviceSubcategory ?? "",
          dayName: body.dayName ?? "",
          remindersStatus: body.remindersStatus ?? null,
          selectedVariant: body.selectedVariant ?? null,
        }), promotion: promotionDiscount, promotionOrigin },
        legacy_service_text: body.serviceSubcategory ?? "",
        professional_id: validatedProfId,
        professional_name: validatedProfName,
      }).select("id").single();
      if (error) {
        if ((error as any).code === "23505") return json({ error: "Reserva duplicada" }, 409);
        return json(failed(error), 500);
      }
      const servicesText = (await appointmentNotificationServices(admin, body.services, body.serviceSubcategory)) + promotionNotificationSuffix(promotionDiscount);
      const approvalPending = approvalStatus === "pending";
      const depositPending = depositStatus === "pending";
      await scheduleAppointmentEmails(admin, {
        apptId: created.id,
        startsAt: new Date(`${body.dateKey}T${body.time}:00Z`).toISOString(),
        clientName: String(body.clientName ?? ""),
        clientEmail: validEmail(body.email),
        servicesText,
        professional: validatedProfName,
        confirmed: notificationConfirmed({lifecycle_status:lifecycleStatus || 'active',approval_status:approvalStatus,deposit_status:depositStatus}),
      }).catch(error => console.error("Notificaciones:",error));
      await scheduleAppointmentWhatsApp(admin, {
        apptId: created.id,
        startsAt: new Date(`${body.dateKey}T${body.time}:00Z`).toISOString(),
        clientName: String(body.clientName ?? ""),
        clientPhone: validPhoneE164(body.phone),
        servicesText,
        confirmed: notificationConfirmed({lifecycle_status:lifecycleStatus || 'active',approval_status:approvalStatus,deposit_status:depositStatus}),
      }).catch(error => console.error("Notificaciones:",error));
      await sendAppointmentPush(admin, {
        apptId: created.id,
        clientId: body.clientId ?? null,
        clientName: String(body.clientName ?? ""),
        startsAt: new Date(`${body.dateKey}T${body.time}:00Z`).toISOString(),
        servicesText,
        confirmed: notificationConfirmed({lifecycle_status:lifecycleStatus || 'active',approval_status:approvalStatus,deposit_status:depositStatus}),
      }).catch(error => console.error("Notificaciones:",error));
      await kickDispatcher(admin);
      return json({ ok: true, id: created.id });
    }

    if (action === "appointment" && req.method === "PUT") {
      const patch: Record<string, unknown> = {};
      if (!isAdmin) {
        // client scope: cancellation only
        if (body.lifecycleStatus !== 'cancelled') return json({ error: "Solo puedes cancelar la cita" }, 403);
        patch.lifecycle_status = 'cancelled';
        if (body.clientSnapshot !== undefined) patch.client_snapshot = body.clientSnapshot;
      } else {
      if (body.dateKey && body.time) patch.starts_at = `${body.dateKey}T${body.time}:00`;
      if (body.dayName !== undefined) patch.dayName = body.dayName;
      if (body.durationMinutes) patch.duration_minutes = Number(body.durationMinutes);
      if (body.lifecycleStatus !== undefined) patch.lifecycle_status = body.lifecycleStatus;
      if (body.approval !== undefined) {
        patch.approval_status = body.approval.status;
        patch.approval_reason = body.approval.reason ?? null;
        patch.approval_reference = body.approval.reference ?? null;
      }
      if (body.advancePayment !== undefined) {
        patch.deposit_status = body.advancePayment.status;
        patch.deposit_amount = body.advancePayment.amount ?? null;
        patch.deposit_reference = body.advancePayment.reference ?? null;
      }
      // A note must never clear or replace the selected services.
      if (body.services !== undefined) {
        if (!Array.isArray(body.services)) return json({ error: 'Los servicios deben ser una lista' }, 422);
        patch.services = body.services;
      }
      if (body.clientSnapshot !== undefined) patch.client_snapshot = body.clientSnapshot;
      if (body.internalNotes !== undefined) {
        if (typeof body.internalNotes !== 'string') return json({ error: 'La nota debe ser texto' }, 422);
        const reference = String(body.id ?? '');
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(reference)) return json({ error: 'Cita no válida' }, 400);
        const { data: existing, error: readError } = await admin.from('studio_appointments')
          .select('id, client_snapshot').or(`source_legacy_id.eq.${reference},id.eq.${reference}`).maybeSingle();
        if (readError) return json(failed(readError), 500);
        if (!existing) return json({ error: 'Cita no encontrada' }, 404);
        patch.client_snapshot = {
          ...((existing.client_snapshot || {}) as Record<string, unknown>),
          ...((patch.client_snapshot || {}) as Record<string, unknown>),
          internalNotes: body.internalNotes
        };
      }
      if (body.completedAt !== undefined) patch.completed_at = body.completedAt;
      }

      if (isAdmin && (body.services !== undefined || (body.dateKey && body.time))) {
        const reference = String(body.id ?? '');
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(reference)) return json({ error: 'Cita no válida' }, 400);
        const { data: original, error: originalError } = await admin.from('studio_appointments').select('services, client_snapshot')
          .or(`source_legacy_id.eq.${reference},id.eq.${reference}`).maybeSingle();
        if (originalError) return json(failed(originalError), 500);
        const offer = original?.client_snapshot?.promotion;
        if (offer) {
          if (body.services !== undefined) {
            const signature = (items: any[]) => JSON.stringify((items || []).map((item: any) => [item?.sub?.id, item?.variant?.id || null]).sort((a,b) => String(a[0]).localeCompare(String(b[0]))));
            if (signature(body.services) !== signature(original.services)) return json({ error: 'Esta cita tiene un precio promocional guardado. Para cambiar sus servicios o variantes, cancela y crea una nueva reserva.' }, 422);
          }
          if (body.dateKey && ((offer.startDate && body.dateKey < offer.startDate) || (offer.endDate && body.dateKey > offer.endDate))) return json({ error: 'La nueva fecha queda fuera de la vigencia de la promoción.' }, 422);
        }
      }
      let query = admin.from("studio_appointments").update(patch);
      const apptRef = String(body.id ?? "");
      // Solo referencias con la forma esperada llegan a un filtro: nada de comas,
      // paréntesis ni operadores inyectados en la consulta.
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(apptRef)) return json({ error: "Cita no válida" }, 400);
      if (isAdmin) query = query.or(`source_legacy_id.eq.${apptRef},id.eq.${apptRef}`);
      else {
        // client scope: only own appointments, matched by server id or portal legacy id
        const { data: own } = await admin.from("studio_appointments").select("id")
          .or(`id.eq.${apptRef},source_legacy_id.eq.${apptRef}`)
          .eq("client_id", tokenRow.client_id).maybeSingle();
        if (!own) return json({ error: "Cita no encontrada" }, 404);
        query = query.or(`id.eq.${apptRef},source_legacy_id.eq.${apptRef}`).eq("client_id", tokenRow.client_id);
      }
      const { error } = await query;
      if (error) return json(failed(error), 500);
      const onlyInternalNotes = isAdmin && body.internalNotes !== undefined
        && Object.keys(body).every(key => key === 'id' || key === 'internalNotes');
      if (onlyInternalNotes) return json({ ok: true });
      const scheduleKey = crypto.randomUUID();
      void scheduleKey;
      let reread = admin.from("studio_appointments")
        .select("id, starts_at, lifecycle_status, approval_status, deposit_status, services, client_snapshot, client_id, professional_id, professional_name")
        .or(`id.eq.${apptRef},source_legacy_id.eq.${apptRef}`);
      if (!isAdmin) reread = reread.eq("client_id", tokenRow.client_id);
      const { data: updatedAppt } = await reread.maybeSingle();
      if (updatedAppt) {
        if (updatedAppt.lifecycle_status === "cancelled" || updatedAppt.lifecycle_status === "no_show" || updatedAppt.approval_status === "rejected") {
          await cancelNotificationJobs(admin,updatedAppt.id);
          await cancelAppointmentEmails(admin, updatedAppt.id, { cancelled: updatedAppt.lifecycle_status === "cancelled" }).catch(error => console.error("Notificaciones:",error));
          await cancelAppointmentWhatsApp(admin, updatedAppt.id, { cancelled: updatedAppt.lifecycle_status === "cancelled" }).catch(error => console.error("Notificaciones:",error));
        } else {
          const snap = (updatedAppt.client_snapshot || {}) as Record<string, unknown>;
          const approvalPending = updatedAppt.approval_status === "pending";
          const depositPending = updatedAppt.deposit_status === "pending";
          const confirmed = notificationConfirmed(updatedAppt);
          const servicesText = (await appointmentNotificationServices(admin, updatedAppt.services, snap.serviceSubcategory)) + promotionNotificationSuffix(snap.promotion);
          const waCtx = {
            apptId: updatedAppt.id,
            startsAt: updatedAppt.starts_at,
            clientName: String(snap.clientName ?? ""),
            clientPhone: validPhoneE164(snap.phone),
            servicesText,
            confirmed,
          };
          if (!confirmed || patch.starts_at) await cancelNotificationJobs(admin,updatedAppt.id);
          if (patch.starts_at) {
            // Rescheduled: annul the previous reminders, send the update and
            // schedule the new ones.
            await cancelAppointmentEmails(admin, updatedAppt.id).catch(error => console.error("Notificaciones:",error));
            await cancelAppointmentWhatsApp(admin, updatedAppt.id).catch(error => console.error("Notificaciones:",error));
            await scheduleAppointmentEmails(admin, {
              apptId: updatedAppt.id,
              startsAt: updatedAppt.starts_at,
              clientName: String(snap.clientName ?? ""),
              clientEmail: validEmail(snap.email),
              servicesText,
              professional: (updatedAppt as any).professional_name ?? null,
              confirmed,
              isUpdate: true,
            }).catch(error => console.error("Notificaciones:",error));
            await scheduleAppointmentWhatsApp(admin, { ...waCtx, isUpdate: true }).catch(e => console.error(e));
            await sendAppointmentPush(admin,{...waCtx,clientId:updatedAppt.client_id || null,isUpdate:true}).catch(e=>console.error(e));
          } else {
            await scheduleAppointmentEmails(admin, {
              apptId: updatedAppt.id,
              startsAt: updatedAppt.starts_at,
              clientName: String(snap.clientName ?? ""),
              clientEmail: validEmail(snap.email),
              servicesText,
              professional: (updatedAppt as any).professional_name ?? null,
              confirmed,
            }).catch(error => console.error("Notificaciones:",error));
            await scheduleAppointmentWhatsApp(admin, waCtx).catch(error => console.error("Notificaciones:",error));
            // Confirmation after approval accepted or deposit received.
            if (confirmed) {
              await sendAppointmentPush(admin, {
                apptId: updatedAppt.id,
                clientId: updatedAppt.client_id ?? null,
                clientName: String(snap.clientName ?? ""),
                startsAt: updatedAppt.starts_at,
                servicesText,
                confirmed: true,
              }).catch(error => console.error("Notificaciones:",error));
            }
          }
        }
      }
      await kickDispatcher(admin);
      return json({ ok: true });
    }

    if (action === "appointment" && req.method === "DELETE") {
      let query = admin.from("studio_appointments").delete();
      const apptRef = String(body.id ?? "");
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(apptRef)) return json({ error: "Cita no válida" }, 400);
      if (isAdmin) query = query.or(`source_legacy_id.eq.${apptRef},id.eq.${apptRef}`);
      else {
        const { data: own } = await admin.from("studio_appointments").select("id").eq("source_legacy_id", apptRef).eq("client_id", tokenRow.client_id).maybeSingle();
        if (!own) return json({ error: "Cita no encontrada" }, 404);
        query = query.eq("source_legacy_id", apptRef).eq("client_id", tokenRow.client_id);
      }
      const { error } = await query;
      if (error) return json(failed(error), 500);
      await cancelAppointmentEmails(admin, body.id).catch(error => console.error("Notificaciones:",error));
      await cancelAppointmentWhatsApp(admin, body.id).catch(error => console.error("Notificaciones:",error));
      return json({ ok: true });
    }

    // ---------- push notifications ----------
    if (action === "push-public-key") {
      const { data: cfg } = await admin.from("studio_push_config").select("public_key").eq("id", true).maybeSingle();
      if (!cfg?.public_key) return json({ error: "El Studio aún no tiene configuradas las notificaciones push" }, 503);
      return json({ publicKey: cfg.public_key });
    }

    if (action === "push-subscribe" && req.method === "POST") {
      const endpoint = String(body.endpoint ?? "");
      const keys = body.keys ?? {};
      // Solo servicios push reales: evita que el servidor acabe enviando peticiones
      // a una dirección arbitraria elegida por quien se suscribe.
      const PUSH_HOSTS = [
        "android.googleapis.com",
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "updates-autopush.stage.mozaws.net",
        "notify.windows.com",
        "wns2-par02p.notify.windows.com",
        "web.push.apple.com",
      ];
      let endpointHost = "";
      try {
        const parsed = new URL(endpoint);
        if (parsed.protocol !== "https:") throw new Error("protocolo");
        endpointHost = parsed.hostname.toLowerCase();
      } catch {
        return json({ error: "Suscripción no válida" }, 400);
      }
      const hostAllowed = PUSH_HOSTS.includes(endpointHost)
        || /\.push\.apple\.com$/.test(endpointHost)
        || /\.notify\.windows\.com$/.test(endpointHost)
        || /\.push\.services\.mozilla\.com$/.test(endpointHost)
        || /\.googleapis\.com$/.test(endpointHost);
      if (!hostAllowed || !keys.p256dh || !keys.auth) return json({ error: "Suscripción no válida" }, 400);
      // Link to the signed-in clienta; admin devices record role admin without client link.
      const { data: sub, error } = await admin.from("studio_push_subscriptions").upsert({
        endpoint,
        p256dh: String(keys.p256dh),
        auth: String(keys.auth),
        client_id: (isAdmin ? null : tokenRow.client_id) ?? null,
        user_agent: String(body.userAgent ?? "").slice(0, 200),
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" }).select("id").single();
      if (error) return json(failed(error), 500);
      return json({ ok: true, id: sub.id });
    }

    if (action === "push-unsubscribe" && req.method === "POST") {
      const endpoint = String(body.endpoint ?? "");
      if (!endpoint) return json({ error: "Falta la suscripción" }, 400);
      // Cada sesión solo puede retirar sus propios dispositivos.
      let unsubQuery = admin.from("studio_push_subscriptions").delete().eq("endpoint", endpoint);
      if (!isAdmin) unsubQuery = unsubQuery.eq("client_id", tokenRow.client_id);
      await unsubQuery;
      return json({ ok: true });
    }

    if (action === "push-test" && req.method === "POST") {
      // Client scope: sends a test notification to the signed-in clienta's own devices only.
      if (isAdmin || !tokenRow.client_id) return json({ error: "La prueba de avisos se realiza desde el portal de una clienta con sesión iniciada" }, 403);
      const { data: subs } = await admin.from("studio_push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("client_id", tokenRow.client_id);
      if (!subs?.length) return json({ ok: true, sent: 0, errors: ["Este dispositivo todavía no aparece registrado. Vuelve a pulsar «Activar notificaciones»."] });
      let sent = 0; const errors: string[] = [];
      for (const sub of subs as { id: string; endpoint: string; p256dh: string; auth: string }[]) {
        const result = await sendWebPush(admin, sub.endpoint, sub.p256dh, sub.auth, {
          title: "Avisos activados",
          body: "Recibirás aquí la confirmación de tus citas de L'Studio Ana.",
          url: "/",
          tag: "push-test",
        });
        if (result.ok) sent++; else errors.push(result.error);
        if (result.expired) await admin.from("studio_push_subscriptions").delete().eq("id", sub.id);
      }
      return json({ ok: true, sent, errors });
    }

    if (action === "push-status" && req.method === "POST") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const appointmentId = String(body.appointmentId ?? "");
      if (!appointmentId) return json({ error: "Falta la cita" }, 400);
      const { data: pushes, error } = await admin
        .from("studio_push_outbox")
        .select("id, kind, status, provider, provider_message_id, delivered_at, last_error, attempts, created_at, subscription_id, studio_push_subscriptions(user_agent)")
        .eq("appointment_id", appointmentId)
        .order("created_at");
      if (error) return json(failed(error), 500);
      const {data:jobs,error:jobError}=await admin.from('studio_notification_jobs').select('*').eq('appointment_id',appointmentId).eq('channel','push').order('scheduled_at');
      if(jobError)return json(failed(jobError), 500);
      return json({pushes:[...(pushes||[]),...(jobs||[]).map((j:any)=>({...j,status:j.status === 'sent' ? 'accepted':j.status,studio_push_subscriptions:null,delivered_at:null}))]});
    }

    if (action === "invalidate-admin-sessions" && req.method === "POST") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const { count, error: delError } = await admin.from("api_tokens")
        .delete({ count: "exact" })
        .eq("role", "admin")
        .neq("token", token);
      if (delError) return json(failed(delError), 500);
      return json({ ok: true, invalidated: count ?? 0 });
    }

    return json({ error: "Acción no reconocida" }, 404);
  } catch (error) {
    return json(failed(error, "studio-api:unhandled"), 500);
  }
});