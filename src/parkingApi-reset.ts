import * as studioApi from './studioApi';
export type ParkingState={initialized:boolean;minMinutes:number;courtesyMinutes:number;stock:number|null;lowStock:boolean;alertAt:number;eligible:boolean;delivered:boolean;deliveredAt:string|null;added:number;deliveredTotal:number;history:{action:string;delta:number;at:string;appointment_id:string|null;reason:string|null}[]};
export type ParkingOperation={action:'initialize'|'restock'|'issue'|'return'|'settings';requestId:string;reference?:string;amount?:number;minimum?:number;reason?:string};
const pendingKey='lst_parking_pending_v1';
export const parkingChanged=()=>window.dispatchEvent(new Event('lst-parking-change'));
export function readParkingPending():ParkingOperation|null{const value=localStorage.getItem(pendingKey);if(!value)return null;const op=JSON.parse(value);if(!op?.requestId||!['initialize','restock','issue','return','settings'].includes(op.action))throw Error('Hay una operación de parking pendiente que necesita revisión.');return op;}
class ParkingError extends Error{constructor(message:string,public status:number){super(message);}}
export async function parkingCall(body:Record<string,unknown>):Promise<ParkingState>{
 const token=studioApi.currentToken();if(!token||studioApi.storedRole()!=='admin')throw Error('Accede como administradora para gestionar el parking.');
 const response=await fetch(String(import.meta.env.VITE_SUPABASE_URL||'')+'/functions/v1/studio-parking',{method:'POST',headers:{'Content-Type':'application/json',apikey:String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||''),Authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(15000),cache:'no-store'});
 const result=await response.json();if(studioApi.currentToken()!==token||studioApi.storedRole()!=='admin')throw Error('La sesión ha cambiado. Revisa el resultado al volver a entrar.');
 if(!response.ok||result.ok!==true)throw new ParkingError(result.error||'No se pudo acceder al parking. Revisa el SQL y la función studio-parking.',response.status);
 if(typeof result.data?.initialized!=='boolean'||typeof result.data?.minMinutes!=='number')throw Error('No se pudo comprobar el contador de parking.');return result.data;
}
export async function mutateParking(body:Omit<ParkingOperation,'requestId'>,retry=false):Promise<ParkingState>{
 let operation=readParkingPending();if(!retry){if(operation)throw Error('Comprueba primero la operación de parking pendiente.');operation={...body,requestId:crypto.randomUUID()};localStorage.setItem(pendingKey,JSON.stringify(operation));parkingChanged();}
 if(!operation)throw Error('No hay ninguna operación pendiente.');
 try{const result=await parkingCall(operation);if(readParkingPending()?.requestId===operation.requestId)localStorage.removeItem(pendingKey);parkingChanged();return result;}
 catch(error){if(error instanceof ParkingError&&[400,403,409,413,422].includes(error.status)){if(readParkingPending()?.requestId===operation.requestId)localStorage.removeItem(pendingKey);parkingChanged();}throw error;}
}
