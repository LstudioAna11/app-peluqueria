import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,Authorization,Apikey','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Authorization'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});if(req.method!=='POST')return json({error:'Método no permitido'},405);
 const action=new URL(req.url).pathname.replace(/\/+$/,'').split('/').pop()||'';if(!['status','save'].includes(action))return json({error:'Acción no disponible'},404);
 try{
  let body;try{const raw=await req.text();if(raw.length>8000)return json({error:'Petición demasiado grande'},413);body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{return json({error:'Revisa los datos.'},400);}
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'').trim();if(action==='save'&&!token)return json({error:'Accede a la intranet.'},401);
  let guardReady=false,guardUnknown=false;
  if(action==='save'&&body.mode==='paused'){
   const {data:session,error:authError}=await db.from('api_tokens').select('role,expires_at').eq('token',token).maybeSingle();
   if(authError)return json({error:'No se pudo verificar la sesión. Comprueba el resultado antes de reintentar.'},503);
   if(session?.role!=='admin'||!Number.isFinite(Date.parse(session.expires_at))||Date.parse(session.expires_at)<=Date.now())return json({error:'Solo administración puede activar el mantenimiento.'},403);
   let ready=false;try{const response=await fetch(Deno.env.get('SUPABASE_URL')!+'/functions/v1/studio-api/health',{method:'POST',headers:{'Content-Type':'application/json',apikey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,Authorization:'Bearer '+Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!},body:'{}',signal:AbortSignal.timeout(8000),cache:'no-store'});if(response.ok)ready=(await response.json()).portalMaintenanceGuard===1;else guardUnknown=true;}catch{guardUnknown=true;}
   guardReady=ready;
  }
  const result=action==='status'?await db.rpc('studio_portal_maintenance_public'):await db.rpc('studio_maintenance_save',{p_token:token,p_body:body,p_guard_ready:guardReady});
  if(result.error){const msg=String(result.error.message||'');if(msg.includes('MAINT_ADMIN'))return json({error:'Solo administración puede cambiar el mantenimiento.'},403);if(msg.includes('MAINT_GUARD'))return json({error:guardUnknown?'No se pudo comprobar la protección de reservas. Conserva la operación y comprueba el resultado antes de reintentar.':'Despliega primero la versión incluida de studio-api con la protección de mantenimiento. Esta operación no ha cambiado el estado del portal.'},guardUnknown?503:409);if(msg.includes('MAINT_REVISION'))return json({error:'Otra sesión ha cambiado el mantenimiento. Actualiza antes de guardar.'},409);if(msg.includes('MAINT_REQUEST_CHANGED'))return json({error:'La operación pendiente corresponde a otros datos.'},409);if(msg.includes('MAINT_TIME'))return json({error:'Indica una hora prevista futura o deja el campo vacío.'},422);if(msg.includes('MAINT_INVALID')||['22P02','22003','23514','22007','22008'].includes(String(result.error.code)))return json({error:'Revisa el modo, texto y hora prevista.'},422);console.error('studio-maintenance',String(result.error.code||'rpc-failed'));return json({error:'No se pudo confirmar el mantenimiento. Comprueba la instalación y reintenta.'},503);}
  if(!result.data||!['off','notice','paused'].includes(result.data.mode))return json({error:'Estado de mantenimiento no disponible.'},503);
  return json(result.data);
 }catch{console.error('studio-maintenance','operation-failed');return json({error:'No se pudo confirmar el resultado. Actualiza antes de reintentar.'},503);}
});
