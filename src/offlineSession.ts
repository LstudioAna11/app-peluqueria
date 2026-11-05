// Session-only consultation. No credentials, private snapshots or encryption keys are persisted here.
export const OFFLINE_EVENT = 'lst-offline-consultation';
let consultation = typeof navigator !== 'undefined' && !navigator.onLine;
let agendaAt = '', clientsAt = '';
export const offlineConsultation = () => consultation || !navigator.onLine;
export function enterOfflineConsultation() {
  consultation = true;
  window.dispatchEvent(new Event(OFFLINE_EVENT));
}
export function clearOfflineConsultation() { consultation = false; agendaAt = ''; clientsAt = ''; }
export function markOfflineData(section: 'agenda' | 'clients') {
  if (offlineConsultation()) return;
  if (section === 'agenda') agendaAt = new Date().toISOString();
  else clientsAt = new Date().toISOString();
}
export const offlineDataTimes = () => ({agendaAt, clientsAt});
if (typeof window !== 'undefined') window.addEventListener('offline', enterOfflineConsultation);
