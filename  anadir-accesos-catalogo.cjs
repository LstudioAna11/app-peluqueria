'use strict';
const fs=require('fs'),path=require('path');
const originalList="['Corte', 'Color', 'Mechas', 'Peinado']";
const expandedList="['Corte', 'Color', 'Mechas', 'Peinado', 'Head Spa', 'Tratamientos', 'Hombre', 'Niños']";
function transform(source){
 if(source.includes(expandedList+'.map(word =>'))return source;
 const anchor=originalList+'.map(word =>';
 if(source.split(anchor).length!==2)throw Error('No se encuentra la fila esperada de accesos. No se ha modificado nada. Envía tu App.tsx actual.');
 return source.replace(anchor,expandedList+'.map(word =>');
}
module.exports={transform};
if(require.main===module){try{
 const root=process.cwd(),target=path.join(root,'src/App.tsx');
 if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(target))throw Error('Ejecuta este archivo en Bolt junto a package.json.');
 const original=fs.readFileSync(target,'utf8'),updated=transform(original);
 if(updated===original){console.log('Los ocho accesos del catálogo ya están instalados.');process.exit(0);}
 const ts=require(require.resolve('typescript',{paths:[root]}));
 if(ts.createSourceFile('App.tsx',updated,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length)throw Error('No se pudo validar App.tsx. No se ha cambiado nada.');
 const backup=path.join(root,'respaldo-accesos-catalogo-'+Date.now());fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'App.tsx'),original);
 try{fs.writeFileSync(target,updated);}catch(error){fs.writeFileSync(target,original);throw error;}
 console.log('Añadidos Head Spa, Tratamientos, Hombre y Niños a los accesos del buscador. Se conserva su funcionamiento y estilo. Respaldo: '+path.basename(backup)+'. Ejecuta npm run build y Publish / Update. Solo Bolt; no requiere cambios en Supabase.');
}catch(error){console.error(error.message);process.exitCode=1;}}
