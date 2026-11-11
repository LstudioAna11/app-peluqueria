import React,{useEffect,useRef,useState} from 'react';
import * as studioApi from './studioApi';
import {offlineConsultation} from './offlineSession';
import type {ClientRecord} from './App';
type State={settings:{enabled:boolean};providerReady:boolean;preferences:{client_id:string;email_enabled:boolean}[];logs:{id:string;client_name:string;status:string;created_at:string;last_error:string|null}[];stats:{sent:number;failed:number;pending:number;skipped:number}};
async function request<T>(action:string,body:unknown,token:string,signal?:AbortSignal):Promise<T>{
 if(offlineConsultation())throw new Error('Conecta para gestionar las felicitaciones.');
 const response=await fetch(String(import.meta.env.VITE_SUPABASE_URL)+'/functions/v1/studio-birthdays/'+action,{
  method:'POST',headers:{'Content-Type':'application/json',apikey:String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||''),Authorization:'Bearer '+token},body:JSON.stringify(body),signal,cache:'no-store',
 });
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'No se pudo conectar con Cumpleaños.');
 if(studioApi.currentToken()!==token||studioApi.storedRole()!=='admin')throw new Error('La sesión ha cambiado.');return data;
}
const button:React.CSSProperties={padding:'10px 14px',borderRadius:8,border:'1px solid #B9955F',background:'#3E342C',color:'#E4C687',cursor:'pointer'};
export default function BirthdayPanel({clients}:{clients:ClientRecord[]}){
 const [state,setState]=useState<State|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[search,setSearch]=useState('');
 const [selected,setSelected]=useState<ClientRecord|null>(null),[confirmed,setConfirmed]=useState(false);
 const mounted=useRef(false),lock=useRef(false),controller=useRef<AbortController|null>(null);
 const load=async()=>{
  if(lock.current)return;const token=studioApi.currentToken();if(!token||studioApi.storedRole()!=='admin'){setError('Accede a la intranet.');return;}
  lock.current=true;setBusy(true);setError('');controller.current=new AbortController();
  try{const next=await request<State>('status',{},token,controller.current.signal);if(mounted.current)setState(next);}
  catch(value){if(mounted.current)setError(value instanceof Error?value.message:'No se pudo cargar Cumpleaños.');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 useEffect(()=>{mounted.current=true;const start=setTimeout(()=>void load(),0);return()=>{clearTimeout(start);mounted.current=false;controller.current?.abort();};},[]);
 const change=async(action:'settings'|'preference',body:Record<string,unknown>)=>{
  if(lock.current)return;const token=studioApi.currentToken();if(!token||studioApi.storedRole()!=='admin')return;
  lock.current=true;setBusy(true);setError('');
  try{
   await request(action,body,token);
   if(!mounted.current)return;
   if(action==='settings')setState(old=>old?{...old,settings:{enabled:body.enabled===true}}:old);
   else setState(old=>old?{...old,preferences:[...old.preferences.filter(p=>p.client_id!==body.clientId),{client_id:String(body.clientId),email_enabled:body.enabled===true}]}:old);
   setSelected(null);setConfirmed(false);
  }catch(value){if(mounted.current)setError(value instanceof Error?value.message:'No se pudo guardar la preferencia.');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 const preference=(id:string)=>state?.preferences.some(p=>p.client_id===id&&p.email_enabled)===true;
 const visible=clients.filter(c=>c.serverId&&`${c.nombre} ${c.apellidos} ${c.email}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 return <section style={{padding:20,border:'1px solid #B9955F',borderRadius:12,background:'#29231F',color:'#F3E7D5',display:'grid',gap:14}} aria-label="Felicitaciones de cumpleaños">
  <h3 style={{margin:0,color:'#E4C687'}}>Cumpleaños</h3>
  <div><button type="button" style={button} disabled={busy} onClick={()=>void load()}>{busy?'Guardando / consultando…':'Actualizar estado'}</button></div>
  {error&&<p role="alert">{error}</p>}
  {state&&<>
   <label style={{display:'flex',gap:10,alignItems:'center',fontSize:14}}><input type="checkbox" role="switch" aria-checked={state.settings.enabled} checked={state.settings.enabled} disabled={busy||(!state.providerReady&&!state.settings.enabled)} onChange={e=>void change('settings',{enabled:e.target.checked})}/>Felicitaciones por email</label>
   <p role="status" style={{margin:0,fontSize:13,color:state.providerReady?'#D6CBB8':'#E4C687'}}>{!state.providerReady?'Email pendiente de configurar':state.settings.enabled?'Felicitaciones activadas':'Felicitaciones desactivadas'} · {state.stats.sent} enviadas este año{state.stats.failed+state.stats.pending>0?' · '+(state.stats.failed+state.stats.pending)+' por revisar':''}</p>
   <small style={{color:'#D6CBB8'}}>El interruptor se guarda al cambiarlo.</small>

   <details><summary style={{cursor:'pointer',color:'#E4C687'}}>Ver el mensaje de cumpleaños</summary><div style={{padding:16,lineHeight:1.7}}><strong>¡Feliz cumpleaños, [nombre]!</strong><p>Que este nuevo año te regale momentos bonitos, tiempo para ti y muchas razones para sonreír.</p><p>Gracias por formar parte de L’Studio Ana. Hoy te enviamos un abrazo muy especial.</p><p>Con cariño, Ana</p></div></details>
   <details><summary style={{cursor:'pointer',color:'#E4C687'}}>Clientas y preferencias de cumpleaños</summary>
    <p style={{fontSize:13,lineHeight:1.6}}>Activa únicamente a quienes hayan aceptado recibir estas felicitaciones. La fecha de nacimiento y el email se editan en la ficha de Clientas. Las fichas dadas de baja no reciben felicitaciones.</p>
    <label>Buscar clienta <input type="search" value={search} onChange={e=>setSearch(e.target.value)} style={{...button,width:'100%',boxSizing:'border-box',margin:'8px 0'}}/></label>
    {visible.slice(0,50).map(client=><div key={client.serverId} style={{padding:'12px 0',borderBottom:'1px solid #655039',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
     <div><strong>{client.nombre} {client.apellidos}</strong><small style={{display:'block'}}>{client.fechaNacimiento||'Sin fecha de nacimiento'} · {client.email||'Sin email'}{client.archivedAt?' · Baja':''}</small><small>{preference(client.serverId!)?'Felicitación permitida':'Felicitación desactivada'}</small></div>
     <button type="button" style={button} disabled={busy} onClick={()=>{if(preference(client.serverId!))void change('preference',{clientId:client.serverId,enabled:false});else{setSelected(client);setConfirmed(false);}}}>{preference(client.serverId!)?'Desactivar':'Activar para esta clienta'}</button>
    </div>)}
    <small>{visible.length} fichas cargadas coinciden. Se muestran hasta 50; usa la búsqueda para localizar otra.</small>
    {selected&&<div role="group" aria-label="Confirmar preferencia" style={{padding:16,border:'1px solid #B9955F',marginTop:12,borderRadius:8}}><p>{selected.nombre} {selected.apellidos}</p><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> La clienta ha aceptado recibir felicitaciones de cumpleaños por email.</label><div style={{display:'flex',gap:10,marginTop:12}}><button type="button" style={button} disabled={!confirmed||busy} onClick={()=>void change('preference',{clientId:selected.serverId,enabled:true,permissionConfirmed:confirmed})}>Guardar preferencia</button><button type="button" style={button} disabled={busy} onClick={()=>setSelected(null)}>Cancelar</button></div></div>}
   </details>
   <details><summary style={{cursor:'pointer',color:'#E4C687'}}>Últimos envíos de cumpleaños</summary>
   <p style={{fontSize:13,margin:0}}>Este año: {state.stats.sent} enviadas · {state.stats.failed} sin confirmar / fallidas · {state.stats.pending} en proceso o por revisar · {state.stats.skipped} omitidas.</p>
    {state.logs.length===0?<p>Todavía no hay envíos registrados.</p>:state.logs.map(log=><div key={log.id} style={{padding:'10px 0',borderBottom:'1px solid #655039'}}><strong>{log.client_name}</strong> · {({sent:'Enviado',failed:'Sin confirmar / fallido',sending:'En proceso / por revisar',skipped:'Omitido'} as Record<string,string>)[log.status]||'Por revisar'}<small style={{display:'block'}}>{new Date(log.created_at).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})}</small>{log.last_error&&<p style={{fontSize:12}}>{log.last_error}</p>}</div>)}
    <p style={{fontSize:12}}>Los envíos inciertos no se reintentan automáticamente. Consulta el proveedor antes de reenviar.</p>
   </details>
   <details><summary style={{cursor:'pointer',color:'#D6CBB8'}}>Ayuda</summary><p style={{fontSize:13,lineHeight:1.6}}>Un email personalizado el día de su cumpleaños, alrededor de las 10:00. Una felicitación por año, sin descuento y con enlace para dejar de recibirlas. Solo se envía a las clientas que tengan permitidas estas felicitaciones y con el proveedor configurado.</p></details>
  </>}
 </section>;
}

// lst-notices-compact-v1
