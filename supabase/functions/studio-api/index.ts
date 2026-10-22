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
  completed_at?: string | null;
}

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

function appointmentIsConfirmed(appt: AppointmentRow): boolean { return notificationConfirmed(appt); }

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
  idempotencyKey?: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(12000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...(idempotencyKey ? {"Idempotency-Key":idempotencyKey}: {}) },
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


function templateData(appt:any,portalUrl:string) {
  const snap=appt.client_snapshot || {};
  const instant=notificationInstant(appt.starts_at);
  const services=(appt.services || []).map((s:any)=>[s?.sub?.name,s?.variant?.name].filter(Boolean).join(' · ')).filter(Boolean).join(' + ') || snap.serviceSubcategory || 'Servicios del Studio';
  return {client_name:String(snap.clientName || ''),date:fmtDate(instant),time:fmtTime(instant),services,portal_url:`${portalUrl.replace(/\/+$/,'')}?cita=${encodeURIComponent(appt.id)}`};
}
const cleanCredential = (value: unknown): string =>
  String(value ?? "").trim().replace(/^["'\s]+|["'\s]+$/g, "");

async function sendApprovedWhatsApp(config:any,kind:string,to:string,appt:any) {
  const token = cleanCredential(config.access_token);
  const phoneId = cleanCredential(config.phone_number_id);
  if (!token) return {ok:false,error:'Falta el token de acceso de WhatsApp (vacío o no configurado)'};
  if (!phoneId) return {ok:false,error:'Falta el phone_number_id de WhatsApp'};
  const configured=config.notification_templates?.[kind];
  const template=configured || (kind === 'confirmation' && config.template_name ? {name:config.template_name,language:'es',parameters:[]}:null);
  if(!template?.name) return {ok:false,error:`Falta la plantilla aprobada y configurada para ${kind}. No se enviará una plantilla de confirmación como recordatorio.`};
  const values=templateData(appt,String(config.portal_url || DEFAULT_PORTAL_URL));
  const parameters=Array.isArray(template.parameters) ? template.parameters : [];
  if(parameters.some((key:string)=>!(key in values)))return {ok:false,error:'La plantilla tiene parámetros desconocidos'};
  const payload={messaging_product:'whatsapp',to:to.replace(/^\+/,''),type:'template',template:{name:template.name,language:{code:template.language || 'es'},...(parameters.length ? {components:[{type:'body',parameters:parameters.map((key:keyof typeof values)=>({type:'text',text:values[key]}))}]}:{})}};
  try {
    const response=await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok || !data.messages?.[0]?.id){
      const err=data.error || {};
      const parts=[`HTTP ${response.status}`];
      if(err.type)parts.push(err.type);
      if(err.code)parts.push(`Código ${err.code}`);
      if(err.error_subcode)parts.push(`Subcódigo ${err.error_subcode}`);
      if(err.message)parts.push(err.message);
      if(err.fbtrace_id)parts.push(`Ref ${err.fbtrace_id}`);
      return {ok:false,error:parts.join(' · ') || `Meta no confirmó el envío (${response.status})`};
    }
    return {ok:true,id:String(data.messages[0].id)};
  }catch(error){return {ok:false,error:error instanceof Error ? error.message:'Error de red'};}
}
async function whatsappConsent(admin:any,appt:any) {
  const {data,error}=appt.client_id ? await admin.from('studio_clients').select('whatsapp_consent').eq('id',appt.client_id).maybeSingle():{data:null,error:null};
  if(error)throw error;
  const old=appt.client_snapshot?.remindersStatus || {};
  return !!data?.whatsapp_consent || (appt.booking_channel === 'portal' && (old.whatsapp48h === true || old.whatsapp24h === true || old.whatsapp2h === true));
}
async function readAppointment(admin:any,id:string) {
  const {data,error}=await admin.from('studio_appointments').select('*').eq('id',id).maybeSingle();
  if(error)throw error;return data;
}
async function claim(admin:any,table:string,row:any) {
  const {data,error}=await admin.from(table).update({status:'sending',attempts:(row.attempts || 0)+1}).eq('id',row.id).eq('status',row.status).eq('attempts',row.attempts || 0).select('id').maybeSingle();
  if(error)throw error;return !!data;
}
async function finish(admin:any,table:string,row:any,result:any,provider:string) {
  if(result.ok){
    const patch={status:'sent',sent_at:new Date().toISOString(),provider,provider_message_id:result.id || result.messageId || null,last_error:null};
    const {error}=await admin.from(table).update(patch).eq('id',row.id).eq('status','sending');if(error)throw error;
    return;
  }
  // Token/auth errors are not transient: park the row so it won't auto-retry
  // until an admin fixes the credential and requeues it.
  const tokenError=/HTTP 401|Código 190|Invalid OAuth|access token/i.test(result.error || '');
  const attempts=tokenError ? MAX_ATTEMPTS : (row.attempts || 0);
  const patch=result.expired ? {status:'skipped',last_error:result.error || 'Proveedor no confirmó el envío'}
    : {status:'failed',last_error:result.error || 'Proveedor no confirmó el envío',provider,attempts,scheduled_at:new Date(Date.now()+RETRY_DELAY_MINUTES*60000).toISOString()};
  const {error}=await admin.from(table).update(patch).eq('id',row.id).eq('status','sending');if(error)throw error;
}
async function skip(admin:any,table:string,id:string,reason:string) {
  const {error}=await admin.from(table).update({status:'skipped',last_error:reason}).eq('id',id).eq('status','sending');if(error)throw error;
}
function invalidMessage(row:any,appt:any):string|null {
  if(!appt)return 'Cita eliminada';
  if(row.kind === 'cancellation')return appt.lifecycle_status === 'cancelled' ? null:'La cita no está cancelada';
  if(row.kind === 'request_received')return ['cancelled','no_show'].includes(appt.lifecycle_status) || appt.approval_status === 'rejected' || appointmentIsConfirmed(appt) ? 'La solicitud ya no está pendiente':null;
  if(!appointmentIsConfirmed(appt))return 'Cita pendiente, rechazada, cancelada o finalizada';
  const start=Date.parse(notificationInstant(appt.starts_at));
  if(start <= Date.now())return 'La cita ya ha comenzado';
  if(row.expected_starts_at && Date.parse(row.expected_starts_at) !== Date.parse(appt.starts_at))return 'La cita ha cambiado de fecha';
  if(row.idempotency_key && !row.expected_starts_at) {
    const match=String(row.idempotency_key).match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)$/);
    if(match && Date.parse(match[1]) !== start)return 'Aviso de una fecha anterior';
  }
  if(row.kind === 'reminder_24h' && start-Date.now() <= 2*3600000)return 'El recordatorio de 24 horas ya está fuera de plazo';
  return null;
}

Deno.serve(async(req:Request)=>{
  if(req.method === 'OPTIONS')return new Response(null,{headers:corsHeaders});
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const url=new URL(req.url);
    const raw=req.method === 'GET' ? '':await req.text();
    let body:any={};try{body=raw ? JSON.parse(raw):{};}catch{return json({error:'JSON no válido'},400);}
    // Meta callbacks have separate verification; do not execute the dispatch loop.
    if(url.pathname.endsWith('/whatsapp') || url.searchParams.has('hub.mode')) {
      const {data:cfg}=await admin.from('studio_whatsapp_config').select('*').eq('id',true).maybeSingle();
      if(req.method === 'GET')return cfg?.verify_token && url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === cfg.verify_token ? new Response(url.searchParams.get('hub.challenge') || '',{status:200}):json({error:'No autorizado'},403);
      const secret=Deno.env.get('META_APP_SECRET');
      if(!secret)return json({error:'Falta META_APP_SECRET para verificar el webhook'},503);
      const sig=req.headers.get('x-hub-signature-256') || '';
      if(!/^sha256=[a-f0-9]{64}$/i.test(sig))return json({error:'Firma no válida'},401);
      const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
      const signature=Uint8Array.from(sig.slice(7).match(/../g)!,h=>parseInt(h,16));
      if(!await crypto.subtle.verify('HMAC',key,signature,new TextEncoder().encode(raw)))return json({error:'Firma no válida'},401);
      for(const entry of body.entry || [])for(const change of entry.changes || [])for(const st of change.value?.statuses || []) {
        if(!st.id || !['sent','delivered','read','failed'].includes(st.status))continue;
        const instant=st.timestamp ? new Date(Number(st.timestamp)*1000).toISOString():new Date().toISOString();
        const patch:any={};
        if(st.status === 'delivered')patch.delivered_at=instant;
        if(st.status === 'read'){patch.read_at=instant;patch.delivered_at=instant;}
        if(st.status === 'failed')patch.last_error=st.errors?.[0]?.title || 'Meta informó de un fallo de entrega';
        // Never downgrade read to delivered on an out-of-order callback.
        if(st.status === 'read')await admin.from('studio_whatsapp_outbox').update({...patch,status:'read'}).eq('provider_message_id',st.id);
        if(st.status === 'delivered')await admin.from('studio_whatsapp_outbox').update({...patch,status:'delivered'}).eq('provider_message_id',st.id).neq('status','read');
        if(st.status === 'failed')await admin.from('studio_whatsapp_outbox').update(patch).eq('provider_message_id',st.id);
        await admin.from('studio_notification_jobs').update({...(st.status === 'failed' ? {last_error:patch.last_error}:{}),provider_delivery_status:st.status}).eq('provider_message_id',st.id);
      }
      return json({ok:true});
    }
    const {data:cfg,error:configError}=await admin.from('studio_email_config').select('*').eq('id',true).maybeSingle();
    if(configError)throw configError;
    const secret=String(cfg?.worker_secret || '');
    if(!secret || (String(body.workerSecret || '') !== secret && url.searchParams.get('workerSecret') !== secret))return json({error:'No autorizado: falta secreto de worker válido'},401);
    if(url.pathname.endsWith('/email-status')) {
      const {data,error}=await admin.from('studio_email_outbox').select('id,kind,to_email,subject,status,scheduled_at,sent_at,provider,provider_message_id,last_error,attempts,created_at').eq('appointment_id',String(body.appointmentId || '')).order('created_at');
      if(error)throw error;return json({emails:data || []});
    }
    if(req.method !== 'POST' && req.method !== 'GET')return json({error:'Método no permitido'},405);
    const {data:waCfg,error:waConfigError}=await admin.from('studio_whatsapp_config').select('*').eq('id',true).maybeSingle();
    const report:any={email:{sent:0,failed:0,skipped:0},whatsapp:{sent:0,failed:0,skipped:0},push:{sent:0,failed:0,skipped:0},errors:[]};
    if(waConfigError)report.errors.push('WhatsApp: '+waConfigError.message);
    // Recover rows stuck in "sending" (previous invocation crashed mid-send).
    await admin.from('studio_whatsapp_outbox').update({status:'failed',last_error:'Recuperado de envío atascado'}).eq('status','sending');
    await admin.from('studio_email_outbox').update({status:'failed',last_error:'Recuperado de envío atascado'}).eq('status','sending');
    await admin.from('studio_notification_jobs').update({status:'failed',last_error:'Recuperado de envío atascado'}).eq('status','sending');
    const deadline=Date.now()+45000;
    for(const table of ['studio_email_outbox','studio_whatsapp_outbox','studio_notification_jobs']) {
      const {data:due,error}=await admin.from(table).select('*').in('status',['scheduled','failed']).lt('attempts',MAX_ATTEMPTS).lte('scheduled_at',new Date().toISOString()).order('scheduled_at').limit(30);
      if(error){report.errors.push(`${table}: ${error.message}`);continue;}
      for(const row of due || []) {
        if(Date.now()>deadline)break;
        const channel=table === 'studio_email_outbox' ? 'email':table === 'studio_whatsapp_outbox' ? 'whatsapp':row.channel;
        let claimed=false;
        try {
          if(!await claim(admin,table,row))continue;
          claimed=true;
          const appt=await readAppointment(admin,row.appointment_id);
          const invalid=invalidMessage(row,appt);
          if(invalid){await skip(admin,table,row.id,invalid);report[channel].skipped++;continue;}
          if(channel === 'email') {
            const result=cfg?.service_key && cfg?.from_email ? await sendViaResend(cfg.service_key,cfg.from_email,row.to_email,row.subject,row.body_html,row.id):{ok:false,error:'Falta API key de email o remitente verificado'};
            await finish(admin,table,row,result,'resend');report.email[result.ok?'sent':'failed']++;
            if(!result.ok)report.errors.push(result.error);
          } else if(channel === 'whatsapp') {
            if(!await whatsappConsent(admin,appt)){await skip(admin,table,row.id,'Sin autorización de WhatsApp de la clienta');report.whatsapp.skipped++;continue;}
            const result=await sendApprovedWhatsApp(waCfg || {},row.kind,row.to_phone,appt);
            await finish(admin,table,row,result,'meta_cloud_api');report.whatsapp[result.ok?'sent':'failed']++;
            if(!result.ok)report.errors.push(result.error);
          } else {
            const {data:sub,error:subError}=await admin.from('studio_push_subscriptions').select('*').eq('id',row.subscription_id).maybeSingle();
            if(subError)throw subError;
            if(!sub || sub.client_id !== appt.client_id){await skip(admin,table,row.id,'Dispositivo desactivado o de otra clienta');report.push.skipped++;continue;}
            const instant=notificationInstant(appt.starts_at);
            const kind=row.kind;
            const title=kind === 'reminder_24h' ? 'Mañana te esperamos':kind === 'reminder_2h' ? 'Tu cita es dentro de 2 horas':kind === 'update' ? 'Cita modificada':'Cita confirmada';
            const result=await sendWebPush(admin,sub.endpoint,sub.p256dh,sub.auth,{title,body:`${fmtDate(instant)} · ${fmtTime(instant)} h. ${templateData(appt,DEFAULT_PORTAL_URL).services}`,url:`/?cita=${appt.id}`,tag:`appt-${appt.id}-${kind}-${appt.starts_at}`,ttlSeconds:Math.max(1,Math.floor((Date.parse(instant)-Date.now())/1000))});
            await finish(admin,table,row,result,'web_push');report.push[result.ok?'sent':'failed']++;
            if(!result.ok){report.errors.push(result.error);if(result.expired)await admin.from('studio_push_subscriptions').delete().eq('id',sub.id);}
          }
        }catch(error){
          const message=error instanceof Error ? error.message:String((error as any)?.message || error);
          report.errors.push(message);
          if(claimed)await finish(admin,table,row,{ok:false,error:message},channel === 'email'?'resend':channel === 'push'?'web_push':'meta_cloud_api');
          report[channel].failed++;
        }
      }
    }
    return json({ok:report.errors.length === 0,...report,errors:report.errors.slice(0,20)});
  }catch(error){return json({error:error instanceof Error ? error.message:String((error as any)?.message || error)},500);}
});
