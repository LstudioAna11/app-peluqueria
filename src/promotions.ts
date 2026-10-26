export interface Promotion {
  bookingServiceId?: string;
  id: string; title: string; description: string; imageUrl: string;
  price: string; conditions: string; startDate: string; endDate: string; active: boolean;
}
export const madridToday = (now = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export const isVisiblePromotion = (p: Promotion, today = madridToday()) => p.active === true && !!p.title && (!p.startDate || p.startDate <= today) && (!p.endDate || p.endDate >= today);
export const safePromotionImage = (url: string) => {
  if (!url) return '';
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try { return new URL(url).protocol === 'https:' ? url : ''; } catch { return ''; }
};
