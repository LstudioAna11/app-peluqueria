// Ejecutar junto a package.json: node corregir-movimiento-cita.cjs
function patchMovePayload(original,ts){
 const source=ts.createSourceFile('App.tsx',original,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
 const all=(root,p)=>{const xs=[];function walk(n){if(p(n))xs.push(n);ts.forEachChild(n,walk);}walk(root);return xs;};
 const one=(xs,label)=>{if(xs.length!==1)throw Error('No se reconoce '+label+'. No se ha cambiado nada. Envíame src/App.tsx para adaptarlo.');return xs[0];};
 const helper=one(all(source,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='persistVerifiedAppointmentMove'),'la función de cambio verificado');
 const call=one(all(helper,n=>ts.isCallExpression(n)&&n.expression.getText(source)==='studioApi.updateAppointmentOnServer'),'la petición de cambio');const payload=call.arguments[1];
 if(!ts.isObjectLiteralExpression(payload))throw Error('El guardado de citas tiene otra versión. No se ha cambiado nada.');
 const day=one(payload.properties.filter(p=>p.name?.getText(source)==='dayName'),'el dato del día');
 const next=payload.properties[payload.properties.indexOf(day)+1];
 if(!next)throw Error('El formato de la petición ha cambiado. No se ha cambiado nada.');
 edits.push({start:day.getStart(source),end:next.getStart(source),text:''});
 const map=one(all(source,n=>ts.isVariableDeclaration(n)&&n.name.getText(source)==='mapServerAppointment'),'la lectura de citas');
 const weekday=one(all(map,n=>ts.isPropertyAssignment(n)&&n.name.getText(source)==='dayName'),'el nombre del día');
 if(weekday.initializer.getText(source)!=="snap.dayName || ''")throw Error('El nombre del día ya se calcula de otra manera. No se ha cambiado nada. Envíame src/App.tsx.');
 edits.push({start:weekday.initializer.getStart(source),end:weekday.initializer.end,text:"Number.isFinite(Date.parse(iso.slice(0,10)+'T12:00:00Z'))?new Date(iso.slice(0,10)+'T12:00:00Z').toLocaleDateString('es-ES',{weekday:'long',timeZone:'UTC'}):(snap.dayName||'')"});
 for(const edit of edits.sort((a,b)=>b.start-a.start))original=original.slice(0,edit.start)+edit.text+original.slice(edit.end);
 const output=original+'\n// lst-move-payload-weekday-v1\n';if(ts.createSourceFile('App.tsx',output,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length)throw Error('La comprobación del código no ha pasado. No se ha cambiado nada.');return output;
};


const fs=require('fs'),path=require('path');
try{
 if(!fs.existsSync('package.json'))throw Error('Sube corregir-movimiento-cita.cjs junto a package.json, fuera de src.');
 const file='src/App.tsx',original=fs.readFileSync(file,'utf8');if(original.includes('// lst-move-payload-weekday-v1')){console.log('Petición de cambio corregida. Ejecuta npm run build y Publish / Update.');process.exit(0);}
 const output=patchMovePayload(original,require('typescript')),backup='respaldo-movimiento-cita-'+Date.now();fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'App.tsx'),original);
 try{fs.writeFileSync(file,output);}catch(error){fs.writeFileSync(file,original);throw error;}
 console.log('Retirado el campo dayName de la petición de movimiento. El día se calcula desde la fecha confirmada. Se conservan permisos y comprobación de guardado. Respaldo: '+backup+'. Ejecuta npm run build y Publish / Update. No requiere SQL ni cambiar email-dispatch.');
}catch(error){console.error(error.code==='MODULE_NOT_FOUND'?'Ejecuta npm install y repite el instalador. No se ha cambiado nada.':error.message);process.exitCode=1;}
