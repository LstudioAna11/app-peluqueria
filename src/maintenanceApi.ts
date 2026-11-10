import * as studioApi from './studioApi';
export type MaintenanceMode='off'|'notice'|'paused';
export type MaintenanceStatus={mode:MaintenanceMode;message:string;until:string|null;untilLocal:string|null;revision:number;updatedAt:string;ok?:boolean};
export class MaintenanceError extends Error{constructor(message:string,public status:number){super(message);}}
export const maintenanceRequest=(body:Record<string,unknown>)=>({...body,requestId:crypto.randomUUID()});
export const isMaintenanceStatus=(data:any):data is MaintenanceStatus=>!!data&&['off','notice','paused'].includes(data.mode)&&typeof data.message==='string'&&Number.isSafeInteger(data.revision)&&data.revision>0;
export async function maintenanceCall<T>(action:string,body:Record<string,unknown>={}):Promise<T>{
 if(!studioApi.serverConfigured)throw new MaintenanceError('Servidor no configurado.',0);
 const token=action==='save'?studioApi.currentToken():null;
 if(action==='save'&&(!token||studioApi.storedRole()!=='admin'))throw new MaintenanceError('Accede a la intranet.',403);
 if(!navigator.onLine)throw new MaintenanceError('Necesitas conexión para cambiar o comprobar el mantenimiento.',0);
 try{const response=await fetch(String(import.meta.env.VITE_SUPABASE_URL)+'/functions/v1/studio-maintenance/'+action,{method:'POST',headers:{'Content-Type':'application/json',apikey:String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||''),...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(action==='save'?15000:8000),cache:'no-store'});const data=await response.json();if(action==='save'&&(studioApi.currentToken()!==token||studioApi.storedRole()!=='admin'))throw new MaintenanceError('La sesión ha cambiado. Comprueba el resultado al volver a acceder.',0);if(!response.ok)throw new MaintenanceError(data.error||'No se pudo confirmar el estado.',response.status);if(!isMaintenanceStatus(data)||(action==='save'&&data.ok!==true))throw new MaintenanceError('Respuesta no verificable. Actualiza antes de reintentar.',503);return data as T;}catch(e){if(e instanceof MaintenanceError)throw e;throw new MaintenanceError('No se pudo confirmar el resultado. Actualiza para comprobarlo antes de reintentar.',0);}
}
