'use strict';
const fs=require('fs'),path=require('path');
const marker='lst-quick-open-direct-v1';
function patchFiles(app,admin,ts){
 if(app.includes(marker)&&admin.includes(marker))return {app,admin};
 if(app.includes(marker)||admin.includes(marker))throw Error('El cambio está instalado parcialmente. Envía App.tsx y AdminPanelView.tsx actuales.');
 const parse=(name,text)=>{const tree=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);if(tree.parseDiagnostics.length)throw Error(name+' contiene errores de sintaxis. No se ha cambiado nada.');return tree;};
 function one(tree,test,label){const items=[];function walk(n){if(test(n))items.push(n);ts.forEachChild(n,walk);}walk(tree);if(items.length!==1)throw Error('Ha cambiado '+label+'. No se ha modificado nada. Envía los dos archivos actuales.');return items[0];}
 const change=(text,tree,node,value)=>text.slice(0,node.getStart(tree))+value+text.slice(node.end);
 const replace=(text,a,b)=>{if(text.split(a).length!==2)throw Error('No se reconoce el formulario actual. No se ha cambiado nada.');return text.replace(a,b);};
 let tree=parse('App.tsx',app);
 const handler=one(tree,n=>ts.isVariableDeclaration(n)&&n.name.getText(tree)==='handleCellClick','la apertura de cita');
 let code=handler.getText(tree);
 code=replace(code,'(targetDate: Date, dayName: string, time: string)','(targetDate: Date, dayName: string, time: string, openFormOnly = false)');
 code=replace(code,'const existing = appointments.find(', 'const existing = openFormOnly ? undefined : appointments.find(');
 code=replace(code,'if (!enableOutOfHours && !isAgendaTimeWorking(targetDate, time))','if (!openFormOnly && !enableOutOfHours && !isAgendaTimeWorking(targetDate, time))');
 code=replace(code,'if (timeBlockConflict(targetDateKey, time))','if (!openFormOnly && timeBlockConflict(targetDateKey, time))');
 code=replace(code,'setTargetTime(time);','setTargetTime(openFormOnly ? "" : time);');
 app=change(app,tree,handler,code);
 if(!app.includes('lst-quick-appointment-hour')){
  const heading="<h4 style={{ color: '#FFF8EE', fontSize: '16px', margin: '8px 0' }}>1. Datos de la clienta</h4>";
  app=replace(app,heading,`<label htmlFor="lst-quick-appointment-hour" style={{color:'#E4C687',fontSize:13}}>Hora de la cita
    <input id="lst-quick-appointment-hour" type="time" step={60} required value={targetTime} onChange={event=>setTargetTime(event.target.value)} style={{display:'block',width:'100%',boxSizing:'border-box',padding:11,marginTop:6,background:'#322A25',color:'#FFF8EE',border:'1px solid #C5A059',borderRadius:6,fontSize:16}} />
  </label>`+heading);
 }
 tree=parse('App.tsx',app);
 const save=one(tree,n=>ts.isVariableDeclaration(n)&&n.name.getText(tree)==='handleSaveModalAppointment','el guardado de la cita');
 let saveCode=save.getText(tree);
 if(!saveCode.includes("test(targetTime)"))saveCode=replace(saveCode,'if (!modalClientName.trim()) return;',`if (!modalClientName.trim()) return;
    if (!/^(?:[01]\\d|2[0-3]):[0-5]\\d$/.test(targetTime)) { alert('Selecciona una hora válida antes de guardar la cita.'); return; }`);
 app=change(app,tree,save,saveCode);
 app='// '+marker+'\n'+app;
 tree=parse('AdminPanelView.tsx',admin);
 const mobile=one(tree,n=>ts.isVariableDeclaration(n)&&n.name.getText(tree)==='openMobileBooking','el botón móvil');
 admin=change(admin,tree,mobile,`openMobileBooking = () => {
   if(isDateBlockedByHoliday(formatDateKey(fechaSeleccionada))){alert('El día seleccionado está bloqueado. Elige otra fecha.');return;}
   setAgendaSummaryOpen(false);setAgendaExpanded(false);
   handleCellClick(fechaSeleccionada,fechaSeleccionada.toLocaleDateString('es-ES',{weekday:'long'}),'',true);
 }`);
 tree=parse('AdminPanelView.tsx',admin);
 const prop=one(tree,n=>ts.isPropertySignature(n)&&n.name?.getText(tree)==='handleCellClick','la conexión entre agenda y formulario');
 admin=change(admin,tree,prop,'handleCellClick: (targetDate: Date, dayName: string, time: string, openFormOnly?: boolean) => void;');
 tree=parse('AdminPanelView.tsx',admin);
 const button=one(tree,n=>ts.isJsxElement(n)&&n.openingElement.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.getText(tree)==='className'&&a.initializer?.getText(tree)==='"studio-new-appointment"'),'el botón Nueva cita');
 const click=button.openingElement.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(tree)==='onClick');if(!click)throw Error('No se encuentra el botón.');
 admin=change(admin,tree,click,'onClick={openMobileBooking}');
 admin='// '+marker+'\n'+admin;
 parse('App.tsx',app);parse('AdminPanelView.tsx',admin);
 return {app,admin};
}
module.exports={patchFiles};
if(require.main===module){try{
 const root=process.cwd(),appPath=path.join(root,'src/App.tsx'),adminPath=path.join(root,'src/AdminPanelView.tsx');
 if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(appPath)||!fs.existsSync(adminPath))throw Error('Ejecuta este archivo en Bolt, junto a package.json.');
 const ts=require(require.resolve('typescript',{paths:[root]})),app=fs.readFileSync(appPath,'utf8'),admin=fs.readFileSync(adminPath,'utf8');
 const result=patchFiles(app,admin,ts);
 if(result.app===app&&result.admin===admin){console.log('La apertura directa de cita rápida ya está instalada.');process.exit(0);}
 const backup=path.join(root,'respaldo-cita-directa-'+Date.now());fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'App.tsx'),app);fs.writeFileSync(path.join(backup,'AdminPanelView.tsx'),admin);
 try{fs.writeFileSync(appPath,result.app);fs.writeFileSync(adminPath,result.admin);}catch(error){fs.writeFileSync(appPath,app);fs.writeFileSync(adminPath,admin);throw error;}
 console.log('Instalado en App.tsx y AdminPanelView.tsx. Nueva cita abre el formulario con la hora en blanco. Se valida el horario al guardar. Respaldo: '+path.basename(backup)+'. Ejecuta npm run build y Publish / Update. Este archivo se ejecuta en Bolt; no se pega en Supabase.');
}catch(error){console.error(error.message);process.exitCode=1;}}
