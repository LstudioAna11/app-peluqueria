import type {CatalogCategory,BusinessConfig,SubService,ServiceVariant} from './App';
import * as studioApi from './studioApi';
import {exactPrice} from './promotionPricing';
import {getBookingName} from './serviceNames';
export type VoucherServiceOption={id:string;label:string;price:number|null;variantPrices:number[];category:string;portalName:string;active:boolean;displayPrice:string};
export type VoucherClientOption={id:string;label:string};
export const voucherMoney=(cents:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100);
export async function deleteTestVoucher(token:string,id:string,expectedCode:string):Promise<void>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(String(import.meta.env.VITE_SUPABASE_URL)+'/functions/v1/studio-api/voucher-delete-test',{method:'POST',headers:{'Content-Type':'application/json',apikey:String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||''),Authorization:'Bearer '+token},body:JSON.stringify({id,expectedCode,confirmTest:true}),signal:controller.signal,cache:'no-store'});
    const data=await response.json();if(!response.ok||data?.ok!==true)throw new Error(data?.error||'No se pudo confirmar la eliminación del bono.');
  }finally{clearTimeout(timer);}
}
export const voucherToken=()=>{const token=studioApi.currentToken();if(!token)throw new Error('Vuelve a iniciar sesión para consultar tus bonos.');return token;};
export function voucherServiceOptions(catalog:CatalogCategory[],includeUnavailable=false):VoucherServiceOption[]{return catalog.flatMap(cat=>cat.subservices.filter(sub=>includeUnavailable||sub.active!==false).map(sub=>({id:sub.id,label:getBookingName(sub,catalog),category:cat.title,portalName:sub.name,active:sub.active!==false,displayPrice:[sub.price,...(sub.variants||[]).map(v=>(v.name?v.name+' · ':'')+v.price)].filter(Boolean).join(' / '),price:!sub.priceType||sub.priceType==='fijo'?exactPrice(sub.price):null,variantPrices:(sub.variants||[]).map(v=>exactPrice(v.price)).filter((p):p is number=>p!==null)})));}
export type RepeatPortalDraft={token:string;clientId:string;appointmentId:string;startsAt:string;catalog:CatalogCategory[];settings:Partial<BusinessConfig>;items:{sub:SubService;variant:ServiceVariant|null}[];warnings:string[]};
