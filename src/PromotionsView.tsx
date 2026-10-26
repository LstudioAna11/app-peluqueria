import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as studioApi from './studioApi';
import { Promotion, isVisiblePromotion, madridToday, safePromotionImage } from './promotions';
import './promotions.css';
type BookingServiceOption = { id: string; label: string };
type PromoBookingProps = { onReserve?: (promotion: Promotion) => boolean; serviceOptions?: BookingServiceOption[] };

export function PromotionsPortal({ promotions = [], onReserve, serviceOptions = [] }: { promotions?: Promotion[] } & PromoBookingProps) {
  const [today, setToday] = useState(madridToday);
  useEffect(() => { const id = window.setInterval(() => setToday(madridToday()), 60000); return () => clearInterval(id); }, []);
  const visible = promotions.filter(p => isVisiblePromotion(p, today));
  if (!visible.length) return null;
  return <section className="lst-promotions" aria-label="Promociones del Studio"><h2>Un motivo más para cuidarte</h2><p>Las promociones del Studio, aquí para ti.</p><div className="lst-promo-grid">{visible.map(p => <article className="lst-promo-card" key={p.id}>
    {safePromotionImage(p.imageUrl) && <img src={safePromotionImage(p.imageUrl)} alt="" loading="lazy" decoding="async" />}
    <div className="lst-promo-body"><h3>{p.title}</h3><p>{p.description}</p>{p.price && <strong className="lst-promo-price">{p.price}</strong>}{p.endDate && <p>Hasta el {p.endDate.split('-').reverse().join('/')}</p>}{p.conditions && <details><summary>Condiciones</summary><p>{p.conditions}</p></details>}{onReserve && p.bookingServiceId && (
      serviceOptions.some(service => service.id === p.bookingServiceId)
        ? <button type="button" onClick={() => onReserve(p)}>Reservar promoción</button>
        : <p>El servicio de esta promoción no está disponible para reservar ahora.</p>
    )}</div>
  </article>)}</div></section>;
}
