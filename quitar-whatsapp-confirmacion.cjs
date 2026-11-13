'use strict';
const fs=require('fs'),path=require('path');
try{
 const root=process.cwd(),file=path.join(root,'src/App.tsx'),marker='lst-booking-confirmation-clear-v1';
 if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(file))throw Error('Ejecuta este archivo junto a package.json, fuera de src.');
 const text=fs.readFileSync(file,'utf8');if(text.includes(marker)){console.log('La confirmación del portal ya está actualizada.');process.exit(0);}
 let ts;try{ts=require(require.resolve('typescript',{paths:[root]}));}catch{throw Error('Ejecuta npm install y vuelve a intentarlo.');}
 const ast=ts.createSourceFile('App.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);if(ast.parseDiagnostics.length)throw Error('App.tsx tiene errores de sintaxis previos. No se ha cambiado nada.');
 const txt=n=>n.getText(ast),all=[];function walk(n){if(ts.isJsxElement(n))all.push(n);ts.forEachChild(n,walk);}walk(ast);
 function one(list,test,label){const found=list.filter(test);if(found.length!==1)throw Error('No se encuentra un único '+label+'. No se ha cambiado nada. Envía tu src/App.tsx actual para adaptarlo.');return found[0];}
 const attr=(n,key)=>n.openingElement.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(ast)===key);
 const tag=n=>n.openingElement.tagName.getText(ast);
 const modal=one(all,n=>attr(n,'aria-labelledby')?.initializer?.getText(ast)==='"appointment-registered-title"','aviso de cita registrada');
 const inside=all.filter(n=>n.pos>=modal.pos&&n.end<=modal.end),title=one(inside,n=>attr(n,'id')?.initializer?.getText(ast)==='"appointment-registered-title"','título de confirmación'),hint=one(inside,n=>tag(n)==='p'&&txt(n).includes('WhatsApp no se envía automáticamente.'),'texto de WhatsApp'),wa=one(inside,n=>tag(n)==='button'&&txt(n).includes('Enviar solicitud a Ana por WhatsApp'),'botón de WhatsApp'),dismiss=one(inside,n=>tag(n)==='button'&&n.children.some(c=>ts.isJsxText(c)&&c.text.trim()==='Entendido'),'botón Entendido'),message=one(inside,n=>tag(n)==='p'&&txt(n).includes('La cita ha quedado guardada en la agenda.'),'mensaje de reserva');
 const edits=[],replace=(node,value)=>edits.push({start:node.getStart(ast),end:node.end,value});
 replace(title,'{/* '+marker+' */}'+txt(title.openingElement)+"{registeredAppointment.saturdayApproval?.status==='pending'?'Solicitud recibida':registeredAppointment.advancePayment?.status==='pending'?'Reserva pendiente de pago':'Cita confirmada'}"+txt(title.closingElement));
 replace(message,txt(message).replace('La cita ha quedado guardada en la agenda.','Tu cita ya está en la agenda. Puedes consultarla en Mis citas.'));
 replace(hint,"{currentScreen==='adminPanel'&&("+txt(hint)+') }');
 const view="{currentScreen!=='adminPanel'&&<button type=\"button\" onClick={()=>{setViewApptModal(registeredAppointment);setRegisteredAppointment(null);setCurrentScreen('myAppointmentsPage');}} style={{minHeight:44,padding:'12px 16px',background:'#C49A58',color:'#29231F',border:'1px solid #C49A58',borderRadius:7,fontWeight:600,cursor:'pointer'}}>Ver mi cita</button>}";
 replace(wa,view+"{currentScreen==='adminPanel'&&("+txt(wa)+')}');
 const dismissStyle=attr(dismiss,'style');if(!dismissStyle)throw Error('No se encuentra el estilo de Entendido. No se ha cambiado nada.');
 edits.push({start:dismissStyle.getStart(ast),end:dismissStyle.end,value:"style={{minHeight:44,padding:'12px 16px',background:'transparent',color:'#E4C687',border:'1px solid #947749',borderRadius:7,cursor:'pointer'}}"});
 let result=text;for(const e of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,e.start)+e.value+result.slice(e.end);
 if(ts.createSourceFile('App.tsx',result,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length)throw Error('No se pudo validar la nueva confirmación. No se ha cambiado nada.');
 const backup=path.join(root,'respaldo-confirmacion-'+Date.now());fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'App.tsx'),text);
 try{fs.writeFileSync(file,result);}catch(error){fs.writeFileSync(file,text);throw error;}
 console.log('Confirmación actualizada: sin botón WhatsApp en el portal; Ver mi cita y Entendido. Las solicitudes pendientes conservan su estado. Respaldo: '+path.basename(backup)+'. Ejecuta npm run build y pulsa Publish / Update. No requiere cambios en Supabase.');
}catch(error){console.error(error.message);process.exitCode=1;}
