import {privateStorage,flushPrivateCache} from './PrivateSessionGate';
import * as studioApi from './studioApi';
import {raffleCall,raffleRequest,RaffleError} from './raffleApi';
type Pending={action:string;body:Record<string,unknown>;summary?:string};
let running=false;
export function readRafflePending():Pending|null{try{const raw=privateStorage.getItem('lst_raffle_pending');if(!raw)return null;const p=JSON.parse(raw);if(typeof p.action!=='string'||!p.body||typeof p.body.requestId!=='string')throw Error();return p;}catch{throw new Error('No se pudo leer la operación pendiente de sorteos. Revisa el guardado privado antes de continuar.');}}
async function clearPending(p:Pending){privateStorage.removeItem('lst_raffle_pending');try{await flushPrivateCache();}catch(e){privateStorage.setItem('lst_raffle_pending',JSON.stringify(p));throw e;}}
export async function mutateRaffleAdmin(action:string,body:Record<string,unknown>,retry=false,summary=''):Promise<unknown>{
 if(running)throw new Error('Hay una operación de sorteos en curso.');
 if(studioApi.storedRole()!=='admin'||!privateStorage.ready)throw new Error('Accede a la intranet y espera a que termine el acceso privado.');
 running=true;
 try{
  let p=readRafflePending();if(p&&!retry)throw new Error('Comprueba primero la operación pendiente de sorteos.');if(!p){p={action,body:raffleRequest(body),summary:summary.slice(0,300)};privateStorage.setItem('lst_raffle_pending',JSON.stringify(p));}
  await flushPrivateCache();
  let result:unknown;
  try{result=await raffleCall(p.action,p.body);}catch(e){if(e instanceof RaffleError&&e.status>0&&e.status<500)await clearPending(p);throw e;}
  await clearPending(p);return result;
 }finally{running=false;}
}
