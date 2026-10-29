export type ServiceDepositPolicy = 'general' | 'none' | 'fixed';
type DepositService = {id?: string; duration?: string; bizumPolicy?: ServiceDepositPolicy; bizumAmount?: number; variants?: {id?: string; duration?: string}[]};
type DepositItem = {sub: DepositService; variant?: {id?: string; duration?: string} | null};
type DepositConfig = {advancePaymentEnabled?: boolean; advancePaymentThresholdMinutes?: number; depositAmount?: string | number};
export function depositMoney(value: unknown): number {
  const text=String(value ?? '').trim().replace(/\s*€\s*$/,'').trim();
  if(!/^\d+(?:[.,]\d{1,2})?$/.test(text))return NaN;
  const amount=Number(text.replace(',','.'));
  return Number.isFinite(amount)&&amount<=9999.99?Math.round(amount*100)/100:NaN;
}
export function validateServiceDeposit(service: DepositService): string | null {
  if(service.bizumPolicy!==undefined&&!['general','none','fixed'].includes(service.bizumPolicy))return 'La opción de anticipo no es válida.';
  if(service.bizumPolicy==='fixed'&&!(depositMoney(service.bizumAmount)>0))return 'Indica un anticipo mayor que cero y de hasta 9.999,99 €.';
  return null;
}
/** One deposit per booking: highest configured amount, never a sum of deposits. */
export function calculateServiceDeposit(items: readonly DepositItem[], catalog: readonly DepositService[], config: DepositConfig, legacyDuration = 0): number {
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
  return amount;
}
