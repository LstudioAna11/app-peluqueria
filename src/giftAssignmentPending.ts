import * as api from './studioApi';
const key='lst_gift_assignment_pending_v1',event='lst-gift-assignment-change';
const uid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export function readGiftAssignmentPending():api.GiftAssignment|null{
 const raw=localStorage.getItem(key);if(!raw)return null;const v=JSON.parse(raw);
 if(!uid(v.requestId)||!uid(v.voucherId)||!uid(v.expectedOwner)||!uid(v.recipientId)||typeof v.reason!=='string'||v.reason.length<3||v.reason.length>200)throw Error('Hay una asignación pendiente que necesita revisión.');return v;
}
export const giftAssignmentEvent=event;
const changed=()=>window.dispatchEvent(new Event(event));
export async function saveGiftAssignment(body:Omit<api.GiftAssignment,'requestId'>,retry=false){
 const token=api.currentToken();if(!token||api.storedRole()!=='admin')throw Error('Entra como administradora para asignar la tarjeta.');
 let pending=readGiftAssignmentPending();if(!retry){if(pending)throw Error('Comprueba primero la asignación pendiente.');pending={...body,requestId:crypto.randomUUID()};localStorage.setItem(key,JSON.stringify(pending));changed();}
 if(!pending)throw Error('No hay ninguna asignación pendiente.');
 try{const response=await api.assignGiftRecipient(token,pending);if(api.currentToken()!==token||api.storedRole()!=='admin')throw Error('La sesión ha cambiado. Comprueba la asignación al volver a entrar.');if(response?.ok!==true)throw Error('El servidor no confirmó la asignación. Comprueba su resultado antes de reintentar.');if(readGiftAssignmentPending()?.requestId===pending.requestId)localStorage.removeItem(key);changed();return response;}
 catch(error){if(error instanceof api.StudioApiError&&[400,403,409,422].includes(error.status)){if(readGiftAssignmentPending()?.requestId===pending.requestId)localStorage.removeItem(key);changed();}throw error;}
}
