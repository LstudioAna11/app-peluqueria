'use strict';
const fs=require('fs'),path=require('path');
function transform(source){
 const marker='lst-agenda-drop-hour-v1';
 if(source.includes(marker))return source;
 let updated=source;
 const replace=(oldText,newText)=>{if(updated.split(oldText).length!==2)throw Error('La estructura ha cambiado: '+oldText.slice(0,90)+'. No se ha modificado nada. Envía tu App.tsx actual.');updated=updated.replace(oldText,newText);};
 replace('export async function persistVerifiedAppointmentMove(',`// ${marker}: use real row geometry, including when a card covers the target row.
export function agendaDropHour(grid: Element | null, dateKey: string, clientY: number): string | null {
  if (!grid || !Number.isFinite(clientY)) return null;
  const rows = Array.from(grid.querySelectorAll<HTMLElement>('[data-agenda-date][data-agenda-time]'))
    .filter(slot => slot.dataset.agendaDate === dateKey)
    .map(slot => ({time: slot.dataset.agendaTime || '', rect: slot.getBoundingClientRect()}))
    .filter(row => row.rect.height > 0).sort((a,b) => a.rect.top-b.rect.top);
  if (!rows.length || clientY < rows[0].rect.top || clientY >= rows[rows.length-1].rect.bottom) return null;
  const hit = rows.find(row => clientY >= row.rect.top && clientY < row.rect.bottom);
  if (hit) return hit.time;
  // Grid gaps belong to the nearest row, without assuming a fixed row height.
  return rows.reduce((a,b) => Math.abs(clientY-(a.rect.top+a.rect.bottom)/2) <= Math.abs(clientY-(b.rect.top+b.rect.bottom)/2) ? a : b).time;
}

export async function persistVerifiedAppointmentMove(`);
 replace('    if (patch.waiveDeposit !== undefined',`    if (patch.dateKey !== undefined && String(row.starts_at || '').slice(0,10) !== patch.dateKey) return false;
    if (patch.time !== undefined && String(row.starts_at || '').slice(11,16) !== patch.time) return false;
    if (patch.waiveDeposit !== undefined`);
 replace("    e.dataTransfer.setData('text/plain', id);","    e.dataTransfer.effectAllowed = 'move';\n    e.dataTransfer.setData('text/plain', id);");
 replace("    if (!modalClientName.trim()) return;",`    if (!modalClientName.trim()) return;
    if (!/^(?:[01]\\d|2[0-3]):[0-5]\\d$/.test(targetTime)) { alert('Selecciona una hora válida.'); return; }
    if (isDateBlockedByHoliday(formatDateKey(targetDateObj))) { alert('Este día está bloqueado por vacaciones o festivo.'); return; }`);
 replace('          id: updated.serverId || updated.id,',`          id: updated.serverId || updated.id,
          ...(targetTime !== editingAppointment.time ? {dateKey: formatDateKey(targetDateObj), time: targetTime} : {}),`);
 replace('disabled={!working || timeBlockConflict(key, time) || (occupied && !enableDoubleBooking)}',`disabled={!draggedApptId && (!working || timeBlockConflict(key, time) || (occupied && !enableDoubleBooking))}
            data-agenda-date={key} data-agenda-time={time}`);
 replace('onClick={() => chooseSlotAction(day.dateObj, day.name, time)} onDragOver={handleDragOver}',`onClick={() => { if (!draggedApptId && working && !timeBlockConflict(key,time) && (!occupied || enableDoubleBooking)) chooseSlotAction(day.dateObj, day.name, time); }} onDragOver={handleDragOver}`);
 replace('draggable onDragStart={event => handleDragStart(event, item.id)}',`draggable onDragStart={event => handleDragStart(event, item.id)} onDragEnd={() => setDraggedApptId(null)}`);
 replace('onDrop={event => { event.stopPropagation(); handleDrop(event, day.dateObj, day.name, item.time); }}',`onDrop={event => {
              event.preventDefault(); event.stopPropagation();
              const hour = agendaDropHour(event.currentTarget.closest('.studio-agenda-grid'), formatDateKey(day.dateObj), event.clientY);
              if (hour) void handleDrop(event, day.dateObj, day.name, hour);
              else setDraggedApptId(null);
            }}`);
 replace("{editingAppointment ? 'Editar servicios · 360studio' : 'Nueva cita · 360studio'}", "{editingAppointment ? 'Editar cita · 360studio' : 'Nueva cita · 360studio'}");
 replace('<h4 style={{ color: \'#FFF8EE\', fontSize: \'16px\', margin: \'8px 0\' }}>1. Datos de la clienta</h4>',`<label htmlFor="lst-quick-appointment-hour" style={{color:'#E4C687',fontSize:13}}>Hora de la cita
                <input id="lst-quick-appointment-hour" type="time" step={60} required value={targetTime} onChange={event => setTargetTime(event.target.value)} style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:6,padding:11,background:'#322A25',color:'#FFF8EE',border:'1px solid #C5A059',borderRadius:6,fontSize:16}} />
              </label>
              <h4 style={{ color: '#FFF8EE', fontSize: '16px', margin: '8px 0' }}>1. Datos de la clienta</h4>`);
 return updated;
}
module.exports={transform};
if(require.main===module){try{
 const root=process.cwd(),target=path.join(root,'src/App.tsx');
 if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(target))throw Error('Ejecuta este archivo en la raíz del proyecto, junto a package.json.');
 const original=fs.readFileSync(target,'utf8'),updated=transform(original);
 if(updated===original){console.log('La corrección de hora ya está instalada.');process.exit(0);}
 const ts=require(require.resolve('typescript',{paths:[root]}));
 if(ts.createSourceFile('App.tsx',updated,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length)throw Error('No se pudo validar el cambio. No se ha modificado nada.');
 const backup=path.join(root,'respaldo-hora-cita-'+Date.now());fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'App.tsx'),original);
 try{fs.writeFileSync(target,updated);}catch(error){fs.writeFileSync(target,original);throw error;}
 console.log('Instalado: arrastre según la hora bajo el puntero y campo Hora en cita rápida y edición. Respaldo: '+path.basename(backup)+'. Ejecuta npm run build y Publish / Update. No requiere SQL ni cambios en Supabase.');
}catch(error){console.error(error.message);process.exitCode=1;}}
