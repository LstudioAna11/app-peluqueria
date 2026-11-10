import * as studioApi from './studioApi';
export type Memory={id:string;client_id:string;title:string;body:string;happened_on:string;photo_id:string|null;photoUrl:string|null;published:boolean;revision:number;created_at:string;updated_at:string};
export type Memories={items:Memory[];total:number;page:number;pageSize:number;achievements:{visits:number;firstVisit:string|null;anniversaries:number;club:null|{level:string;badges:{first:boolean;organized:boolean;streak:boolean};active:boolean}}};
export class MemoryError extends Error{constructor(message:string,public status:number){super(message);}}
export const memoryRequest=(body:Record<string,unknown>)=>({...body,requestId:crypto.randomUUID()});
export async function memoryCall<T>(action:string,body:Record<string,unknown>={},signal?:AbortSignal):Promise<T>{
 const token=studioApi.currentToken(),role=studioApi.storedRole();if(!token||!['admin','client'].includes(role||''))throw new MemoryError('Vuelve a acceder a tu cuenta.',401);
 if(!navigator.onLine)throw new MemoryError('Necesitas conexión para consultar o publicar recuerdos.',0);
 try{
  const response=await fetch(String(import.meta.env.VITE_SUPABASE_URL)+'/functions/v1/studio-memories/'+action,{method:'POST',headers:{'Content-Type':'application/json',apikey:String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||''),Authorization:'Bearer '+token},body:JSON.stringify(body),cache:'no-store',signal:signal||AbortSignal.timeout(15000)});
  const data=await response.json();if(studioApi.currentToken()!==token||studioApi.storedRole()!==role)throw new MemoryError('La sesión ha cambiado. Comprueba el resultado al volver a acceder.',0);
  if(!response.ok)throw new MemoryError(data.error||'No se pudo confirmar la operación.',response.status);
  if(action==='list'?!(Array.isArray(data.items)&&Number.isInteger(data.total)&&data.achievements&&Number.isInteger(data.achievements.visits)):data.ok!==true)throw new MemoryError('Respuesta no verificable. Actualiza antes de reintentar.',503);
  return data;
 }catch(e){if(e instanceof MemoryError)throw e;throw new MemoryError('No se pudo confirmar el resultado. Conserva los datos y reintenta.',0);}
}
export const memoryDate=(value:string)=>value.split('-').reverse().join('/');
