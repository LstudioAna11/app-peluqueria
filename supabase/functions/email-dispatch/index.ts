// Email dispatch worker. Triggered by pg_cron every 5 minutes and also callable
// manually. Sends scheduled appointment emails through Resend; only
// provider-confirmed sends are marked as "sent".

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MADRID_TZ = "Europe/Madrid";
const STUDIO_NAME = "L'Studio Ana";
const STUDIO_LOCATION = "Calle Mayor / Centro de Elche, Alicante";
const DEFAULT_PORTAL_URL = "https://lstudioana.es";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MINUTES = 10;

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: MADRID_TZ });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: MADRID_TZ });

interface OutboxRow {
  id: string;
  appointment_id: string | null;
  kind: string;
  to_email: string;
  subject: string;
  body_html: string;
  status: string;
  scheduled_at: string;
  attempts: number;
}

interface AppointmentRow {
  id: string;
  starts_at: string;
  lifecycle_status: string;
  approval_status: string;
  deposit_status: string;
}

function appointmentIsConfirmed(appt: AppointmentRow): boolean {
  if (!appt || appt.lifecycle_status === "cancelled" || appt.lifecycle_status === "no_show") return false;
  if (appt.approval_status === "pending") return false;
  if (appt.deposit_status === "pending") return false;
  return true;
}

function emailLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#29231F;font-family:'Garet','Poppins',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#29231F;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#322A25;border:1px solid rgba(212,175,55,.35);border-radius:14px;">
        <tr><td style="padding:22px 22px 6px;text-align:center;">
          <p style="margin:0;color:#C99E52;font-size:13px;letter-spacing:2px;">${esc(STUDIO_NAME.toUpperCase())}</p>
          <h1 style="margin:10px 0 0;color:#FFF8EE;font-size:20px;font-weight:600;line-height:1.3;">${esc(title)}</h1>
        </td></tr>
        <tr><td style="padding:12px 22px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#29231F;border:1px solid rgba(212,175,55,.25);border-radius:10px;">
            <tr><td style="padding:16px;color:#FFF8EE;font-size:15px;line-height:1.7;">${bodyHtml}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:8px 22px 20px;" align="center">
          <p style="margin:0;color:#D6CBB8;font-size:12px;line-height:1.7;">${esc(STUDIO_LOCATION)}</p>
        </td></tr>
      </table>
      <p style="max-width:480px;margin:14px auto 0;color:#8A7E6E;font-size:11px;line-height:1.6;text-align:center;">
        Recibes este correo porque tienes una reserva activa en ${esc(STUDIO_NAME)}.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailsTable(startsAt: string, servicesText: string, professional?: string | null): string {
  const rows = [
    `<tr><td style="padding:4px 0;color:#D6CBB8;width:92px;">Fecha</td><td style="padding:4px 0;color:#FFF8EE;">${esc(fmtDate(startsAt))}</td></tr>`,
    `<tr><td style="padding:4px 0;color:#D6CBB8;">Hora</td><td style="padding:4px 0;color:#FFF8EE;">${esc(fmtTime(startsAt))}h</td></tr>`,
    `<tr><td style="padding:4px 0;color:#D6CBB8;">Servicios</td><td style="padding:4px 0;color:#FFF8EE;">${esc(servicesText)}</td></tr>`,
  ];
  if (professional) rows.push(`<tr><td style="padding:4px 0;color:#D6CBB8;">Profesional</td><td style="padding:4px 0;color:#FFF8EE;">${esc(professional)}</td></tr>`);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table>`;
}

function howToGetThereLink(): string {
  return `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STUDIO_LOCATION)}" target="_blank" style="color:#E4C687;">Cómo llegar</a>`;
}

function viewButton(portalUrl: string, appointmentId: string): string {
  const url = `${portalUrl}?cita=${encodeURIComponent(appointmentId)}`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
  <tr><td align="center" style="padding:4px 0 12px;">
    <a href="${esc(url)}" style="display:inline-block;background:linear-gradient(135deg,#C99E52 0%,#B3823B 100%);color:#29231F;text-decoration:none;font-weight:600;font-size:14px;padding:13px 26px;border-radius:9px;">Ver mi cita</a>
  </td></tr>
  <tr><td align="center">${howToGetThereLink()}</td></tr>
</table>`;
}

async function sendViaResend(
  apiKey: string,
  fromEmail: string,
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromEmail, to: [to], subject, html }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (payload as { message?: string }).message || `Error ${response.status}`;
      return { ok: false, error: message };
    }
    const id = (payload as { id?: string }).id || "";
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error de red" };
  }
}

const cleanCredential = (value: unknown): string =>
  String(value ?? "").trim().replace(/^["'\s]+|["'\s]+$/g, "");

async function sendViaWhatsAppCloud(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  templateName: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const token = cleanCredential(accessToken);
  const phoneId = cleanCredential(phoneNumberId);
  if (!token) return { ok: false, error: "Falta el token de acceso de WhatsApp (vacío o no configurado)" };
  if (!phoneId) return { ok: false, error: "Falta el phone_number_id de WhatsApp" };
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "template",
        template: { name: templateName, language: { code: "es" } },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = (payload as { error?: { message?: string; code?: number; error_subcode?: number; fbtrace_id?: string; type?: string } }).error;
      const parts = [`HTTP ${response.status}`];
      if (err?.type) parts.push(err.type);
      if (err?.code) parts.push(`Código ${err.code}`);
      if (err?.error_subcode) parts.push(`Subcódigo ${err.error_subcode}`);
      if (err?.message) parts.push(err.message);
      if (err?.fbtrace_id) parts.push(`Ref ${err.fbtrace_id}`);
      return { ok: false, error: parts.join(" · ") };
    }
    const id = (payload as { messages?: { id?: string }[] }).messages?.[0]?.id || "";
    if (!id) return { ok: false, error: "Meta aceptó la petición pero no devolvió un identificador de mensaje" };
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error de red" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const body = req.method === "GET" ? {} : await req.json().catch(() => ({})) as Record<string, unknown>;

    // ---------- status (called by studio-api on behalf of 360Studio) ----------
    if (url.pathname.endsWith("/email-status")) {
      const { data: cfgStatus } = await admin.from("studio_email_config").select("worker_secret").eq("id", true).maybeSingle();
      const statusSecret = (cfgStatus as { worker_secret?: string | null } | null)?.worker_secret ?? "";
      if (statusSecret && String(body.workerSecret ?? "") !== statusSecret) return json({ error: "No autorizado" }, 401);
      const appointmentId = String(body.appointmentId ?? "");
      if (!appointmentId) return json({ error: "Falta la cita" }, 400);
      const { data, error } = await admin
        .from("studio_email_outbox")
        .select("id, kind, to_email, subject, status, scheduled_at, sent_at, provider, provider_message_id, last_error, attempts, created_at")
        .eq("appointment_id", appointmentId)
        .order("created_at");
      if (error) return json({ error: error.message }, 500);
      return json({ emails: data ?? [] });
    }

    // ---------- dispatch ----------
    const { data: cfg } = await admin.from("studio_email_config").select("worker_secret").eq("id", true).maybeSingle();
    const configSecret = (cfg as { worker_secret?: string | null } | null)?.worker_secret ?? "";
    const providedSecret = String(body.workerSecret ?? "");
    const urlSecret = url.searchParams.get("workerSecret") ?? "";
    if (configSecret && providedSecret !== configSecret && urlSecret !== configSecret) {
      return json({ error: "No autorizado" }, 401);
    }

    const { data: config } = await admin.from("studio_email_config").select("*").eq("id", true).maybeSingle();
    const serviceKey = (config as { service_key?: string | null } | null)?.service_key ?? null;
    const fromEmail = (config as { from_email?: string | null } | null)?.from_email ?? null;
    const portalUrl = (((config as { portal_url?: string | null } | null)?.portal_url) || DEFAULT_PORTAL_URL).replace(/\/+$/, "");
    const providerConfigured = Boolean(serviceKey && fromEmail);

    const nowIso = new Date().toISOString();
    const { data: due, error } = await admin
      .from("studio_email_outbox")
      .select("id, appointment_id, kind, to_email, subject, body_html, status, scheduled_at, attempts")
      .in("status", ["scheduled", "failed"])
      .lte("scheduled_at", nowIso)
      .order("scheduled_at")
      .limit(50);
    if (error) return json({ error: error.message }, 500);

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of (due ?? []) as OutboxRow[]) {
      if (row.status === "failed" && (row.attempts ?? 0) >= MAX_ATTEMPTS) continue;

      // Reminders only send while the appointment is still confirmed and its
      // schedule has not changed since the reminder was created.
      if (row.kind === "reminder_48h" || row.kind === "reminder_24h") {
        const { data: appt } = await admin
          .from("studio_appointments")
          .select("id, starts_at, lifecycle_status, approval_status, deposit_status")
          .eq("id", row.appointment_id ?? "")
          .maybeSingle();
        if (!appt) {
          await admin.from("studio_email_outbox").update({ status: "skipped", last_error: "Cita eliminada" }).eq("id", row.id);
          skipped++;
          continue;
        }
        if (!appointmentIsConfirmed(appt as unknown as AppointmentRow)) {
          await admin.from("studio_email_outbox").update({ status: "skipped", last_error: "La cita ya no está confirmada" }).eq("id", row.id);
          skipped++;
          continue;
        }
      }

      if (!providerConfigured) {
        await admin.from("studio_email_outbox").update({
          status: "failed",
          attempts: (row.attempts ?? 0) + 1,
          last_error: "Proveedor de email no configurado: falta la API key y un remitente verificado",
          provider: null,
        }).eq("id", row.id);
        failed++;
        errors.push(`${row.kind}: proveedor no configurado`);
        continue;
      }

      await admin.from("studio_email_outbox").update({ status: "sending" }).eq("id", row.id);
      const result = await sendViaResend(serviceKey!, fromEmail!, row.to_email, row.subject, row.body_html);
      if (result.ok) {
        await admin.from("studio_email_outbox").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider: "resend",
          provider_message_id: result.id,
          last_error: null,
          attempts: (row.attempts ?? 0) + 1,
        }).eq("id", row.id);
        sent++;
      } else {
        const nextAttempts = (row.attempts ?? 0) + 1;
        const retryAt = nextAttempts >= MAX_ATTEMPTS ? row.scheduled_at : new Date(Date.now() + RETRY_DELAY_MINUTES * 60_000).toISOString();
        await admin.from("studio_email_outbox").update({
          status: "failed",
          attempts: nextAttempts,
          last_error: result.error,
          provider: "resend",
          scheduled_at: retryAt,
        }).eq("id", row.id);
        failed++;
        errors.push(`${row.kind}: ${result.error}`);
      }
    }

    // ---------- WhatsApp status webhook (Meta) + worker ----------
    const { data: waCfgRow } = await admin.from("studio_whatsapp_config").select("*").eq("id", true).maybeSingle();
    const waCfg = (waCfgRow ?? {}) as Record<string, unknown>;

    if (url.searchParams.has("hub.mode") || (req.method === "GET" && url.pathname.endsWith("/whatsapp"))) {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token && String(token) === String(waCfg.verify_token ?? "")) {
        return new Response(challenge ?? "", { status: 200, headers: corsHeaders });
      }
      return json({ error: "Verificación de webhook no válida" }, 403);
    }

    if (req.method === "POST" && url.pathname.endsWith("/whatsapp")) {
      // Meta status updates: delivered / read. Failed sends are already
      // handled in the dispatch loop below.
      try {
        const payload = await req.json();
        const entries = (payload as { entry?: { changes?: { value?: { statuses?: { id: string; status: string; timestamp?: string }[] }[] }[] }[] }).entry ?? [];
        for (const entry of entries) {
          for (const change of entry.changes ?? []) {
            for (const st of change.value?.statuses ?? []) {
              if (!st?.id) continue;
              const patch: Record<string, unknown> = {};
              if (st.status === "delivered") patch.delivered_at = st.timestamp ? new Date(Number(st.timestamp) * 1000).toISOString() : new Date().toISOString();
              if (st.status === "read") patch.read_at = st.timestamp ? new Date(Number(st.timestamp) * 1000).toISOString() : new Date().toISOString();
              if (st.status === "failed") patch.last_error = "Meta informó de un fallo de entrega";
              if (Object.keys(patch).length) {
                await admin.from("studio_whatsapp_outbox").update(patch).eq("provider_message_id", st.id);
              }
            }
          }
        }
      } catch { /* malformed webhook payloads are ignored */ }
      return json({ ok: true });
    }

    // ---------- WhatsApp dispatch (same cron trigger) ----------
    const waWorkerSecret = String(waCfg.worker_secret ?? "");
    const waBodySecret = String((body as { workerSecret?: string }).workerSecret ?? "");
    const waUrlSecret = url.searchParams.get("workerSecret") ?? "";
    const secretOk = !waWorkerSecret || waBodySecret === waWorkerSecret || waUrlSecret === waWorkerSecret
      || (!!configSecret && (waBodySecret === configSecret || waUrlSecret === configSecret));

    let waSent = 0;
    let waFailed = 0;
    let waSkipped = 0;
    const waErrors: string[] = [];
    if (secretOk) {
      // Recover rows stuck in "sending" (previous invocation crashed mid-send).
      await admin.from("studio_whatsapp_outbox")
        .update({ status: "failed", last_error: "Recuperado de envío atascado" })
        .eq("status", "sending");
      await admin.from("studio_email_outbox")
        .update({ status: "failed", last_error: "Recuperado de envío atascado" })
        .eq("status", "sending");

      const waConfigured = Boolean(cleanCredential(waCfg.access_token) && cleanCredential(waCfg.phone_number_id) && waCfg.template_name);
      const { data: waDue, error: waErr } = await admin
        .from("studio_whatsapp_outbox")
        .select("id, appointment_id, kind, to_phone, template_name, status, attempts")
        .in("status", ["scheduled", "failed"])
        .lte("scheduled_at", nowIso)
        .order("scheduled_at")
        .limit(50);
      if (waErr) return json({ error: waErr.message }, 500);

      for (const row of (waDue ?? []) as { id: string; appointment_id: string | null; kind: string; to_phone: string; template_name: string; attempts: number }[]) {
        if (row.status === "failed" && (row.attempts ?? 0) >= MAX_ATTEMPTS) continue;

        // Confirmations only go out while the appointment is still confirmed.
        if (row.appointment_id) {
          const { data: appt } = await admin
            .from("studio_appointments")
            .select("id, starts_at, lifecycle_status, approval_status, deposit_status, client_id, booking_channel, client_snapshot")
            .eq("id", row.appointment_id)
            .maybeSingle();
          if (!appt) {
            await admin.from("studio_whatsapp_outbox").update({ status: "skipped", last_error: "Cita eliminada" }).eq("id", row.id);
            waSkipped++;
            continue;
          }
          if (!appointmentIsConfirmed(appt as unknown as AppointmentRow)) {
            await admin.from("studio_whatsapp_outbox").update({ status: "skipped", last_error: "La cita ya no está confirmada" }).eq("id", row.id);
            waSkipped++;
            continue;
          }
          // Consent gate: appointment notices only go to clients who authorised
          // WhatsApp. Cancellations inform regardless, since they annul the booking.
          if (row.kind !== "cancellation") {
            const { data: consentRow } = appt.client_id
              ? await admin.from("studio_clients").select("whatsapp_consent").eq("id", appt.client_id).maybeSingle()
              : { data: null };
            const consented = Boolean((consentRow as { whatsapp_consent?: boolean } | null)?.whatsapp_consent);
            const snapshot = (appt.client_snapshot || {}) as Record<string, unknown>;
            const reminders = (snapshot.remindersStatus || {}) as Record<string, unknown>;
            const allowed = consented || (appt.booking_channel === "portal" && reminders.whatsapp48h === true);
            if (!allowed) {
              await admin.from("studio_whatsapp_outbox").update({ status: "skipped", last_error: "Sin autorización de WhatsApp de la clienta" }).eq("id", row.id);
              waSkipped++;
              continue;
            }
          }
        }

        if (!waConfigured) {
          await admin.from("studio_whatsapp_outbox").update({
            status: "failed",
            attempts: (row.attempts ?? 0) + 1,
            last_error: "WhatsApp no configurado: faltan credenciales, número habilitado o plantilla aprobada",
            provider: null,
          }).eq("id", row.id);
          waFailed++;
          waErrors.push(`${row.kind}: WhatsApp no configurado`);
          continue;
        }

        await admin.from("studio_whatsapp_outbox").update({ status: "sending" }).eq("id", row.id);
        const result = await sendViaWhatsAppCloud(waCfg.access_token as string, waCfg.phone_number_id as string, row.to_phone, row.template_name || (waCfg.template_name as string));
        // 401/token errors are not transient — don't waste the retry budget.
        const tokenError = /HTTP 401|Código 190|Invalid OAuth|access token/i.test(result.error || "");
        if (result.ok) {
          await admin.from("studio_whatsapp_outbox").update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider: "meta_cloud_api",
            provider_message_id: result.id,
            last_error: null,
            attempts: (row.attempts ?? 0) + 1,
          }).eq("id", row.id);
          waSent++;
        } else {
          const nextAttempts = (row.attempts ?? 0) + 1;
          const terminal = nextAttempts >= MAX_ATTEMPTS || tokenError;
          const retryAt = terminal ? row.scheduled_at : new Date(Date.now() + RETRY_DELAY_MINUTES * 60_000).toISOString();
          await admin.from("studio_whatsapp_outbox").update({
            status: "failed",
            attempts: terminal ? nextAttempts : nextAttempts,
            last_error: result.error,
            provider: "meta_cloud_api",
            scheduled_at: retryAt,
          }).eq("id", row.id);
          waFailed++;
          waErrors.push(`${row.kind}: ${result.error}`);
        }
      }
    }

    return json({
      ok: true, due: (due ?? []).length, sent, failed, skipped, providerConfigured, errors: errors.slice(0, 10),
      whatsapp: { sent: waSent, failed: waFailed, skipped: waSkipped, providerConfigured: Boolean(cleanCredential(waCfg.access_token) && cleanCredential(waCfg.phone_number_id) && waCfg.template_name), errors: waErrors.slice(0, 10) },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});
