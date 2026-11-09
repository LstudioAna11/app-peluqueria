import * as studioApi from './studioApi';
export type ClubSettings={enabled:boolean;revision:number;visit_points:number;prebook_points:number;streak_points:number;streak_every:number;welcome_points:number;rhythm_days:number;grace_days:number;ritual_visits:number;signature_visits:number;first_badge:boolean;organized_badge:boolean;streak_badge:boolean;terms_version:number};
export type ClubReward={id:string;title:string;description:string;cost:number;active?:boolean;stock:number|null;revision:number};
export type ClubEvent={id:string;client_id?:string;kind:string;delta:number;reason:string;created_at:string;metadata:Record<string,unknown>;name?:string};
export type ClubMember={client_id:string;active:boolean;balance:number;visits:number;organized:number;rhythm_days:number;current_streak:number;streakNow:number;best_streak:number;level:string;badges:{first:boolean;organized:boolean;streak:boolean};name?:string};
export type ClubState={clientName?:string;settings:ClubSettings;terms:{version:number;title:string;body:string};member:ClubMember|null;rewards:ClubReward[];events:ClubEvent[];reviewCount:number};
export type ClubSummary={terms?:{version:number;title:string;body:string};settings:ClubSettings;rewards:ClubReward[];members:number;active:number;balance:number;redemptions:number;pending:number;review:number};
export class ClubError extends Error{constructor(message:string,public status:number){super(message);}}
export async function clubCall<T>(action:string,body:Record<string,unknown>={}):Promise<T>{
 const token=studioApi.currentToken(),role=studioApi.storedRole();if(!token||!['admin','client'].includes(role||''))throw new ClubError('Accede a tu cuenta.',401);
 if(!navigator.onLine)throw new ClubError('Necesitas conexión para consultar o cambiar el club.',0);
 const control=new AbortController(),timer=setTimeout(()=>control.abort(),15000);
 try{const response=await fetch(String(import.meta.env.VITE_SUPABASE_URL)+'/functions/v1/studio-club/'+action,{method:'POST',headers:{'Content-Type':'application/json',apikey:String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||''),Authorization:'Bearer '+token},body:JSON.stringify(body),signal:control.signal,cache:'no-store'});const data=await response.json().catch(()=>({}));if(studioApi.currentToken()!==token||studioApi.storedRole()!==role)throw new ClubError('La sesión ha cambiado. Comprueba el resultado al volver a acceder.',0);if(!response.ok)throw new ClubError(data.error||'No se pudo confirmar la operación.',response.status);
  const valid=action==='state'?typeof data.settings?.enabled==='boolean'&&'member' in data&&Array.isArray(data.rewards)&&Array.isArray(data.events):action==='summary'?typeof data.settings?.enabled==='boolean'&&Array.isArray(data.rewards):['members','history'].includes(action)?Array.isArray(data.items)&&Number.isFinite(data.total):data.ok===true;
  if(!valid)throw new ClubError('No se pudo verificar la respuesta del club. Actualiza antes de reintentar.',503);return data;
 }catch(error){if(error instanceof ClubError)throw error;throw new ClubError('No se pudo confirmar el resultado. Conserva los datos y reintenta.',0);}finally{clearTimeout(timer);}
}
// A mutation keeps the same nonce until its result is known. Network loss must
// not create a second adjustment or redemption; the server checks fingerprints.
export function clubRequest(body:Record<string,unknown>){return {...body,requestId:crypto.randomUUID()};}
export const clubDate=(value:string)=>new Date(value).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'});
