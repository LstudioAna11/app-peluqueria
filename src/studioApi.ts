// Cliente del servidor 360studio: autenticación por PIN, sincronización y reservas.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

export const serverConfigured = Boolean(supabaseUrl && anonKey);

const endpoint = (action: string) => `${supabaseUrl}/functions/v1/studio-api/${action}`;

const TOKEN_KEY = 'lst_api_token';
const TOKEN_ROLE_KEY = 'lst_api_role';

export type ServerRole = 'admin' | 'client';

const getStoredToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

const storeToken = (token: string, role: ServerRole) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_ROLE_KEY, role);
  } catch { /* sin espacio no debe romper la sesión */ }
};

export const clearStoredToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_ROLE_KEY);
  } catch { /* noop */ }
};

export const storedRole = (): ServerRole | null => {
  try {
    const role = localStorage.getItem(TOKEN_ROLE_KEY);
    return role === 'admin' || role === 'client' ? role : null;
  } catch { return null; }
};

const call = async <T>(action: string, options: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> => {
  if (!serverConfigured) throw new Error('Servidor no configurado');
  const response = await fetch(endpoint(action), {
    method: options.method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      apikey: anonKey,
    },
    body: options.method === 'GET' || options.method === 'DELETE' && false ? undefined : options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((payload as { error?: string }).error || `Error ${response.status}`);
  return payload as T;
};

export interface AuthResult {
  role: ServerRole;
  token: string;
  clientId?: string;
}

export const authenticate = async (pin: string): Promise<AuthResult> => {
  const result = await call<AuthResult>('auth', { body: { pin } });
  storeToken(result.token, result.role);
  return result;
};

export const currentToken = getStoredToken;

export const syncAll = <T>(token: string) => call<T>('sync', { token });

export const pushCatalog = (token: string, catalog: unknown) =>
  call<{ ok: true }>('catalog', { method: 'PUT', token, body: { catalog } });

export const pushSettings = (token: string, settings: unknown) =>
  call<{ ok: true }>('settings', { method: 'PUT', token, body: { settings } });

export const createClientOnServer = (token: string, client: Record<string, unknown>) =>
  call<{ ok: true; id: string; legacyId: number }>('client', { token, body: client });

export const pushPassport = (token: string, passport: Record<string, unknown>) =>
  call<{ ok: true }>('passport', { token, body: passport });

export const createClosure = (token: string, closure: Record<string, unknown>) =>
  call<{ ok: true; id: string }>('closure', { token, body: closure });

export const deleteClosure = (token: string, id: string) =>
  call<{ ok: true }>('closure', { method: 'DELETE', token, body: { id } });

export const createTimeBlock = (token: string, block: Record<string, unknown>) =>
  call<{ ok: true; id: string }>('timeblock', { token, body: block });

export const deleteTimeBlock = (token: string, id: string) =>
  call<{ ok: true }>('timeblock', { method: 'DELETE', token, body: { id } });

export interface ServerAppointmentInput {
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
}

export const createAppointmentOnServer = (token: string, appointment: ServerAppointmentInput) =>
  call<{ ok: true; id: string }>('appointment', { token, body: appointment });

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
  call<{ ok: true }>('appointment', { method: 'PUT', token, body: patch });

export const deleteAppointmentOnServer = (token: string, id: string) =>
  call<{ ok: true }>('appointment', { method: 'DELETE', token, body: { id } });

export interface UploadedServiceImage {
  ok: true;
  url: string;
  path: string;
}

export const uploadServiceImage = (token: string, dataUrl: string) =>
  call<UploadedServiceImage>('service-image', { method: 'POST', token, body: { dataUrl } });

export const deleteServiceImage = (token: string, path: string) =>
  call<{ ok: true }>('service-image', { method: 'DELETE', token, body: { path } });
