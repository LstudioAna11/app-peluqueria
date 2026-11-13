// lst-push-compact-v2
import React from 'react';
const row:React.CSSProperties={borderTop:'1px solid #655039',marginTop:6};
const summary:React.CSSProperties={minHeight:44,boxSizing:'border-box',padding:'10px 0',cursor:'pointer',color:'#E4C687',fontSize:13,lineHeight:1.6};
const list:React.CSSProperties={margin:'0 0 12px',paddingLeft:20,color:'#D6CBB8',fontSize:12,lineHeight:1.8};
const note:React.CSSProperties={fontSize:12,lineHeight:1.7,color:'#D6CBB8',margin:'0 0 12px'};
export default function PushSetupHelp(){return <details aria-label="Ayuda para activar los avisos" style={{marginTop:8}}><summary style={{minHeight:44,boxSizing:'border-box',padding:'10px 0',cursor:'pointer',color:'#D8C29A',fontSize:12,lineHeight:1.6}}>Ayuda para activar los avisos</summary><div style={{paddingTop:4}}><details style={row}><summary style={summary}>Android</summary><ol style={list}>
  <li>Abre el portal del Studio con Chrome e inicia sesión con tu PIN.</li>
  <li>Pulsa «Activar notificaciones» y acepta «Permitir» cuando lo pida el navegador.</li>
  <li>Si quieres tener el icono de la app, abre el menú ⋮ de Chrome y busca «Instalar aplicación» o «Añadir a pantalla de inicio». El nombre puede variar según la versión.</li>
  <li>Vuelve al portal o abre la app instalada y pulsa «Enviar notificación de prueba».</li>
 </ol><p style={note}>Si bloqueaste el permiso, abre el portal en Chrome y entra en la información de la página → Permisos → Notificaciones para permitirlas.</p></details>
<details style={row}><summary style={summary}>iPhone o iPad</summary><ol style={list}>
  <li>Abre el portal del Studio en Safari.</li>
  <li>Abre el menú de la página o el botón Compartir y elige «Añadir a pantalla de inicio».</li>
  <li>Si aparece «Abrir como app web», déjalo activado y confirma con «Añadir».</li>
  <li>Abre el Studio desde el nuevo icono de tu pantalla de inicio e inicia sesión con tu PIN.</li>
  <li>Pulsa «Activar notificaciones», acepta el permiso y envía una notificación de prueba.</li>
 </ol><p style={note}>Si ya tienes la app instalada, ábrela desde su icono. Si bloqueaste los avisos, revisa Ajustes → Notificaciones → la app del Studio.</p></details>
<details style={row}><summary style={summary}>Ordenador</summary><ol style={list}>
  <li>Abre el portal e inicia sesión con tu PIN.</li>
  <li>Pulsa «Activar notificaciones» y permite los avisos cuando te lo pida el navegador.</li>
  <li>Pulsa «Enviar notificación de prueba».</li>
 </ol><p style={note}>Si están bloqueadas, revisa los permisos de notificaciones del sitio en tu navegador.</p></details></div></details>;}
