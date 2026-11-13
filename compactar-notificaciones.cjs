'use strict';
const fs=require('fs'),path=require('path');
try{
 const root=process.cwd(),appPath=path.join(root,'src/App.tsx'),helpPath=path.join(root,'src/PushSetupHelp.tsx'),marker='lst-push-compact-v2';
 if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(appPath)||!fs.existsSync(helpPath))throw Error('Ejecuta el instalador junto a package.json. Debe estar instalada la ayuda PushSetupHelp.tsx.');
 const app=fs.readFileSync(appPath,'utf8'),help=fs.readFileSync(helpPath,'utf8');if(app.includes(marker)){if(!help.includes(marker))throw Error('Instalación parcial. No se ha cambiado nada.');console.log('Las notificaciones compactas ya están instaladas.');process.exit(0);}
 let ts;try{ts=require(require.resolve('typescript',{paths:[root]}));}catch{throw Error('Ejecuta npm install y vuelve a intentarlo.');}
 const parse=(name,source)=>{const a=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);if(a.parseDiagnostics.length)throw Error(name+' contiene errores de sintaxis. No se ha cambiado nada.');return a;},ast=parse('App.tsx',app),hast=parse('PushSetupHelp.tsx',help);
 const one=(list,test,label)=>{const matches=list.filter(test);if(matches.length!==1)throw Error('La estructura de '+label+' ha cambiado. No se ha modificado nada. Envía App.tsx y PushSetupHelp.tsx actuales.');return matches[0];};
 function nodes(a,test){const out=[];function walk(n){if(test(n))out.push(n);ts.forEachChild(n,walk);}walk(a);return out;}
 const allDecl=nodes(ast,ts.isVariableDeclaration),panel=one(allDecl,n=>n.name.getText(ast)==='renderClientPushPanel','panel push'),handler=one(allDecl,n=>n.name.getText(ast)==='handleEnablePush','activación');
 const expr=one(nodes(panel,ts.isJsxExpression),n=>n.getText(ast).includes('onClick={handleEnablePush}'),'botón principal');let updatedButton=expr.getText(ast);
 const condition="(pushStatus === 'default' || pushStatus === 'subscribed')",oldLabel="pushStatus === 'subscribed' ? 'Enviar notificación de prueba' : 'Activar notificaciones'";
 if(!updatedButton.includes(condition)||!updatedButton.includes(oldLabel))throw Error('El botón principal tiene otra estructura. No se ha cambiado nada.');
 updatedButton=updatedButton.replace(condition,"(pushStatus === 'default' || pushStatus === 'subscribed' || pushStatus === 'denied')").replace(oldLabel,"pushStatus === 'subscribed' ? 'Enviar notificación de prueba' : pushStatus === 'denied' ? 'Comprobar permisos' : 'Activar notificaciones'");
 const denied=one(nodes(panel,ts.isJsxExpression),n=>n.getText(ast).startsWith("{pushStatus === 'denied' && <p"),'aviso de bloqueo');
 const deniedNew="{pushStatus === 'denied' && <p style={{color:'#F2B8AC',fontSize:12,lineHeight:1.6,margin:'10px 0 0'}}>Permite los avisos en los ajustes de tu móvil o navegador. Después pulsa «Comprobar permisos».</p>}";
 const edits=[{start:expr.getStart(ast),end:expr.end,text:updatedButton},{start:denied.getStart(ast),end:denied.end,text:deniedNew}];
 const permission=one(nodes(handler,ts.isVariableDeclaration),n=>n.name.getText(ast)==='permission','lectura de permiso');const statement=permission.parent.parent;
 edits.push({start:statement.getStart(ast),end:statement.getStart(ast),text:"// "+marker+"\n      if(Notification.permission==='denied'){setPushStatus('denied');setPushError('El permiso sigue bloqueado. Abre la ayuda y sigue los pasos de tu dispositivo.');return;}\n      "});
 let appNew=app;for(const e of edits.sort((a,b)=>b.start-a.start))appNew=appNew.slice(0,e.start)+e.text+appNew.slice(e.end);
 const oldStatus='Permiso bloqueado · Actívalas en los ajustes del navegador';if(!appNew.includes(oldStatus))throw Error('La etiqueta de permiso tiene otro formato. No se ha cambiado nada.');appNew=appNew.replace(oldStatus,'Permiso bloqueado en este dispositivo');
 const helpRoot=one(nodes(hast,ts.isJsxElement),n=>n.openingElement.tagName.getText(hast)==='section'&&n.getText(hast).includes('Cómo activar las notificaciones'),'ayuda');
 const children=helpRoot.children.filter(n=>!ts.isJsxText(n)||n.text.trim());const heading=one(children,n=>ts.isJsxElement(n)&&n.openingElement.tagName.getText(hast)==='h4','título de ayuda');
 const inner=children.filter(n=>n!==heading).map(n=>n.getText(hast)).join('\n');
 const helpUI='<details aria-label="Ayuda para activar los avisos" style={{marginTop:8}}><summary style={{minHeight:44,boxSizing:\'border-box\',padding:\'10px 0\',cursor:\'pointer\',color:\'#D8C29A\',fontSize:12,lineHeight:1.6}}>Ayuda para activar los avisos</summary><div style={{paddingTop:4}}>'+inner+'</div></details>';
 const helpNew='// '+marker+'\n'+help.slice(0,helpRoot.getStart(hast))+helpUI+help.slice(helpRoot.end);parse('App.tsx',appNew);parse('PushSetupHelp.tsx',helpNew);
 const backup=path.join(root,'respaldo-notificaciones-compactas-'+Date.now());fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'App.tsx'),app);fs.writeFileSync(path.join(backup,'PushSetupHelp.tsx'),help);
 try{fs.writeFileSync(appPath,appNew);fs.writeFileSync(helpPath,helpNew);}catch(error){fs.writeFileSync(appPath,app);fs.writeFileSync(helpPath,help);throw error;}
 console.log('Notificaciones compactas instaladas: ayuda plegada y botón de activar, probar o comprobar permisos. Respaldo: '+path.basename(backup)+'. Ejecuta npm run build y pulsa Publish / Update. No requiere cambios en Supabase.');
}catch(error){console.error(error.message);process.exitCode=1;}
