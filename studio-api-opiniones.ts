type OfficialHoliday = { day: string; name: string; scope: 'nacional' | 'autonomico' | 'local'; source_url: string };
function parseElcheCalendar(data: any, year: number): OfficialHoliday[] {
  if (data?.year !== undefined && Number(data.year) !== year) throw new Error('El año de la fuente no coincide con el solicitado.');
  if (data?.calendarType !== undefined && data.calendarType !== 'laboral') throw new Error('La fuente no es un calendario laboral.');
  if (data?.municipality?.ine !== undefined && String(data.municipality.ine) !== '03065') throw new Error('El calendario recibido no corresponde a Elche.');
  if (data?.schemaVersion !== undefined && data.schemaVersion !== 1) throw new Error('Versión de calendario no compatible (lector 2).');
  const holidays = data?.holidays;
  let list: any;
  if (Array.isArray(data)) list = data;
  else if (Array.isArray(holidays)) list = holidays;
  else if (Array.isArray(holidays?.calendar)) list = holidays.calendar;
  else if (holidays && ['national','regional','local'].every(key => Array.isArray(holidays[key]))) {
    list = [...holidays.national, ...holidays.regional, ...(Array.isArray(holidays.provincial) ? holidays.provincial : []), ...holidays.local];
  } else list = data?.festivos ?? data?.data?.holidays;
  if (!Array.isArray(list)) throw new Error('Formato de calendario no compatible (lector 2).');
  const records = new Map<string, OfficialHoliday>();
  for (const item of list) {
    const day = String(item.date || '');
    if (!new RegExp('^'+year+'-\\d{2}-\\d{2}$').test(day) || new Date(day+'T12:00:00Z').toISOString().slice(0,10) !== day) throw new Error('Fecha inválida en el calendario.');
    const scope = String(item.scope || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if (!['nacional','autonomico','local'].includes(scope)) continue;
    const name = String(item.name || '').trim();
    let url: URL;
    try { url = new URL(item.sourceUrl); } catch { continue; }
    const hosts = ['boe.es','gva.es','elche.es','diputacionalicante.es','dip-alicante.es'];
    if (url.protocol !== 'https:' || !hosts.some(host => url.hostname===host || url.hostname.endsWith('.'+host))) continue;
    if (!name || /pendiente|provisional|estimad/i.test(name)) continue;
    records.set(day, { day, name: name.slice(0,200), scope: scope as OfficialHoliday['scope'], source_url: url.href });
  }
  const rows = [...records.values()].sort((a,b)=>a.day.localeCompare(b.day));
  if (rows.filter(row => row.scope !== 'local').length < 12 || rows.length > 16) throw new Error('El calendario no está completo o contiene demasiadas fechas. Se conserva el anterior.');
  return rows;
}
async function refreshElcheYear(admin: any, year: number) {
  const {data:state,error:readError}=await admin.from('studio_holiday_sync').select('*').eq('year',year).maybeSingle();
  if(readError) throw new Error('Primero ejecuta la instalación SQL de festivos.');
  const cacheDays = state?.status === 'pending' || state?.status === 'stale' ? 1 : 28;
  // Retry immediately after upgrading the reader that rejected holidays.calendar.
  const legacyParserFailure = state?.message === 'La fuente no devuelve un calendario reconocible.';
  if(state && !legacyParserFailure && Date.now()-new Date(state.checked_at).getTime()<cacheDays*86400000) return state;
  try {
    const url=`https://calendariosnacionales.com/es/v1/${year}/localidades/val/alicante/elche-elx.json`;
    const response=await fetch(url,{signal:AbortSignal.timeout(12000),redirect:'error',headers:{Accept:'application/json'}});
    if(!response.ok) throw new Error(response.status===404 ? 'Año todavía no publicado por el proveedor.' : 'La fuente no está disponible ('+response.status+').');
    const rows=parseElcheCalendar(await response.json(),year);
    const {error}=await admin.rpc('studio_merge_official_holidays',{p_year:year,p_rows:rows});
    if(error)throw new Error('No se pudo guardar el calendario.');
  } catch(error) {
    const message=error instanceof Error ? error.message : 'No se pudo actualizar. Se conserva el calendario anterior.';
    const {error:saveError}=await admin.from('studio_holiday_sync').upsert({year,checked_at:new Date().toISOString(),status:state?.imported_at?'stale':'pending',imported_at:state?.imported_at||null,message});
    if(saveError)throw new Error('No se pudo guardar el estado de actualización.');
  }
  const {data,error}=await admin.from('studio_holiday_sync').select('*').eq('year',year).single();
  if(error)throw new Error('No se pudo leer el estado del calendario.');
  return data;
}
async function blockedOfficialDay(admin: any, day: string): Promise<boolean> {
  const {data,error}=await admin.from('studio_official_holidays').select('day').eq('day',day).eq('is_open',false).maybeSingle();
  if(error)throw new Error('No se pudo comprobar el calendario de festivos.');
  return !!data;
}

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// Promotion pricing is bundled here: no additional deployment file required.
interface PromotionDiscount {
  promotionId: string; title: string; serviceId: string; serviceName: string; variantName: string;
  percent: number; originalAmount: number; finalAmount: number; discountAmount: number;
  startDate: string; endDate: string; totalBefore: number | null; totalAfter: number | null; orientative: boolean;
}
function exactPrice(value: unknown): number | null {
  const text = String(value ?? '').trim().replace(/\s/g, '').replace(/€/g, '');
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null;
  const amount = Number(text.replace(',', '.'));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}
function calculatePromotionDiscount(promo: any, selection: any[], catalog: any[], date = '', today = ''): PromotionDiscount {
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


type AppointmentDiscount={kind:'percent'|'amount'|'gift';value:number;originalPrice:string;originalPriceType?:string;originalAmount:number|null;finalAmount:number;discountAmount:number|null};
type DiscountableLine={sub:{price:string;priceType?:string};variant:{price:string}|null;appointmentDiscount?:AppointmentDiscount};
const discountMoney=(value:number)=>value.toFixed(2).replace('.',',')+' €';
function clearAppointmentDiscount<T extends DiscountableLine>(item:T):T{
 const discount=item.appointmentDiscount;if(!discount)return item;
 const {appointmentDiscount:_,...rest}=item;
 return {...rest,sub:{...item.sub,priceType:discount.originalPriceType,...(!item.variant?{price:discount.originalPrice}: {})},variant:item.variant?{...item.variant,price:discount.originalPrice}:null} as T;
}
function applyAppointmentDiscount<T extends DiscountableLine>(line:T,kind:AppointmentDiscount['kind'],input:string):T{
 const item=clearAppointmentDiscount(line),originalPrice=item.variant?.price??item.sub.price,originalAmount=exactPrice(originalPrice);
 if(!['percent','amount','gift'].includes(kind))throw new Error('Elige un descuento válido.');
 const value=kind==='gift'?100:exactPrice(input);
 if(value===null||value<=0)throw new Error('Introduce un descuento mayor que cero, con hasta dos decimales.');
 if(kind!=='gift'&&(originalAmount===null||!item.variant&&item.sub.priceType&&item.sub.priceType!=='fijo'))throw new Error('Para descontar euros o un porcentaje necesitas un precio fijo. Puedes marcar el servicio como Obsequio.');
 if(kind==='percent'&&value>100)throw new Error('El porcentaje no puede superar el 100 %.');
 const cents=originalAmount===null?null:Math.round(originalAmount*100),amount=Math.round(value*100);
 if(!Number.isSafeInteger(amount)||cents!==null&&!Number.isSafeInteger(cents))throw new Error('El importe es demasiado grande para calcular el descuento.');
 if(kind==='amount'&&cents!==null&&amount>cents)throw new Error('El descuento no puede superar el precio del servicio.');
 const finalCents=kind==='gift'?0:kind==='percent'?Math.round(cents!*(10000-amount)/10000):cents!-amount;
 const discount:AppointmentDiscount={kind,value,originalPrice,originalPriceType:item.sub.priceType,originalAmount,finalAmount:finalCents/100,discountAmount:cents===null?null:(cents-finalCents)/100};
 return {...item,appointmentDiscount:discount,sub:{...item.sub,priceType:'fijo',...(!item.variant?{price:discountMoney(finalCents/100)}:{})},variant:item.variant?{...item.variant,price:discountMoney(finalCents/100)}:null} as T;
}
function appointmentDiscountDepositLimit(items:readonly DiscountableLine[],amount:number):number{
 if(!items.some(item=>item.appointmentDiscount))return amount;
 let cents=0;for(const item of items){const price=exactPrice(item.variant?.price??item.sub.price);if(price===null||!item.variant&&item.sub.priceType&&item.sub.priceType!=='fijo')return amount;cents+=Math.round(price*100);}
 return Math.min(amount,cents/100);
}

function stableDiscountValue(value:any):any {
 if(Array.isArray(value))return value.map(stableDiscountValue);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stableDiscountValue(value[key])]));
 return value;
}
function validatedAppointmentDiscounts(items:any[],catalog:any[],previous:any[]=[]):any[]{
 return items.map(item=>{
  if(!item?.appointmentDiscount)return item;
  const current=catalog.find(sub=>sub.id===item?.sub?.id);if(!current)throw new Error('El servicio ya no está disponible.');
  const variant=item.variant?.id?current.variants?.find((v:any)=>v.id===item.variant.id):null;
  if(current.hasVariants&&current.variants?.length&&!variant)throw new Error('Elige una variante válida antes de descontar.');
  const old=previous.find(p=>p?.sub?.id===item.sub.id&&(p.variant?.id||null)===(item.variant?.id||null));
  const reference=old?.appointmentDiscount?clearAppointmentDiscount(old):{...item,sub:{...item.sub,price:current.price,priceType:current.priceType},variant:variant?{...item.variant,price:variant.price}:null,appointmentDiscount:undefined};
  const input=item.appointmentDiscount;
  if(input.originalPrice!==(reference.variant?.price??reference.sub.price))throw new Error('El precio ha cambiado. Actualiza el servicio antes de aplicar el descuento.');
  const adjusted=applyAppointmentDiscount(reference,input.kind,String(input.value));
  return {...item,sub:{...item.sub,price:adjusted.sub.price,priceType:adjusted.sub.priceType},variant:item.variant?{...item.variant,price:adjusted.variant.price}:null,appointmentDiscount:adjusted.appointmentDiscount};
 });
}

type ServiceDepositPolicy = 'general' | 'none' | 'fixed';
type DepositService = {id?: string; duration?: string; bizumPolicy?: ServiceDepositPolicy; bizumAmount?: number; variants?: {id?: string; duration?: string}[]};
type DepositItem = {sub: DepositService; variant?: {id?: string; duration?: string} | null};
type DepositConfig = {advancePaymentEnabled?: boolean; advancePaymentThresholdMinutes?: number; depositAmount?: string | number};
function depositMoney(value: unknown): number {
  const text=String(value ?? '').trim().replace(/\s*€\s*$/,'').trim();
  if(!/^\d+(?:[.,]\d{1,2})?$/.test(text))return NaN;
  const amount=Number(text.replace(',','.'));
  return Number.isFinite(amount)&&amount<=9999.99?Math.round(amount*100)/100:NaN;
}
function validateServiceDeposit(service: DepositService): string | null {
  if(service.bizumPolicy!==undefined&&!['general','none','fixed'].includes(service.bizumPolicy))return 'La opción de anticipo no es válida.';
  if(service.bizumPolicy==='fixed'&&!(depositMoney(service.bizumAmount)>0))return 'Indica un anticipo mayor que cero y de hasta 9.999,99 €.';
  return null;
}
/** One deposit per booking: highest configured amount, never a sum of deposits. */
function calculateServiceDeposit(items: readonly DepositItem[], catalog: readonly DepositService[], config: DepositConfig, legacyDuration = 0): number {
  if(config.advancePaymentEnabled===false)return 0;
  let amount=0,generalMinutes=0;
  for(const item of items){
    const current=item.sub.id?catalog.find(service=>service.id===item.sub.id):undefined;
    if(catalog.length&&!current)throw new Error('No se encuentra un servicio en el catálogo actual. Actualiza antes de reservar.');
    const service=current||item.sub;
    const invalid=validateServiceDeposit(service);if(invalid)throw new Error(invalid);
    if(service.bizumPolicy==='none')continue;
    if(service.bizumPolicy==='fixed'){amount=Math.max(amount,depositMoney(service.bizumAmount));continue;}
    const variant=item.variant?.id?service.variants?.find(value=>value.id===item.variant?.id):undefined;
    generalMinutes+=parseInt(String(variant?.duration||(!current?item.variant?.duration:undefined)||service.duration||'45').match(/\d+/)?.[0]||'45',10);
  }
  if(!items.length)generalMinutes=Number.isFinite(legacyDuration)?Math.max(0,legacyDuration):0;
  if(generalMinutes>0){
    const threshold=Number(config.advancePaymentThresholdMinutes);
    if(!Number.isFinite(threshold)||threshold<0)throw new Error('Revisa la duración mínima para pedir anticipo en Configuración.');
    if(generalMinutes>threshold){
      const general=depositMoney(config.depositAmount);
      if(!(general>0))throw new Error('Revisa el importe general del anticipo en Configuración.');
      amount=Math.max(amount,general);
    }
  }
  return appointmentDiscountDepositLimit(items as unknown as readonly DiscountableLine[],amount);
}

async function cleanClientPhotoObjects(admin:any):Promise<boolean>{
  try{
    const {data:pending,error}=await admin.from('studio_client_photo_cleanup').select('object_path').order('created_at').limit(50);
    if(error)return false;if(!pending?.length)return true;
    const paths=pending.map((row:any)=>row.object_path);
    const {data:live,error:liveError}=await admin.from('studio_client_photos').select('object_path').in('object_path',paths);
    if(liveError)return false;
    const livePaths=new Set((live||[]).map((row:any)=>row.object_path));const removable=paths.filter((path:string)=>!livePaths.has(path));
    if(removable.length){const {error:removeError}=await admin.storage.from('client-photos').remove(removable);if(removeError)return false;}
    const {error:clearError}=await admin.from('studio_client_photo_cleanup').delete().in('object_path',paths);
    if(clearError)return false;
    const {data:remaining,error:remainingError}=await admin.from('studio_client_photo_cleanup').select('object_path').limit(1);
    return !remainingError&&Array.isArray(remaining)&&remaining.length===0;
  }catch{return false;}
}
async function signClientPhotoPaths(admin:any,paths:string[]):Promise<Map<string,string>>{
  const urls=new Map<string,string>();
  for(let offset=0;offset<paths.length;offset+=100){
    const chunk=paths.slice(offset,offset+100);
    const {data,error}=await admin.storage.from('client-photos').createSignedUrls(chunk,900);
    if(error||!Array.isArray(data))throw new Error('CLIENT_PHOTO_SIGN_FAILED');
    for(const path of chunk){const row=data.find((item:any)=>item.path===path);if(row?.error||!row?.signedUrl)throw new Error('CLIENT_PHOTO_SIGN_FAILED');urls.set(path,row.signedUrl);}
  }
  return urls;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Los errores internos (esquema, políticas, restricciones) se registran en el
// servidor; la clienta solo recibe un mensaje genérico.
const GENERIC_ERROR = "No se pudo completar la operación. Inténtalo de nuevo.";
const failed = (err: unknown, where = "studio-api") => {
  console.error(`[${where}]`, err instanceof Error ? err.message : JSON.stringify(err));
  return { error: GENERIC_ERROR };
};

const STUDIO_LOCATION = "Carrer Porta d'Alacant 11, Bajo, 03202 Elx (Alicante), España";
const DEFAULT_PORTAL_URL = "https://lstudioana.es";
const STUDIO_NOTIFY_EMAIL = "lstudioana@gmail.com";
const MADRID_TZ = "Europe/Madrid";

const escHtml = (value: string) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmtDateMadrid = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: MADRID_TZ });

const fmtTimeMadrid = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: MADRID_TZ });

const emailLayout = (title: string, bodyHtml: string) => `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#29231F;font-family:'Garet','Poppins',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#29231F;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#322A25;border:1px solid rgba(212,175,55,.35);border-radius:14px;">
        <tr><td style="padding:22px 22px 6px;text-align:center;">
          <p style="margin:0;color:#C99E52;font-size:13px;letter-spacing:2px;">L'STUDIO ANA</p>
          <h1 style="margin:10px 0 0;color:#FFF8EE;font-size:20px;font-weight:600;line-height:1.3;">${escHtml(title)}</h1>
        </td></tr>
        <tr><td style="padding:12px 22px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#29231F;border:1px solid rgba(212,175,55,.25);border-radius:10px;">
            <tr><td style="padding:16px;color:#FFF8EE;font-size:15px;line-height:1.7;">${bodyHtml}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:8px 22px 20px;" align="center">
          <p style="margin:0;color:#D6CBB8;font-size:12px;line-height:1.7;">${escHtml(STUDIO_LOCATION)}</p>
        </td></tr>
      </table>
      <p style="max-width:480px;margin:14px auto 0;color:#8A7E6E;font-size:11px;line-height:1.6;text-align:center;">
        Recibes este correo porque tienes una reserva activa en L'Studio Ana.
      </p>
    </td></tr>
  </table>
</body>
</html>`;

const howToGetThereLink = () =>
  `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STUDIO_LOCATION)}" target="_blank" style="color:#E4C687;">Cómo llegar</a>`;

const viewButton = (portalUrl: string, appointmentId: string) => {
  const url = `${portalUrl}?cita=${encodeURIComponent(appointmentId)}`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
  <tr><td align="center" style="padding:4px 0 12px;">
    <a href="${escHtml(url)}" style="display:inline-block;background:linear-gradient(135deg,#C99E52 0%,#B3823B 100%);color:#29231F;text-decoration:none;font-weight:600;font-size:14px;padding:13px 26px;border-radius:9px;">Ver mi cita</a>
  </td></tr>
  <tr><td align="center">${howToGetThereLink()}</td></tr>
</table>`;
};

// Match the concise appointment names used by the portal, without changing its creative titles.
const normalizeNotificationName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[¿?¡!.,]/g, '').replace(/\s+/g, ' ').trim();
const KNOWN_NOTIFICATION_NAMES: Record<string, string> = {
  'tu cabello en su mejor version': 'Styling & Peinados',
  'tu cabello ha cambiado y no sabes por que': 'Diagnóstico capilar con microcámara'
};
const notificationBookingName = (snapshot: any, current?: any): string => {
  const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  return text(current?.bookingName) || text(snapshot?.bookingName)
    || KNOWN_NOTIFICATION_NAMES[normalizeNotificationName(text(current?.name) || text(snapshot?.name))]
    || text(current?.name) || text(snapshot?.name) || 'Servicio';
};
const formatNotificationServices = (services: unknown, fallback: unknown, catalog: any[] = []): string => {
  if (Array.isArray(services) && services.length) {
    return services.map(item => {
      const current = item?.sub?.id ? catalog.find(service => service.id === item.sub.id) : undefined;
      const name = notificationBookingName(item?.sub, current);
      const variant = typeof item?.variant?.name === 'string' ? item.variant.name.trim() : '';
      return name + (variant ? ' · ' + variant : '');
    }).join(' + ');
  }
  let text = String(fallback || '').replace(/^(RESERVADO|PENDIENTE (?:SÁBADO|VALORACIÓN|BIZUM))\s*/, '');
  const replacements = catalog.filter(service => typeof service?.name === 'string' && service.name.trim()).sort((a,b) => b.name.length - a.name.length);
  for (const service of replacements) text = text.split(service.name).join(notificationBookingName(service, service));
  text = text.replace(/¿?Tu cabello ha cambiado y no sabes por qu[eé]\??/gi, 'Diagnóstico capilar con microcámara').replace(/Tu cabello,? en su mejor versi[oó]n/gi, 'Styling & Peinados');
  return text.trim() || 'Servicios del Studio';
};
const appointmentNotificationServices = async (admin: ReturnType<typeof createClient>, services: unknown, fallback: unknown): Promise<string> => {
  const { data, error } = await admin.from('studio_catalog').select('category');
  if (error) console.error('[notification-service-names]', error.message);
  const catalog = (data || []).flatMap((row: any) => row.category?.subservices || []);
  return formatNotificationServices(services, fallback, catalog);
};

const promotionNotificationSuffix = (promo: any): string => promo && typeof promo.finalAmount === 'number'
  ? ` · Promoción ${promo.title}: −${promo.percent} % solo en ${promo.serviceName}${promo.variantName ? ' (' + promo.variantName + ')' : ''}: ${Number(promo.originalAmount).toFixed(2)} € → ${Number(promo.finalAmount).toFixed(2)} €` : '';

const detailsTable = (startsAt: string, servicesText: string, professional?: string | null) => {
  const rows = [
    `<tr><td style="padding:4px 0;color:#D6CBB8;width:92px;">Fecha</td><td style="padding:4px 0;color:#FFF8EE;">${escHtml(fmtDateMadrid(startsAt))}</td></tr>`,
    `<tr><td style="padding:4px 0;color:#D6CBB8;">Hora</td><td style="padding:4px 0;color:#FFF8EE;">${escHtml(fmtTimeMadrid(startsAt))}h</td></tr>`,
    `<tr><td style="padding:4px 0;color:#D6CBB8;">Servicios</td><td style="padding:4px 0;color:#FFF8EE;">${escHtml(servicesText)}</td></tr>`,
  ];
  if (professional) rows.push(`<tr><td style="padding:4px 0;color:#D6CBB8;">Profesional</td><td style="padding:4px 0;color:#FFF8EE;">${escHtml(professional)}</td></tr>`);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table>`;
};

// Operator-only keys never leave the server for a client session: the master
// PIN grants administration access, so a clienta must never receive it.
const CLIENT_FORBIDDEN_SETTINGS = ["masterPin", "workerSecret", "serviceKey", "accessToken"];
const settingsForClient = (configuration: unknown): unknown => {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) return configuration ?? null;
  const safe: Record<string, unknown> = { ...(configuration as Record<string, unknown>) };
  for (const key of CLIENT_FORBIDDEN_SETTINGS) delete safe[key];
  // Never send drafts, scheduled or expired promotions to a client.
  if (Array.isArray(safe.promotions)) {
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: MADRID_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    safe.promotions = safe.promotions.filter((p: any) => p && p.active === true && typeof p.title === 'string' && p.title.trim() && (!p.startDate || p.startDate <= today) && (!p.endDate || p.endDate >= today));
  }
  return safe;
};

// Explicit portal response: future internal appointment fields stay private.
const PORTAL_APPOINTMENT_FIELDS = [
  'id', 'source_legacy_id', 'client_id', 'starts_at', 'duration_minutes',
  'lifecycle_status', 'approval_status', 'approval_reason',
  'deposit_status', 'deposit_amount', 'deposit_reference', 'completed_at',
  'services', 'legacy_service_text', 'professional_id', 'professional_name',
  'voucher_id', 'voucher_summary',
] as const;
const PORTAL_SNAPSHOT_FIELDS = [
  'clientName', 'phone', 'email', 'serviceCategory', 'serviceSubcategory',
  'dayName', 'selectedVariant', 'promotion', 'promotionOrigin', 'clientNote',
] as const;
const pickPortalFields = (source: unknown, fields: readonly string[]): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (!source || typeof source !== 'object' || Array.isArray(source)) return result;
  const record = source as Record<string, unknown>;
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(record, field)) result[field] = record[field];
  }
  return result;
};
const appointmentForClient = (row: Record<string, unknown>): Record<string, unknown> => ({
  ...pickPortalFields(row, PORTAL_APPOINTMENT_FIELDS),
  client_snapshot: pickPortalFields(row.client_snapshot, PORTAL_SNAPSHOT_FIELDS),
});

const validEmail = (value: unknown): string | null => {
  const email = String(value ?? "").toLowerCase().trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

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

async function enqueueReminderJobs(admin: ReturnType<typeof createClient>, ctx: any, channel: 'push'|'whatsapp') {
  if (!ctx.confirmed) return;
  const start = Date.parse(notificationInstant(ctx.startsAt));
  const now = Date.now();
  if (start <= now) return;
  const recipients = channel === 'push'
    ? (await admin.from('studio_push_subscriptions').select('id').eq('client_id',ctx.clientId || '00000000-0000-0000-0000-000000000000')).data || []
    : ctx.clientPhone ? [{id:null}] : [];
  const reminderHours = channel === 'whatsapp' ? [1] : [24,2];
  const moments: {kind:string;at:number}[] = [
    ...(channel === 'push' ? [{kind:ctx.isUpdate ? 'update':'confirmation',at:now}] : []),
    ...reminderHours.map(hours => ({kind:`reminder_${hours}h`,at:start-hours*3600000})).filter(m => m.at > now)
  ];
  for (const recipient of recipients) for (const moment of moments) {
    const key = `${channel}:${moment.kind}:${ctx.apptId}:${ctx.startsAt}:${recipient.id || ctx.clientPhone}`;
    const {error} = await admin.from('studio_notification_jobs').upsert({
      idempotency_key:key, appointment_id:ctx.apptId, channel, kind:moment.kind,
      subscription_id:recipient.id, client_id:ctx.clientId || null, to_phone:ctx.clientPhone || null,
      expected_starts_at:ctx.startsAt, scheduled_at:new Date(moment.at).toISOString(),
      payload:{clientName:ctx.clientName,servicesText:ctx.servicesText},status:'scheduled'
    },{onConflict:'idempotency_key',ignoreDuplicates:true});
    if (error) throw new Error(`No se pudo programar ${channel}: ${error.message}`);
    // Reactivar únicamente pendientes anulados, nunca mensajes ya enviados.
    await admin.from('studio_notification_jobs').update({status:'scheduled',scheduled_at:new Date(moment.at).toISOString(),attempts:0,last_error:null})
      .eq('idempotency_key',key).eq('status','skipped');
  }
}
async function cancelNotificationJobs(admin: ReturnType<typeof createClient>, id:string) {
  const {error}=await admin.from('studio_notification_jobs').update({status:'skipped',last_error:'Cita cancelada, modificada o pendiente'})
    .eq('appointment_id',id).neq('kind','late_arrival_10m').in('status',['scheduled','failed']);
  if(error) console.error('Cancelar recordatorios:',error.message);
}
async function kickDispatcher(admin: ReturnType<typeof createClient>) {
  const {data}=await admin.from('studio_email_config').select('worker_secret').eq('id',true).maybeSingle();
  if(!data?.worker_secret) { console.error('Falta worker_secret; no se inicia envío inmediato');return; }
  const task=fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/email-dispatch`,{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${Deno.env.get('STUDIO_BACKEND_KEY')}`},
    body:JSON.stringify({workerSecret:data.worker_secret}),signal:AbortSignal.timeout(25000)
  }).then(async r=>{if(!r.ok)console.error('email-dispatch:',r.status,await r.text());}).catch(e=>console.error('email-dispatch:',e.message));
  const runtime=(globalThis as any).EdgeRuntime;
  if(runtime?.waitUntil) runtime.waitUntil(task); else await task;
}

// E.164 normalisation for Spanish/international numbers: digits only, Spain
// assumed when the client saved a 9-digit local number.
const validPhoneE164 = (value: unknown): string | null => {
  const raw = String(value ?? "").replace(/[^+\d]/g, "");
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.length === 9) return `+34${digits}`;
  if (digits.startsWith("34") && digits.length === 11) return `+${digits}`;
  return null;
};

const whatsAppMessageText = (opts: {
  kind: "confirmation" | "request_received" | "update" | "cancellation";
  clientName: string;
  startsAt: string;
  servicesText: string;
  portalUrl: string;
  pending?: string | null;
  apptIdToken?: string;
}) => {
  const date = fmtDateMadrid(opts.startsAt);
  const time = fmtTimeMadrid(opts.startsAt);
  const header = opts.kind === "request_received"
    ? `Hola, ${opts.clientName}. Hemos recibido tu solicitud en L'Studio Ana.`
    : opts.kind === "update"
      ? `Hola, ${opts.clientName}. Tu cita en L'Studio Ana ha sido modificada.`
      : opts.kind === "cancellation"
        ? `Hola, ${opts.clientName}. Tu cita en L'Studio Ana ha sido cancelada.`
        : `Hola, ${opts.clientName}. Tu cita en L'Studio Ana está confirmada.`;
  const pendingLine = opts.pending ? `\nPendiente: ${opts.pending}. Te enviaremos la confirmación definitiva cuando se complete.` : "";
  return `${header}\nFecha: ${date}\nHora: ${time}\nServicios: ${opts.servicesText}\nDirección: ${STUDIO_LOCATION}${pendingLine}\nPuedes consultar y gestionar tu cita aquí: ${opts.portalUrl}?cita=${opts.apptIdToken ?? ""}\n¡Te esperamos!`;
};

interface WhatsAppSchedulingContext {
  apptId: string;
  startsAt: string;
  clientName: string;
  clientPhone: string | null;
  servicesText: string;
  confirmed: boolean;
  isUpdate?: boolean;
  kindOverride?: "confirmation" | "request_received" | "update" | "cancellation";
}

// Schedule WhatsApp reminders only (no immediate confirmation, no 24h).
// Cancellations are still sent immediately. Emails and push are unaffected.
const scheduleAppointmentWhatsApp = async (admin: ReturnType<typeof createClient>, ctx: WhatsAppSchedulingContext) => {
  if (ctx.kindOverride === 'cancellation') {
    await cancelAppointmentWhatsApp(admin, ctx.apptId, { cancelled: true });
    return;
  }
  if (!ctx.confirmed) return;
  await enqueueReminderJobs(admin, ctx, 'whatsapp').catch(error => console.error('Programar WhatsApp:',error));
};

const cancelAppointmentWhatsApp = async (admin: ReturnType<typeof createClient>, apptId: string, opts: { cancelled?: boolean } = {}) => {
  await admin.from("studio_whatsapp_outbox")
    .update({ status: "skipped", last_error: "Cita cancelada o modificada" })
    .eq("appointment_id", apptId)
    .in("status", ["scheduled", "failed"]);
  if (opts.cancelled) {
    const { data: appt } = await admin.from("studio_appointments")
      .select("id, starts_at, services, client_snapshot")
      .eq("id", apptId).maybeSingle();
    const snap = ((appt?.client_snapshot || {}) as Record<string, unknown>);
    const phone = validPhoneE164(snap.phone);
    if (appt && phone) {
      const { data: cfg } = await admin.from("studio_whatsapp_config").select("portal_url").eq("id", true).maybeSingle();
      const portalUrl = ((cfg as { portal_url?: string | null } | null)?.portal_url || DEFAULT_PORTAL_URL).replace(/\/+$/, "");
      const text = whatsAppMessageText({
        kind: "cancellation",
        clientName: String(snap.clientName ?? ""),
        startsAt: notificationInstant(appt.starts_at),
        servicesText: await appointmentNotificationServices(admin, appt.services, snap.serviceSubcategory),
        portalUrl,
        apptIdToken: apptId,
      });
      await admin.from("studio_whatsapp_outbox").upsert({
        idempotency_key: `cancellation:${apptId}:${notificationInstant(appt.starts_at)}`,
        appointment_id: apptId,
        kind: "cancellation",
        to_phone: phone,
        template_name: "appointment_confirmation_v1",
        body_text: text,
        scheduled_at: new Date().toISOString(),
        status: "scheduled",
      }, { onConflict: "idempotency_key", ignoreDuplicates: true });
    }
  }
};

interface SchedulingContext {
  apptId: string;
  startsAt: string;
  clientName: string;
  clientEmail: string | null;
  servicesText: string;
  professional?: string | null;
  confirmed: boolean;
  isUpdate?: boolean;
}

// Schedule or update every email that depends on the current state of an
// appointment. Idempotent: unique idempotency keys prevent duplicates when an
// operation is retried.
// Describe the saved booking quote; never reprice an old appointment from today's catalogue.
function appointmentPriceHtml(appointment:any):string {
  const services=Array.isArray(appointment?.services)?appointment.services:[];
  if(!services.length)return '<p style="color:#D6CBB8;font-size:13px;">Importe de los servicios: a confirmar en el Studio.</p>';
  const money=(cents:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100);
  let cents=0,unknown=false,estimated=false;
  const rows=services.map((item:any)=>{
    const sub=item?.sub||{},variant=item?.variant;
    const raw=variant?.price??sub.price;
    const price=exactPrice(raw);
    const priceType=variant?(variant.priceType||'fijo'):(sub.priceType||'fijo');
    const provisional=priceType!=='fijo';
    if(price===null)unknown=true;else cents+=Math.round(price*100);
    estimated=estimated||provisional;
    const name=String(sub.bookingName||sub.name||'Servicio')+(variant?.name?' · '+String(variant.name):'')+(item.appointmentDiscount?.kind==='gift'?' · Obsequio':'');
    const label=price===null?(String(raw||'A confirmar')):(provisional?(priceType==='desde'?'Desde ':'Orientativo · '):'')+money(Math.round(price*100));
    return `<tr><td style="padding:6px 0;color:#FFF8EE;">${escHtml(name)}</td><td style="padding:6px 0;color:#FFF8EE;text-align:right;">${escHtml(label)}</td></tr>`;
  });
  const promo=appointment?.client_snapshot?.promotion;
  if(promo){
    const discount=Number(promo.discountAmount),original=Number(promo.originalAmount),final=Number(promo.finalAmount);
    const eligible=services.find((i:any)=>i?.sub?.id===promo.serviceId);
    const selectedPrice=eligible?exactPrice(eligible.variant?.price??eligible.sub?.price):null;
    if(Number.isFinite(discount)&&discount>=0&&Number.isFinite(original)&&Number.isFinite(final)&&Math.abs(original-final-discount)<.011&&selectedPrice!==null&&Math.abs(selectedPrice-original)<.011){
      cents-=Math.round(discount*100);
      rows.push(`<tr><td style="padding:6px 0;color:#E4C687;">${escHtml('Promoción −'+String(promo.percent)+' % · '+String(promo.serviceName||'servicio'))}</td><td style="padding:6px 0;color:#E4C687;text-align:right;">−${escHtml(money(Math.round(discount*100)))}</td></tr>`);
    }else unknown=true;
  }
  const voucher=appointment?.voucher_summary;
  const activeVoucher=voucher&&['held','consumed'].includes(voucher.state);
  // The server's persisted voucher quote includes the promotion and is authoritative.
  if(activeVoucher&&Number.isSafeInteger(voucher.totalCents)&&voucher.totalCents>=0){cents=voucher.totalCents;unknown=false;estimated=false;}
  const total=unknown?'A confirmar en el Studio':money(Math.max(0,cents));
  rows.push(`<tr><td style="padding:12px 0 6px;color:#E4C687;border-top:1px solid #67543C;"><strong>${estimated?'Total orientativo de servicios':'Total de servicios'}</strong></td><td style="padding:12px 0 6px;color:#E4C687;text-align:right;border-top:1px solid #67543C;"><strong>${escHtml(total)}</strong></td></tr>`);
  const note=unknown||estimated?'El importe final se confirmará en el Studio.':'Este es el importe de los servicios; no indica el saldo pendiente de pago.';
  return `<section style="margin-top:16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join('')}</table><p style="color:#D6CBB8;font-size:12px;line-height:1.6;">${escHtml(note)}${activeVoucher?' Tu reserva tiene una tarjeta o bono aplicado; consulta su cobertura en el portal.':''}</p></section>`;
}

async function appointmentPriceForEmail(admin:any,id:string):Promise<string> {
  try {
    const {data,error}=await admin.from('studio_appointments').select('services,client_snapshot,voucher_summary').eq('id',id).maybeSingle();
    if(error||!data)throw new Error('No se pudo leer el importe');
    return appointmentPriceHtml(data);
  }catch{
    // A missing quote must not prevent a confirmation or invent a zero price.
    return '<p style="color:#D6CBB8;font-size:13px;">Importe de los servicios: consulta el detalle actualizado en el portal.</p>';
  }
}

const scheduleAppointmentEmails = async (admin: ReturnType<typeof createClient>, ctx: SchedulingContext) => {
  ctx = { ...ctx, startsAt: notificationInstant(ctx.startsAt) };
  const { data: cfg } = await admin.from("studio_email_config").select("portal_url").eq("id", true).maybeSingle();
  const portalUrl = ((cfg as { portal_url?: string | null } | null)?.portal_url || DEFAULT_PORTAL_URL).replace(/\/+$/, "");
  const priceHtml = await appointmentPriceForEmail(admin,ctx.apptId);
  const now = Date.now();
  const startMs = new Date(ctx.startsAt).getTime();

  const upsert = async (kind: string, idempotencyKey: string, subject: string, bodyHtml: string, scheduledAt: string, to: string) => {
    if (!validEmail(to)) return;
    const message = {
      idempotency_key: idempotencyKey,
      appointment_id: ctx.apptId,
      kind,
      to_email: to,
      subject,
      body_html: bodyHtml,
      scheduled_at: scheduledAt,
      status: "scheduled",
    };
    const {error: insertError}=await admin.from("studio_email_outbox").upsert(message, { onConflict: "idempotency_key", ignoreDuplicates: true });
    if(insertError)throw insertError;
    // A → B → A: restore annulled notices; never resend an already sent email.
    const {error: restoreError}=await admin.from("studio_email_outbox")
      .update({...message,attempts:0,last_error:null})
      .eq('idempotency_key',idempotencyKey).eq('status','skipped');
    if(restoreError)throw restoreError;
  };

  // A client/studio test may use the same inbox: schedule just one copy per address.
  // Keep the existing client/studio keys for compatibility with already scheduled messages.
  const deliver = (kind: string, keyPrefix: string, subject: string, bodyHtml: string, scheduledAt: string) => {
    const clientEmail=validEmail(ctx.clientEmail),studioEmail=validEmail(STUDIO_NOTIFY_EMAIL);
    const jobs:Promise<void>[]=[];
    if(clientEmail)jobs.push(upsert(kind,`${keyPrefix}:client:${ctx.apptId}${keySuffix}`,subject,bodyHtml,scheduledAt,clientEmail));
    if(studioEmail&&studioEmail!==clientEmail)jobs.push(upsert(kind,`${keyPrefix}:studio:${ctx.apptId}${keySuffix}`,`[Studio] ${subject}`,bodyHtml,scheduledAt,studioEmail));
    return Promise.all(jobs);
  };

  // Keys include the start time: a rescheduled appointment gets fresh messages
  // instead of colliding with the superseded ones.
  const keySuffix = `:${ctx.startsAt}`;

  if (!ctx.confirmed) {
    await deliver("request_received", "req", "Hemos recibido tu solicitud en L'Studio Ana",
      emailLayout("Solicitud recibida",
        `<p style="margin:0 0 12px;color:#FFF8EE;">Hola <strong>${escHtml(ctx.clientName)}</strong>,</p>
         <p style="margin:0 0 12px;color:#FFF8EE;">Tu solicitud está en revisión. Te enviaremos la confirmación definitiva cuando se completen los pasos pendientes (aprobación de Ana o el anticipo de la reserva).</p>
         ${detailsTable(ctx.startsAt, ctx.servicesText, ctx.professional)}${priceHtml}
         ${viewButton(portalUrl, ctx.apptId)}`),
      new Date().toISOString());
    return;
  }

  const confirmationKind = ctx.isUpdate ? "update" : "confirmation";
  const confirmationTitle = ctx.isUpdate ? "Tu cita ha sido modificada" : "Tu cita está confirmada";
  const confirmationSubject = ctx.isUpdate
    ? "Tu cita en L'Studio Ana ha sido modificada"
    : "Tu cita en L'Studio Ana está confirmada";
  await deliver(confirmationKind, confirmationKind, confirmationSubject,
    emailLayout(confirmationTitle,
      `<p style="margin:0 0 12px;color:#FFF8EE;">Hola <strong>${escHtml(ctx.clientName)}</strong>,</p>
       ${detailsTable(ctx.startsAt, ctx.servicesText, ctx.professional)}${priceHtml}
       ${viewButton(portalUrl, ctx.apptId)}`),
    new Date().toISOString());

  for (const [kind, hours, subject] of [
    ["reminder_48h", 48, "Tu cita en L'Studio Ana es dentro de 48 horas"],
    ["reminder_24h", 24, "Mañana te esperamos en L'Studio Ana"],
  ] as const) {
    const sendAt = startMs - hours * 3600_000;
    if (sendAt <= now) continue;
    await deliver(kind, kind, subject,
      emailLayout(hours === 48 ? "Tu cita es dentro de 48 horas" : "Mañana te esperamos",
        `<p style="margin:0 0 12px;color:#FFF8EE;">Hola <strong>${escHtml(ctx.clientName)}</strong>,</p>
         ${detailsTable(ctx.startsAt, ctx.servicesText, ctx.professional)}${priceHtml}
         <p style="margin:12px 0 0;color:#D6CBB8;">Puedes consultar, modificar o cancelar tu cita desde el portal, según las condiciones de reserva.</p>
         ${viewButton(portalUrl, ctx.apptId)}`),
      new Date(sendAt).toISOString());
  }
};

const cancelAppointmentEmails = async (admin: ReturnType<typeof createClient>, apptId: string, opts: { cancelled?: boolean } = {}) => {
  await admin.from("studio_email_outbox")
    .update({ status: "skipped", last_error: "Cita cancelada o modificada" })
    .eq("appointment_id", apptId)
    .in("status", ["scheduled", "failed"]);
  if (opts.cancelled) {
    const { data: appt } = await admin.from("studio_appointments")
      .select("id, starts_at, services, client_snapshot")
      .eq("id", apptId).maybeSingle();
    const snap = ((appt?.client_snapshot || {}) as Record<string, unknown>);
    const email = validEmail(snap.email);
    if (appt && email) {
      await admin.from("studio_email_outbox").upsert({
        idempotency_key: `cancellation:${apptId}:${notificationInstant(appt.starts_at)}`,
        appointment_id: apptId,
        kind: "cancellation",
        to_email: email,
        subject: "Tu cita en L'Studio Ana ha sido cancelada",
        body_html: emailLayout("Tu cita ha sido cancelada",
          `<p style="margin:0 0 12px;color:#FFF8EE;">Hola <strong>${escHtml(String(snap.clientName ?? ""))}</strong>,</p>
           <p style="margin:0 0 12px;color:#FFF8EE;">Tu cita ha quedado cancelada y el hueco liberado en la agenda del Studio. Los recordatorios pendientes han sido anulados.</p>
           ${detailsTable(notificationInstant(appt.starts_at), await appointmentNotificationServices(admin, appt.services, snap.serviceSubcategory))}
           <p style="margin:12px 0 0;color:#D6CBB8;">Si quieres reservar otro día, puedes hacerlo desde el portal.</p>`),
        scheduled_at: new Date().toISOString(),
        status: "scheduled",
      }, { onConflict: "idempotency_key", ignoreDuplicates: true });
    }
  }
};

const sendViaWhatsAppCloud = async (accessToken: string, phoneNumberId: string, to: string, templateName: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/^\+/, ""), type: "template", template: { name: templateName, language: { code: "es" } } }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: (payload as { error?: { message?: string } }).error?.message || `Error ${response.status}` };
    return { ok: true, id: (payload as { messages?: { id?: string }[] }).messages?.[0]?.id || "" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error de red" };
  }
};

// ---------- Web Push (RFC 8291 / RFC 8292) ----------

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

// Sends a push to every device of a clienta and records each attempt in the
// outbox. Idempotent per appointment+kind, cleans up expired subscriptions.
const sendAppointmentPush = async (admin: ReturnType<typeof createClient>, ctx: { apptId: string; clientId: string | null; clientName: string; startsAt: string; servicesText: string; confirmed: boolean; isUpdate?: boolean }) => {
  if (ctx.confirmed && ctx.clientId) await enqueueReminderJobs(admin,ctx,'push');
};

function voucherError(error:any){
 const message=String(error?.message||error||'');
 const messages:Record<string,string>={BONO_CHANGED:'La disponibilidad del bono ha cambiado. Vuelve a comprobar la reserva antes de confirmar.',BONO_OWNER:'Este bono no pertenece a la clienta de la cita.',BONO_NOT_ACTIVE:'El bono todavía no está activado.',BONO_EXPIRED:'La cita debe estar dentro de la validez del bono.',BONO_NO_BALANCE:'El bono no tiene saldo o sesiones disponibles. Revisa las reservas pendientes.',BONO_NOT_ELIGIBLE:'La selección no incluye un servicio de este bono.',BONO_CLOSED_PRICE:'Para usar el bono, el servicio debe tener un precio cerrado.',BONO_VARIANT:'Selecciona una variante válida.',BONO_SERVICES:'Revisa los servicios de la reserva.',BONO_NO_PROMO:'El bono 5×4 no se combina con otra promoción en la misma cita.',BONO_NO_AMOUNT:'No hay importe que aplicar en esta cita.',BONO_COMPLETED_LOCK:'El bono de una cita finalizada ya está consumido. Conserva su historial.',BONO_PAID_DEPOSIT:'Esta cita ya tiene un anticipo cobrado. Revisa ese pago antes de aplicar un bono para evitar un doble cobro.',BONO_PENDING_APPOINTMENT:'Confirma primero la aprobación y el anticipo pendiente.',BONO_NOT_AVAILABLE:'Este bono todavía no está disponible.',BONO_NOT_FOUND:'No se ha encontrado el bono.',BONO_AMOUNT:'El importe comprobado no coincide con el precio del bono.',BONO_NOT_PENDING:'Esta compra ya no está pendiente.',BONO_REQUEST_CONFLICT:'Esta referencia de compra ya corresponde a otra solicitud.',BONO_CLAIM_INVALID:'No se puede añadir esta tarjeta. Comprueba el código; debe estar activa, sin uso ni reservas y sin asignar a otra persona.'};
 for(const [key,text]of Object.entries(messages))if(message.includes(key))return text;
 return 'No se pudo completar la gestión del bono. Comprueba la instalación SQL y reintenta.';
}

// PORTAL_MAINTENANCE_GUARD_20261110: only client booking/order writes are paused.
async function portalMaintenanceRejection(admin:any):Promise<Response|null>{
 const {data,error}=await admin.rpc('studio_portal_maintenance_public');
 if(error||!data||!['off','notice','paused'].includes(data.mode))return json({error:'No se puede verificar la disponibilidad del portal. Inténtalo de nuevo en unos minutos.',code:'PORTAL_STATUS_UNAVAILABLE'},503);
 if(data.mode!=='paused')return null;
 return new Response(JSON.stringify({error:data.message||'El portal está en mantenimiento. Inténtalo de nuevo en unos minutos.',code:'PORTAL_MAINTENANCE',maintenance:data}),{status:503,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store','Retry-After':'60'}});
}

// STUDIO_WEEKLY_HOURS_V1
type StudioHourSpan={start:string;end:string};
type StudioWeek=Record<string,StudioHourSpan[]>;
type StudioHoursConfig={weeklyHours?:StudioWeek;scheduleMonday?:string;scheduleTueWed?:string;scheduleThuFri?:string;scheduleSaturday?:string};
const STUDIO_WEEK_DAYS=[{key:'1',label:'Lunes'},{key:'2',label:'Martes'},{key:'3',label:'Miércoles'},{key:'4',label:'Jueves'},{key:'5',label:'Viernes'},{key:'6',label:'Sábado'},{key:'0',label:'Domingo'}];
function studioHourMinute(value:unknown,end=false):number {
 if(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return NaN;
 const minute=Number(value.slice(0,2))*60+Number(value.slice(3));return end&&minute===0?1440:minute;
}
function studioWeekErrors(week:unknown):string[]{
 if(!week||typeof week!=='object'||Array.isArray(week))return ['El horario semanal no es válido.'];
 const values=week as Record<string,unknown>,errors:string[]=[];
 for(const {key,label} of STUDIO_WEEK_DAYS){const spans=values[key];if(!Array.isArray(spans)||spans.length>8){errors.push(label+': revisa los tramos (máximo 8).');continue;}
  const ranges:{start:number;end:number}[]=[];
  for(const raw of spans){const span=raw as StudioHourSpan|null;const start=studioHourMinute(span?.start),end=studioHourMinute(span?.end,true);if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end){errors.push(label+': indica una apertura y un cierre posterior.');continue;}ranges.push({start,end});}
  ranges.sort((a,b)=>a.start-b.start);if(ranges.some((r,i)=>i>0&&r.start<ranges[i-1].end))errors.push(label+': hay tramos solapados.');
 }
 return errors;
}
function studioLegacyHours(config:StudioHoursConfig,day:number):string {return day===0?'Cerrado':String(day===1?config.scheduleMonday:day<=3?config.scheduleTueWed:day<=5?config.scheduleThuFri:config.scheduleSaturday);}
function studioLegacySpans(text:string,day:number):StudioHourSpan[]|null {
 if(/cerrado|closed/i.test(text)||!text.trim())return [];
 const matches=Array.from(text.matchAll(/(\d{1,2})(?::(\d{2})|h(?:\s*(\d{2}))?)/gi));
 if(!matches.length&&day===6)return [{start:'09:00',end:'19:00'}];
 if(!matches.length||matches.length%2)return null;
 const result:StudioHourSpan[]=[];for(let i=0;i<matches.length;i+=2){const format=(m:RegExpMatchArray,end=false)=>{const h=Number(m[1]),n=Number(m[2]||m[3]||0);return end&&h===24&&n===0?'00:00':String(h).padStart(2,'0')+':'+String(n).padStart(2,'0');};result.push({start:format(matches[i]),end:format(matches[i+1],true)});}return result;
}
function studioReadWeek(config:StudioHoursConfig):StudioWeek {
 if(config.weeklyHours!==undefined)return config.weeklyHours;
 return Object.fromEntries(STUDIO_WEEK_DAYS.map(({key})=>[key,studioLegacySpans(studioLegacyHours(config,Number(key)),Number(key))||[]]));
}
function studioImportErrors(config:StudioHoursConfig):string[]{
 if(config.weeklyHours!==undefined)return studioWeekErrors(config.weeklyHours);
 const issues=STUDIO_WEEK_DAYS.filter(({key})=>studioLegacySpans(studioLegacyHours(config,Number(key)),Number(key))===null).map(({label})=>label+': no se pudo interpretar el horario anterior.');
 return [...issues,...studioWeekErrors(studioReadWeek(config))];
}
function studioDayRanges(config:StudioHoursConfig,day:number):{start:number;end:number}[]{
 const week=studioReadWeek(config);if(studioWeekErrors(week).length)return [];
 return (week[String(day)]||[]).map(span=>({start:studioHourMinute(span.start),end:studioHourMinute(span.end,true)})).sort((a,b)=>a.start-b.start);
}
function studioScheduleLabel(config:StudioHoursConfig,day:number):string {
 if(config.weeklyHours===undefined)return studioLegacyHours(config,day);
 const ranges=studioDayRanges(config,day);const time=(n:number)=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 return ranges.length?ranges.map(span=>time(span.start)+' – '+time(span.end)).join(' · '):'Cerrado';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("STUDIO_BACKEND_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const action = url.pathname.replace(/\/+$/, "").split("/").pop() || "";
    const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));

    // ---------- health ----------
    if (action === "health") return json({ weeklyHoursVersion: 1, ok: true, version: "studio-api-egress-20261027", promotionDiscount: true, portalMaintenanceGuard: 1 });

    if (action === 'holidays-monthly' && req.method === 'POST') {
      const secret = Deno.env.get('HOLIDAY_SYNC_SECRET');
      if (!secret || secret.length < 32 || req.headers.get('x-holiday-secret') !== secret) return json({error:'No autorizado'},401);
      const year=Number(new Intl.DateTimeFormat('en',{timeZone:MADRID_TZ,year:'numeric'}).format(new Date()));
      const results=[];
      for(let y=year;y<=year+3;y++) results.push(await refreshElcheYear(admin,y));
      return json({ok:true,results});
    }
    // Public PIN recovery. Only hashes are stored; account existence is not returned.
    if(action==='pin-reset-request'||action==='pin-reset-complete'){
      const recoveryJson=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
      if(req.method!=='POST')return recoveryJson({error:'Método no permitido'},405);
      const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
      const take=async(value:string,limit:number,seconds:number)=>{
        const {data,error}=await admin.rpc('studio_auth_take_attempt',{p_bucket:await hash(value),p_limit:limit,p_window_seconds:seconds});
        if(error)throw new Error('RESET_LIMIT_UNAVAILABLE');return data===true;
      };
      const ip=(req.headers.get('x-forwarded-for')||'').split(',')[0].trim()||'desconocido';
      try{
        const request=action==='pin-reset-request';
        if(!await take((request?'reset-request-ip:':'reset-complete-ip:')+ip,request?5:10,900))return recoveryJson({error:'Demasiados intentos. Espera 15 minutos antes de reintentar.'},429);
        if(request){
          const email=String(body.email||'').trim().toLowerCase();
          if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return recoveryJson({error:'Introduce un email válido.'},400);
          const generic={ok:true,message:'Si ese email está asociado a una ficha, recibirás un enlace para cambiar tu PIN. Revisa también la carpeta de correo no deseado.'};
          if(!await take('reset-request-email:'+email,3,1800))return recoveryJson(generic,202);
          const {data:cfg,error:configError}=await admin.from('studio_email_config').select('service_key,from_email,portal_url').eq('id',true).maybeSingle();
          if(configError||!cfg?.service_key||!cfg?.from_email)return recoveryJson({error:'La recuperación por email no está disponible ahora. Contacta con el estudio.'},503);
          let portal:URL;
          try{portal=new URL(String(cfg.portal_url||DEFAULT_PORTAL_URL));if(portal.protocol!=='https:'||portal.username||portal.password)throw new Error('invalid');}
          catch{return recoveryJson({error:'La recuperación no está disponible. Contacta con el estudio.'},503);}
          portal.hash='';portal.search='';
          const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');
          const tokenHash=await hash(token);
          const link=portal.toString()+'#recuperar='+token;
          const send=async()=>{
            const {data:result,error}=await admin.rpc('studio_issue_pin_reset',{p_email:email,p_token_hash:tokenHash});
            if(error){console.error('pin-reset: issue failed');return;}
            if(!result?.email)return;
            try{
              const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${cfg.service_key}`,'Content-Type':'application/json','Idempotency-Key':'pin-reset-'+tokenHash},signal:AbortSignal.timeout(12000),body:JSON.stringify({from:`L’Studio Ana · Acceso <${cfg.from_email}>`,to:[result.email],subject:'Recupera tu acceso a L’Studio Ana',html:`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"></head><body style="margin:0;background:#29231F;padding:24px;font-family:Arial,sans-serif;color:#FFF8EE"><div style="max-width:480px;margin:auto;padding:24px;background:#322A25;border:1px solid #C99E52;border-radius:12px"><p style="color:#E4C687;letter-spacing:2px;font-size:12px">L’STUDIO ANA</p><h1 style="font-size:22px">Recupera tu acceso</h1><p style="font-size:14px;line-height:1.7">Hemos recibido una solicitud para cambiar el PIN de acceso a tu portal.</p><p><a href="${escHtml(link)}" rel="noreferrer" style="display:inline-block;background:#C99E52;color:#29231F;padding:14px 20px;text-decoration:none;border-radius:6px;font-weight:bold">Elegir un PIN nuevo</a></p><p style="font-size:13px;line-height:1.7">El enlace caduca en 15 minutos y solo puede utilizarse una vez. Tu ficha, tus citas y tu pasaporte se conservarán.</p><p style="font-size:12px;line-height:1.7;color:#D6CBB8">Si no has solicitado este cambio, puedes ignorar el correo. Tu PIN seguirá siendo el mismo.</p></div></body></html>`})});
              if(!response.ok){console.error('pin-reset: email provider failed',response.status);return;}
              const sent=await response.json().catch(()=>null);
              if(!sent?.id)console.error('pin-reset: email provider did not confirm delivery');
            }catch{console.error('pin-reset: email request failed');}
          };
          const task=send();
          const runtime=(globalThis as any).EdgeRuntime;
          if(runtime?.waitUntil)runtime.waitUntil(task);else await task;
          return recoveryJson(generic,202);
        }
        const token=String(body.token||'').trim().toLowerCase();
        const pin=String(body.pin||'').trim();
        if(!/^[0-9a-f]{64}$/.test(token))return recoveryJson({error:'El enlace no es válido o ha caducado. Solicita uno nuevo.'},400);
        if(!/^\d{4}$/.test(pin))return recoveryJson({error:'El PIN debe tener cuatro cifras.'},400);
        if(!await take('reset-complete-token:'+token,5,900))return recoveryJson({error:'Demasiados intentos con este enlace. Espera 15 minutos o solicita otro enlace.'},429);
        const {data,error}=await admin.rpc('studio_redeem_pin_reset',{p_token_hash:await hash(token),p_pin:pin});
        if(error){
          const message=String(error?.message||'');
          if(message.includes('RESET_PIN_UNAVAILABLE'))return recoveryJson({error:'Ese PIN no está disponible. Elige otro de cuatro cifras.'},409);
          if(message.includes('RESET_LINK_INVALID'))return recoveryJson({error:'El enlace ha caducado o ya se ha utilizado. Si ya cambiaste el PIN, prueba a entrar; si no, solicita otro enlace.'},400);
          console.error('pin-reset: redemption failed');
          return recoveryJson({error:'No se pudo confirmar el cambio de PIN. Reintenta o contacta con el estudio.'},503);
        }
        if(data?.ok!==true)return recoveryJson({error:'No se pudo confirmar el cambio de PIN.'},503);
        return recoveryJson({ok:true});
      }catch{return recoveryJson({error:'La recuperación no está disponible temporalmente. Reintenta más tarde.'},503);}
    }

    // Public registration: rate-limited; the SQL function creates profile and session atomically.
    if(action==='register'){
      const maintenance=await portalMaintenanceRejection(admin);if(maintenance)return maintenance;
      if(req.method!=='POST')return json({error:'Método no permitido'},405);
      const requestId=String(body.requestId||'');const d=body.details||{};
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))return json({error:'Solicitud de registro no válida'},400);
      const details={nombre:String(d.nombre||'').trim(),apellidos:String(d.apellidos||'').trim(),telefono:String(d.telefono||'').trim(),email:String(d.email||'').trim().toLowerCase(),pin:String(d.pin||'').trim(),birthDate:''};
      if(!details.nombre||details.nombre.length>100||details.apellidos.length>150||details.telefono.length>40||details.email.length>254||!/^\S+@\S+\.\S+$/.test(details.email)||!/^\d{4}$/.test(details.pin))return json({error:'Revisa el nombre, email y PIN de cuatro cifras.'},400);
      const raw=String(d.fechaNacimiento||'').trim();
      if(raw){
        const match=raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
        details.birthDate=match?`${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`:raw;
        const date=new Date(details.birthDate+'T12:00:00Z');
        if(!/^\d{4}-\d{2}-\d{2}$/.test(details.birthDate)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==details.birthDate||details.birthDate>new Date().toISOString().slice(0,10))return json({error:'Revisa la fecha de nacimiento. Usa DD/MM/AAAA.'},400);
      }
      const ip=(req.headers.get('x-forwarded-for')||'').split(',')[0].trim()||'desconocido';
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('register:'+ip));
      const bucket=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
      const {data:allowed,error:limitError}=await admin.rpc('studio_auth_take_attempt',{p_bucket:bucket,p_limit:5,p_window_seconds:900});
      if(limitError)return json({error:'El registro no está disponible temporalmente. Contacta con el estudio.'},503);
      if(allowed!==true)return json({error:'Demasiados intentos de registro. Espera 15 minutos antes de reintentar.'},429);
      const {data,error}=await admin.rpc('studio_register_portal',{p_request:requestId,p_details:details});
      if(error){
        const message=String(error.message||'');
        if(message.includes('REG_PIN_UNAVAILABLE'))return json({error:'Ese PIN no está disponible. Elige otro de cuatro cifras.'},409);
        if(message.includes('REG_ALREADY_EXISTS'))return json({error:'Ya existe una ficha con esos datos. Vuelve a Entrar o contacta con el estudio.'},409);
        if(message.includes('REG_REQUEST_CHANGED'))return json({error:'La solicitud ha cambiado. Recarga el formulario y vuelve a intentarlo.'},409);
        if(error.code==='23505')return json({error:'El email o PIN ya está registrado. Revisa tus datos antes de reintentar.'},409);
        console.error('register failed:',error.code);
        return json({error:'No se pudo completar el registro. Conservamos tus datos para reintentar.'},500);
      }
      return json(data);
    }

    // ---------- auth ----------
    if (action === "auth") {
      const pin = String(body.pin ?? "").trim();
      if (!/^\d{4}$/.test(pin)) return json({ error: "PIN no válido" }, 400);

      // Limita los intentos por origen para que nadie pueda probar los 10.000 PIN.
      const callerIp = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconocido";
      const ipDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`auth:${callerIp}`));
      const bucket = Array.from(new Uint8Array(ipDigest)).map((b) => b.toString(16).padStart(2, "0")).join("");
      const { data: allowed, error: limitError } = await admin.rpc("studio_auth_take_attempt" as never, {
        p_bucket: bucket,
        p_limit: 10,
        p_window_seconds: 900,
      } as never);
      // Never authenticate when the attempt limiter cannot confirm permission.
      if (limitError || (allowed !== true && allowed !== false)) {
        return json({ error: "El acceso no está disponible temporalmente. Inténtalo de nuevo en unos minutos." }, 503);
      }
      if (allowed === false) {
        return json({ error: "Demasiados intentos. Inténtalo de nuevo en unos minutos." }, 429);
      }

      const { data: config, error: configError } = await admin.from("studio_settings").select("configuration").eq("id", true).maybeSingle();
      const configuredPin = (config?.configuration as any)?.masterPin;
      const masterPin = typeof configuredPin === "string" || typeof configuredPin === "number" ? String(configuredPin) : "";
      // No fallback credential: configuration failure must not grant a session.
      if (configError || !/^\d{4}$/.test(masterPin)) {
        return json({ error: "No se pudo verificar la configuración de acceso. Contacta con el estudio." }, 503);
      }

      if (pin === masterPin) {
        const { data, error } = await admin.from("api_tokens").insert({ role: "admin" }).select("token, expires_at").single();
        if (error) return json({ error: "No se pudo iniciar sesión" }, 500);
        return json({ role: "admin", token: data.token, expiresAt: data.expires_at });
      }

      const { data: client, error: clientError } = await admin.from("studio_clients").select("id, whatsapp_consent").eq("legacy_id", Number(pin)).maybeSingle();
      if (clientError) return json({ error: "No se pudo verificar el acceso. Inténtalo de nuevo en unos minutos." }, 503);
      if (client) {
        const { data, error } = await admin.from("api_tokens").insert({ role: "client", client_id: client.id }).select("token, expires_at").single();
        if (error) return json({ error: "No se pudo iniciar sesión" }, 500);
        return json({ role: "client", token: data.token, clientId: client.id, expiresAt: data.expires_at, whatsappConsent: Boolean((client as { whatsapp_consent?: boolean }).whatsapp_consent) });
      }
      return json({ error: "PIN incorrecto" }, 401);
    }

    // Small public responses; no client records or appointment information.
    if (action === 'public-professionals' || action === 'branding') {
      const { data, error } = await admin.from('studio_settings').select('configuration').eq('id', true).maybeSingle();
      if (error) return json(failed(error), 500);
      const config = (data?.configuration || {}) as any;
      if (action === 'branding') return json({brandLogoUrl: config.brandLogoUrl || null, headerLogoUrl: config.headerLogoUrl || null});
      const employees = (Array.isArray(config.employees) ? config.employees : [])
        .filter((e: any) => e.status === 'active' && e.name?.trim())
        .map((e: any) => ({id:e.id || '', name:e.name || '', role:e.role || '', photo:e.photo || '', status:'active'}));
      return json({employees});
    }

    // ---------- public catalog (read-only, sin datos de clientas ni citas) ----------
    if (action === "public-catalog") {
      const { data: catalog, error } = await admin.from("studio_catalog").select("id, category").order("sort_order");
      if (error) return json(failed(error), 500);
      const { data: settings } = await admin.from("studio_settings").select("configuration").eq("id", true).maybeSingle();
      const employees = ((settings?.configuration as Record<string, unknown> | null)?.employees ?? []) as { id?: string; name?: string; role?: string; photo?: string; status?: string }[];
      const activeEmployees = employees.filter((e) => e.status === "active" && e.name?.trim())
        .map((e) => ({ id: e.id || "", name: e.name || "", role: e.role || "", photo: e.photo || "", status: "active" }));
      return json({ catalog: catalog ?? [], employees: activeEmployees });
    }

    // ---------- token check ----------
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Falta autenticación" }, 401);

    const { data: tokenRow } = await admin.from("api_tokens").select("token, role, client_id, expires_at").eq("token", token).maybeSingle();
    if (!tokenRow || new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return json({ error: "Sesión caducada" }, 401);
    }
    const isAdmin = tokenRow.role === "admin";
    if(!isAdmin && ((action==='appointment'&&['POST','PUT','DELETE'].includes(req.method))||['availability','voucher-order'].includes(action))){
      const maintenance=await portalMaintenanceRejection(admin);if(maintenance)return maintenance;
    }
    if(action==='appointment-arrival'){
      if(!isAdmin)return json({error:'Solo administración'},403);
      if(req.method!=='POST')return json({error:'Método no permitido'},405);
      const id=String(body.id||''),operation=String(body.operation||'state');
      if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)||!['state','arrived','adapted','enabled'].includes(operation))return json({error:'Acción de llegada no válida'},422);
      if(operation==='enabled'&&typeof body.enabled!=='boolean')return json({error:'Selecciona si quieres activar el aviso'},422);
      if(operation!=='state'){
        const {data:saved,error}=await admin.rpc('studio_mark_arrival',{p_id:id,p_action:operation,p_enabled:operation==='enabled'?body.enabled:null});
        if(error||saved?.ok!==true){
          const message=String(error?.message||'');
          const reason=message.includes('ARRIVAL_TOO_EARLY')?'Registra la llegada el día de la cita, como máximo dos horas antes.':message.includes('ARRIVAL_FINISHED')?'La hora de finalización prevista ya ha pasado. Revisa la cita antes de cambiarla.':message.includes('ARRIVAL_GRACE')?'Todavía no han pasado los 15 minutos de cortesía.':message.includes('ARRIVAL_NOT_CONFIRMED')?'La cita debe estar activa y confirmada.':'No se pudo guardar la llegada. Actualiza el estado antes de reintentar.';
          return json({error:reason},message.includes('ARRIVAL_')?409:503);
        }
      }
      const {data:appt,error}=await admin.from('studio_appointments').select('id,starts_at,duration_minutes,arrived_at,late_notice_enabled,late_service_adapted_at,lifecycle_status,approval_status,deposit_status,completed_at').eq('id',id).maybeSingle();
      if(error)return json({error:'No se pudo consultar la llegada. Comprueba el SQL de esta mejora.'},503);
      if(!appt)return json({error:'Cita no encontrada'},404);
      const {data:jobs,error:jobsError}=await admin.from('studio_notification_jobs').select('status').eq('appointment_id',id).eq('channel','push').eq('kind','late_arrival_10m');
      if(jobsError)return json({error:'No se pudo comprobar el aviso. Actualiza antes de reintentar.'},503);
      const statuses:Record<string,number>={};for(const job of jobs||[])statuses[job.status]=(statuses[job.status]||0)+1;
      const startsAt=notificationInstant(appt.starts_at);
      return new Response(JSON.stringify({ok:true,id:appt.id,now:new Date().toISOString(),startsAt,
        endsAt:new Date(Date.parse(startsAt)+Number(appt.duration_minutes)*60000).toISOString(),
        arrivedAt:appt.arrived_at,adaptedAt:appt.late_service_adapted_at,enabled:appt.late_notice_enabled===true,
        confirmed:notificationConfirmed(appt)&&appt.lifecycle_status==='active',statuses}),{headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
    }

    if(action==='app-usage'){
      if(req.method!=='POST')return json({error:'Método no permitido'},405);
      if(isAdmin||tokenRow.role!=='client'||!tokenRow.client_id)return json({error:'Solo portal de clientas'},403);
      const deviceId=String(body.deviceId||'');
      if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(deviceId))return json({error:'Dispositivo no válido'},422);
      const accessMode=String(body.accessMode||'');
      if(!['installed','browser'].includes(accessMode))return json({error:'Acceso no válido'},422);
      const {data,error}=await admin.rpc('studio_register_app_usage',{p_device_id:deviceId,p_access_mode:accessMode});
      if(error||data!==true)return json({error:'No se pudo registrar el dispositivo'},503);
      return new Response(JSON.stringify({ok:true}),{headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
    }
    if(action==='app-usage-stats'){
      if(req.method!=='POST')return json({error:'Método no permitido'},405);
      if(!isAdmin)return json({error:'Solo administración'},403);
      const {data,error}=await admin.rpc('studio_app_usage_counts');
      if(error||!data||!Number.isSafeInteger(data.installed)||data.installed<0||!Number.isSafeInteger(data.browser)||data.browser<0)return json({error:'No se pudo consultar el contador'},503);
      return new Response(JSON.stringify({installed:data.installed,browser:data.browser}),{headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
    }

    if (action === 'availability') {
      if (req.method !== 'POST') return json({error:'Método no permitido'},405);
      if (!isAdmin && (tokenRow.role !== 'client' || !tokenRow.client_id)) return json({error:'Necesitas una sesión válida.'},403);
      const startDate=String(body.startDate||''),endDate=String(body.endDate||'');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!/^\d{4}-\d{2}-\d{2}$/.test(endDate))return json({error:'Periodo no válido.'},422);
      const start=new Date(startDate+'T00:00:00Z'),last=new Date(endDate+'T00:00:00Z');
      if(!Number.isFinite(start.getTime())||!Number.isFinite(last.getTime())||start.toISOString().slice(0,10)!==startDate||last.toISOString().slice(0,10)!==endDate||last<start||last.getTime()-start.getTime()>6*86400000)return json({error:'Consulta un máximo de siete días.'},422);
      const {data:settings,error:settingsError}=await admin.from('studio_settings').select('configuration').eq('id',true).maybeSingle();
      if(settingsError||!settings)return json({error:'No se pudo comprobar el periodo de reservas.'},503);
      const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      const earliest=new Date(today+'T00:00:00Z'),latest=new Date(today+'T00:00:00Z');
      earliest.setUTCDate(earliest.getUTCDate()-6);
      const months=Number(settings.configuration?.maxBookingMonths);
      latest.setUTCMonth(latest.getUTCMonth()+(Number.isFinite(months)?Math.max(0,months):3));latest.setUTCDate(latest.getUTCDate()+6);
      if(start<earliest||last>latest)return json({error:'El periodo está fuera del calendario de reservas.'},422);
      let excludeId:string|null=null;
      if(body.excludeAppointmentId!==undefined&&body.excludeAppointmentId!==null){
        const requested=String(body.excludeAppointmentId);
        if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requested))return json({error:'Cita no válida.'},422);
        let ownQuery=admin.from('studio_appointments').select('id').eq('id',requested);
        if(!isAdmin)ownQuery=ownQuery.eq('client_id',tokenRow.client_id);
        const {data:own,error:ownError}=await ownQuery.maybeSingle();
        if(ownError)return json({error:'No se pudo comprobar la cita.'},503);
        if(!own)return json({error:'Cita no encontrada en esta sesión.'},404);
        excludeId=own.id;
      }
      const end=new Date(last.getTime()+86400000);
      const args:Record<string,unknown>={p_start:start.toISOString(),p_end:end.toISOString()};
      if(excludeId)args.p_exclude=excludeId;
      const {data,error}=await admin.rpc('studio_busy_intervals',args);
      if(error||!Array.isArray(data?.busy)||data.busy.some((slot:any)=>typeof slot?.start!=='string'||typeof slot?.end!=='string'||!Number.isFinite(Date.parse(slot.start))||!Number.isFinite(Date.parse(slot.end))||Date.parse(slot.end)<=Date.parse(slot.start)))return json({error:'No se pudieron comprobar los horarios. Reintenta en unos instantes.'},503);
      // Whitelist the output even if the SQL function changes in a future deployment.
      return new Response(JSON.stringify({startDate,endDate,excludeAppointmentId:excludeId,busy:data.busy.map((slot:any)=>({start:slot.start,end:slot.end}))}),{headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
    }
    // News stays outside catalogue/settings sync: summary first, full text on demand.
    if(action==='news-list'||action==='news-detail'){
      if(req.method!=='POST')return json({error:'Método no permitido'},405);
      if(!isAdmin&&(!tokenRow.client_id||tokenRow.role!=='client'))return json({error:'Sesión de clienta necesaria'},403);
      const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      const columns='id,title,summary,category,image_url,status,start_date,end_date,action,service_id,created_at,updated_at';
      let query=admin.from('studio_news').select(action==='news-detail'?columns+',body':columns,{count:'exact'});
      if(!isAdmin)query=query.eq('status','published').or(`start_date.is.null,start_date.lte.${today}`).or(`end_date.is.null,end_date.gte.${today}`);
      if(action==='news-detail'){
        const id=String(body.id||'');if(!/^[a-f0-9-]{36}$/i.test(id))return json({error:'Publicación no válida'},400);
        const {data,error}=await query.eq('id',id).maybeSingle();
        if(error)return json({error:'No se pudo abrir la publicación.'},503);
        if(!data)return json({error:'Esta publicación ya no está disponible.'},404);
        return new Response(JSON.stringify({item:data}),{headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
      }
      const page=Number(body.page??0),size=body.latest===true?1:8;
      if(!Number.isInteger(page)||page<0||page>10000)return json({error:'Página no válida'},400);
      const {data,count,error}=await query.order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*size,page*size+size-1);
      if(error)return json({error:'No se pudieron cargar las novedades. Comprueba que has ejecutado el SQL de Novedades.'},503);
      return new Response(JSON.stringify({items:data||[],total:count||0,page,pageSize:size}),{headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
    }
    if(action==='news-save'||action==='news-delete'){
      if(!isAdmin)return json({error:'Solo administración'},403);
      if(req.method!=='POST')return json({error:'Método no permitido'},405);
      const id=String(body.id||'');if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return json({error:'Publicación no válida'},400);
      const expected=body.expectedUpdatedAt==null?null:String(body.expectedUpdatedAt);
      if(expected!==null&&!Number.isFinite(Date.parse(expected)))return json({error:'Versión de publicación no válida'},400);
      if(action==='news-delete'){
        if(!expected)return json({error:'Vuelve a cargar la publicación antes de borrarla.'},400);
        const {data,error}=await admin.from('studio_news').delete().eq('id',id).eq('updated_at',expected).select('id');
        if(error)return json({error:'No se pudo borrar la publicación.'},503);
        if(!data?.length){const current=await admin.from('studio_news').select('id').eq('id',id).maybeSingle();if(current.error)return json({error:'No se pudo comprobar el borrado.'},503);if(current.data)return json({error:'La publicación ha cambiado. Actualiza la lista antes de borrarla.'},409);}
        return json({ok:true});
      }
      const d=body.item||{};
      const item={title:String(d.title||'').trim(),summary:String(d.summary||'').trim(),body:String(d.body||'').trim(),category:String(d.category||''),image_url:String(d.image_url||'').trim(),status:String(d.status||''),start_date:d.start_date||null,end_date:d.end_date||null,action:String(d.action||'none'),service_id:d.service_id?String(d.service_id):null};
      if(!item.title||item.title.length>100||!item.summary||item.summary.length>240||!item.body||item.body.length>6000)return json({error:'Completa título (100), resumen (240) y texto (6000 caracteres).'},400);
      if(!['servicios','cuidados','studio','avisos'].includes(item.category)||!['draft','published'].includes(item.status)||!['none','service','booking'].includes(item.action))return json({error:'Tipo de publicación no válido'},400);
      const validDate=(v:unknown)=>v===null||(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v);
      if(!validDate(item.start_date)||!validDate(item.end_date)||(item.start_date&&item.end_date&&item.end_date<item.start_date))return json({error:'Revisa las fechas de publicación.'},400);
      if(item.image_url){
        const prefix=new URL(Deno.env.get('SUPABASE_URL')!).origin+'/storage/v1/object/public/service-images/services/';
        if(!item.image_url.startsWith(prefix)||!/^[-a-f0-9]+\.(png|jpe?g|webp)$/.test(item.image_url.slice(prefix.length)))return json({error:'Sube la imagen desde el botón de la publicación.'},400);
      }
      if(item.action==='none')item.service_id=null;
      else{
        if(!item.service_id||item.service_id.length>200)return json({error:'Selecciona el servicio del botón.'},400);
        const {data:rows,error}=await admin.from('studio_catalog').select('category');
        if(error)return json({error:'No se pudo comprobar el servicio.'},503);
        const exists=(rows||[]).some((row:any)=>Array.isArray(row.category?.subservices)&&row.category.subservices.some((sub:any)=>sub.id===item.service_id&&sub.active!==false));
        if(!exists)return json({error:'El servicio debe estar activo en el portal.'},400);
      }
      const equal=(row:any)=>row&&Object.keys(item).every(key=>row[key]===(item as any)[key]);
      let result;
      if(expected)result=await admin.from('studio_news').update(item).eq('id',id).eq('updated_at',expected).select('*').maybeSingle();
      else result=await admin.from('studio_news').insert({id,...item}).select('*').single();
      if(result.error||!result.data){
        const current=await admin.from('studio_news').select('*').eq('id',id).maybeSingle();
        if(!current.error&&equal(current.data))return json({ok:true,item:current.data}); // Retry after a lost response.
        if(current.data||(!result.error&&expected))return json({error:'Esta publicación ha cambiado. Vuelve a abrirla antes de guardar.'},409);
        return json({error:'No se pudo guardar la publicación. Puedes reintentar.'},503);
      }
      return json({ok:true,item:result.data});
    }

    if(action.startsWith('voucher-')){
      if(req.method!=='POST')return json({error:'Método no permitido'},405);
      if(!isAdmin&&(!tokenRow.client_id||tokenRow.role!=='client'))return json({error:'Necesitas una sesión de clienta.'},403);
      const uid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
      const clientId=isAdmin?String(body.clientId||''):String(tokenRow.client_id);
      if(['voucher-activate','voucher-config','voucher-attach','voucher-delete','voucher-delete-test'].includes(action)&&!isAdmin)return json({error:'Solo administración'},403);
      if(action==='voucher-list'){
        const page=Number(body.page||0);if(!Number.isInteger(page)||page<0||page>10000)return json({error:'Página no válida'},400);
        const {data:products,error:pe}=await admin.from('studio_voucher_products').select('*').order('price_cents');
        if(pe)return json({error:voucherError(pe)},503);
        let q=admin.from('studio_voucher_balances').select('*',{count:'exact'});
        if(body.usableOnly===true)q=q.eq('status','active').gte('expires_on',new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())).gt('available_units',0);
        if(!isAdmin)q=q.eq('client_id',tokenRow.client_id);
        else if(clientId){if(!uid(clientId))return json({error:'Clienta no válida'},400);q=q.eq('client_id',clientId);}
        const {data:vouchers,count,error}=await q.order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*12,page*12+11);
        if(error)return json({error:voucherError(error)},503);
        const ids=(vouchers||[]).map((v:any)=>v.id);
        const uses=ids.length?await admin.from('studio_voucher_uses').select('voucher_id,appointment_id,amount_cents,sessions,state,booked_for,service_text,updated_at').in('voucher_id',ids).order('created_at',{ascending:false}).limit(120):{data:[],error:null};
        if(uses.error)return json({error:'No se pudo comprobar el saldo de los bonos.'},503);
        const {data:cfg,error:ce}=await admin.from('studio_settings').select('configuration').eq('id',true).maybeSingle();
        if(ce)return json({error:'No se pudo comprobar el número de Bizum.'},503);
        const rows=(vouchers||[]).map((v:any)=>{
          return {...v,code:v.status==='active'?v.code:'',history:(uses.data||[]).filter((u:any)=>u.voucher_id===v.id)};
        });
        return new Response(JSON.stringify({products,vouchers:rows,total:count||0,page,bizumNumber:String(cfg?.configuration?.bizumNumber||'')}),{headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
      }
      if(action==='voucher-order'){
        if(!uid(body.id)||!uid(clientId))return json({error:'Referencia o clienta no válida'},400);
        const {data:cfg,error}=await admin.from('studio_settings').select('configuration').eq('id',true).maybeSingle();
        if(error||!String(cfg?.configuration?.bizumNumber||'').trim())return json({error:'El Studio debe configurar el número de Bizum antes de solicitar la compra.'},422);
        const {data:order,error:oe}=await admin.rpc('studio_voucher_order',{p_id:body.id,p_client:clientId,p_product:String(body.productId||''),p_dedication:String(body.dedication||'')});
        if(oe)return json({error:voucherError(oe)},422);
        return json({ok:true,id:order.id,checkout:{id:order.id,title:order.title,kind:order.kind,priceCents:order.price_cents,paymentReference:order.payment_reference,status:order.status,bizumNumber:String(cfg.configuration.bizumNumber),dedication:order.dedication||'',paymentReported:!!order.payment_reported_at,existingRequest:order.id!==body.id}});
      }
      if(action==='voucher-delete-test'){
        if(!uid(body.id)||body.confirmTest!==true||typeof body.expectedCode!=='string'||!body.expectedCode.trim())return json({error:'Confirma que es un bono ficticio de prueba.'},422);
        const {data,error}=await admin.rpc('studio_voucher_delete_test',{p_id:body.id,p_code:body.expectedCode,p_confirm_test:true});
        if(error||saved?.ok!==true){
          const message=String(error?.message||'');
          if(message.includes('BONO_TEST_IN_USE'))return json({error:'Tiene saldo o sesiones reservadas o consumidas. No se ha borrado. Revisa sus movimientos antes de continuar.'},409);
          if(message.includes('BONO_TEST_APPOINTMENT'))return json({error:'Sigue aplicado a una cita. Retira primero el bono de esa cita; la cita no se borra con esta opción.'},409);
          if(message.includes('BONO_TEST_CHANGED'))return json({error:'El bono ya no coincide con el seleccionado. Actualiza la lista.'},409);
          return json({error:'No se pudo eliminar el bono. Comprueba el SQL de bonos de prueba y vuelve a intentarlo.'},503);
        }
        if(!data?.ok)return json({error:'El servidor no confirmó la eliminación.'},503);
        return json(data);
      }
      if(action==='voucher-delete'){
        if(!uid(body.id))return json({error:'Solicitud no válida'},400);
        const {data,error}=await admin.rpc('studio_voucher_delete_cancelled',{p_id:body.id});
        if(error){const message=String(error.message||'');return json({error:message.includes('BONO_DELETE_')?'Solo se pueden eliminar solicitudes anuladas que nunca se activaron y no tienen movimientos.':'No se pudo eliminar la solicitud. Comprueba que has ejecutado el SQL de esta actualización.'},422);}
        return json(data||{ok:true,deleted:false});
      }
      if(action==='voucher-activate'){
        if(!uid(body.id)||!Number.isInteger(body.amountCents))return json({error:'Revisa el importe comprobado.'},400);
        const {error}=await admin.rpc('studio_voucher_activate',{p_id:body.id,p_amount:body.amountCents});
        if(error)return json({error:voucherError(error)},422);return json({ok:true});
      }
      if(action==='voucher-report'||action==='voucher-cancel'){
        if(!uid(body.id))return json({error:'Bono no válido'},400);
        let q=admin.from('studio_vouchers').update(action==='voucher-report'?{payment_reported_at:new Date().toISOString()}:{status:'cancelled'}).eq('id',body.id).eq('status','pending');
        if(!isAdmin)q=q.eq('client_id',tokenRow.client_id);
        const {data,error}=await q.select('id');if(error)return json({error:voucherError(error)},503);
        if(!data?.length)return json({error:'Esta solicitud ya no está pendiente. Actualiza tus bonos.'},409);
        return json({ok:true});
      }
      if(action==='voucher-claim'){
        if(!uid(clientId)||!/^LS-[A-F0-9]{32}$/.test(String(body.code||'').trim().toUpperCase()))return json({error:'Revisa el código completo de la tarjeta regalo.'},400);
        const {data:allowed,error:rateError}=await admin.rpc('studio_auth_take_attempt',{p_bucket:'voucher-claim:'+clientId,p_limit:5,p_window_seconds:900});
        if(rateError||allowed===false)return json({error:'No se pueden comprobar más códigos ahora. Reintenta en unos minutos.'},429);
        const {error}=await admin.rpc('studio_voucher_claim',{p_client:clientId,p_code:String(body.code).trim().toUpperCase()});
        if(error)return json({error:voucherError(error)},422);return json({ok:true});
      }
      if(action==='voucher-config'){
        const ids=body.serviceIds;
        if(!['intensive5','men5'].includes(body.productId)||!Array.isArray(ids)||ids.length>100||ids.some((id:any)=>typeof id!=='string'||id.length>200))return json({error:'Selección de servicios no válida'},400);
        const {data:rows,error}=await admin.from('studio_catalog').select('category');
        if(error)return json({error:'No se pudo comprobar el catálogo.'},503);
        const subs=(rows||[]).flatMap((r:any)=>r.category?.subservices||[]);
        const unit=body.productId==='intensive5'?38:20;
        if(ids.some((id:string)=>{const s=subs.find((s:any)=>s.id===id);return !s||s.active===false||!(exactPrice(s.price)===unit&&(!s.priceType||s.priceType==='fijo')||s.variants?.some((v:any)=>exactPrice(v.price)===unit));}))return json({error:'Selecciona servicios activos con el precio del bono (38 € o 20 €).'},422);
        const {error:ue}=await admin.from('studio_voucher_products').update({service_ids:[...new Set(ids)],enabled:body.enabled!==false}).eq('id',body.productId);
        if(ue)return json({error:voucherError(ue)},503);return json({ok:true});
      }
      if(action==='voucher-quote'){
        if(!uid(clientId)||!uid(body.voucherId)||!/^\d{4}-\d{2}-\d{2}$/.test(String(body.dateKey||'')))return json({error:'Revisa la fecha y el bono.'},400);
        let promotion=null;
        if(body.promotionId){
          const cfg=await admin.from('studio_settings').select('configuration').eq('id',true).maybeSingle();const cats=await admin.from('studio_catalog').select('category');
          if(cfg.error||cats.error)return json({error:'No se pudo comprobar la promoción.'},503);
          const promo=cfg.data?.configuration?.promotions?.find((p:any)=>p.id===body.promotionId);
          try{promotion=calculatePromotionDiscount(promo,body.services||[],(cats.data||[]).flatMap((r:any)=>r.category?.subservices||[]),body.dateKey,new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));}
          catch(e){return json({error:e instanceof Error?e.message:'Revisa la promoción.'},422);}
        }
        const {data,error}=await admin.rpc('studio_voucher_quote',{p_voucher:body.voucherId,p_client:clientId,p_services:body.services||[],p_date:body.dateKey,p_promotion:promotion});
        if(error)return json({error:voucherError(error)},422);return json({quote:data});
      }
      if(action==='voucher-attach'){
        if(!uid(body.appointmentId)||(body.voucherId!==null&&!uid(body.voucherId)))return json({error:'Cita o bono no válido'},400);
        const {data:original,error:oe}=await admin.from('studio_appointments').select('*').eq('id',body.appointmentId).maybeSingle();
        if(oe||!original)return json({error:'No se encontró la cita.'},404);
        if(original.completed_at)return json({error:'Elige el bono antes de finalizar la cita.'},422);
        const patch:any={voucher_id:body.voucherId};
        if(!['confirmed','received','paid'].includes(String(original.deposit_status))){
          const cfg=await admin.from('studio_settings').select('configuration').eq('id',true).maybeSingle();const cats=await admin.from('studio_catalog').select('category');
          if(cfg.error||cats.error||!cfg.data)return json({error:'No se pudo comprobar el anticipo de la cita.'},503);
          let amount=0;
          try{if(original.approval_status!=='pending'&&original.client_snapshot?.depositWaiver?.reason!=='trusted_client')amount=calculateServiceDeposit(original.services||[],(cats.data||[]).flatMap((r:any)=>r.category?.subservices||[]),cfg.data.configuration||{},original.duration_minutes);}
          catch(e){return json({error:e instanceof Error?e.message:'Revisa el anticipo de la cita.'},422);}
          patch.deposit_status=amount>0?'pending':'not_required';patch.deposit_amount=amount>0?amount:null;patch.deposit_reference=amount>0?original.deposit_reference||'LS-'+crypto.randomUUID().slice(0,8).toUpperCase():null;
        }
        const {data,error}=await admin.from('studio_appointments').update(patch).eq('id',body.appointmentId).is('completed_at',null).select('*');
        if(error)return json({error:voucherError(error)},422);if(!data?.length)return json({error:'La cita acaba de cambiar. Actualiza la agenda.'},409);
        // Reuse the ordinary notification pipeline if voucher coverage changed the payment gate.
        const saved=data[0],snap=saved.client_snapshot||{};
        try{
          const servicesText=(await appointmentNotificationServices(admin,saved.services,saved.legacy_service_text))+promotionNotificationSuffix(snap.promotion);
          const ctx={apptId:saved.id,startsAt:saved.starts_at,clientName:String(snap.clientName||''),servicesText,confirmed:notificationConfirmed(saved)};
          await scheduleAppointmentEmails(admin,{...ctx,clientEmail:validEmail(snap.email),professional:saved.professional_name||null});
          await scheduleAppointmentWhatsApp(admin,{...ctx,clientPhone:validPhoneE164(snap.phone)});
          await sendAppointmentPush(admin,{...ctx,clientId:saved.client_id});
          await kickDispatcher(admin);
        }catch(e){console.error('Notificaciones del bono:',e instanceof Error?e.message:'error');}
        return json({ok:true});
      }
      return json({error:'Acción de bono no válida'},404);
    }

    // Only a validated administrator can unlock this device's encrypted cache.
    if (action === 'private-cache-key') {
      if (!isAdmin) return json({error: 'Solo administración'}, 403);
      if (req.method !== 'POST') return json({error: 'Método no permitido'}, 405);
      let result = await admin.from('studio_private_cache_key').select('encryption_key').eq('id', true).maybeSingle();
      if (result.error) return json({error: 'No se pudo abrir la protección local. Revisa su instalación.'}, 503);
      if (!result.data) {
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        const key = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
        const inserted = await admin.from('studio_private_cache_key').insert({id: true, encryption_key: key});
        if (inserted.error && inserted.error.code !== '23505') return json({error: 'No se pudo preparar la protección local.'}, 503);
        // A simultaneous request may have created the row; always use the stored key.
        result = await admin.from('studio_private_cache_key').select('encryption_key').eq('id', true).maybeSingle();
      }
      if (result.error || !/^[a-f0-9]{64}$/.test(result.data?.encryption_key || '')) return json({error: 'No se pudo verificar la protección local.'}, 503);
      return new Response(JSON.stringify({key: result.data!.encryption_key}), {
        headers: {...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Pragma': 'no-cache'},
      });
    }

    if(action==='agenda-live'){
      if(!isAdmin)return json({error:'Solo administración'},403);
      const {data,error}=await admin.from('studio_agenda_signal').select('topic').eq('id',true).maybeSingle();
      if(error||!data?.topic)return json({error:'Falta instalar el SQL de agenda en directo.'},500);
      return json({topic:data.topic});
    }

    if(action==='client-details'&&req.method==='PUT'){
      if(!isAdmin)return json({error:'Solo administración'},403);
      const d=body.details||{};const pin=String(d.pinAcceso||'').trim();
      if(!/^\d{4}$/.test(pin)||!String(d.nombre||'').trim())return json({error:'Nombre o PIN no válido'},400);
      const {data:config,error:ce}=await admin.from('studio_settings').select('configuration').eq('id',true).maybeSingle();
      if(ce)return json(failed(ce),500);
      if(pin===String(config?.configuration?.masterPin??'0000'))return json({error:'El PIN de clienta debe ser distinto del PIN maestro'},409);
      const {data:other,error:oe}=await admin.from('studio_clients').select('id').eq('legacy_id',Number(pin)).neq('id',body.id);
      if(oe)return json(failed(oe),500);
      if(other?.length)return json({error:'Este PIN ya está asignado a otra clienta'},409);
      const rawBirth=String(d.fechaNacimiento||'').trim();
      let birth:string|null=null;
      if(rawBirth){
        const match=rawBirth.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
        birth=match?`${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`:rawBirth;
        if(!/^\d{4}-\d{2}-\d{2}$/.test(birth))return json({error:'Fecha de nacimiento no válida. Usa DD/MM/AAAA.'},400);
        const parsed=new Date(birth+'T12:00:00Z');
        if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==birth||birth>new Date().toISOString().slice(0,10))return json({error:'La fecha de nacimiento no existe o es futura. Revisa día, mes y año.'},400);
      }
      const {data,error}=await admin.from('studio_clients').update({legacy_id:Number(pin),first_name:String(d.nombre).trim(),last_name:String(d.apellidos||'').trim(),email:String(d.email||'').trim().toLowerCase(),phone:String(d.telefono||'').trim(),birth_date:birth}).eq('id',body.id).select('id,legacy_id').maybeSingle();
      if(error)return json({error:'No se pudieron guardar los datos. Comprueba la fecha de nacimiento y que el PIN no esté repetido.'},409);
      if(!data||Number(data.legacy_id)!==Number(pin))return json({error:'No se encontró la ficha o no se confirmó el PIN'},404);
      return json({ok:true});
    }

    if(action==='client-delete'){
      if(!isAdmin)return json({error:'Solo administración'},403);
      if(req.method!=='DELETE' && !(req.method==='POST'&&body.inspect===true))return json({error:'Método no permitido'},405);
      const id=String(body.id||'');
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return json({error:'Ficha no válida'},400);
      if(req.method==='DELETE'){
        const {data:bonos,error:bonosError}=await admin.from('studio_vouchers').select('id').or(`client_id.eq.${id},buyer_id.eq.${id}`).limit(1);
        if(bonosError)return json({error:'No se pudo comprobar si la ficha tiene bonos asociados.'},503);
        if(bonos?.length)return json({error:'Esta ficha tiene compras de bonos asociadas. Conserva su historial de saldo y pagos; puedes darla de baja.'},409);
      }
      const {data,error}=await admin.rpc('studio_delete_client_safely',{p_id:id,p_delete:req.method==='DELETE'});
      if(error)return json({error:'No se pudo eliminar la ficha. Revisa que el SQL esté instalado y que no tenga datos asociados.'},409);
      if(req.method==='DELETE'&&!data.deleted)return json({error:'La ficha tiene citas o historial asociado. Se conserva; puedes darla de baja.'},409);
      if(req.method==='DELETE'&&data.deleted)return json({...data,photoCleanupPending:!await cleanClientPhotoObjects(admin)});
      return json(data);
    }


    if (['official-holidays','official-holidays-refresh','official-holidays-open'].includes(action)) {
      if(!isAdmin)return json({error:'Solo administración'},403);
      if(action==='official-holidays-open') {
        if(req.method!=='PUT'||!/^\d{4}-\d{2}-\d{2}$/.test(String(body.day))||typeof body.open!=='boolean')return json({error:'Fecha o apertura no válida'},422);
        const {data,error}=await admin.from('studio_official_holidays').update({is_open:body.open}).eq('day',body.day).select('day').maybeSingle();
        if(error)return json(failed(error),500);
        if(!data)return json({error:'Festivo no encontrado'},404);
        return json({ok:true});
      }
      const year=Number(body.year);
      if(!Number.isInteger(year)||year<2026||year>2100)return json({error:'Año no válido'},422);
      if(action==='official-holidays-refresh')return json({ok:true,state:await refreshElcheYear(admin,year)});
      const [{data:days,error:dayError},{data:state,error:stateError}]=await Promise.all([
        admin.from('studio_official_holidays').select('*').gte('day',year+'-01-01').lte('day',year+'-12-31').order('day'),
        admin.from('studio_holiday_sync').select('*').eq('year',year).maybeSingle()
      ]);
      if(dayError||stateError)return json({error:'Ejecuta primero la instalación SQL de festivos.'},500);
      return json({days:days||[],state});
    }
    if(action==='client-photos'){
      if(req.method!=='POST')return json({error:'Método no permitido'},405);
      const clientId=String(isAdmin?body.clientId:tokenRow.client_id||'');
      if(!isAdmin&&body.clientId&&body.clientId!==clientId)return json({error:'No puedes consultar las fotos de otra ficha'},403);
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId))return json({error:'La ficha debe estar guardada para consultar sus fotos'},422);
      const page=Number(body.page??0),pageSize=12;
      if(!Number.isInteger(page)||page<0||page>10000)return json({error:'Página no válida'},422);
      const {data:photos,count,error}=await admin.from('studio_client_photos').select('id,client_id,object_path,taken_on,label,note,mime,byte_size,created_at',{count:'exact'}).eq('client_id',clientId).order('taken_on',{ascending:false}).order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*pageSize,page*pageSize+pageSize-1);
      if(error)return json({error:'No se pudo leer la galería. Comprueba la instalación SQL.'},503);
      try{
        const signed=await signClientPhotoPaths(admin,(photos||[]).map((row:any)=>row.object_path));
        const expiresAt=new Date(Date.now()+900000).toISOString();
        return new Response(JSON.stringify({photos:(photos||[]).map((row:any)=>({...row,url:signed.get(row.object_path),expiresAt})),total:count||0,page,pageSize}),{headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
      }catch{return json({error:'No se pudieron abrir las fotos privadas. Actualiza la galería o contacta con el Studio.'},503);}
    }
    if(action==='client-photo'){
      if(!isAdmin)return json({error:'Solo el Studio puede subir o eliminar fotos'},403);
      if(req.method==='POST'){
        const clientId=String(body.clientId||''),date=String(body.takenOn||''),label=String(body.label||'seguimiento'),note=String(body.note||'').trim();
        if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId))return json({error:'Guarda primero la ficha de la clienta'},422);
        const day=new Date(date+'T12:00:00Z');const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==date||date>today||!['antes','despues','seguimiento'].includes(label)||note.length>1000)return json({error:'Revisa la fecha, etiqueta y nota de la foto'},422);
        const dataUrl=String(body.dataUrl||'');
        if(dataUrl.length>750000)return json({error:'La foto es demasiado grande. Vuelve a seleccionarla para optimizarla.'},413);
        const match=/^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
        if(!match)return json({error:'Elige una foto JPG, PNG o WebP'},422);
        let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(match[3]),char=>char.charCodeAt(0));}catch{return json({error:'El archivo de foto no es válido'},422);}
        const mime=match[1],kind=match[2];
        const valid=kind==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:kind==='png'?[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value):bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
        if(!valid||bytes.length===0||bytes.length>524288)return json({error:'La foto no es válida o supera 512 KB'},422);
        const {data:client,error:clientError}=await admin.from('studio_clients').select('id').eq('id',clientId).maybeSingle();
        if(clientError)return json({error:'No se pudo comprobar la ficha'},503);if(!client)return json({error:'La ficha ya no existe'},404);
        const requestId=String(body.requestId||'');
        if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))return json({error:'Solicitud de subida no válida'},422);
        const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as unknown as ArrayBuffer))).map(value=>value.toString(16).padStart(2,'0')).join('');
        const same=(photo:any)=>photo&&photo.client_id===clientId&&photo.sha256===sha&&photo.taken_on===date&&photo.label===label&&photo.note===note;
        const {data:previous,error:previousError}=await admin.from('studio_client_photos').select('id,client_id,sha256,taken_on,label,note').eq('id',requestId).maybeSingle();
        if(previousError)return json({error:'No se pudo comprobar la subida anterior. Reintenta.'},503);
        if(previous)return same(previous)?json({ok:true,id:previous.id}):json({error:'La solicitud de foto ha cambiado. Vuelve a seleccionar el archivo.'},409);
        const path=clientId+'/'+requestId+'.'+(kind==='jpeg'?'jpg':kind);
        const {error:uploadError}=await admin.storage.from('client-photos').upload(path,bytes,{contentType:mime,cacheControl:'300',upsert:true});
        if(uploadError)return json({error:'No se pudo subir la foto. Conservamos la selección para reintentar.'},503);
        const {data:saved,error:saveError}=await admin.from('studio_client_photos').insert({id:requestId,client_id:clientId,object_path:path,taken_on:date,label,note,mime,byte_size:bytes.length,sha256:sha}).select('id').single();
        if(saveError||!saved){
          const {data:completed}=await admin.from('studio_client_photos').select('id,client_id,sha256,taken_on,label,note').eq('id',requestId).maybeSingle();
          if(same(completed))return json({ok:true,id:completed.id});
          await admin.from('studio_client_photo_cleanup').upsert({object_path:path},{onConflict:'object_path'});
          await cleanClientPhotoObjects(admin);
          return json({error:'No se pudo guardar la foto en la ficha. Reintenta.'},503);
        }
        await cleanClientPhotoObjects(admin);
        return json({ok:true,id:saved.id});
      }
      if(req.method==='DELETE'){
        const id=String(body.id||''),clientId=String(body.clientId||'');
        if(!/^[0-9a-f-]{36}$/i.test(id)||!/^[0-9a-f-]{36}$/i.test(clientId))return json({error:'Foto o ficha no válida'},422);
        const {error}=await admin.from('studio_client_photos').delete().eq('id',id).eq('client_id',clientId);
        if(error)return json({error:'No se pudo eliminar la foto. Reintenta.'},503);
        const cleaned=await cleanClientPhotoObjects(admin);
        return json({ok:true,cleanupPending:!cleaned});
      }
      return json({error:'Método no permitido'},405);
    }

    if(action==='backup'){
      if(!isAdmin)return json({error:'Solo administración'},403);
      if(req.method!=='POST')return json({error:'Método no permitido'},405);
      const {data:snapshot,error}=await admin.rpc('studio_export_business_backup');
      if(error||!snapshot?.tables||snapshot.snapshotVersion!==1)return json({error:'No se pudo generar una copia completa de datos. Comprueba la instalación SQL; no se descargará una copia parcial.'},503);
      if(new TextEncoder().encode(JSON.stringify(snapshot)).byteLength>16*1024*1024)return json({error:'La copia de datos supera el tamaño admitido por esta descarga. Utiliza una exportación de base de datos de Supabase.'},413);
      const origin=new URL(Deno.env.get('SUPABASE_URL')!).origin;
      const paths=new Set<string>();
      const prefix=origin+'/storage/v1/object/public/service-images/';
      const visit=(value:unknown)=>{
        if(typeof value==='string'&&value.startsWith(prefix)){
          let path:string;try{path=decodeURIComponent(value.slice(prefix.length).split(/[?#]/)[0]);}catch{throw new Error('Invalid storage path');}
          if(!path||path.startsWith('/')||path.split('/').some(part=>part==='..'||part==='.')||/[\\\x00-\x1f]/.test(path))throw new Error('Invalid storage path');
          paths.add(path);
        }else if(Array.isArray(value))value.forEach(visit);
        else if(value&&typeof value==='object')Object.values(value).forEach(visit);
      };
      try{visit(snapshot.tables.studio_catalog);visit(snapshot.tables.studio_settings);visit((snapshot.tables.studio_news||[]).map((item:any)=>item.image_url));}catch{return json({error:'Hay una dirección de foto no válida. Revisa el catálogo antes de crear la copia.'},422);}
      const media=[...paths].sort().map(path=>({bucket:'service-images',path,url:prefix+path.split('/').map(encodeURIComponent).join('/')}));
      const privatePaths=[...new Set<string>((snapshot.tables.studio_client_photos||[]).map((photo:any)=>photo.object_path))];
      try{const signed=body.includePhotos===true?await signClientPhotoPaths(admin,privatePaths):new Map<string,string>();for(const path of privatePaths)media.push({bucket:'client-photos',path,url:signed.get(path)||''});}
      catch{return json({error:'No se pudieron preparar las fotos privadas para la copia. Reintenta.'},503);}
      return new Response(JSON.stringify({snapshot,source:origin,media}),{headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store','Pragma':'no-cache'}});
    }

    // STUDIO_OPINIONS_V1
    if(action==='nps-summary'){
      if(!isAdmin)return json({error:'Solo administración'},403);
      if(req.method!=='POST')return json({error:'Método no permitido'},405);
      if(!['30d','90d','all'].includes(body.period))return json({error:'Periodo no válido'},422);
      const {data,error}=await admin.rpc('studio_nps_summary_v1',{p_period:body.period});
      if(error||!data){const setup=['PGRST202','42883','42703','42P01'].includes(String(error?.code||''));return json({error:setup?'No se pudo consultar el NPS. Comprueba la actualización SQL de Opiniones.':'No se pudo consultar el NPS. Reintenta.',code:setup?'NPS_SETUP_REQUIRED':'NPS_UNAVAILABLE'},503);}
      return json(data);
    }
    if(action==='feedback'){
      if(req.method!=='POST')return json({error:'Método no permitido'},405);
      if(isAdmin||tokenRow.role!=='client'||!tokenRow.client_id)return json({error:'Accede como clienta para enviar tu opinión.'},403);
      const scale=body.ratingScale===undefined?5:body.ratingScale;
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(body.id||''))||!Number.isInteger(body.rating)||![5,10].includes(scale)||body.rating<(scale===5?1:0)||body.rating>scale||typeof body.comment!=='string'||body.comment.length>4000)return json({error:'Revisa la puntuación y el comentario.'},422);
      const {data,error}=await admin.rpc('studio_nps_submit_v1',{p_client:tokenRow.client_id,p_id:body.id,p_rating:body.rating,p_comment:body.comment,p_scale:scale});
      if(error){if(String(error.message||'').includes('NPS_REQUEST_CONFLICT'))return json({error:'La solicitud ya se usó para otra opinión.'},409);return json({error:'No se pudo confirmar tu opinión. Conservamos lo escrito para reintentar.'},503);}
      return json(data);
    }
    if(action==='feedback-status'){
      if(!isAdmin)return json({error:'Solo administración'},403);
      if(req.method!=='PUT')return json({error:'Método no permitido'},405);
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(body.id||''))||typeof body.resolved!=='boolean')return json({error:'Opinión no válida.'},422);
      const {data,error}=await admin.from('studio_feedback').update({resolved_at:body.resolved?new Date().toISOString():null}).eq('id',body.id).select('id,resolved_at').maybeSingle();
      if(error)return json({error:'No se pudo guardar el seguimiento de la opinión.'},503);
      if(!data)return json({error:'No se encontró esa opinión.'},404);
      return json({ok:true,resolvedAt:data.resolved_at});
    }

    // Each caller can request only the sections it needs. Old clients still receive full sync.
    if (action === "sync") {
      const allowedSections = ['catalog', 'settings', 'closures', 'timeBlocks', 'clients', 'appointments', 'feedback'];
      if (body.sections !== undefined && (!Array.isArray(body.sections) || body.sections.some((s: any) => !allowedSections.includes(s)))) {
        return json({error:'Secciones de sincronización no válidas.'},400);
      }
      const sections = new Set<string>(body.sections ?? allowedSections);
      const response: Record<string, any> = {role: isAdmin ? 'admin' : 'client'};
      if (!isAdmin) response.clientId = tokenRow.client_id;
      if (!isAdmin && !tokenRow.client_id) return json({error:'Sesión sin clienta asociada.'},403);
      const read = async (query: any) => {
        const {data, error} = await query;
        if (error) throw error;
        return data;
      };
      const jobs: Promise<void>[] = [];
      if (sections.has('catalog')) jobs.push((async () => {
        response.catalog = await read(admin.from('studio_catalog').select('id, category').order('sort_order')) ?? [];
      })());
      if (sections.has('settings')) jobs.push((async () => {
        const row = await read(admin.from('studio_settings').select('configuration').eq('id',true).maybeSingle());
        response.settings = isAdmin ? row?.configuration ?? null : settingsForClient(row?.configuration ?? null);
      })());
      if (sections.has('closures')) jobs.push((async () => {
        const [manual, official] = await Promise.all([
          read(admin.from('studio_closures').select('id, start_date, end_date, type, reason')),
          read(admin.from('studio_official_holidays').select('day,name').eq('is_open',false)),
        ]);
        response.closures = [...(manual ?? []), ...(official ?? []).map((d: any) => ({id:'auto-'+d.day,start_date:d.day,end_date:d.day,type:'festivo',reason:d.name}))];
      })());
      if (sections.has('timeBlocks')) jobs.push((async () => {
        response.timeBlocks = await read(admin.from('studio_time_blocks').select(isAdmin ? 'id, starts_at, ends_at, reason' : 'id, starts_at, ends_at')) ?? [];
      })());
      if (sections.has('appointments')) jobs.push((async () => {
        let query = admin.from('studio_appointments').select('*').order('starts_at');
        // Filter in PostgreSQL, before any other client's records leave the database.
        if (!isAdmin) query = query.eq('client_id',tokenRow.client_id);
        const rows = await read(query) ?? [];
        response.appointments = isAdmin ? rows : rows.map(appointmentForClient);
      })());
      if (sections.has('clients')) jobs.push((async () => {
        const scoped = (table: string, columns: string, key: string) => {
          const query = admin.from(table).select(columns);
          return read(isAdmin ? query : query.eq(key,tokenRow.client_id));
        };
        const [clients, passports, visits] = await Promise.all([
          scoped('studio_clients','id, legacy_id, registration_id, first_name, last_name, email, phone, birth_date, created_at','id'),
          scoped('studio_passports','client_id, hair_diagnosis, home_care, last_visit_text, next_visit_text','client_id'),
          scoped('studio_visits','id, client_id, visit_date, service, stylist, shared_notes, source_appointment_id','client_id'),
        ]);
        if (isAdmin) response.clients = (clients ?? []).map((c: any) => ({...c,passport:passports?.find((p: any)=>p.client_id===c.id) ?? null,visits:(visits ?? []).filter((v: any)=>v.client_id===c.id),notes:null}));
        else {
          response.me = clients?.[0] ?? null;
          response.passport = passports?.[0] ?? null;
          response.visits = visits ?? [];
        }
      })());
      if (isAdmin && sections.has('feedback')) jobs.push((async () => {
        response.feedback = await read(admin.from('studio_feedback').select('id, rating, rating_scale, comment, resolved_at, created_at, client_id')) ?? [];
      })());
      await Promise.all(jobs);
      return json(response);
    }

    // ---------- admin-only mutations ----------
    if (action === "email-status") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const appointmentId = String(body.appointmentId ?? "");
      if (!appointmentId) return json({ error: "Falta la cita" }, 400);
      const { data: cfg, error: cfgErr } = await admin.from("studio_email_config").select("worker_secret").eq("id", true).maybeSingle();
      if (cfgErr) return json(failed(cfgErr), 500);
      const { data: emails, error } = await admin
        .from("studio_email_outbox")
        .select("id, kind, to_email, subject, status, scheduled_at, sent_at, provider, provider_message_id, last_error, attempts, created_at")
        .eq("appointment_id", appointmentId)
        .order("created_at");
      if (error) return json(failed(error), 500);
      return json({ emails: emails ?? [] });
    }

    if (action === "email-config") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const { data: cfg, error } = await admin.from("studio_email_config").select("provider, from_email, portal_url, service_key").eq("id", true).maybeSingle();
      if (error) return json(failed(error), 500);
      const row = (cfg ?? {}) as Record<string, unknown>;
      return json({
        providerConfigured: Boolean(row.service_key && row.from_email),
        provider: (row.provider as string) ?? null,
        fromEmail: (row.from_email as string) ?? null,
        portalUrl: (row.portal_url as string) ?? null,
      });
    }

    if (action === "whatsapp-consent" && req.method === "PUT") {
      // Client scope: a clienta saves her own consent. Admin can set it for any client.
      const consent = Boolean(body.consent);
      let targetClientId = tokenRow.client_id as string | null;
      if (isAdmin && body.clientId) targetClientId = String(body.clientId);
      if (!targetClientId) return json({ error: "Falta la clienta" }, 400);
      const { error } = await admin.from("studio_clients").update({ whatsapp_consent: consent }).eq("id", targetClientId);
      if (error) return json(failed(error), 500);
      return json({ ok: true, whatsappConsent: consent });
    }

    if (action === "whatsapp-retry" && req.method === "POST") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const appointmentId = String(body.appointmentId ?? "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appointmentId)) {
        return json({ error: "Cita no válida" }, 400);
      }
      const { data: retried, error } = await admin.rpc("studio_reenqueue_whatsapp_confirmation" as never, { p_appointment_id: appointmentId } as never);
      if (error) return json(failed(error), 500);
      await kickDispatcher(admin);
      return json({ ok: true, retried: Number(retried) || 0 });
    }

    if (action === "whatsapp-status") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const appointmentId = String(body.appointmentId ?? "");
      if (!appointmentId) return json({ error: "Falta la cita" }, 400);
      const { data: messages, error } = await admin
        .from("studio_whatsapp_outbox")
        .select("id, kind, to_phone, status, scheduled_at, sent_at, delivered_at, read_at, provider, provider_message_id, body_text, last_error, attempts, created_at")
        .eq("appointment_id", appointmentId)
        .order("created_at");
      if (error) return json(failed(error), 500);
      const {data:jobs,error:jobError}=await admin.from('studio_notification_jobs').select('*').eq('appointment_id',appointmentId).eq('channel','whatsapp').order('scheduled_at');
      if(jobError)return json(failed(jobError), 500);
      return json({messages:[...(messages||[]),...(jobs||[]).map((j:any)=>({...j,status:['delivered','read'].includes(j.provider_delivery_status) ? j.provider_delivery_status:j.status,body_text:`Recordatorio de cita ${j.kind === 'reminder_24h' ? '24 horas' : j.kind === 'reminder_1h' ? '1 hora' : '2 horas'} antes`,sent_at:j.sent_at,provider:j.provider,provider_message_id:j.provider_message_id,delivered_at:null,read_at:null}))]});
    }

    if (action === "whatsapp-config") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const { data: cfg, error } = await admin.from("studio_whatsapp_config").select("provider, access_token, phone_number_id, template_name, studio_phone, portal_url, notification_templates").eq("id", true).maybeSingle();
      if (error) return json(failed(error), 500);
      const row = (cfg ?? {}) as Record<string, unknown>;
      const missing: string[] = [];
      if (!row.provider || !row.phone_number_id || !row.access_token) missing.push("Credenciales de WhatsApp Business Platform (proveedor, phone_number_id y token de sistema)");
      if (!row.template_name) missing.push("Plantilla aprobada por Meta para las confirmaciones");
      if (!row.studio_phone) missing.push("Número de WhatsApp del Studio verificado");
      return json({
        providerConfigured: missing.length === 0,
        missing,
        provider: (row.provider as string) ?? null,
        templateName: (row.template_name as string) ?? null,
        studioPhone: (row.studio_phone as string) ?? null,
        portalUrl: (row.portal_url as string) ?? null,
      });
    }

    if (action === "service-image" && req.method === "POST") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const dataUrl = String(body.dataUrl ?? "");
      const match = /^data:(image\/(png|jpeg|webp));base64,(.+)$/.exec(dataUrl);
      if (!match) return json({ error: "Formato de imagen no soportado" }, 400);
      const [, mime, , base64] = match;
      const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
      if (bytes.length > 4 * 1024 * 1024) return json({ error: "La imagen supera 4 MB" }, 400);
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const path = `services/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await admin.storage.from("service-images").upload(path, bytes, {
        contentType: mime, upsert: false,
      });
      if (upErr) return json(failed(upErr), 500);
      const { data: pub } = admin.storage.from("service-images").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (typeof publicUrl !== "string" || !publicUrl.trim()) {
        return json({ error: "La foto se ha subido, pero no se pudo obtener su dirección pública." }, 500);
      }
      return json({ ok: true, url: publicUrl, path });
    }

    if (action === "service-image" && req.method === "DELETE") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const path = String(body.path ?? "");
      if (!/^services\/[a-f0-9-]+\.(png|jpe?g|webp)$/.test(path)) return json({ error: "Ruta no válida" }, 400);
      const { error } = await admin.storage.from("service-images").remove([path]);
      if (error) return json(failed(error), 500);
      return json({ ok: true });
    }

    if (action === "catalog" && req.method === "PUT") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      if (!Array.isArray(body.catalog)) return json({error:'Catálogo no válido.'},400);
      for(const category of body.catalog)for(const sub of category.subservices||[]){
        const invalid=validateServiceDeposit(sub);if(invalid)return json({error:(sub.bookingName||sub.name||'Servicio')+': '+invalid},422);
      }
      if (/data:image\//i.test(JSON.stringify(body.catalog))) return json({error:'Hay una imagen incrustada. Vuelve a subirla desde el catálogo para guardarla en Storage antes de guardar.'},400);
      const rows = (body.catalog as any[]).map((category, index) => ({
        id: String(category.id),
        sort_order: index,
        category,
      }));
      const { error } = await admin.from("studio_catalog").upsert(rows, { onConflict: "id" });
      if (error) return json(failed(error), 500);
      const keep = new Set(rows.map(row => row.id));
      const { data: existing } = await admin.from("studio_catalog").select("id");
      const stale = (existing ?? []).filter(row => !keep.has(row.id)).map(row => row.id);
      if (stale.length) await admin.from("studio_catalog").delete().in("id", stale);
      return json({ ok: true });
    }

    if (action === "settings" && req.method === "PUT") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      if(body.settings?.weeklyHours !== undefined){const issues=studioWeekErrors(body.settings.weeklyHours);if(issues.length)return json({error:issues.join(' ')},422);}
      const { error } = await admin.from("studio_settings").upsert({ id: true, configuration: body.settings }, { onConflict: "id" });
      if (error) return json(failed(error), 500);
      // Si se cambió el PIN maestro, invalidar todas las demás sesiones admin.
      const incomingPin = (body.settings as Record<string, unknown>)?.masterPin;
      if (typeof incomingPin === "string" && /^\d{4}$/.test(incomingPin) && incomingPin !== "0000") {
        await admin.from("api_tokens")
          .delete()
          .eq("role", "admin")
          .neq("token", token);
      }
      return json({ ok: true });
    }

    if (action === "client" && req.method === "POST") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const pin = String(body.pin ?? "").trim();
      if (!/^\d{4}$/.test(pin)) return json({ error: "PIN de clienta no válido" }, 400);
      // Authentication reads legacy_id; it must contain the chosen client PIN.
      const legacyId = Number(pin);
      const {data:config,error:configError}=await admin.from('studio_settings').select('configuration').eq('id',true).maybeSingle();
      if(configError)return json(failed(configError),500);
      if(pin===String(config?.configuration?.masterPin??'0000'))return json({error:'El PIN de clienta debe ser distinto del maestro'},409);
      const {data:existing,error:existingError}=await admin.from('studio_clients').select('id').eq('legacy_id',legacyId);
      if(existingError)return json(failed(existingError),500);
      if(existing?.length)return json({error:'Este PIN ya pertenece a una ficha. Actualiza Clientas o elige otro.'},409);
      const email=String(body.email||'').trim().toLowerCase();
      if(email){
        const {data:matches,error:emailError}=await admin.from('studio_clients').select('id').eq('email',email);
        if(emailError)return json(failed(emailError),500);
        if(matches?.length)return json({error:'Ya existe una ficha con ese email. Actualiza el listado antes de crear otra.'},409);
      }

      const { data: client, error } = await admin.from("studio_clients").insert({
        legacy_id: legacyId,
        registration_id: body.registroId ?? null,
        email: String(body.email ?? "").toLowerCase().trim() || `clienta${legacyId}@lstudio.local`,
        first_name: body.nombre ?? "",
        last_name: body.apellidos ?? "",
        phone: body.telefono ?? "",
      }).select("id,registration_id").single();
      if (error) return json(failed(error), 500);
      await admin.from("studio_passports").upsert({
        client_id: client.id,
        hair_diagnosis: body.dniCapilar ?? "",
        home_care: body.prescripcionCasa ?? "",
        last_visit_text: body.ultimaVisita ?? "",
        next_visit_text: body.proximaVisitaSugerida ?? "",
      }, { onConflict: "client_id" });
      return json({ ok: true, id: client.id, legacyId, registrationId: client.registration_id });
    }

    if (action === 'passport-state' || (action === 'passport' && req.method === 'PUT')) {
      if(!isAdmin)return json({error:'Solo administración'},403);
      const clientId=String(body.clientId||'');
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId))return json({error:'Ficha no válida.'},422);
      if(action==='passport-state'&&req.method!=='POST')return json({error:'Método no permitido'},405);
      let result;
      if(action==='passport-state')result=await admin.rpc('studio_passport_state',{p_client:clientId});
      else{
        if(!/^[a-f0-9]{32}$/.test(String(body.expectedRevision||''))||!/^[0-9a-f-]{36}$/i.test(String(body.requestId||''))||!Array.isArray(body.pastVisits))return json({error:'Abre de nuevo el editor para cargar una versión comprobada del pasaporte.'},422);
        result=await admin.rpc('studio_save_passport',{p_client:clientId,p_expected:body.expectedRevision,p_request:body.requestId,p_document:{dniCapilar:body.dniCapilar||'',prescripcionCasa:body.prescripcionCasa||'',ultimaVisita:body.ultimaVisita||'',proximaVisitaSugerida:body.proximaVisitaSugerida||'',pastVisits:body.pastVisits}});
      }
      if(result.error){
        const message=String(result.error.message||'');
        if(message.includes('STUDIO_PASSPORT_CHANGED'))return json({error:'El pasaporte o historial cambió en el servidor. Conserva tus cambios y vuelve a abrir la versión actual antes de guardarlos.'},409);
        if(message.includes('STUDIO_PASSPORT_REQUEST_CHANGED'))return json({error:'Esta referencia ya corresponde a otros cambios. Vuelve a abrir el pasaporte.'},409);
        if(message.includes('STUDIO_PASSPORT_INVALID'))return json({error:'Revisa las visitas y sus referencias. No se ha aplicado ningún cambio.'},422);
        return json({error:'No se pudo guardar o leer el pasaporte. Revisa el SQL del historial. Tus cambios se conservan.'},503);
      }
      if(!result.data?.revision||!Array.isArray(result.data.visits))return json({error:'No se pudo comprobar la versión del pasaporte.'},503);
      return new Response(JSON.stringify({ok:true,state:result.data}),{headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
    }

    if (action === "closure" && req.method === "POST") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const { data, error } = await admin.from("studio_closures").insert({
        start_date: body.startDate, end_date: body.endDate, type: body.type ?? "vacaciones", reason: body.reason ?? "",
      }).select("id").single();
      if (error) return json(failed(error), 500);
      return json({ ok: true, id: data.id });
    }

    if (action === "closure" && req.method === "DELETE") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const {error} = await admin.from("studio_closures").delete().eq("id", body.id);
      if(error)return json(failed(error),500);
      return json({ ok: true });
    }

    if (action === "timeblock" && req.method === "POST") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const id = String(body.id || '');
      const date = String(body.dateKey || ''), time = String(body.time || ''), duration = Number(body.durationMinutes);
      const reason = String(body.reason || 'Tiempo reservado').trim() || 'Tiempo reservado';
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
        || !Number.isInteger(duration) || duration < 5 || duration > 720 || reason.length > 240) return json({error:'Revisa la fecha, hora y duración del bloqueo (5–720 minutos).'},422);
      const start = new Date(date + 'T' + time + ':00Z');
      if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0,10) !== date) return json({error:'Fecha no válida.'},422);
      const end = new Date(start.getTime() + duration * 60000);
      if (end.toISOString().slice(0,10) !== date) return json({error:'El bloqueo debe terminar en el mismo día.'},422);
      const {data,error} = await admin.rpc('studio_save_time_block', {p_id:id,p_start:start.toISOString(),p_end:end.toISOString(),p_reason:reason});
      if (error) {
        const message = String(error.message || '');
        if (message.includes('STUDIO_TIME_BLOCK_CONFLICT')) return json({error:'Este periodo coincide con una cita o con otro bloqueo. Actualiza la agenda.'},409);
        if (message.includes('STUDIO_BLOCK_REFERENCE_CHANGED')) return json({error:'La referencia del bloqueo ya tiene otros datos. Comprueba la agenda antes de reintentar.'},409);
        if (message.includes('STUDIO_BLOCK_INVALID_INTERVAL')) return json({error:'El intervalo del bloqueo no es válido.'},422);
        return json({error:'No se pudo guardar el bloqueo. Revisa el SQL de bloqueos e inténtalo de nuevo.'},503);
      }
      if (!data?.id) return json({error:'El servidor no confirmó el bloqueo.'},503);
      return json({ok:true,id:data.id});
    }

    if (action === "timeblock" && req.method === "DELETE") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(body.id || ''))) return json({error:'Bloqueo no válido.'},422);
      const {error} = await admin.from("studio_time_blocks").delete().eq("id", body.id);
      if (error) return json({error:'No se pudo desbloquear el periodo. Conservamos el bloqueo hasta comprobar el servidor.'},503);
      return json({ ok: true });
    }

    // ---------- appointments (admin or client) ----------
    if (action === "appointment" && req.method === "POST") {
      if(body.clientNote!==undefined&&(typeof body.clientNote!=='string'||body.clientNote.length>500))return json({error:'La nota de la cita debe ser texto de hasta 500 caracteres.'},422);
      const bookingClientNote=typeof body.clientNote==='string'?body.clientNote.trim():'';
      if(body.waiveDeposit!==undefined&&(typeof body.waiveDeposit!=='boolean'||!isAdmin))return json({error:'Solo administración puede decidir la exención del anticipo.'},403);
      const depositWaiverForCreate=isAdmin&&body.waiveDeposit===true?{reason:'trusted_client',grantedAt:new Date().toISOString()}:null;
      if(Array.isArray(body.services)&&body.services.some((item:any)=>item?.appointmentDiscount)){
        if(!isAdmin)return json({error:'Solo administración puede aplicar descuentos u obsequios.'},403);
        if(body.promotionId||body.voucherId)return json({error:'Revisa el bono o promoción antes de añadir otro descuento.'},422);
        const {data:discountRows,error:discountError}=await admin.from('studio_catalog').select('category');
        if(discountError)return json({error:'No se pudo comprobar el precio.'},503);
        try{body.services=validatedAppointmentDiscounts(body.services,(discountRows||[]).flatMap((r:any)=>r.category?.subservices||[]));body.selectedVariant=body.services[0]?.variant||null;}
        catch(error){return json({error:error instanceof Error?error.message:'Descuento no válido.'},422);}
      }
      const startsAt = `${body.dateKey}T${body.time}:00`;
      if (!isAdmin && (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.dateKey||'')) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.time||'')) || !Array.isArray(body.services) || !body.services.length)) return json({error:'Elige servicios, fecha y hora válidos.'},422);
      if(await blockedOfficialDay(admin,String(body.dateKey)))return json({error:'El Studio está cerrado por festivo. Elige otro día.'},422);
      const {data:manualClosures,error:closureError}=await admin.from('studio_closures').select('id').lte('start_date',body.dateKey).gte('end_date',body.dateKey).limit(1);
      if(closureError)return json(failed(closureError),500);
      if(manualClosures?.length)return json({error:'El Studio tiene un cierre en esa fecha.'},422);
      let duration = Number(body.durationMinutes) || 45;
      if(Array.isArray(body.services)&&body.services.length){
        const {data:timingRows,error:timingError}=await admin.from('studio_catalog').select('category');
        if(timingError)return json(failed(timingError),500);
        const timingCatalog=(timingRows||[]).flatMap((row:any)=>row.category?.subservices||[]);
        let serviceTime=0,buffer=0;
        for(const item of body.services){
          const sub=timingCatalog.find((entry:any)=>entry.id===item.sub?.id);
          if(!sub)return json({error:'Hay un servicio que ya no está disponible'},422);
          const variant=item.variant?.id?sub.variants?.find((v:any)=>v.id===item.variant.id):null;
          serviceTime+=parseInt(String(variant?.duration||sub.duration||'45').match(/\d+/)?.[0]||'45',10);
          const value=Number(sub.bufferMinutes);
          buffer=Math.max(buffer,Number.isFinite(value)?Math.max(0,Math.min(120,Math.round(value))):0);
        }
        duration=serviceTime+buffer;
      }


      // Aplicar las mismas condiciones editables del catálogo en el servidor.
      if (Array.isArray(body.services) && body.services.length) {
        const {data:rows,error:catalogError}=await admin.from('studio_catalog').select('category');
        if(catalogError)return json(failed(catalogError), 500);
        const catalog=(rows || []).flatMap((r:any)=>r.category?.subservices || []);
        const selected=body.services.map((item:any)=>({sub:catalog.find((sub:any)=>sub.id === item?.sub?.id),variant:item.variant}));
        if(selected.some((item:any)=>!item.sub || (!isAdmin && item.sub.active === false)))return json({error:'Hay servicios no disponibles en la reserva'},422);
        if(selected.some((i:any)=>i.sub.hasVariants && i.sub.variants?.length && !i.sub.variants.some((v:any)=>v.id===i.variant?.id)))return json({error:'Selecciona una variante válida para cada servicio'},422);
        if (!isAdmin) {
        for(const item of selected)for(const group of item.sub.addonGroups || []) {
          if(group.mode==='required' && !selected.some((i:any)=>i.sub.id!==item.sub.id && i.sub.active!==false && group.serviceIds?.includes(i.sub.id)))return json({error:'Completa '+(item.sub.bookingName||item.sub.name)+': '+group.title},422);
        }
        if(selected.some((i:any)=>i.sub.isCutGoService) && selected.some((i:any)=>i.sub.isStylingService && !i.sub.isCutGoService))return json({error:'Elige peinado o Cut & Go, no ambas modalidades'},422);
        for(const kind of ['styling','toner']) {
          const flag=kind === 'styling' ? 'isStylingService':'isTonerService';
          const policy=kind+'Policy'; const ids=kind+'AllowedIds';
          const compatible=(owner:any,candidate:any)=>candidate.id !== owner.id && candidate[flag] && candidate.active !== false && (!candidate.isCutGoService || kind === 'styling' && owner.allowCutGo) && (!Array.isArray(owner[ids]) || owner[ids].includes(candidate.id));
          for(const item of selected) {
            if(!item.sub[flag] && item.sub[policy] === 'required' && !selected.some((i:any)=>compatible(item.sub,i.sub)))return json({error:`Completa ${item.sub.name} con un complemento compatible de ${kind === 'styling' ? 'peinado':'matiz'}`},422);
            if(item.sub[flag] && item.sub.hasVariants && item.sub.variants?.length && !item.sub.variants.some((v:any)=>v.id === item.variant?.id))return json({error:`Selecciona una variante válida de ${item.sub.name}`},422);
          }
        }
        for(const item of selected.filter((i:any)=>i.sub.isCutGoService)) {
          if(!selected.some((i:any)=>!i.sub.isStylingService && i.sub.allowCutGo && (!Array.isArray(i.sub.stylingAllowedIds) || i.sub.stylingAllowedIds.includes(item.sub.id))))return json({error:'Cut & Go no está permitido para estos servicios'},422);
        }
      }
      }

      // Las puertas de aprobación y pago se recalculan en el servidor: una clienta
      // no puede declarar su propia cita como aprobada o pagada.
      let approvalStatus = body.approval?.status ?? "not_required";
      let approvalReason = body.approval?.reason ?? null;
      let depositStatus = body.advancePayment?.status ?? "not_required";
      let depositAmount = body.advancePayment?.amount ?? null;
      let depositReference = body.advancePayment?.reference ?? null;
      if (!isAdmin) {
        const { data: cfgRow,error:depositConfigError } = await admin.from("studio_settings").select("configuration").eq("id", true).maybeSingle();
        if(depositConfigError||!cfgRow)return json({error:'No se pudo comprobar la configuración de anticipos. Reintenta.'},503);
        const cfg = (cfgRow?.configuration ?? {}) as Record<string, any>;
        const date = new Date(String(body.dateKey)+'T12:00:00Z');
        if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==body.dateKey)return json({error:'Fecha no válida.'},422);
        const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
        const earliest=new Date(today+'T12:00:00Z'),latest=new Date(today+'T12:00:00Z');
        const advance=Number(cfg.minAdvanceDays),months=Number(cfg.maxBookingMonths);
        earliest.setUTCDate(earliest.getUTCDate()+(Number.isFinite(advance)?Math.max(0,advance):0));
        latest.setUTCMonth(latest.getUTCMonth()+(Number.isFinite(months)?Math.max(0,months):3));
        if(body.dateKey<earliest.toISOString().slice(0,10)||body.dateKey>latest.toISOString().slice(0,10))return json({error:'La fecha está fuera del periodo de reservas del Studio.'},422);
        try{if(Date.parse(notificationInstant(startsAt))<=Date.now())return json({error:'Elige una fecha y hora futuras.'},422);}catch{return json({error:'La hora seleccionada no es válida.'},422);}
        const day=date.getUTCDay(),schedule=studioScheduleLabel(cfg,day);
        const hours=Array.from(schedule.matchAll(/(\d{1,2})(?::(\d{2})|h(?:\s*(\d{2}))?)/gi));
        const start=Number(body.time.slice(0,2))*60+Number(body.time.slice(3));let fits=false;
        for(let i=0;i+1<hours.length;i+=2){const open=Number(hours[i][1])*60+Number(hours[i][2]||hours[i][3]||0),close=Number(hours[i+1][1])*60+Number(hours[i+1][2]||hours[i+1][3]||0);if(start>=open&&start+duration<=close)fits=true;}
        if(!hours.length&&day===6&&!/cerrado|closed/i.test(schedule))fits=start>=540&&start+duration<=1140;
        if(!fits)return json({error:'La duración completa no cabe en el horario del Studio.'},422);
        const { data: catRows,error:depositCatalogError } = await admin.from("studio_catalog").select("category");
        if(depositCatalogError)return json({error:'No se pudo comprobar el anticipo de los servicios. Reintenta.'},503);
        const catalogSubs = (catRows ?? []).flatMap((r: any) => r.category?.subservices ?? []);
        const needsAssessment = Array.isArray(body.services) && body.services.some((item: any) => {
          const sub = catalogSubs.find((s: any) => s.id === item?.sub?.id);
          return !!sub?.requiresAssessment;
        });
        const isSaturday = new Date(`${body.dateKey}T12:00:00`).getDay() === 6;
        const needsApproval = needsAssessment || isSaturday;
        approvalStatus = needsApproval ? "pending" : "not_required";
        approvalReason = needsApproval
          ? (needsAssessment && isSaturday ? "both" : needsAssessment ? "assessment" : "saturday")
          : null;

        let requiredDeposit:number;
        try{requiredDeposit=calculateServiceDeposit(body.services||[],catalogSubs,cfg,duration);}
        catch(error){return json({error:error instanceof Error?error.message:'Revisa la configuración de anticipos'},422);}
        const needsDeposit = !needsApproval && requiredDeposit>0;
        depositStatus = needsDeposit ? "pending" : "not_required";
        depositAmount = needsDeposit ? requiredDeposit : null;
        depositReference = needsDeposit && body.advancePayment?.reference
          ? String(body.advancePayment.reference).slice(0, 64)
          : null;
      }
      if(depositWaiverForCreate){
        if(['received','paid','confirmed'].includes(String(depositStatus)))return json({error:'No se puede eximir un anticipo ya pagado.'},422);
        depositStatus='not_required';depositAmount=null;depositReference=null;
      }
      // Validate professional: if provided, must match an active employee.
      let validatedProfId: string | null = null;
      let validatedProfName: string | null = null;
      if (typeof body.professionalId === 'string' && body.professionalId) {
        const { data: profCfg } = await admin.from('studio_settings').select('configuration').eq('id', true).maybeSingle();
        const employees = ((profCfg?.configuration ?? {}) as Record<string, any>)?.employees as { id: string; name: string; status: string }[] | undefined;
        const match = (employees || []).find((e) => e.id === body.professionalId && e.status === 'active');
        if (!match) return json({ error: 'Profesional no disponible' }, 422);
        validatedProfId = match.id;
        validatedProfName = match.name.trim();
      }

      const lifecycleStatus = isAdmin ? (body.lifecycleStatus ?? "active") : "active";
      const bookingClientId = isAdmin ? (body.clientId ?? null) : (tokenRow.client_id ?? null);

      // Recheck the requested interval; the database trigger also guards the final insert.
      if (!isAdmin) {
        const start=new Date(startsAt+'Z');
        if(!Number.isFinite(start.getTime())||!Number.isInteger(duration)||duration<=0||duration>10080)return json({error:'Fecha o duración no válida.'},422);
        const end=new Date(start.getTime()+duration*60000);
        const {data:occupied,error:availabilityError}=await admin.rpc('studio_busy_intervals',{p_start:start.toISOString(),p_end:end.toISOString()});
        if(availabilityError||!Array.isArray(occupied?.busy))return json({error:'No se pudo comprobar la disponibilidad. Conservamos tu selección para reintentar.'},503);
        if(occupied.busy.length)return json({error:'Ese hueco acaba de ocuparse. Elige otra hora.'},409);
      }

      let promotionOrigin: { id: string; title: string } | null = null;
      if (body.promotionOriginId || body.promotionId) {
        const requestedId = body.promotionOriginId || body.promotionId;
        if (body.promotionId && body.promotionOriginId && body.promotionId !== body.promotionOriginId) return json({ error: 'Las referencias de promoción no coinciden.' }, 422);
        const { data: cfg, error: cfgError } = await admin.from('studio_settings').select('configuration').eq('id', true).maybeSingle();
        if (cfgError) return json({ error: 'No se pudo comprobar la promoción.' }, 503);
        const promos = (cfg?.configuration as any)?.promotions;
        const promo = Array.isArray(promos) ? promos.find((item: any) => item.id === requestedId) : null;
        const today = new Intl.DateTimeFormat('sv-SE', { timeZone: MADRID_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        if (!promo || !promo.active || (promo.startDate && today < promo.startDate) || (promo.endDate && today > promo.endDate)) return json({ error: 'La promoción ya no está vigente.' }, 422);
        const requiredIds = Array.isArray(promo.bookingServiceIds) ? promo.bookingServiceIds : promo.bookingServiceId ? [promo.bookingServiceId] : [];
        if (!requiredIds.length || !requiredIds.every((id: string) => Array.isArray(body.services) && body.services.some((item: any) => item?.sub?.id === id))) return json({ error: 'Completa los servicios incluidos en la promoción.' }, 422);
        promotionOrigin = { id: promo.id, title: promo.title };
      }
      let promotionDiscount: ReturnType<typeof calculatePromotionDiscount> | null = null;
      if (body.promotionId) {
        const [{ data: settingsRow, error: settingsError }, { data: catalogRows, error: catalogError }] = await Promise.all([
          admin.from('studio_settings').select('configuration').eq('id', true).maybeSingle(),
          admin.from('studio_catalog').select('category')
        ]);
        if (settingsError || catalogError) return json({ error: 'No se pudo comprobar la promoción. Reintenta.' }, 503);
        const promos = (settingsRow?.configuration as any)?.promotions;
        const promo = Array.isArray(promos) ? promos.find((item: any) => item.id === body.promotionId) : null;
        const currentCatalog = (catalogRows || []).flatMap((row: any) => row.category?.subservices || []);
        const today = new Intl.DateTimeFormat('sv-SE', { timeZone: MADRID_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        try { promotionDiscount = calculatePromotionDiscount(promo, Array.isArray(body.services) ? body.services : [], currentCatalog, String(body.dateKey || ''), today); }
        catch (error) { return json({ error: error instanceof Error ? error.message : 'Promoción no válida.' }, 422); }
      }
      const { data: created, error } = await admin.from("studio_appointments").insert({
        source_legacy_id: body.id ? String(body.id) : null,
        client_id: bookingClientId,
        voucher_id: body.voucherId || null,
        starts_at: startsAt,
        duration_minutes: duration,
        booking_channel: isAdmin && body.bookingChannel === "admin" ? "admin" : "portal",
        lifecycle_status: lifecycleStatus,
        approval_status: approvalStatus,
        approval_reason: approvalReason,
        approval_reference: isAdmin ? (body.approval?.reference ?? null) : null,
        deposit_status: depositStatus,
        deposit_amount: depositAmount,
        deposit_reference: depositReference,
        services: body.services ?? [],
        client_snapshot: { ...(body.clientSnapshot ?? {
          clientName: body.clientName ?? "",
          phone: body.phone ?? "",
          email: body.email ?? "",
          serviceCategory: body.serviceCategory ?? "",
          serviceSubcategory: body.serviceSubcategory ?? "",
          dayName: body.dayName ?? "",
          remindersStatus: body.remindersStatus ?? null,
          selectedVariant: body.selectedVariant ?? null,
        }), promotion: promotionDiscount, promotionOrigin, depositWaiver:depositWaiverForCreate, clientNote:bookingClientNote, voucherExpectedCents:body.voucherId&&Number.isInteger(body.voucherExpectedCents)?body.voucherExpectedCents:null },
        legacy_service_text: body.serviceSubcategory ?? "",
        professional_id: validatedProfId,
        professional_name: validatedProfName,
      }).select("id,deposit_status,deposit_amount,deposit_reference,voucher_summary,client_snapshot").single();
      if (error) {
        if (String(error.message || '').includes('STUDIO_TIME_BLOCK_CONFLICT')) return json({error:'Ese periodo está bloqueado. Elige otra hora.'},409);
        if (String(error.message || '').includes('STUDIO_PORTAL_SLOT_OCCUPIED')) return json({error:'Ese hueco acaba de ocuparse. Elige otra hora.'},409);
        if ((error as any).code === "23505") return json({ error: "Reserva duplicada" }, 409);
        if(String(error.message||'').includes('BONO_'))return json({error:voucherError(error)},422);
        return json(failed(error), 500);
      }
      depositStatus=created.deposit_status;depositAmount=created.deposit_amount;depositReference=created.deposit_reference;
      const servicesText = (await appointmentNotificationServices(admin, body.services, body.serviceSubcategory)) + promotionNotificationSuffix(promotionDiscount);
      const approvalPending = approvalStatus === "pending";
      const depositPending = depositStatus === "pending";
      await scheduleAppointmentEmails(admin, {
        apptId: created.id,
        startsAt: new Date(`${body.dateKey}T${body.time}:00Z`).toISOString(),
        clientName: String(body.clientName ?? ""),
        clientEmail: validEmail(body.email),
        servicesText,
        professional: validatedProfName,
        confirmed: notificationConfirmed({lifecycle_status:lifecycleStatus || 'active',approval_status:approvalStatus,deposit_status:depositStatus}),
      }).catch(error => console.error("Notificaciones:",error));
      await scheduleAppointmentWhatsApp(admin, {
        apptId: created.id,
        startsAt: new Date(`${body.dateKey}T${body.time}:00Z`).toISOString(),
        clientName: String(body.clientName ?? ""),
        clientPhone: validPhoneE164(body.phone),
        servicesText,
        confirmed: notificationConfirmed({lifecycle_status:lifecycleStatus || 'active',approval_status:approvalStatus,deposit_status:depositStatus}),
      }).catch(error => console.error("Notificaciones:",error));
      await sendAppointmentPush(admin, {
        apptId: created.id,
        clientId: body.clientId ?? null,
        clientName: String(body.clientName ?? ""),
        startsAt: new Date(`${body.dateKey}T${body.time}:00Z`).toISOString(),
        servicesText,
        confirmed: notificationConfirmed({lifecycle_status:lifecycleStatus || 'active',approval_status:approvalStatus,deposit_status:depositStatus}),
      }).catch(error => console.error("Notificaciones:",error));
      await kickDispatcher(admin);
      return json({ ok: true, id: created.id,voucherSummary:created.voucher_summary,depositStatus,depositAmount,depositReference,depositWaived:created.client_snapshot?.depositWaiver?.reason==='trusted_client',clientNote:created.client_snapshot?.clientNote||'' });
    }

    if (action === "appointment" && req.method === "PUT") {
      if(body.waiveDeposit!==undefined&&(typeof body.waiveDeposit!=='boolean'||!isAdmin))return json({error:'Solo administración puede decidir la exención del anticipo.'},403);
      let depositWaiverGuard:any=null;
      if(!isAdmin&&Array.isArray(body.services)&&body.services.some((item:any)=>item?.appointmentDiscount))return json({error:'Solo administración puede aplicar descuentos u obsequios.'},403);
      if(isAdmin&&Array.isArray(body.services)){
        const reference=String(body.id??'');if(!/^[A-Za-z0-9_-]{1,64}$/.test(reference))return json({error:'Cita no válida'},400);
        const {data:original,error:readError}=await admin.from('studio_appointments').select('services,client_snapshot,voucher_id,deposit_status,completed_at').or(`source_legacy_id.eq.${reference},id.eq.${reference}`).maybeSingle();
        if(readError)return json({error:'No se pudo comprobar la cita.'},503);if(!original)return json({error:'Cita no encontrada'},404);
        const manual=(items:any[])=>items.some((item:any)=>item?.appointmentDiscount);
        if((manual(body.services)||manual(original.services||[]))&&JSON.stringify(stableDiscountValue(original.services))!==JSON.stringify(stableDiscountValue(body.services))){
          if(original.voucher_id||original.client_snapshot?.promotion||original.completed_at||['pending','received','paid','confirmed'].includes(original.deposit_status))return json({error:'Revisa el cobro, anticipo, bono o promoción antes de cambiar el precio.'},422);
          const {data:discountRows,error:discountError}=await admin.from('studio_catalog').select('category');if(discountError)return json({error:'No se pudo comprobar el precio.'},503);
          try{body.services=validatedAppointmentDiscounts(body.services,(discountRows||[]).flatMap((r:any)=>r.category?.subservices||[]),original.services||[]);}
          catch(error){return json({error:error instanceof Error?error.message:'Descuento no válido.'},422);}
        }
      }
      const patch: Record<string, unknown> = {};
      if(body.dateKey && body.time && await blockedOfficialDay(admin,String(body.dateKey)))return json({error:'La nueva fecha es festivo. Elige otro día o configura una apertura excepcional.'},422);
      let portalMutationDone=false;
      if(!isAdmin){
        const reference=String(body.id??'');
        if(!/^[A-Za-z0-9_-]{1,64}$/.test(reference))return json({error:'Cita no válida'},400);
        const {data:own,error:ownError}=await admin.from('studio_appointments').select('*').or(`source_legacy_id.eq.${reference},id.eq.${reference}`).eq('client_id',tokenRow.client_id).maybeSingle();
        if(ownError)return json(failed(ownError),503);
        if(!own)return json({error:'Cita no encontrada'},404);
        const cancel=body.lifecycleStatus==='cancelled';
        const move=!cancel && typeof body.dateKey==='string' && typeof body.time==='string';
        if(!cancel&&!move)return json({error:'Solo puedes cambiar la fecha o cancelar tu propia cita'},403);
        let nextStart:string|null=null,dayName:string|null=null,approval:string|null=null,reason:string|null=null;
        if(move){
          if(!/^\d{4}-\d{2}-\d{2}$/.test(body.dateKey)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time))return json({error:'Fecha u hora no válida'},422);
          const date=new Date(body.dateKey+'T12:00:00Z');
          if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==body.dateKey)return json({error:'Fecha no válida'},422);
          const {data:settings,error:settingsError}=await admin.from('studio_settings').select('configuration').eq('id',true).maybeSingle();
          if(settingsError||!settings)return json({error:'No se pudo comprobar el horario. Reintenta.'},503);
          const cfg=settings.configuration||{};
          const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
          const earliest=new Date(today+'T12:00:00Z'),latest=new Date(today+'T12:00:00Z');
          const minDays=Number(cfg.minAdvanceDays),maxMonths=Number(cfg.maxBookingMonths);
          earliest.setUTCDate(earliest.getUTCDate()+(Number.isFinite(minDays)?Math.max(0,minDays):0));
          latest.setUTCMonth(latest.getUTCMonth()+(Number.isFinite(maxMonths)?Math.max(0,maxMonths):3));
          if(body.dateKey<earliest.toISOString().slice(0,10)||body.dateKey>latest.toISOString().slice(0,10))return json({error:'La nueva fecha queda fuera del periodo de reservas del Studio.'},422);
          const duration=Number(own.duration_minutes)||45;
          const day=date.getUTCDay();
          const schedule=studioScheduleLabel(cfg,day);
          const matches=Array.from(schedule.matchAll(/(\d{1,2})(?::(\d{2})|h(?:\s*(\d{2}))?)/gi));
          const start=Number(body.time.slice(0,2))*60+Number(body.time.slice(3));let fits=false;
          for(let i=0;i+1<matches.length;i+=2){const opening=Number(matches[i][1])*60+Number(matches[i][2]||matches[i][3]||0);const closing=Number(matches[i+1][1])*60+Number(matches[i+1][2]||matches[i+1][3]||0);if(start>=opening&&start+duration<=closing)fits=true;}
          if(!matches.length&&day===6&&!/cerrado|closed/i.test(schedule))fits=start>=540&&start+duration<=1140;
          if(!fits)return json({error:'La duración completa no cabe en el horario del Studio.'},422);
          const {data:closures,error:closureError}=await admin.from('studio_closures').select('id').lte('start_date',body.dateKey).gte('end_date',body.dateKey).limit(1);
          if(closureError)return json({error:'No se pudo comprobar la disponibilidad.'},503);
          if(closures?.length)return json({error:'El Studio está cerrado en esa fecha.'},422);
          nextStart=body.dateKey+'T'+body.time+':00';
          const end=new Date(Date.parse(nextStart+'Z')+duration*60000).toISOString();
          const {data:blocks,error:blockError}=await admin.from('studio_time_blocks').select('id').lt('starts_at',end).gt('ends_at',nextStart).limit(1);
          if(blockError)return json({error:'No se pudieron comprobar los periodos bloqueados.'},503);
          if(blocks?.length)return json({error:'La cita coincide con un periodo bloqueado.'},409);
          const offer=own.client_snapshot?.promotion;
          if(offer&&((offer.startDate&&body.dateKey<offer.startDate)||(offer.endDate&&body.dateKey>offer.endDate)))return json({error:'La nueva fecha queda fuera de la promoción.'},422);
          if(day===6){approval='pending';reason=['assessment','both'].includes(own.approval_reason)?'both':'saturday';}
          dayName=date.toLocaleDateString('es-ES',{weekday:'long',timeZone:'UTC'});
        }
        const {error:changeError}=await admin.rpc('studio_change_portal_appointment',{p_client_id:tokenRow.client_id,p_appointment_id:own.id,p_expected_start:own.starts_at,p_cancel:cancel,p_new_start:nextStart,p_day_name:dayName,p_approval_status:approval,p_approval_reason:reason});
        if(changeError){
          const message=String(changeError.message||'');
          if(message.includes('STUDIO_TIME_BLOCK_CONFLICT'))return json({error:'Ese periodo está bloqueado. Elige otra hora.'},409);
          if(message.includes('BONO_'))return json({error:voucherError(changeError)},422);
          if(message.includes('PORTAL_CHANGE_TOO_LATE'))return json({error:'Para cambiar o cancelar tu cita con menos de 24 horas de antelación, contacta directamente con L’Studio Ana.'},422);
          if(message.includes('PORTAL_NEW_DATE_TOO_SOON'))return json({error:'La nueva cita debe tener al menos 24 horas de antelación.'},422);
          if(message.includes('PORTAL_SLOT_OCCUPIED'))return json({error:'Ese hueco acaba de ocuparse. Elige otro horario.'},409);
          if(message.includes('PORTAL_APPOINTMENT_NOT_FOUND'))return json({error:'Cita no encontrada'},404);
          if(message.includes('PORTAL_APPOINTMENT_CHANGED')||message.includes('PORTAL_APPOINTMENT_INACTIVE'))return json({error:'La cita ha cambiado o ya no admite modificaciones. Actualiza el portal.'},409);
          return json({error:'No se pudo confirmar el cambio. Actualiza el portal antes de reintentar.'},503);
        }
        portalMutationDone=true;
        if(cancel)patch.lifecycle_status='cancelled';else patch.starts_at=nextStart;
      }

      if (isAdmin) {
      if (body.dateKey && body.time) patch.starts_at = `${body.dateKey}T${body.time}:00`;
      if (body.dayName !== undefined) patch.dayName = body.dayName;
      if (body.durationMinutes) patch.duration_minutes = Number(body.durationMinutes);
      if (body.lifecycleStatus !== undefined) patch.lifecycle_status = body.lifecycleStatus;
      if (body.approval !== undefined) {
        patch.approval_status = body.approval.status;
        patch.approval_reason = body.approval.reason ?? null;
        patch.approval_reference = body.approval.reference ?? null;
      }
      if (body.advancePayment !== undefined) {
        patch.deposit_status = body.advancePayment.status;
        patch.deposit_amount = body.advancePayment.amount ?? null;
        patch.deposit_reference = body.advancePayment.reference ?? null;
      }
      // A note must never clear or replace the selected services.
      if (body.services !== undefined) {
        if (!Array.isArray(body.services)) return json({ error: 'Los servicios deben ser una lista' }, 422);
        patch.services = body.services;
      }
      if (body.clientSnapshot !== undefined) patch.client_snapshot = body.clientSnapshot;
      if (body.internalNotes !== undefined) {
        if (typeof body.internalNotes !== 'string') return json({ error: 'La nota debe ser texto' }, 422);
        const reference = String(body.id ?? '');
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(reference)) return json({ error: 'Cita no válida' }, 400);
        const { data: existing, error: readError } = await admin.from('studio_appointments')
          .select('id, client_snapshot').or(`source_legacy_id.eq.${reference},id.eq.${reference}`).maybeSingle();
        if (readError) return json(failed(readError), 500);
        if (!existing) return json({ error: 'Cita no encontrada' }, 404);
        patch.client_snapshot = {
          ...((existing.client_snapshot || {}) as Record<string, unknown>),
          ...((patch.client_snapshot || {}) as Record<string, unknown>),
          internalNotes: body.internalNotes
        };
      }
      if (body.completedAt !== undefined) {
        if(typeof body.completedAt!=='string'||!Number.isFinite(Date.parse(body.completedAt)))return json({error:'Finalización no válida.'},422);
        const reference=String(body.id||'');
        if(!/^[A-Za-z0-9_-]{1,64}$/.test(reference))return json({error:'Cita no válida.'},422);
        const {data:original,error:readError}=await admin.from('studio_appointments').select('id,services,legacy_service_text,client_snapshot,completed_at').or(`id.eq.${reference},source_legacy_id.eq.${reference}`).maybeSingle();
        if(readError||!original)return json({error:'No se pudo comprobar la cita antes de finalizarla.'},503);
        const title=await appointmentNotificationServices(admin,original.services,original.legacy_service_text);
        patch.client_snapshot={...(original.client_snapshot||{}),...((patch.client_snapshot||{}) as Record<string,unknown>),completionServiceName:title};
        patch.completed_at=original.completed_at||new Date().toISOString();
      }
      }

      if (isAdmin && (body.services !== undefined || (body.dateKey && body.time))) {
        const reference = String(body.id ?? '');
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(reference)) return json({ error: 'Cita no válida' }, 400);
        const { data: original, error: originalError } = await admin.from('studio_appointments').select('services, client_snapshot')
          .or(`source_legacy_id.eq.${reference},id.eq.${reference}`).maybeSingle();
        if (originalError) return json(failed(originalError), 500);
        const offer = original?.client_snapshot?.promotion;
        if (offer) {
          if (body.services !== undefined) {
            const signature = (items: any[]) => JSON.stringify((items || []).map((item: any) => [item?.sub?.id, item?.variant?.id || null]).sort((a,b) => String(a[0]).localeCompare(String(b[0]))));
            if (signature(body.services) !== signature(original.services)) return json({ error: 'Esta cita tiene un precio promocional guardado. Para cambiar sus servicios o variantes, cancela y crea una nueva reserva.' }, 422);
          }
          if (body.dateKey && ((offer.startDate && body.dateKey < offer.startDate) || (offer.endDate && body.dateKey > offer.endDate))) return json({ error: 'La nueva fecha queda fuera de la vigencia de la promoción.' }, 422);
        }
      }
      if(isAdmin && body.approval?.status==='accepted'){
        const reference=String(body.id??'');
        if(!/^[A-Za-z0-9_-]{1,64}$/.test(reference))return json({error:'Cita no válida'},400);
        const {data:original,error:readError}=await admin.from('studio_appointments').select('services,duration_minutes,deposit_status,deposit_amount,deposit_reference,client_snapshot').or(`source_legacy_id.eq.${reference},id.eq.${reference}`).maybeSingle();
        if(readError)return json(failed(readError),500);
        if(!original)return json({error:'Cita no encontrada'},404);
        if(['pending','received','paid','confirmed'].includes(String(original.deposit_status))){
          patch.deposit_status=original.deposit_status;patch.deposit_amount=original.deposit_amount;patch.deposit_reference=original.deposit_reference;
        }else if((original.client_snapshot?.depositWaiver?.reason==='trusted_client'&&body.waiveDeposit!==false)||body.waiveDeposit===true){
          patch.deposit_status='not_required';patch.deposit_amount=null;patch.deposit_reference=null;
        }else{
          const {data:cfgRow,error:cfgError}=await admin.from('studio_settings').select('configuration').eq('id',true).maybeSingle();
          const {data:catRows,error:catError}=await admin.from('studio_catalog').select('category');
          if(cfgError||catError||!cfgRow)return json({error:'No se pudo comprobar el anticipo. Reintenta.'},503);
          let amount:number;
          try{amount=calculateServiceDeposit((patch.services as any[])||original.services||[],(catRows||[]).flatMap((row:any)=>row.category?.subservices||[]),cfgRow.configuration||{},Number(patch.duration_minutes||original.duration_minutes));}
          catch(error){return json({error:error instanceof Error?error.message:'Revisa el anticipo del servicio'},422);}
          patch.deposit_status=amount>0?'pending':'not_required';patch.deposit_amount=amount>0?amount:null;
          patch.deposit_reference=amount>0?'LS-'+crypto.randomUUID().slice(0,8).toUpperCase():null;
        }
      }
      // Server-owned exemption: never trust a waiver embedded in clientSnapshot.
      if(isAdmin){
        const reference=String(body.id??'');if(!/^[A-Za-z0-9_-]{1,64}$/.test(reference))return json({error:'Cita no válida'},400);
        const {data:original,error:waiverReadError}=await admin.from('studio_appointments').select('id,services,duration_minutes,approval_status,deposit_status,deposit_amount,deposit_reference,client_snapshot,completed_at').or(`source_legacy_id.eq.${reference},id.eq.${reference}`).maybeSingle();
        if(waiverReadError)return json({error:'No se pudo comprobar el anticipo.'},503);if(!original)return json({error:'Cita no encontrada'},404);
        const existing=original.client_snapshot?.depositWaiver?.reason==='trusted_client';
        const requested=body.waiveDeposit===undefined?existing:body.waiveDeposit;
        const paid=['received','paid','confirmed'].includes(String(original.deposit_status));
        const changed=requested!==existing;
        if(changed&&(paid||original.completed_at))return json({error:'El anticipo ya está pagado o la cita está finalizada. No se modifica desde aquí.'},422);
        const waiver=requested?(existing?original.client_snapshot.depositWaiver:{reason:'trusted_client',grantedAt:new Date().toISOString()}):null;
        if(body.clientSnapshot!==undefined||body.waiveDeposit!==undefined){
          patch.client_snapshot={...(original.client_snapshot||{}),...((patch.client_snapshot||{}) as any),depositWaiver:waiver};
        }
        if(requested&&!paid){
          if(body.advancePayment&&['received','paid','confirmed'].includes(body.advancePayment.status))return json({error:'La cita está exenta de anticipo. Revisa su cobro por separado.'},422);
          patch.deposit_status='not_required';patch.deposit_amount=null;patch.deposit_reference=null;
        }else if(changed&&!requested){
          const cfg=await admin.from('studio_settings').select('configuration').eq('id',true).maybeSingle();
          const cats=await admin.from('studio_catalog').select('category');
          if(cfg.error||cats.error||!cfg.data)return json({error:'No se pudo comprobar el anticipo habitual.'},503);
          let amount=0;
          try{if((body.approval?.status||original.approval_status)!=='pending')amount=calculateServiceDeposit((patch.services as any[])||original.services||[],(cats.data||[]).flatMap((r:any)=>r.category?.subservices||[]),cfg.data.configuration||{},Number(patch.duration_minutes||original.duration_minutes));}
          catch(error){return json({error:error instanceof Error?error.message:'Revisa el anticipo.'},422);}
          patch.deposit_status=amount>0?'pending':'not_required';patch.deposit_amount=amount>0?amount:null;
          patch.deposit_reference=amount>0?'LS-'+crypto.randomUUID().slice(0,8).toUpperCase():null;
        }
        if(changed||requested&&!paid)depositWaiverGuard=original;
      }
      let query = portalMutationDone ? null : admin.from("studio_appointments").update(patch);
      const apptRef = String(body.id ?? "");
      // Solo referencias con la forma esperada llegan a un filtro: nada de comas,
      // paréntesis ni operadores inyectados en la consulta.
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(apptRef)) return json({ error: "Cita no válida" }, 400);
      if (isAdmin && query) query = query.or(`source_legacy_id.eq.${apptRef},id.eq.${apptRef}`);
      else if(!portalMutationDone && query) {
        // client scope: only own appointments, matched by server id or portal legacy id
        const { data: own } = await admin.from("studio_appointments").select("id")
          .or(`id.eq.${apptRef},source_legacy_id.eq.${apptRef}`)
          .eq("client_id", tokenRow.client_id).maybeSingle();
        if (!own) return json({ error: "Cita no encontrada" }, 404);
        query = query.or(`id.eq.${apptRef},source_legacy_id.eq.${apptRef}`).eq("client_id", tokenRow.client_id);
      }
      if(query&&depositWaiverGuard){
        query=query.eq('id',depositWaiverGuard.id).is('completed_at',null);
        query=depositWaiverGuard.deposit_status===null?query.is('deposit_status',null):query.eq('deposit_status',depositWaiverGuard.deposit_status);
        query=depositWaiverGuard.client_snapshot===null?query.is('client_snapshot',null):query.eq('client_snapshot',JSON.stringify(depositWaiverGuard.client_snapshot));
      }
      const waiverResult=query&&depositWaiverGuard?await query.select('id'):null;
      if(waiverResult&&!waiverResult.error&&!waiverResult.data?.length)return json({error:'La cita o el anticipo acaba de cambiar. Actualiza antes de guardar.'},409);
      const { error } = waiverResult || (query ? await query : {error:null});
      if(error&&String(error.message||'').includes('STUDIO_COMPLETION_'))return json({error:'No se pudo finalizar la cita. Comprueba que ya comenzó, tiene ficha vinculada y no tiene aprobación o anticipo pendientes. No se ha aplicado la finalización.'},422);
      if (error && String(error.message || '').includes('STUDIO_TIME_BLOCK_CONFLICT')) return json({error:'El cambio coincide con un periodo bloqueado. Elige otra hora.'},409);
      if (error) return json({error:String(error.message||'').includes('BONO_')?voucherError(error):failed(error).error},String(error.message||'').includes('BONO_')?422:500);
      const onlyInternalNotes = isAdmin && body.internalNotes !== undefined
        && Object.keys(body).every(key => key === 'id' || key === 'internalNotes');
      if (onlyInternalNotes) return json({ ok: true });
      if(isAdmin&&body.completedAt!==undefined){
        const {data:done}=await admin.from('studio_appointments').select('id').or(`id.eq.${apptRef},source_legacy_id.eq.${apptRef}`).maybeSingle();
        if(done){
          await cancelNotificationJobs(admin,done.id).catch(()=>{});
          await cancelAppointmentEmails(admin,done.id).catch(()=>{});
          await cancelAppointmentWhatsApp(admin,done.id).catch(()=>{});
        }
        return json({ok:true});
      }
      const scheduleKey = crypto.randomUUID();
      void scheduleKey;
      let reread = admin.from("studio_appointments")
        .select("id, starts_at, lifecycle_status, approval_status, deposit_status, completed_at, services, client_snapshot, client_id, professional_id, professional_name")
        .or(`id.eq.${apptRef},source_legacy_id.eq.${apptRef}`);
      if (!isAdmin) reread = reread.eq("client_id", tokenRow.client_id);
      const { data: updatedAppt } = await reread.maybeSingle();
      if (updatedAppt) {
        if (updatedAppt.lifecycle_status === "cancelled" || updatedAppt.lifecycle_status === "no_show" || updatedAppt.approval_status === "rejected") {
          await cancelNotificationJobs(admin,updatedAppt.id);
          await cancelAppointmentEmails(admin, updatedAppt.id, { cancelled: updatedAppt.lifecycle_status === "cancelled" }).catch(error => console.error("Notificaciones:",error));
          await cancelAppointmentWhatsApp(admin, updatedAppt.id, { cancelled: updatedAppt.lifecycle_status === "cancelled" }).catch(error => console.error("Notificaciones:",error));
        } else {
          const snap = (updatedAppt.client_snapshot || {}) as Record<string, unknown>;
          const approvalPending = updatedAppt.approval_status === "pending";
          const depositPending = updatedAppt.deposit_status === "pending";
          const confirmed = notificationConfirmed(updatedAppt);
          const servicesText = (await appointmentNotificationServices(admin, updatedAppt.services, snap.serviceSubcategory)) + promotionNotificationSuffix(snap.promotion);
          const waCtx = {
            apptId: updatedAppt.id,
            startsAt: updatedAppt.starts_at,
            clientName: String(snap.clientName ?? ""),
            clientPhone: validPhoneE164(snap.phone),
            servicesText,
            confirmed,
          };
          if (!confirmed || patch.starts_at) await cancelNotificationJobs(admin,updatedAppt.id);
          if (patch.starts_at) {
            // Rescheduled: annul the previous reminders, send the update and
            // schedule the new ones.
            await cancelAppointmentEmails(admin, updatedAppt.id).catch(error => console.error("Notificaciones:",error));
            await cancelAppointmentWhatsApp(admin, updatedAppt.id).catch(error => console.error("Notificaciones:",error));
            await scheduleAppointmentEmails(admin, {
              apptId: updatedAppt.id,
              startsAt: updatedAppt.starts_at,
              clientName: String(snap.clientName ?? ""),
              clientEmail: validEmail(snap.email),
              servicesText,
              professional: (updatedAppt as any).professional_name ?? null,
              confirmed,
              isUpdate: true,
            }).catch(error => console.error("Notificaciones:",error));
            await scheduleAppointmentWhatsApp(admin, { ...waCtx, isUpdate: true }).catch(e => console.error(e));
            await sendAppointmentPush(admin,{...waCtx,clientId:updatedAppt.client_id || null,isUpdate:true}).catch(e=>console.error(e));
          } else {
            await scheduleAppointmentEmails(admin, {
              apptId: updatedAppt.id,
              startsAt: updatedAppt.starts_at,
              clientName: String(snap.clientName ?? ""),
              clientEmail: validEmail(snap.email),
              servicesText,
              professional: (updatedAppt as any).professional_name ?? null,
              confirmed,
            }).catch(error => console.error("Notificaciones:",error));
            await scheduleAppointmentWhatsApp(admin, waCtx).catch(error => console.error("Notificaciones:",error));
            // Confirmation after approval accepted or deposit received.
            if (confirmed) {
              await sendAppointmentPush(admin, {
                apptId: updatedAppt.id,
                clientId: updatedAppt.client_id ?? null,
                clientName: String(snap.clientName ?? ""),
                startsAt: updatedAppt.starts_at,
                servicesText,
                confirmed: true,
              }).catch(error => console.error("Notificaciones:",error));
            }
          }
        }
      }
      await kickDispatcher(admin);
      return json({ ok: true });
    }

    if (action === "appointment" && req.method === "DELETE") {
      if(!isAdmin)return json({error:'Las clientas deben cancelar la cita desde el portal; no pueden eliminar su historial.'},403);
      let query = admin.from("studio_appointments").delete();
      const apptRef = String(body.id ?? "");
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(apptRef)) return json({ error: "Cita no válida" }, 400);
      if (isAdmin) query = query.or(`source_legacy_id.eq.${apptRef},id.eq.${apptRef}`);
      else {
        const { data: own } = await admin.from("studio_appointments").select("id").eq("source_legacy_id", apptRef).eq("client_id", tokenRow.client_id).maybeSingle();
        if (!own) return json({ error: "Cita no encontrada" }, 404);
        query = query.eq("source_legacy_id", apptRef).eq("client_id", tokenRow.client_id);
      }
      const { error } = await query;
      if (error) return json(failed(error), 500);
      await cancelAppointmentEmails(admin, body.id).catch(error => console.error("Notificaciones:",error));
      await cancelAppointmentWhatsApp(admin, body.id).catch(error => console.error("Notificaciones:",error));
      return json({ ok: true });
    }

    // ---------- push notifications ----------
    if (action === "push-public-key") {
      const { data: cfg } = await admin.from("studio_push_config").select("public_key").eq("id", true).maybeSingle();
      if (!cfg?.public_key) return json({ error: "El Studio aún no tiene configuradas las notificaciones push" }, 503);
      return json({ publicKey: cfg.public_key });
    }

    if (action === "push-subscribe" && req.method === "POST") {
      const endpoint = String(body.endpoint ?? "");
      const keys = body.keys ?? {};
      // Solo servicios push reales: evita que el servidor acabe enviando peticiones
      // a una dirección arbitraria elegida por quien se suscribe.
      const PUSH_HOSTS = [
        "android.googleapis.com",
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "updates-autopush.stage.mozaws.net",
        "notify.windows.com",
        "wns2-par02p.notify.windows.com",
        "web.push.apple.com",
      ];
      let endpointHost = "";
      try {
        const parsed = new URL(endpoint);
        if (parsed.protocol !== "https:") throw new Error("protocolo");
        endpointHost = parsed.hostname.toLowerCase();
      } catch {
        return json({ error: "Suscripción no válida" }, 400);
      }
      const hostAllowed = PUSH_HOSTS.includes(endpointHost)
        || /\.push\.apple\.com$/.test(endpointHost)
        || /\.notify\.windows\.com$/.test(endpointHost)
        || /\.push\.services\.mozilla\.com$/.test(endpointHost)
        || /\.googleapis\.com$/.test(endpointHost);
      if (!hostAllowed || !keys.p256dh || !keys.auth) return json({ error: "Suscripción no válida" }, 400);
      // Link to the signed-in clienta; admin devices record role admin without client link.
      const { data: sub, error } = await admin.from("studio_push_subscriptions").upsert({
        endpoint,
        p256dh: String(keys.p256dh),
        auth: String(keys.auth),
        client_id: (isAdmin ? null : tokenRow.client_id) ?? null,
        user_agent: String(body.userAgent ?? "").slice(0, 200),
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" }).select("id").single();
      if (error) return json(failed(error), 500);
      return json({ ok: true, id: sub.id });
    }

    if (action === "push-unsubscribe" && req.method === "POST") {
      const endpoint = String(body.endpoint ?? "");
      if (!endpoint) return json({ error: "Falta la suscripción" }, 400);
      // Cada sesión solo puede retirar sus propios dispositivos.
      let unsubQuery = admin.from("studio_push_subscriptions").delete().eq("endpoint", endpoint);
      if (!isAdmin) unsubQuery = unsubQuery.eq("client_id", tokenRow.client_id);
      await unsubQuery;
      return json({ ok: true });
    }

    if (action === "push-test" && req.method === "POST") {
      // Client scope: sends a test notification to the signed-in clienta's own devices only.
      if (isAdmin || !tokenRow.client_id) return json({ error: "La prueba de avisos se realiza desde el portal de una clienta con sesión iniciada" }, 403);
      const { data: subs } = await admin.from("studio_push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("client_id", tokenRow.client_id);
      if (!subs?.length) return json({ ok: true, sent: 0, errors: ["Este dispositivo todavía no aparece registrado. Vuelve a pulsar «Activar notificaciones»."] });
      let sent = 0; const errors: string[] = [];
      for (const sub of subs as { id: string; endpoint: string; p256dh: string; auth: string }[]) {
        const result = await sendWebPush(admin, sub.endpoint, sub.p256dh, sub.auth, {
          title: "Avisos activados",
          body: "Recibirás aquí la confirmación de tus citas de L'Studio Ana.",
          url: "/",
          tag: "push-test",
        });
        if (result.ok) sent++; else errors.push(result.error);
        if (result.expired) await admin.from("studio_push_subscriptions").delete().eq("id", sub.id);
      }
      return json({ ok: true, sent, errors });
    }

    if (action === "push-status" && req.method === "POST") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const appointmentId = String(body.appointmentId ?? "");
      if (!appointmentId) return json({ error: "Falta la cita" }, 400);
      const { data: pushes, error } = await admin
        .from("studio_push_outbox")
        .select("id, kind, status, provider, provider_message_id, delivered_at, last_error, attempts, created_at, subscription_id, studio_push_subscriptions(user_agent)")
        .eq("appointment_id", appointmentId)
        .order("created_at");
      if (error) return json(failed(error), 500);
      const {data:jobs,error:jobError}=await admin.from('studio_notification_jobs').select('*').eq('appointment_id',appointmentId).eq('channel','push').order('scheduled_at');
      if(jobError)return json(failed(jobError), 500);
      return json({pushes:[...(pushes||[]),...(jobs||[]).map((j:any)=>({...j,status:j.status === 'sent' ? 'accepted':j.status,studio_push_subscriptions:null,delivered_at:null}))]});
    }

    if (action === "invalidate-admin-sessions" && req.method === "POST") {
      if (!isAdmin) return json({ error: "Solo administración" }, 403);
      const { count, error: delError } = await admin.from("api_tokens")
        .delete({ count: "exact" })
        .eq("role", "admin")
        .neq("token", token);
      if (delError) return json(failed(delError), 500);
      return json({ ok: true, invalidated: count ?? 0 });
    }

    return json({ error: "Acción no reconocida" }, 404);
  } catch (error) {
    return json(failed(error, "studio-api:unhandled"), 500);
  }
});
// lst-weekly-hours-installed-v1

// lst-opinions-installed-v1
