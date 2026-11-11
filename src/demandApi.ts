import {currentToken,storedRole} from './studioApi';
import {offlineConsultation} from './offlineSession';
const url=import.meta.env.VITE_SUPABASE_URL as string;
const key=(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY) as string;
export async function demandCall<T>(action:string,body:unknown,token=currentToken()):Promise<T>{
 if(offlineConsultation()||!url||!key||!token)throw new Error('Necesitas conexión y una sesión válida.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(`${url}/functions/v1/studio-demand/${action}`,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${token}`},body:JSON.stringify(body),signal:controller.signal});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo consultar la demanda.');return data as T;
 }catch(error){if(error instanceof Error&&error.name==='AbortError')throw new Error('El servidor no ha confirmado el resultado. Reintenta para comprobarlo.');throw error;}finally{clearTimeout(timer);}
}
export const clientDemandSession=()=>storedRole()==='client'?currentToken():null;
export type DemandService={id:string;variantId?:string|null;name?:string};
export type DemandRow={id:string;clientId:string;clientName:string;openedAt:string;updatedAt:string;services:DemandService[];date:string|null;dateExplicit:boolean;time:string|null;step:string;reason:string;source:string;status:string;contactedAt:string|null;appointmentId:string|null};
export type DemandList={page:number;pageSize:number;total:number;stats:{clients:number;attempts:number;blocked:number;unfinished:number;recovered:number;errors:number;active:number};items:DemandRow[]};
export type DemandDetail={id:string;note:string;contactedAt:string|null;closedAt:string|null;appointmentId:string|null;truncated:boolean;client:{name:string;phone:string;email:string};events:{id:string;at:string;actor:string;data:{step?:string;reason?:string;source?:string;services?:DemandService[];date?:string;dateExplicit?:boolean;time?:string;action?:string;note?:string;appointmentId?:string}}[];appointments:{id:string;startsAt:string;services:string;status:string;approval:string}[]};
