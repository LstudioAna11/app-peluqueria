import {exactPrice} from './promotionPricing';
export type AppointmentDiscount={kind:'percent'|'amount'|'gift';value:number;originalPrice:string;originalPriceType?:string;originalAmount:number|null;finalAmount:number;discountAmount:number|null};
export type DiscountableLine={sub:{price:string;priceType?:string};variant:{price:string}|null;appointmentDiscount?:AppointmentDiscount};
export const discountMoney=(value:number)=>value.toFixed(2).replace('.',',')+' €';
export function clearAppointmentDiscount<T extends DiscountableLine>(item:T):T{
 const discount=item.appointmentDiscount;if(!discount)return item;
 const {appointmentDiscount:_,...rest}=item;
 return {...rest,sub:{...item.sub,priceType:discount.originalPriceType,...(!item.variant?{price:discount.originalPrice}: {})},variant:item.variant?{...item.variant,price:discount.originalPrice}:null} as T;
}
export function applyAppointmentDiscount<T extends DiscountableLine>(line:T,kind:AppointmentDiscount['kind'],input:string):T{
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
export function appointmentDiscountDepositLimit(items:readonly DiscountableLine[],amount:number):number{
 if(!items.some(item=>item.appointmentDiscount))return amount;
 let cents=0;for(const item of items){const price=exactPrice(item.variant?.price??item.sub.price);if(price===null||!item.variant&&item.sub.priceType&&item.sub.priceType!=='fijo')return amount;cents+=Math.round(price*100);}
 return Math.min(amount,cents/100);
}
