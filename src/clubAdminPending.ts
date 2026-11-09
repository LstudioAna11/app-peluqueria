import {privateStorage,flushPrivateCache} from './PrivateSessionGate';
import * as studioApi from './studioApi';
import {clubCall,clubRequest,ClubError} from './clubApi';
type Pending={action:string;body:Record<string,unknown>;summary?:string};
let running=false;
export function readClubPending():Pending|null{try{const raw=privateStorage.getItem('lst_club_pending');if(!raw)return null;const p=JSON.parse(raw);if(typeof p.action!=='string'||!p.body||typeof p.body.requestId!=='string')throw Error();return p;}catch{throw new Error('No se pudo leer la operación pendiente del club. Revisa el guardado privado antes de continuar.');}}
async function clearPending(p:Pending){privateStorage.removeItem('lst_club_pending');try{await flushPrivateCache();}catch(e){privateStorage.setItem('lst_club_pending',JSON.stringify(p));throw e;}}
export async function mutateClubAdmin(action:string,body:Record<string,unknown>,retry=false,summary=''):Promise<unknown>{
 if(running)throw new Error('Hay una operación del club en curso.');
 if(studioApi.storedRole()!=='admin'||!privateStorage.ready)throw new Error('Accede a la intranet y espera a que termine el acceso privado.');
 running=true;
 try{
  let p=readClubPending();if(p&&!retry)throw new Error('Comprueba primero la operación pendiente del club.');if(!p){p={action,body:clubRequest(body),summary:summary.slice(0,300)};privateStorage.setItem('lst_club_pending',JSON.stringify(p));}
  await flushPrivateCache();
  let result:unknown;
  try{result=await clubCall(p.action,p.body);}catch(e){if(e instanceof ClubError&&e.status>0&&e.status<500)await clearPending(p);throw e;}
  await clearPending(p);return result;
 }finally{running=false;}
}
