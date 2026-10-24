// Only appointment labels change. Portal titles and historical records stay intact.
type NamedService = { id?: string; name?: string; bookingName?: string };
type Category = { subservices: NamedService[] };
type AppointmentServices = { services?: { sub: NamedService; variant?: { name?: string } | null }[]; serviceSubcategory?: string };
const CONFIRMED_NAMES: Record<string, string> = {
  'tu cabello en su mejor version': 'Styling & Peinados',
  'tu cabello ha cambiado y no sabes por que': 'Diagnóstico capilar con microcámara',
};
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[¿?¡!.,]/g, '').replace(/\s+/g, ' ').trim();
export function getBookingName(service: NamedService, catalog: Category[] = []): string {
  const current = service.id ? catalog.flatMap(category => category.subservices).find(item => item.id === service.id) : undefined;
  return current?.bookingName?.trim() || service.bookingName?.trim() || CONFIRMED_NAMES[normalize(current?.name || service.name || '')] || current?.name?.trim() || service.name?.trim() || 'Servicio';
}
export function compactServiceText(text: string, catalog: Category[] = []): string {
  let result = text;
  const names = catalog.flatMap(category => category.subservices).filter(item => item.name && getBookingName(item, catalog) !== item.name).sort((a,b) => (b.name?.length || 0) - (a.name?.length || 0));
  for (const item of names) result = result.split(item.name!).join(getBookingName(item, catalog));
  // Known titles also cover snapshots no longer present in the catalogue.
  result = result.replace(/¿?Tu cabello ha cambiado y no sabes por qu[eé]\??/gi, 'Diagnóstico capilar con microcámara').replace(/Tu cabello,? en su mejor versi[oó]n/gi, 'Styling & Peinados');
  return result;
}
export function getAppointmentServiceNames(appointment: AppointmentServices, catalog: Category[] = []): string {
  if (appointment.services?.length) return appointment.services.map(item => getBookingName(item.sub, catalog) + (item.variant?.name ? ' · ' + item.variant.name : '')).join(' + ');
  return compactServiceText((appointment.serviceSubcategory || '').replace(/^(RESERVADO|PENDIENTE (?:SÁBADO|VALORACIÓN|BIZUM))\s*/, ''), catalog);
}
