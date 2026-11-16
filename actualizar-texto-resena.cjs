'use strict';
const fs=require('fs'),path=require('path');
const edits=[
 ['Lo que dicen de L’Studio','Comparte tu experiencia'],
 ['Tu experiencia puede ayudar a alguien a descubrir el Studio.','¿Qué servicio te has realizado en L’Studio? Cuéntanos cómo fue la experiencia, qué te pareció el resultado y la atención recibida.'],
 ['Escribir mi reseña en Google','Escribir mi reseña'],
];
function transform(source){
 let result=source;
 for(const [before,after] of edits){
  if(!result.includes(before)&&result.includes(after))continue;
  if(result.split(before).length!==2)throw Error('El texto de StudioReviewsCard.tsx es distinto. No se ha modificado nada. Envía ese archivo actual.');
  result=result.replace(before,after);
 }
 return result;
}
module.exports={transform};
if(require.main===module){try{
 const root=process.cwd(),target=path.join(root,'src/StudioReviewsCard.tsx');
 if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(target))throw Error('Ejecuta este archivo en Bolt junto a package.json.');
 const original=fs.readFileSync(target,'utf8'),updated=transform(original);
 if(updated===original){console.log('Los textos de la tarjeta ya están actualizados.');process.exit(0);}
 const ts=require(require.resolve('typescript',{paths:[root]}));
 if(ts.createSourceFile('StudioReviewsCard.tsx',updated,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length)throw Error('No se pudo validar el archivo. No se ha modificado nada.');
 const backup=path.join(root,'respaldo-texto-resena-'+Date.now());fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'StudioReviewsCard.tsx'),original);
 try{fs.writeFileSync(target,updated);}catch(error){fs.writeFileSync(target,original);throw error;}
 console.log('Actualizado: Comparte tu experiencia y Escribir mi reseña. El enlace sigue abriendo Google y la opinión privada se conserva. Respaldo: '+path.basename(backup)+'. Ejecuta npm run build y Publish / Update. Solo Bolt.');
}catch(error){console.error(error.message);process.exitCode=1;}}
