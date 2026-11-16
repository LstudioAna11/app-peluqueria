'use strict';
const fs=require('fs'),path=require('path'),marker='lst-opinion-experiencia-v1';
function transform(app,card,css,ts){
 if(app.includes(marker)&&card.includes(marker)&&css.includes(marker))return {app,card,css};
 if([app,card,css].some(text=>text.includes(marker)))throw Error('El cambio está instalado parcialmente. Envía App.tsx, StudioReviewsCard.tsx y studio-reviews-card.css actuales.');
 const once=(source,from,to,label)=>{if(source.split(from).length!==2)throw Error('La estructura de '+label+' ha cambiado. No se ha modificado nada. Envía los archivos actuales.');return source.replace(from,to);};
 const parse=(name,text)=>{const tree=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);if(tree.parseDiagnostics.length)throw Error(name+' contiene errores de sintaxis. No se ha cambiado nada.');return tree;};
 const tree=parse('App.tsx',app);let form;function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='NpsFeedbackForm'){if(form)throw Error('Formulario duplicado.');form=n;}ts.forEachChild(n,walk);}walk(tree);if(!form)throw Error('No se encuentra NpsFeedbackForm en App.tsx. Envía ese archivo actual.');
 let text=form.getText(tree);
 text=once(text,'Tu experiencia en L’Studio Ana','Tu experiencia en L’Studio','el título');
 const privacyLine="      <p style={{fontSize:11,color:'#C9B79D',margin:0}}>{'OPINIÓN PRIVADA · L’STUDIO ANA'}</p>";
 text=once(text,privacyLine,'','el encabezado repetido');
 text=once(text,'Tu valoración de {score}/10 está registrada. Ana podrá leerla para seguir cuidando tu experiencia.','Tu valoración de {score}/10 está registrada. El equipo de L’Studio podrá leerla para seguir cuidando tu experiencia.','la confirmación');
 text=once(text,'Del 0 al 10, ¿qué probabilidad hay de que recomiendes L’Studio Ana a una amiga, un amigo o un familiar?','Del 0 al 10, ¿nos recomendarías?','la pregunta de recomendación');
 text=once(text,"style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(44px,1fr))',gap:6}}", "className=\"sr-score-grid\" style={{display:'grid',gap:6}}",'la escala');
 text=once(text,'¿Cuál es el motivo principal de tu puntuación?','Cuéntanos tu experiencia','la pregunta del comentario');
 text=once(text,'Comentario opcional · Lo recibe el Studio de forma privada.','Comentario opcional.','la aclaración duplicada');
 text=once(text,'Tu opinión nos ayuda a cuidar cada detalle…','Me he realizado… Mi experiencia ha sido…','el ejemplo del comentario');
 text=once(text,":'Enviar a Ana'", ":'Enviar mi opinión'",'el botón de envío');
 app=app.slice(0,form.getStart(tree))+text+app.slice(form.end);
 app='// '+marker+'\n'+app;
 card=once(card,'Hablar con Ana en privado','Compartir mi opinión en privado','el acceso al formulario');
 card=once(card,'Tu opinión para Ana','Cuéntanos tu experiencia en L’Studio','el título del diálogo');
 card=once(card,'<p className="sr-note">Solo la recibe el Studio. No se publica en Google.</p>{children}', '<p className="sr-note">¿Qué servicio te has realizado y cómo te has sentido? Nos encantará saber qué te ha parecido el resultado y la atención recibida.</p>{children}<p className="sr-note">Tu opinión es privada y solo la recibe el equipo de L’Studio.</p>','la explicación del diálogo');
 card='// '+marker+'\n'+card;
 css+='\n/* '+marker+' */\n.sr-dialog .sr-score-grid { grid-template-columns:repeat(11,minmax(0,1fr)); }\n.sr-dialog .sr-score-grid button { min-width:0; }\n.sr-dialog #studio-nps-survey > div { padding-top:0!important; }\n@media(max-width:520px) { .sr-dialog .sr-score-grid { grid-template-columns:repeat(6,minmax(0,1fr)); } }\n';
 parse('App.tsx',app);parse('StudioReviewsCard.tsx',card);
 return {app,card,css};
}
module.exports={transform};
if(require.main===module){try{
 const root=process.cwd(),files={app:'src/App.tsx',card:'src/StudioReviewsCard.tsx',css:'src/studio-reviews-card.css'};
 if(!fs.existsSync(path.join(root,'package.json'))||Object.values(files).some(file=>!fs.existsSync(path.join(root,file))))throw Error('Ejecuta el archivo junto a package.json. Deben existir App.tsx, StudioReviewsCard.tsx y studio-reviews-card.css dentro de src.');
 const before=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,fs.readFileSync(path.join(root,file),'utf8')]));
 const ts=require(require.resolve('typescript',{paths:[root]})),updated=transform(before.app,before.card,before.css,ts);
 if(Object.keys(files).every(key=>before[key]===updated[key])){console.log('El formulario de opinión de L’Studio ya está actualizado.');process.exit(0);}
 const backup=path.join(root,'respaldo-opinion-studio-'+Date.now());fs.mkdirSync(backup);for(const [key,file] of Object.entries(files))fs.writeFileSync(path.join(backup,path.basename(file)),before[key]);
 try{for(const [key,file] of Object.entries(files))fs.writeFileSync(path.join(root,file),updated[key]);}catch(error){for(const [key,file] of Object.entries(files))fs.writeFileSync(path.join(root,file),before[key]);throw error;}
 console.log('Actualizado: Cuéntanos tu experiencia en L’Studio, ejemplo de servicio y experiencia, privacidad una sola vez y escala compacta 0–10. Respaldo: '+path.basename(backup)+'. Ejecuta npm run build y Publish / Update. Solo Bolt; no requiere Supabase.');
}catch(error){console.error(error.message);process.exitCode=1;}}
