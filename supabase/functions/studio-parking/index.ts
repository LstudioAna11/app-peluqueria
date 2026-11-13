import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const messages:Record<string,string>={PARKING_EMPTY:'No quedan tarjetas de parking. Registra una reposición.',PARKING_NOT_INITIALIZED:'Introduce primero las tarjetas disponibles.',PARKING_ALREADY_INITIALIZED:'El stock ya está iniciado. Actualiza el contador.',PARKING_NOT_ELIGIBLE:'Esta cita no cumple la duración o el estado necesarios.',PARKING_APPOINTMENT:'No se encuentra la cita. Actualiza la agenda.',PARKING_QUANTITY:'Indica una cantidad válida.',PARKING_MINIMUM:'La duración mínima debe ser de 30 a 480 minutos, en pasos de cinco.',PARKING_REASON:'Indica el motivo de la devolución del papel.',PARKING_NOT_DELIVERED:'Esta cita no tiene una tarjeta pendiente de devolver.',PARKING_REQUEST_CHANGED:'La operación pendiente tiene otros datos. Comprueba su resultado antes de cambiarla.'};
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const token=(/^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')||'')||[])[1]||'';if(!token||token.length>512)return json({error:'Accede como administradora.'},401);
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('STUDIO_BACKEND_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:session,error:authError}=await client.from('api_tokens').select('role,expires_at').eq('token',token).maybeSingle();
  if(authError)return json({error:'No se pudo comprobar la sesión.'},503);
  if(!session||!Number.isFinite(Date.parse(session.expires_at))||Date.parse(session.expires_at)<=Date.now())return json({error:'La sesión ha caducado.'},401);
  if(session.role!=='admin')return json({error:'Solo administración puede gestionar parking.'},403);
  const raw=await req.text();if(raw.length>4000)return json({error:'Petición demasiado grande.'},413);let body:any;try{body=JSON.parse(raw);}catch{return json({error:'Petición no válida.'},400);}
  if(!['state','initialize','restock','issue','return','settings'].includes(body.action))return json({error:'Acción no válida.'},422);
  if(body.action!=='state'&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.requestId||''))return json({error:'Referencia de operación no válida.'},422);
  if(body.amount!==undefined&&!Number.isInteger(body.amount)||body.minimum!==undefined&&!Number.isInteger(body.minimum))return json({error:'Indica números enteros.'},422);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)),actor=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');
  const {data,error}=await client.rpc('studio_parking_admin_v1',{p_actor:actor,p_action:body.action,p_request:body.requestId||null,p_reference:typeof body.reference==='string'?body.reference:null,p_amount:body.amount??null,p_minimum:body.minimum??null,p_reason:typeof body.reason==='string'?body.reason:null});
  if(error){const message=Object.keys(messages).find(k=>String(error.message).includes(k));if(message)return json({error:messages[message]},409);console.error('[studio-parking]',error.code);return json({error:'No se pudo comprobar el parking. Revisa que el SQL esté instalado.'},503);}
  return json({ok:true,data});
 }catch{return json({error:'No se pudo completar la operación de parking. Actualiza y comprueba el resultado antes de reintentar.'},503);}
});
