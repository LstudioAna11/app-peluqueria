const HELPER="export type HighlightFamily='balayage'|'babylights'|'hybrid'|'traditional';\nconst normalize=(value:string)=>String(value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();\nexport function highlightFamily(value:string):HighlightFamily|null{\n const text=normalize(value);\n if(/hybrid/.test(text))return 'hybrid';\n if(/babylights?/.test(text))return 'babylights';\n if(/balayage/.test(text))return 'balayage';\n if(/\\bmechas?\\b/.test(text)&&/\\btradicional(?:es)?\\b/.test(text))return 'traditional';\n return null;\n}\nexport function highlightTechniqueLabel(value:string):string{\n const family=highlightFamily(value);\n return family==='traditional'?'Mechas tradicionales':family==='hybrid'?'Hybrid':family==='babylights'?'Babylights':family==='balayage'?'Balayage':'Mechas';\n}\n";
'use strict';
const fs=require('fs'),path=require('path'),marker='lst-traditional-soft-full-v1';
function transform(options,comparison,ts){
 if(options.includes(marker)&&comparison.includes(marker))return {options,comparison};
 if(options.includes(marker)||comparison.includes(marker))throw Error('La actualización está instalada parcialmente. Envía HighlightOptions.tsx y HighlightComparison.tsx actuales.');
 const once=(source,before,after,label)=>{if(source.split(before).length!==2)throw Error('Ha cambiado '+label+'. No se ha modificado nada. Envía los archivos actuales.');return source.replace(before,after);};
 options=once(options,"export const isHighlights=(service:Pick<SubService,'name'|'bookingName'>)=>/balayage|babylights?|hybrid/.test(fold(service.name+' '+(service.bookingName||'')));", "export const isHighlights=(service:Pick<SubService,'name'|'bookingName'>)=>highlightFamily(service.name+' '+(service.bookingName||''))!==null;",'el reconocimiento de técnicas');
 const oldLabel="const technique=/hybrid/.test(name)?'Hybrid':/babylight/.test(name)?'Babylights':'Balayage';";
 if(options.split(oldLabel).length!==3)throw Error('Debe estar instalado SOFT/FULL dentro de cada largo. Envía HighlightOptions.tsx actual.');
 options=options.split(oldLabel).join('const technique=highlightTechniqueLabel(name);');
 options="import {highlightFamily,highlightTechniqueLabel} from './highlightFamily'; // "+marker+'\n'+options;
 comparison=once(comparison,"const label=(service:SubService)=>/hybrid/i.test(service.name+' '+(service.bookingName||''))?'Hybrid':/babylight/i.test(service.name+' '+(service.bookingName||''))?'Babylights':'Balayage';", "const label=(service:SubService)=>highlightTechniqueLabel(service.name+' '+(service.bookingName||''));",'la etiqueta de las fotografías');
 comparison="import {highlightTechniqueLabel} from './highlightFamily'; // "+marker+'\n'+comparison;
 for(const [name,code] of [['HighlightOptions.tsx',options],['HighlightComparison.tsx',comparison]])if(ts.createSourceFile(name,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length)throw Error('No se pudo validar '+name+'. No se ha cambiado nada.');
 return {options,comparison};
}
module.exports={transform};
if(require.main===module){try{
 const root=process.cwd(),paths={options:'src/HighlightOptions.tsx',comparison:'src/HighlightComparison.tsx'},helper=path.join(root,'src/highlightFamily.ts');
 if(!fs.existsSync(path.join(root,'package.json'))||Object.values(paths).some(file=>!fs.existsSync(path.join(root,file))))throw Error('Ejecuta este archivo en Bolt junto a package.json. Deben estar instalados SOFT/FULL por largo y la comparativa de fotos.');
 const ts=require(require.resolve('typescript',{paths:[root]})),before=Object.fromEntries(Object.entries(paths).map(([key,file])=>[key,fs.readFileSync(path.join(root,file),'utf8')])),after=transform(before.options,before.comparison,ts);
 if(before.options===after.options&&before.comparison===after.comparison){console.log('Mechas tradicionales ya admite SOFT/FULL y fotos comparativas. Completa sus opciones y guarda el catálogo.');process.exit(0);}
 if(fs.existsSync(helper))throw Error('Ya existe highlightFamily.ts. No se ha sobrescrito. Envía ese archivo actual.');
 const backup=path.join(root,'respaldo-tradicionales-soft-full-'+Date.now());fs.mkdirSync(backup);for(const [key,file] of Object.entries(paths))fs.writeFileSync(path.join(backup,path.basename(file)),before[key]);
 try{fs.writeFileSync(helper,HELPER);for(const [key,file] of Object.entries(paths))fs.writeFileSync(path.join(root,file),after[key]);}catch(error){for(const [key,file] of Object.entries(paths))fs.writeFileSync(path.join(root,file),before[key]);if(fs.existsSync(helper))fs.unlinkSync(helper);throw error;}
 console.log('Mechas tradicionales añadidas a SOFT/FULL por largo, descripciones y fotos. En Catálogo → Mechas tradicionales → Opciones del servicio completa precio y tiempo de cada opción, aplica y guarda el catálogo. Las fotos son propias de esta técnica. Respaldo: '+path.basename(backup)+'. Ejecuta npm run build y Publish / Update. Solo Bolt; no requiere SQL ni modificar Supabase.');
}catch(error){console.error(error.message);process.exitCode=1;}}
