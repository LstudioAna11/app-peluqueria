// Ejecutar junto a package.json: node corregir-fecha-agenda.cjs
function patchInitialDate(original,ts){
 const source=ts.createSourceFile('App.tsx',original,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
 const all=(root,p)=>{const xs=[];function walk(n){if(p(n))xs.push(n);ts.forEachChild(n,walk);}walk(root);return xs;};
 const one=(xs,name)=>{if(xs.length!==1)throw Error('No se reconoce '+name+'. No se ha cambiado nada. Envíame src/App.tsx para adaptarlo.');return xs[0];};
 if(original.includes('bookingDateTouchedRef'))throw Error('La agenda ya tiene otra protección de fecha. No se ha cambiado nada. Envíame src/App.tsx.');
 const booking=one(all(source,n=>ts.isVariableDeclaration(n)&&ts.isArrayBindingPattern(n.name)&&n.name.elements.some(e=>e.name?.getText(source)==='bookingDate')),'la fecha inicial de reserva');
 const statement=booking.parent.parent;
 if(!ts.isVariableStatement(statement)||!booking.initializer?.getText(source).includes('date.setDate(date.getDate() + bizConfig.minAdvanceDays)'))throw Error('La fecha inicial tiene otra versión. No se ha cambiado nada.');
 edits.push({start:statement.getStart(source),end:statement.getStart(source),text:'const bookingDateTouchedRef=useRef(false);\n  '});
 const init=booking.initializer.getText(source).replace('date.getDate() + bizConfig.minAdvanceDays','date.getDate() + Math.max(0,Math.floor(Number(bizConfig.minAdvanceDays)||0))');edits.push({start:booking.initializer.getStart(source),end:booking.initializer.end,text:init});
 edits.push({start:statement.end,end:statement.end,text:`
  // The server configuration can arrive after useState has used the fallback settings.
  // Refresh automatic dates on entry too, but keep every date chosen by the client.
  useEffect(()=>{
    if(bookingDateTouchedRef.current)return;
    const date=new Date();date.setHours(12,0,0,0);
    date.setDate(date.getDate()+Math.max(0,Math.floor(Number(bizConfig.minAdvanceDays)||0)));
    if(bookingDate.getFullYear()!==date.getFullYear()||bookingDate.getMonth()!==date.getMonth()||bookingDate.getDate()!==date.getDate()){
      setBookingDate(date);setSelectedVisualTime('');
    }
  },[bizConfig.minAdvanceDays,currentScreen]);
`});
 const choose=one(all(source,n=>ts.isVariableDeclaration(n)&&n.name.getText(source)==='choosePortalDate'),'la selección manual de fecha');
 const body=choose.initializer?.body;if(!body||!ts.isBlock(body))throw Error('La selección de fecha tiene otro formato. No se ha cambiado nada.');edits.push({start:body.getStart(source)+1,end:body.getStart(source)+1,text:' bookingDateTouchedRef.current=true;'});
 const automatic='setRepeatPortalNotice(issue||\'\');setViewServiceDetail(null);';
 // Repeating a visit intentionally starts a new, automatic date selection.
 const repeated='date.setDate(date.getDate()+Math.max(0,Number(bizConfig.minAdvanceDays)||0));setBookingDate(date);';const pos=original.indexOf(repeated);
 if(pos>=0){if(original.indexOf(repeated,pos+1)>=0)throw Error('Hay varias fechas automáticas distintas. No se ha cambiado nada.');edits.push({start:pos,end:pos+repeated.length,text:'date.setDate(date.getDate()+Math.max(0,Math.floor(Number(bizConfig.minAdvanceDays)||0)));bookingDateTouchedRef.current=false;setBookingDate(date);'});}
 for(const edit of edits.sort((a,b)=>b.start-a.start))original=original.slice(0,edit.start)+edit.text+original.slice(edit.end);
 const output=original+'\n// lst-booking-initial-date-sync-v1\n';if(ts.createSourceFile('App.tsx',output,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length)throw Error('La comprobación del código no ha pasado. No se ha cambiado nada.');return output;
};


const fs=require('fs'),path=require('path');
try{
 if(!fs.existsSync('package.json'))throw Error('Sube corregir-fecha-agenda.cjs junto a package.json, fuera de src.');
 const file='src/App.tsx',original=fs.readFileSync(file,'utf8');
 if(original.includes('// lst-booking-initial-date-sync-v1')){console.log('Sincronización de fecha ya instalada. Ejecuta npm run build y Publish / Update.');process.exit(0);}
 const output=patchInitialDate(original,require('typescript')),backup='respaldo-fecha-agenda-'+Date.now();fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'App.tsx'),original);
 try{fs.writeFileSync(file,output);}catch(error){fs.writeFileSync(file,original);throw error;}
 console.log('Fecha inicial sincronizada con la antelación guardada. Se conserva la fecha elegida por la clienta. No se cambia la configuración de reservas. Respaldo: '+backup+'. Ejecuta npm run build y Publish / Update. No requiere cambios en Supabase.');
}catch(error){console.error(error.code==='MODULE_NOT_FOUND'?'Ejecuta npm install y repite el instalador. No se ha cambiado nada.':error.message);process.exitCode=1;}
