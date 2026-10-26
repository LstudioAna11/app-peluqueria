export interface PromotionDiscount {
  promotionId: string; title: string; serviceId: string; serviceName: string; variantName: string;
  percent: number; originalAmount: number; finalAmount: number; discountAmount: number;
  startDate: string; endDate: string; totalBefore: number | null; totalAfter: number | null; orientative: boolean;
}
export function exactPrice(value: unknown): number | null {
  const text = String(value ?? '').trim().replace(/\s/g, '').replace(/€/g, '');
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null;
  const amount = Number(text.replace(',', '.'));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}
export function calculatePromotionDiscount(promo: any, selection: any[], catalog: any[], date = '', today = ''): PromotionDiscount {
  if (!promo || promo.active !== true) throw new Error('La promoción ya no está activa.');
  for (const day of [date, today].filter(Boolean)) {
    if ((promo.startDate && day < promo.startDate) || (promo.endDate && day > promo.endDate)) throw new Error('La fecha debe estar dentro de la vigencia de la promoción.');
  }
  const ids: string[] = Array.from(new Set(Array.isArray(promo.bookingServiceIds) ? promo.bookingServiceIds : promo.bookingServiceId ? [promo.bookingServiceId] : []));
  if (!ids.length || !ids.every(id => selection.some(item => item?.sub?.id === id))) throw new Error('La reserva debe incluir todos los servicios de la promoción.');
  if (new Set(selection.map(item => item?.sub?.id)).size !== selection.length) throw new Error('Hay servicios repetidos en la reserva.');
  const serviceId = String(promo.discountServiceId || '');
  const percent = Number(promo.discountPercent);
  if (!ids.includes(serviceId) || !Number.isFinite(percent) || percent <= 0 || percent > 100) throw new Error('La promoción no tiene un descuento válido configurado.');
  const selected = selection.find(item => item?.sub?.id === serviceId);
  const sub = catalog.find(item => item?.id === serviceId && item.active !== false);
  if (!selected || !sub) throw new Error('El servicio con descuento ya no está disponible.');
  const variant = sub.hasVariants && sub.variants?.length ? sub.variants.find((item: any) => item.id === selected.variant?.id) : null;
  if (sub.hasVariants && sub.variants?.length && !variant) throw new Error('Elige la variante del servicio para calcular el descuento.');
  const amount = exactPrice(variant?.price ?? sub.price);
  if (amount === null || (!variant && sub.priceType && sub.priceType !== 'fijo')) throw new Error('El servicio con descuento necesita un precio cerrado para aplicar la promoción.');
  let totalCents = 0;
  let unknownPrice = false;
  let orientative = false;
  for (const item of selection) {
    const service = catalog.find(sub => sub.id === item?.sub?.id && sub.active !== false);
    if (!service) throw new Error('Hay servicios no disponibles en la promoción.');
    const option = service.hasVariants && service.variants?.length ? service.variants.find((v: any) => v.id === item.variant?.id) : null;
    if (service.hasVariants && service.variants?.length && !option) throw new Error('Elige las variantes de todos los servicios antes de continuar.');
    const price = exactPrice(option?.price ?? service.price);
    if (price === null) unknownPrice = true;
    else totalCents += Math.round(price * 100);
    if (price === null || (service.priceType && service.priceType !== 'fijo')) orientative = true;
  }
  const cents = Math.round(amount * 100);
  const finalCents = Math.round(cents * (100 - percent) / 100);
  return { promotionId: promo.id, title: promo.title, serviceId, serviceName: sub.bookingName?.trim() || sub.name, variantName: variant?.name || '', percent, originalAmount: cents / 100, finalAmount: finalCents / 100, discountAmount: (cents - finalCents) / 100, startDate: promo.startDate || '', endDate: promo.endDate || '', totalBefore: unknownPrice ? null : totalCents / 100, totalAfter: unknownPrice ? null : (totalCents - (cents - finalCents)) / 100, orientative };
}
