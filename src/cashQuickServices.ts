import type { Appointment, CatalogCategory, SubService } from './App';
import { exactPrice } from './promotionPricing';
import { isStraighteningSupplement } from './StraighteningProduct';

type QuickVariant = { id: string; label: string; priceCents: number | null };
export type CashQuickService = QuickVariant & { variants: QuickVariant[] };

export function cashQuickServices(
  catalog: CatalogCategory[], appointments: Appointment[], bookingName: (service: SubService) => string, today: string,
): CashQuickService[] {
  const from = new Date(today + 'T00:00:00Z');
  from.setUTCDate(from.getUTCDate() - 89);
  const firstDay = from.toISOString().slice(0, 10);
  const counts = new Map<string, number>();

  for (const appointment of appointments) {
    if (!appointment.completedAt || appointment.lifecycleStatus || appointment.dateKey < firstDay || appointment.dateKey > today) continue;
    for (const id of new Set(appointment.services?.map(({ sub }) => sub.id))) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  return catalog.flatMap(category => category.subservices)
    .filter(service => service.active !== false && !isStraighteningSupplement(service))
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
    .map(service => {
      const fixed = !service.priceType || service.priceType === 'fijo';
      function priceInCents(value: string): number | null {
        const price = fixed ? exactPrice(value) : null;
        const cents = price === null ? null : Math.round(price * 100);
        return cents !== null && cents > 0 && cents <= 99_999_999 ? cents : null;
      }
      return {
        id: service.id,
        label: bookingName(service),
        priceCents: priceInCents(service.price),
        variants: service.hasVariants
          ? (service.variants ?? []).map(variant => ({ id: variant.id, label: variant.name, priceCents: priceInCents(variant.price) }))
          : [],
      };
    });
}
