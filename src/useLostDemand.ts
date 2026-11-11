import {useEffect,useRef} from 'react';
import {demandCall,clientDemandSession,type DemandService} from './demandApi';
type Snapshot={services:DemandService[];date:string;dateExplicit:boolean;time:string;observation:string;hasSlots:boolean};
type Context={token:string;client:string;id:string;lastKey:string;last:Snapshot;completed:boolean;left:boolean;inAgenda:boolean;lastActivity:number;queue:Promise<void>};
type Options={screen:string;clientId?:string|null;services:DemandService[];date:string;explicit:boolean;time:string;ready:boolean;error:boolean;hasSlots:boolean};
const uuid=()=>crypto.randomUUID();
export function useLostDemand(options:Options){
 const context=useRef<Context|null>(null);
 const send=(ctx:Context,step:string,snapshot:Snapshot,extra:Record<string,unknown>={})=>{
  const body={attemptId:ctx.id,eventId:uuid(),step,...snapshot,...extra};
  // Sequential, bounded retry with the same ID. Telemetry never blocks a reservation.
  ctx.queue=ctx.queue.then(async()=>{
   for(let n=0;n<2;n++){
    if(clientDemandSession()!==ctx.token)return;
    try{await demandCall('record',body,ctx.token);return;}catch{if(n===0)await new Promise(resolve=>setTimeout(resolve,500));}
   }
  }).catch(()=>{});
 };
 const servicesKey=JSON.stringify(options.services);
 useEffect(()=>{
  const token=clientDemandSession(),inFlow=['catalogBooking','visualAgenda'].includes(options.screen);
  let ctx=context.current;
  if(!token||!options.clientId||ctx&&(ctx.token!==token||ctx.client!==options.clientId)){context.current=null;ctx=null;}
  if(!token||!options.clientId)return;
  if(!inFlow){
   if(ctx&&!ctx.completed&&!ctx.left){send(ctx,'left',ctx.last);ctx.left=true;}
   return;
  }
  const agenda=options.screen==='visualAgenda';
  const snapshot:Snapshot={services:options.services,date:agenda?options.date:'',dateExplicit:agenda&&(options.explicit||!!options.time),time:agenda?options.time:'',observation:agenda?(options.error?'error':options.ready?'ready':'waiting'):'waiting',hasSlots:agenda&&options.hasSlots};
  if(ctx?.completed&&!options.services.length)return;
  const step=agenda?(options.time?'time':'calendar'):options.services.length?'services':'entry';
  const signature=JSON.stringify([step,snapshot]);
  if(ctx&&!ctx.completed&&signature!==ctx.lastKey&&Date.now()-ctx.lastActivity>30*60000)ctx=null;
  if(!ctx||ctx.completed){ctx={token,client:options.clientId,id:uuid(),lastKey:'',last:snapshot,completed:false,left:false,inAgenda:false,lastActivity:Date.now(),queue:Promise.resolve()};context.current=ctx;const entry={...snapshot,date:'',dateExplicit:false,time:'',observation:'waiting',hasSlots:false};send(ctx,'entry',entry);ctx.lastKey=JSON.stringify(['entry',entry]);}
  ctx.left=false;
  if(agenda&&!ctx.inAgenda)send(ctx,'agenda_open',snapshot);
  ctx.inAgenda=agenda;
  // Loading and polling are not client movements. A stable ready snapshot is sent once.
  if(agenda&&!options.ready&&!options.error){ctx.last=snapshot;return;}
  if(ctx.lastKey!==signature){send(ctx,step,snapshot);ctx.lastKey=signature;ctx.lastActivity=Date.now();}
  ctx.last=snapshot;
 },[options.screen,options.clientId,servicesKey,options.date,options.explicit,options.time,options.ready,options.error,options.hasSlots]);
 return {
  submit(){const ctx=context.current;if(ctx&&!ctx.completed)send(ctx,'submit',ctx.last);},
  complete(ref:string){const ctx=context.current;if(ctx&&!ctx.completed){ctx.completed=true;send(ctx,'saved',ctx.last,{appointmentRef:String(ref)});}},
  failed(taken:boolean,ref?:string){const ctx=context.current;if(ctx&&!ctx.completed)send(ctx,'booking_error',ctx.last,{failure:taken?'slot_taken':'request_error',appointmentRef:ref?String(ref):null});}
 };
}
