const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/studio-api`;

export const serverConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const TOKEN_KEY = "lst_api_token";
const ROLE_KEY = "lst_api_role";
const CLIENT_ID_KEY = "lst_client_id";
const EXPIRES_KEY = "lst_api_expires";

export const currentToken = (): string | null => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

export const storedRole = (): string | null => {
  try { return localStorage.getItem(ROLE_KEY); } catch { return null; }
};

export const storedClientId = (): string | null => {
  try { return localStorage.getItem(CLIENT_ID_KEY); } catch { return null; }
};

export const clearStoredToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(CLIENT_ID_KEY);
    localStorage.removeItem(EXPIRES_KEY);
  } catch { /* ignore */ }
};

const storeSession = (result: { token: string; role: string; clientId?: string; expiresAt?: string }) => {
  try {
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(ROLE_KEY, result.role);
    if (result.clientId) localStorage.setItem(CLIENT_ID_KEY, result.clientId);
    else localStorage.removeItem(CLIENT_ID_KEY);
    if (result.expiresAt) localStorage.setItem(EXPIRES_KEY, result.expiresAt);
  } catch { /* ignore */ }
};

export interface AuthResult {
  role: string;
  token: string;
  clientId?: string;
  expiresAt?: string;
  whatsappConsent?: boolean;
}

export const authenticate = async (pin: string): Promise<AuthResult> => {
  const data = await call<AuthResult>("auth", { body: { pin } });
  storeSession(data);
  return data;
};

const call = async <T = Record<string, unknown>>(
  action: string,
  opts: { method?: string; token?: string; body?: unknown } = {}
): Promise<T> => {
  if (!serverConfigured) throw new Error("Servidor no configurado");
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  const res = await fetch(`${EDGE_FUNCTION_URL}/${encodeURIComponent(action)}`, {
    method: opts.method || "POST",
    headers,
    body: opts.method === "GET" || opts.method === "HEAD" || opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error del servidor");
  return data as T;
};

export const syncAll = <T>(token: string) => call<T>("sync", { token });

export const fetchPublicCatalog = <T = { catalog: { id: string; category: unknown }[]; employees?: { id: string; name: string; role: string; photo: string; status: string }[] }>() =>
  call<T>("public-catalog", { method: "GET" });

export const pushCatalog = (token: string, catalog: unknown) =>
  call<{ ok: true }>("catalog", { method: "PUT", token, body: { catalog } });

export const pushSettings = (token: string, settings: unknown) =>
  call<{ ok: true }>("settings", { method: "PUT", token, body: { settings } });

export const createClientOnServer = (token: string, client: Record<string, unknown>) =>
  call<{ ok: true; id: string; legacyId: number }>("client", { token, body: client });

export const pushPassport = (token: string, passport: Record<string, unknown>) =>
  call<{ ok: true }>("passport", { token, body: passport });

export const createClosure = (token: string, closure: Record<string, unknown>) =>
  call<{ ok: true; id: string }>("closure", { token, body: closure });

export const deleteClosure = (token: string, id: string) =>
  call<{ ok: true }>("closure", { method: "DELETE", token, body: { id } });

export const createTimeBlock = (token: string, block: Record<string, unknown>) =>
  call<{ ok: true; id: string }>("timeblock", { token, body: block });

export const deleteTimeBlock = (token: string, id: string) =>
  call<{ ok: true }>("timeblock", { method: "DELETE", token, body: { id } });

export interface ServerAppointmentInput {
  promotionId?: string;
  promotionOriginId?: string;
  id?: string;
  clientId?: string | null;
  dateKey: string;
  time: string;
  dayName?: string;
  durationMinutes?: number;
  bookingChannel?: 'portal' | 'admin';
  lifecycleStatus?: string | null;
  approval?: { status: string; reason?: string; reference?: string } | null;
  advancePayment?: { status: string; amount?: number; reference?: string } | null;
  services?: unknown;
  clientName?: string;
  phone?: string;
  email?: string;
  serviceCategory?: string;
  serviceSubcategory?: string;
  selectedVariant?: unknown;
  remindersStatus?: unknown;
  professionalId?: string | null;
  professionalName?: string | null;
}

export const createAppointmentOnServer = (token: string, appointment: ServerAppointmentInput) =>
  call<{ ok: true; id: string }>("appointment", { token, body: appointment });

export interface ServerAppointmentPatch {
  id: string;
  dateKey?: string;
  time?: string;
  dayName?: string;
  durationMinutes?: number;
  lifecycleStatus?: string | null;
  approval?: { status: string; reason?: string; reference?: string } | null;
  advancePayment?: { status: string; amount?: number; reference?: string } | null;
  internalNotes?: string;
  services?: unknown;
  clientSnapshot?: unknown;
  completedAt?: string | null;
}

export const updateAppointmentOnServer = (token: string, patch: ServerAppointmentPatch) =>
  call<{ ok: true }>("appointment", { method: "PUT", token, body: patch });

export const deleteAppointmentOnServer = (token: string, id: string) =>
  call<{ ok: true }>("appointment", { method: "DELETE", token, body: { id } });

export interface UploadedServiceImage {
  ok: true;
  url: string;
  path: string;
}

export const uploadServiceImage = (token: string, dataUrl: string) =>
  call<UploadedServiceImage>("service-image", { method: "POST", token, body: { dataUrl } });

export const deleteServiceImage = (token: string, path: string) =>
  call<{ ok: true }>("service-image", { method: "DELETE", token, body: { path } });

export interface AppointmentEmailRow {
  id: string;
  kind: string;
  to_email: string;
  subject: string;
  status: 'scheduled' | 'sending' | 'sent' | 'failed' | 'skipped';
  scheduled_at: string;
  sent_at: string | null;
  provider: string | null;
  provider_message_id: string | null;
  last_error: string | null;
  attempts: number;
  created_at: string;
}

export const fetchAppointmentEmails = (token: string, appointmentId: string) =>
  call<{ emails: AppointmentEmailRow[] }>("email-status", { token, body: { appointmentId } });

export interface EmailConfigStatus {
  providerConfigured: boolean;
  portalUrl: string | null;
  fromEmail: string | null;
  provider: string | null;
}

export const fetchEmailConfigStatus = (token: string) =>
  call<EmailConfigStatus>("email-config", { token, body: {} });

export interface AppointmentWhatsAppRow {
  id: string;
  kind: string;
  to_phone: string;
  status: 'scheduled' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped';
  scheduled_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  provider: string | null;
  provider_message_id: string | null;
  body_text: string;
  last_error: string | null;
  attempts: number;
  created_at: string;
}

export const fetchAppointmentWhatsApp = (token: string, appointmentId: string) =>
  call<{ messages: AppointmentWhatsAppRow[] }>("whatsapp-status", { token, body: { appointmentId } });

export interface WhatsAppConfigStatus {
  providerConfigured: boolean;
  missing: string[];
  provider: string | null;
  templateName: string | null;
  studioPhone: string | null;
  portalUrl: string | null;
}

export const fetchWhatsAppConfigStatus = (token: string) =>
  call<WhatsAppConfigStatus>("whatsapp-config", { token, body: {} });

export const saveWhatsAppConsent = (token: string, consent: boolean) =>
  call<{ ok: true; whatsappConsent: boolean }>("whatsapp-consent", { method: "PUT", token, body: { consent } });

export const retryWhatsAppConfirmation = (token: string, appointmentId: string) =>
  call<{ ok: true; retried: number }>("whatsapp-retry", { token, body: { appointmentId } });

export interface PushStatusRow {
  id: string;
  kind: string;
  status: 'accepted' | 'delivered' | 'failed' | 'expired' | 'sending';
  provider: string | null;
  provider_message_id: string | null;
  delivered_at: string | null;
  last_error: string | null;
  attempts: number;
  created_at: string;
  subscription_id: string | null;
  studio_push_subscriptions: { user_agent: string } | null;
}

export const fetchPushPublicKey = (token: string) =>
  call<{ publicKey: string }>("push-public-key", { token, body: {} });

export const subscribePush = (token: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent: string }) =>
  call<{ ok: true; id: string }>("push-subscribe", { method: "POST", token, body: subscription });

export const unsubscribePush = (token: string, endpoint: string) =>
  call<{ ok: true }>("push-unsubscribe", { method: "POST", token, body: { endpoint } });

export const sendTestPush = (token: string) =>
  call<{ ok: true; sent: number; errors: string[] }>("push-test", { method: "POST", token, body: {} });

export const fetchAppointmentPushes = (token: string, appointmentId: string) =>
  call<{ pushes: PushStatusRow[] }>("push-status", { method: "POST", token, body: { appointmentId } });

export const setClientArchived = (token: string, clientId: string, archived: boolean) =>
  call<{ ok: true; archivedAt: string | null }>("client-status", {
    method: "PUT", token, body: { clientId, archived },
  });

export interface SavedFeedback { id: string; rating: number; comment: string | null; created_at: string; }
export const submitFeedback = (token: string, feedback: { id: string; rating: number; comment: string }) =>
  call<{ ok: true; feedback: SavedFeedback }>('feedback', { token, body: feedback });
export const updateFeedbackStatus = (token: string, id: string, resolved: boolean) =>
  call<{ ok: true; resolvedAt: string | null }>('feedback-status', { method: 'PUT', token, body: { id, resolved } });

export const fetchPublicBranding = () => call<{ brandLogoUrl: string | null; headerLogoUrl: string | null }>('branding', { method: 'GET' });

export const fetchOfficialHolidays = (token: string, year: number) => call<{days:any[];state:any}>('official-holidays',{token,body:{year}});
export const refreshOfficialHolidays = (token: string, year: number) => call<any>('official-holidays-refresh',{token,body:{year}});
export const setOfficialHolidayOpen = (token: string, day: string, open: boolean) => call<any>('official-holidays-open',{method:'PUT',token,body:{day,open}});
