import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const STUDIO_LOCATION = "Calle Mayor / Centro de Elche, Alicante";
const DEFAULT_PORTAL_URL = "https://lstudioana.es";
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

const detailsTable = (startsAt: string, servicesText: string, professional?: string | null) => {
  const rows = [
    `<tr><td style="padding:4px 0;color:#D6CBB8;width:92px;">Fecha</td><td style="padding:4px 0;color:#FFF8EE;">${escHtml(fmtDateMadrid(startsAt))}</td></tr>`,
    `<tr><td style="padding:4px 0;color:#D6CBB8;">Hora</td><td style="padding:4px 0;color:#FFF8EE;">${escHtml(fmtTimeMadrid(startsAt))}h</td></tr>`,
    `<tr><td style="padding:4px 0;color:#D6CBB8;">Servicios</td><td style="padding:4px 0;color:#FFF8EE;">${escHtml(servicesText)}</td></tr>`,
  ];
  if (professional) rows.push(`<tr><td style="padding:4px 0;color:#D6CBB8;">Profesional</td><td style="padding:4px 0;color:#FFF8EE;">${escHtml(professional)}</td></tr>`);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table>`;
};

const validEmail = (value: unknown): string | null => {
  const email = String(value ?? "").toLowerCase().trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
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
  const { data: cfg } = await admin.from("studio_email_config").select("portal_url").eq("id", true).maybeSingle();
  const portalUrl = ((cfg as { portal_url?: string | null } | null)?.portal_url || DEFAULT_PORTAL_URL).replace(/\/+$/, "");
  const now = Date.now();
  const startMs = new Date(ctx.startsAt).getTime();

  const upsert = async (kind: string, idempotencyKey: string, subject: string, bodyHtml: string, scheduledAt: string) => {
    await admin.from("studio_email_outbox").upsert({
      idempotency_key: idempotencyKey,
      appointment_id: ctx.apptId,
      kind,
      to_email: ctx.clientEmail ?? "",
      subject,
      body_html: bodyHtml,
      scheduled_at: scheduledAt,
      status: "scheduled",
    }, { onConflict: "idempotency_key", ignoreDuplicates: true });
  };

  if (!ctx.clientEmail) return;

  // Keys include the start time: a rescheduled appointment gets fresh messages
  // instead of colliding with the superseded ones.
  const keySuffix = `:${ctx.startsAt}`;

  if (!ctx.confirmed) {
    await upsert("request_received", `req:${ctx.apptId}${keySuffix}`, "Hemos recibido tu solicitud en L'Studio Ana",
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
  await upsert(confirmationKind, `${confirmationKind}:${ctx.apptId}${keySuffix}`, confirmationSubject,
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
    await upsert(kind, `${kind}:${ctx.apptId}${keySuffix}`, subject,
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
      .select("id, starts_at, client_snapshot")
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
           ${detailsTable(appt.starts_at, String(snap.serviceSubcategory ?? "Servicios del Studio"))}
           <p style="margin:12px 0 0;color:#D6CBB8;">Si quieres reservar otro día, puedes hacerlo desde el portal.</p>`),
        scheduled_at: new Date().toISOString(),
        status: "scheduled",
      }, { onConflict: "idempotency_key", ignoreDuplicates: true });
    }
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const action = url.pathname.replace(/\/+$/, "").split("/").pop() || "";
    const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));

    // ---------- health ----------
    if (action === "health") return json({ ok: true });

    // ---------- auth ----------
    if (action === "auth") {
      const pin = String(body.pin ?? "").trim();
      if (!/^\d{4}$/.test(pin)) return json({ error: "PIN no válido" }, 400);

      const { data: config } = await admin.from("studio_settings").select("configuration").eq("id", true).maybeSingle();
      const masterPin = String((config?.configuration as any)?.masterPin ?? "0000");

      if (pin === masterPin) {
        const { data, error } = await admin.from("api_tokens").insert({ role: "admin" }).select("token, expires_at").single();
        if (error) return json({ error: "No se pudo iniciar sesión" }, 500);
        return json({ role: "admin", token: data.token, expiresAt: data.expires_at });
      }

      const { data: client } = await admin.from("studio_clients").select("id").eq("legacy_id", Number(pin)).maybeSingle();
      if (client) {
        const { data, error } = await admin.from("api_tokens").insert({ role: "client", client_id: client.id }).select("token, expires_at").single();
        if (error) return json({ error: "No se pudo iniciar sesión" }, 500);
        return json({ role: "client", token: data.token, clientId: client.id, expiresAt: data.expires_at });
      }
      return json({ error: "PIN incorrecto" }, 401);
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
        settings: settings?.configuration ?? null,
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
      if (cfgErr) return json({ error: cfgErr.message }, 500);
      const { data: emails, error } = await admin
        .from("studio_email_outbox")
        .select("id, kind, to_email, subject, status, scheduled_at, sent_at, provider, provider_message_id, last_error, attempts, created_at")
        .eq("appointment_id", appointmentId)
        .order("created_at");
      if (error) return json({ error: error.message }, 500);
      return json({ emails: emails ?? [] });
    }

    if (action === "email-config") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const { data: cfg, error } = await admin.from("studio_email_config").select("provider, from_email, portal_url, service_key").eq("id", true).maybeSingle();
      if (error) return json({ error: error.message }, 500);
      const row = (cfg ?? {}) as Record<string, unknown>;
      return json({
        providerConfigured: Boolean(row.service_key && row.from_email),
        provider: (row.provider as string) ?? null,
        fromEmail: (row.from_email as string) ?? null,
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
      if (upErr) return json({ error: upErr.message }, 500);
      const { data: pub } = admin.storage.from("service-images").getPublicUrl(path);
      return json({ ok: true, url: pub.data.publicUrl, path });
    }

    if (action === "service-image" && req.method === "DELETE") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const path = String(body.path ?? "");
      if (!/^services\/[a-f0-9-]+\.(png|jpe?g|webp)$/.test(path)) return json({ error: "Ruta no válida" }, 400);
      const { error } = await admin.storage.from("service-images").remove([path]);
      if (error) return json({ error: error.message }, 500);
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
      if (error) return json({ error: error.message }, 500);
      const keep = new Set(rows.map(row => row.id));
      const { data: existing } = await admin.from("studio_catalog").select("id");
      const stale = (existing ?? []).filter(row => !keep.has(row.id)).map(row => row.id);
      if (stale.length) await admin.from("studio_catalog").delete().in("id", stale);
      return json({ ok: true });
    }

    if (action === "settings" && req.method === "PUT") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const { error } = await admin.from("studio_settings").upsert({ id: true, configuration: body.settings }, { onConflict: "id" });
      if (error) return json({ error: error.message }, 500);
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
      if (error) return json({ error: error.message }, 500);
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
      if (error) return json({ error: error.message }, 500);
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
      if (error) return json({ error: error.message }, 500);
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
      if (error) return json({ error: error.message }, 500);
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

      // Server-side conflict validation (source of truth)
      const rpc = admin.rpc("studio_appointment_conflict" as never, {} as never);
      const conflicts = typeof rpc?.catch === "function" ? await rpc.catch(() => ({ data: null })) : { data: null };
      void conflicts;

      const check = await admin
        .from("studio_appointments")
        .select("id, starts_at, duration_minutes, lifecycle_status, booking_channel")
        .gte("starts_at", new Date(new Date(startsAt).getTime() - 14 * 3600_000).toISOString())
        .lte("starts_at", new Date(new Date(startsAt).getTime() + 14 * 3600_000).toISOString());
      if (check.error) return json({ error: check.error.message }, 500);

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
      if (overlap && body.bookingChannel !== "admin") {
        return json({ error: "Ese hueco acaba de ocuparse. Elige otra hora." }, 409);
      }

      const { data: created, error } = await admin.from("studio_appointments").insert({
        source_legacy_id: body.id ? String(body.id) : null,
        client_id: body.clientId ?? null,
        starts_at: startsAt,
        duration_minutes: duration,
        booking_channel: body.bookingChannel === "admin" ? "admin" : "portal",
        lifecycle_status: body.lifecycleStatus ?? "active",
        approval_status: body.approval?.status ?? "not_required",
        approval_reason: body.approval?.reason ?? null,
        approval_reference: body.approval?.reference ?? null,
        deposit_status: body.advancePayment?.status ?? "not_required",
        deposit_amount: body.advancePayment?.amount ?? null,
        deposit_reference: body.advancePayment?.reference ?? null,
        services: body.services ?? [],
        client_snapshot: body.clientSnapshot ?? {
          clientName: body.clientName ?? "",
          phone: body.phone ?? "",
          email: body.email ?? "",
          serviceCategory: body.serviceCategory ?? "",
          serviceSubcategory: body.serviceSubcategory ?? "",
          dayName: body.dayName ?? "",
          remindersStatus: body.remindersStatus ?? null,
          selectedVariant: body.selectedVariant ?? null,
        },
        legacy_service_text: body.serviceSubcategory ?? "",
      }).select("id").single();
      if (error) {
        if ((error as any).code === "23505") return json({ error: "Reserva duplicada" }, 409);
        return json({ error: error.message }, 500);
      }
      const servicesText = (Array.isArray(body.services) && body.services.length
        ? body.services.map((s: any) => [s?.sub?.name || "", s?.variant?.name].filter(Boolean).join(" (") + (s?.variant ? ")" : "")).join(" + ")
        : String(body.serviceSubcategory ?? "")) || "Servicios del Studio";
      const approvalPending = (body.approval?.status ?? "not_required") === "pending";
      const depositPending = (body.advancePayment?.status ?? "not_required") === "pending";
      await scheduleAppointmentEmails(admin, {
        apptId: created.id,
        startsAt: new Date(`${body.dateKey}T${body.time}:00Z`).toISOString(),
        clientName: String(body.clientName ?? ""),
        clientEmail: validEmail(body.email),
        servicesText,
        confirmed: !approvalPending && !depositPending,
      }).catch(() => undefined);
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
      if (body.internalNotes !== undefined) {
        patch.services = body.services ?? null;
      }
      if (body.clientSnapshot !== undefined) patch.client_snapshot = body.clientSnapshot;
      if (body.completedAt !== undefined) patch.completed_at = body.completedAt;
      }

      let query = admin.from("studio_appointments").update(patch);
      if (isAdmin) query = query.or(`source_legacy_id.eq.${body.id},id.eq.${body.id}`);
      else {
        // client scope: only own appointments, matched by server id or portal legacy id
        const { data: own } = await admin.from("studio_appointments").select("id")
          .or(`id.eq.${body.id},source_legacy_id.eq.${body.id}`)
          .eq("client_id", tokenRow.client_id).maybeSingle();
        if (!own) return json({ error: "Cita no encontrada" }, 404);
        query = query.or(`id.eq.${body.id},source_legacy_id.eq.${body.id}`).eq("client_id", tokenRow.client_id);
      }
      const { error } = await query;
      if (error) return json({ error: error.message }, 500);
      const scheduleKey = crypto.randomUUID();
      void scheduleKey;
      const { data: updatedAppt } = await admin.from("studio_appointments")
        .select("id, starts_at, lifecycle_status, approval_status, deposit_status, services, client_snapshot")
        .or(`id.eq.${body.id},source_legacy_id.eq.${body.id}`).maybeSingle();
      if (updatedAppt) {
        if (updatedAppt.lifecycle_status === "cancelled" || updatedAppt.lifecycle_status === "no_show") {
          await cancelAppointmentEmails(admin, updatedAppt.id, { cancelled: updatedAppt.lifecycle_status === "cancelled" }).catch(() => undefined);
        } else {
          const snap = (updatedAppt.client_snapshot || {}) as Record<string, unknown>;
          const approvalPending = updatedAppt.approval_status === "pending";
          const depositPending = updatedAppt.deposit_status === "pending";
          const confirmed = !approvalPending && !depositPending;
          const servicesText = (Array.isArray(updatedAppt.services) && updatedAppt.services.length
            ? updatedAppt.services.map((s: any) => [s?.sub?.name || "", s?.variant?.name].filter(Boolean).join(" (") + (s?.variant ? ")" : "")).join(" + ")
            : String(snap.serviceSubcategory ?? "")) || "Servicios del Studio";
          if (patch.starts_at) {
            // Rescheduled: annul the previous reminders, send the update and
            // schedule the new ones.
            await cancelAppointmentEmails(admin, updatedAppt.id).catch(() => undefined);
            await scheduleAppointmentEmails(admin, {
              apptId: updatedAppt.id,
              startsAt: updatedAppt.starts_at,
              clientName: String(snap.clientName ?? ""),
              clientEmail: validEmail(snap.email),
              servicesText,
              confirmed,
              isUpdate: true,
            }).catch(() => undefined);
          } else {
            await scheduleAppointmentEmails(admin, {
              apptId: updatedAppt.id,
              startsAt: updatedAppt.starts_at,
              clientName: String(snap.clientName ?? ""),
              clientEmail: validEmail(snap.email),
              servicesText,
              confirmed,
            }).catch(() => undefined);
          }
        }
      }
      return json({ ok: true });
    }

    if (action === "appointment" && req.method === "DELETE") {
      let query = admin.from("studio_appointments").delete();
      if (isAdmin) query = query.eq("id", body.id).or(`source_legacy_id.eq.${body.id},id.eq.${body.id}`);
      else {
        const { data: own } = await admin.from("studio_appointments").select("id").eq("source_legacy_id", body.id).eq("client_id", tokenRow.client_id).maybeSingle();
        if (!own) return json({ error: "Cita no encontrada" }, 404);
        query = query.eq("source_legacy_id", body.id).eq("client_id", tokenRow.client_id);
      }
      const { error } = await query;
      if (error) return json({ error: error.message }, 500);
      await cancelAppointmentEmails(admin, body.id).catch(() => undefined);
      return json({ ok: true });
    }

    return json({ error: "Acción no reconocida" }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});
