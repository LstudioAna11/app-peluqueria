import React from 'react';
import * as studioApi from './studioApi';
const LazyClockPortal=React.lazy(()=>import('./TimeClock').then(m=>({default:m.ClockPortal})));
export function isClockEntry(url=new URL(window.location.href)){return url.searchParams.get('fichaje')==='1'&&!['cita','opinion','notificacion','reservar'].some(k=>url.searchParams.has(k))&&!new URLSearchParams(url.hash.slice(1)).has('recuperar');}
export function TimeClockEntry({children}:{children:React.ReactNode}){
 if(!isClockEntry())return <>{children}</>;
 if(new URLSearchParams(window.location.search).get('modo')==='salon'&&studioApi.currentToken()&&studioApi.storedRole()==='admin')return <main style={{padding:30,background:'#29231F',color:'#FFF8EE',minHeight:'100dvh',boxSizing:'border-box'}}><h1 style={{color:'#E4C687'}}>Preparar el dispositivo del salón</h1><p>Este navegador tiene la intranet de administración abierta. Usa un dispositivo o perfil de navegador dedicado a fichajes, sin sesión de administración.</p><p>Copia esta dirección en ese perfil:</p><input readOnly style={{width:'100%',boxSizing:'border-box',padding:12,fontSize:16}} value="https://lstudioana.es/?fichaje=1&modo=salon" onFocus={e=>e.target.select()}/><p>Así el personal podrá fichar sin dejar acceso a las fichas de clientas.</p></main>;
 return <React.Suspense fallback={<div role="status" style={{padding:24,background:'#29231F',color:'#E4C687'}}>Preparando fichajes…</div>}><LazyClockPortal/></React.Suspense>;
}
