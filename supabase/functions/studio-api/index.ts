import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
      const { data: conflicts } = await admin.rpc("studio_appointment_conflict" as never, {} as never).catch(() => ({ data: null, error: null }));
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
        lifecycle_status: body.lifecycleStatus ?? null,
        approval_status: body.approval?.status ?? null,
        approval_reason: body.approval?.reason ?? null,
        approval_reference: body.approval?.reference ?? null,
        deposit_status: body.advancePayment?.status ?? null,
        deposit_amount: body.advancePayment?.amount ?? null,
        deposit_reference: body.advancePayment?.reference ?? null,
        services: body.services ?? null,
        client_snapshot: {
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
      return json({ ok: true, id: created.id });
    }

    if (action === "appointment" && req.method === "PUT") {
      const patch: Record<string, unknown> = {};
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

      let query = admin.from("studio_appointments").update(patch);
      if (isAdmin) query = query.eq("id", body.id);
      else {
        // client scope: only own appointments
        const { data: own } = await admin.from("studio_appointments").select("id").eq("id", body.id).eq("client_id", tokenRow.client_id).maybeSingle();
        if (!own) return json({ error: "Cita no encontrada" }, 404);
        query = query.eq("id", body.id).eq("client_id", tokenRow.client_id);
      }
      const { error } = await query;
      if (error) return json({ error: error.message }, 500);
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
      return json({ ok: true });
    }

    return json({ error: "Acción no reconocida" }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});
