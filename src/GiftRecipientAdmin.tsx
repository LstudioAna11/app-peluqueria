import React,{useEffect,useRef,useState} from 'react';
import * as api from './studioApi';
import {giftAssignmentEvent,readGiftAssignmentPending,saveGiftAssignment} from './giftAssignmentPending';
type Client={id:string;label:string};
const money=(c:number)=>(c/100).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const date=(s:string|null)=>s?new Date(s.length===10?s+'T12:00:00':s).toLocaleDateString('es-ES',{timeZone:'Europe/Madrid'}):'—';
const normal=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
export default function GiftRecipientAdmin({voucher:v,clients,disabled,run}:{voucher:api.StudioVoucher;clients:Client[];disabled:boolean;run:(action:()=>Promise<unknown>,success:string)=>Promise<void>}){
 const [query,setQuery]=useState(''),[recipient,setRecipient]=useState(''),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[pending,setPending]=useState<api.GiftAssignment|null>(null),[pendingError,setPendingError]=useState('');const alive=useRef(false),lock=useRef(false);
 const check=()=>{try{setPending(readGiftAssignmentPending());setPendingError('');}catch(e){setPendingError((e as Error).message);}};
 useEffect(()=>{alive.current=true;check();window.addEventListener(giftAssignmentEvent,check);window.addEventListener('storage',check);return()=>{alive.current=false;window.removeEventListener(giftAssignmentEvent,check);window.removeEventListener('storage',check);};},[]);
 useEffect(()=>{setRecipient('');setReason('');setQuery('');setConfirmed(false);},[v.id,v.client_id]);
 const correcting=v.client_id!==v.buyer_id,holder=clients.find(c=>c.id===v.client_id)?.label||'Ficha registrada',buyer=clients.find(c=>c.id===v.buyer_id)?.label||'Ficha registrada';
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const editable=v.status==='active'&&!!v.expires_on&&v.expires_on>=today&&v.used_cents===0&&v.held_cents===0&&v.used_sessions===0&&v.held_sessions===0;
 const blocked=disabled||!!pending||!!pendingError,selected=clients.find(c=>c.id===recipient),options=clients.filter(c=>normal(c.label).includes(normal(query))||c.id===recipient);
 const submit=async(retry=false)=>{if(lock.current)return;lock.current=true;try{await run(async()=>{const body={voucherId:v.id,expectedOwner:v.client_id,recipientId:recipient,reason:correcting?reason.trim():'Asignación inicial de tarjeta regalo'};await saveGiftAssignment(body,retry);if(alive.current){setConfirmed(false);setRecipient('');setReason('');setQuery('');}},'Asignación comprobada. La tarjeta aparece en la ficha de su titular.');}finally{lock.current=false;if(alive.current)check();}};
 return <div style={{fontSize:12,lineHeight:1.6,margin:'8px 0'}}>
  <p style={{margin:'4px 0'}}>Comprada por: <strong>{buyer}</strong><br/>Titular actual: <strong>{holder}</strong>{!correcting&&<small style={{display:'block'}}>Puedes conservarla para ti o asignarla a quien recibe el regalo.</small>}</p>
  {pendingError&&<p role="alert">{pendingError}</p>}{pending&&<p role="status">Hay una asignación pendiente de comprobar.<button type="button" disabled={disabled} onClick={()=>void submit(true)}>Comprobar / reintentar asignación</button></p>}
  {editable?<details><summary style={{minHeight:44,alignContent:'center',cursor:'pointer',color:'#E4C687'}}>{correcting?'Corregir destinataria':'Asignar a la destinataria'}</summary>
   <label>Buscar ficha<input type="search" value={query} disabled={blocked} onChange={e=>setQuery(e.target.value)} placeholder="Nombre o número de ficha"/></label>
   <label>Quien recibe la tarjeta<select value={recipient} disabled={blocked} onChange={e=>{setRecipient(e.target.value);setConfirmed(false);}}><option value="">Elige la ficha de la destinataria</option>{options.map(c=><option key={c.id} value={c.id} disabled={c.id===v.client_id}>{c.label}</option>)}</select></label>
   <p style={{fontSize:11}}>Si no aparece, crea primero su ficha en Clientas y vuelve a este apartado. No necesita haberse registrado en la app.</p>
   {correcting&&<label>Motivo de la corrección<input value={reason} minLength={3} maxLength={200} disabled={blocked} onChange={e=>setReason(e.target.value)} placeholder="Por qué cambias la destinataria"/></label>}
   {selected&&selected.id!==v.client_id&&<><p>De: <strong>{holder}</strong><br/>Para: <strong>{selected.label}</strong></p>{recipient===v.buyer_id&&<p>Al devolverla a la compradora se renovará el código y dejará de funcionar el anterior.</p>}<label className="vb-check"><input type="checkbox" checked={confirmed} disabled={blocked} onChange={e=>setConfirmed(e.target.checked)}/>He comprobado que esta es la ficha correcta.</label></>}
   <button type="button" disabled={blocked||!selected||recipient===v.client_id||!confirmed||(correcting&&reason.trim().length<3)} onClick={()=>void submit()}>{correcting?'Guardar corrección':'Asignar tarjeta regalo'}</button>
   <small style={{display:'block',marginTop:8}}>Conserva la compra, el importe y la caducidad. No se puede cambiar si tiene usos o saldo reservado.</small>
  </details>:<small>La asignación solo se cambia en tarjetas activas, vigentes y sin usos ni saldo reservado.</small>}
 </div>;
}
export function GiftPurchaseReceipts({refreshKey}:{refreshKey:unknown}){
 const [open,setOpen]=useState(false),[page,setPage]=useState(0),[data,setData]=useState<{purchases:api.GiftPurchaseReceipt[];total:number}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{if(!open)return;let alive=true;const token=api.currentToken();setBusy(true);setError('');setData(null);if(!token||api.storedRole()!=='client'){setData(null);setBusy(false);setError('Entra en tu perfil para consultar las compras.');return;}
 api.fetchGiftPurchases(token,page).then(result=>{if(!alive)return;if(api.currentToken()!==token||api.storedRole()!=='client'){setData(null);setError('La sesión ha cambiado. Vuelve a entrar en tu perfil.');return;}if(!Array.isArray(result.purchases)||typeof result.total!=='number')throw Error('No se pudieron comprobar tus compras.');setData(result);}).catch(e=>{if(alive){setData(null);setError((e as Error).message);}}).finally(()=>{if(alive)setBusy(false);});return()=>{alive=false;};},[open,page,refreshKey,refresh]);
 return <details className="vb-panel" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>Regalos que has comprado</summary><p className="vb-note">Justificantes de tarjetas que compraste y ya están asignadas a otra persona. Su saldo y sus citas se consultan desde el perfil de quien las recibe.</p>
 {busy&&<p role="status">Consultando compras…</p>}{error&&<p role="alert">{error}</p>}{data?.purchases.length===0&&<p>Todavía no hay tarjetas regaladas asignadas a otra ficha.</p>}
 {data?.purchases.map(p=><article key={p.id} style={{borderTop:'1px solid #655039',padding:'10px 0',fontSize:12,lineHeight:1.6}}><strong>{p.title} · {money(p.price_cents)}</strong><p style={{margin:'4px 0'}}>Pago confirmado: {date(p.activated_at)}<br/>Referencia: {p.payment_reference}<br/>Caducidad de la tarjeta: {date(p.expires_on)}</p><small>Compra conservada · tarjeta asignada a su destinataria.</small></article>)}
 <div className="vb-actions"><button type="button" disabled={busy} onClick={()=>setRefresh(n=>n+1)}>Actualizar compras</button>{!!data&&data.total>12&&<><button type="button" disabled={busy||page===0} onClick={()=>setPage(n=>n-1)}>Anterior</button><span>{page+1} / {Math.ceil(data.total/12)}</span><button type="button" disabled={busy||(page+1)*12>=data.total} onClick={()=>setPage(n=>n+1)}>Siguiente</button></>}</div>
 </details>;
}
