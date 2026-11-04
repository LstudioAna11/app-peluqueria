import React, {useEffect, useState} from 'react';
import * as studioApi from './studioApi';
import {ProtectedCache} from './privateCache';
const projectUrl = String(import.meta.env.VITE_SUPABASE_URL || '');
const publishableKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '');
const LOCK_EVENT = 'lst-private-session-ended';
const CACHE_ERROR_EVENT = 'lst-private-cache-error';
export const privateStorage = new ProtectedCache(localStorage, studioApi.serverConfigured, projectUrl,
  message => window.dispatchEvent(new CustomEvent(CACHE_ERROR_EVENT, {detail: message})));
let unlockedToken: string | null = null;
let mountedSessionToken: string | null = null;
let opening: {token: string; promise: Promise<void>} | null = null;
async function openAdminCache(): Promise<void> {
  const token = studioApi.currentToken();
  if (!token || studioApi.storedRole() !== 'admin') throw new Error('Necesitas una sesión de administración.');
  if (privateStorage.ready && unlockedToken === token) return;
  if (opening?.token === token) return opening.promise;
  const promise = (async () => {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(projectUrl + '/functions/v1/studio-api/private-cache-key', {
        method: 'POST', headers: {'Content-Type': 'application/json', apikey: publishableKey, Authorization: 'Bearer ' + token},
        body: '{}', signal: controller.signal, cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? 'La sesión ha caducado. Vuelve a entrar con tu PIN.' : 'No se pudo abrir la protección local. Comprueba que has instalado el SQL y la API de este cambio.');
      if (studioApi.currentToken() !== token || studioApi.storedRole() !== 'admin') throw new Error('La sesión ha cambiado.');
      await privateStorage.unlock(data.key);
      if (studioApi.currentToken() !== token || studioApi.storedRole() !== 'admin') { privateStorage.lock(); throw new Error('La sesión ha cambiado.'); }
      unlockedToken = token;
    } finally { clearTimeout(timeout); }
  })();
  opening = {token, promise};
  try { await promise; } finally { if (opening?.promise === promise) opening = null; }
}
// A newly authenticated administrator remounts once, after all local state is available.
export async function ensureAdminPrivateSession(): Promise<void> {
  if (!studioApi.serverConfigured) return;
  const token = studioApi.currentToken();
  const adminReady = studioApi.storedRole() !== 'admin' || (privateStorage.ready && unlockedToken === token);
  if (token === mountedSessionToken && adminReady) return;
  // A different identity must never inherit the previous component state.
  privateStorage.lock(); unlockedToken = null;
  window.location.reload();
  await new Promise<void>(() => {});
}
export function clearStudioSession(): void {
  privateStorage.lock(); unlockedToken = null;
  studioApi.clearStoredToken();
  window.dispatchEvent(new Event(LOCK_EVENT));
}
export async function flushPrivateCache(): Promise<void> { await privateStorage.flush(); }
export function PrivateSessionGate({children}: {children: React.ReactElement}) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState(''), [cacheError, setCacheError] = useState('');
  const [attempt, setAttempt] = useState(0), [generation, setGeneration] = useState(0);
  useEffect(() => {
    let active = true;
    mountedSessionToken = studioApi.currentToken();
    if (!studioApi.serverConfigured || !studioApi.currentToken() || studioApi.storedRole() !== 'admin') { setState('ready'); return; }
    setState('loading'); setError('');
    void openAdminCache().then(() => {if (active) setState('ready');}).catch(value => {
      if (active) {setError(value instanceof Error ? value.message : 'No se pudieron abrir los datos locales.'); setState('error');}
    });
    return () => {active = false;};
  }, [attempt]);
  useEffect(() => {
    const ended = () => {setGeneration(value => value + 1); setCacheError(''); setState('ready');};
    const changed = (event: StorageEvent) => {
      if (event.key === null || ['lst_api_token', 'lst_api_role', 'lst_client_id'].includes(event.key)) {
        privateStorage.lock(); unlockedToken = null; window.location.reload();
      }
    };
    const failed = (event: Event) => setCacheError(String((event as CustomEvent).detail || 'No se han guardado todos los datos locales.'));
    window.addEventListener(LOCK_EVENT, ended); window.addEventListener('storage', changed); window.addEventListener(CACHE_ERROR_EVENT, failed);
    const closing = (event: BeforeUnloadEvent) => {if (cacheError) {event.preventDefault(); event.returnValue = '';}};
    window.addEventListener('beforeunload', closing);
    return () => {window.removeEventListener(LOCK_EVENT, ended); window.removeEventListener('storage', changed); window.removeEventListener(CACHE_ERROR_EVENT, failed); window.removeEventListener('beforeunload', closing);};
  }, [cacheError]);
  const style: React.CSSProperties = {maxWidth: 480, margin: '60px auto', padding: 24, color: '#F3E7D5', background: '#29231F', border: '1px solid #B9955F', borderRadius: 12, lineHeight: 1.6};
  if (state === 'loading') return <div role="status" style={style}>Preparando tu sesión…</div>;
  if (state === 'error') return <div role="alert" style={style}><p>{error}</p><p>Tus datos locales se conservan. No borres los datos del navegador.</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Reintentar</button>{' '}<button type="button" onClick={clearStudioSession}>Volver al acceso</button></div>;
  return <>{cacheError && <div role="alert" style={style}>{cacheError} <button type="button" onClick={() => void flushPrivateCache().then(() => setCacheError('')).catch(() => {})}>Reintentar guardado local</button></div>}{React.cloneElement(children, {key: generation})}</>;
}
