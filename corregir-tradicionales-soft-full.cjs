const SETUP="export function setupDraft(service:SubService):Cell[]|null{\n if(!isHighlights(service))return null;\n const traditional=isTraditionalHighlights(service);\n const variants=traditional?(service.variants||[]).filter(v=>! /\\b(?:corto|corta|short)\\b/.test(fold(v.name))):(service.variants||[]);\n const source={...service,variants};\n if(matrixReady(source))return lengths.flatMap(length=>intensities.map(intensity=>{\n  const base=variants.find(v=>{const a=variantAxes(v);return a?.length===length&&a.intensity===intensity;})!;\n  return {length,intensity,id:base.id,price:base.price,minutes:String(parseInt(base.duration.match(/\\d+/)?.[0]||'',10)||''),base};\n }));\n if(variants.length!==3)return null;\n const originals=lengths.map(length=>variants.filter(v=>{\n  const a=variantAxes(v);\n  return a?a.length===length&&!a.intensity:traditional&&length==='Extralargo'&&/\\bextra\\b/.test(fold(v.name))&&!/\\b(?:soft|full)\\b/.test(fold(v.name));\n }));\n if(originals.some(items=>items.length!==1))return null;\n return lengths.flatMap((length,i)=>intensities.map(intensity=>{\n  const base=originals[i][0];\n  return {length,intensity,id:intensity==='FULL'?base.id:'hf-'+crypto.randomUUID(),price:intensity==='FULL'?base.price:'',minutes:intensity==='FULL'?base.duration.match(/\\d+/)?.[0]||'':'',base};\n }));\n}\n";
'use strict';
const fs=require('fs'),path=require('path'),marker='lst-traditional-three-lengths-v2';
function transform(source,comparison,ts){
 if(source.includes(marker))return {source,comparison};
 const parse=(name,text)=>{const t=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);if(t.parseDiagnostics.length)throw Error(name+' contiene errores de sintaxis. No se ha cambiado nada.');return t;};
 const tree=parse('HighlightOptions.tsx',source);
 if(!source.includes('lst-highlights-by-length'))throw Error('Debe estar instalado el selector por largos. Envía HighlightOptions.tsx actual.');
 const functions={},variables={};function walk(n){if(ts.isFunctionDeclaration(n)&&n.name)functions[n.name.text]=n;if(ts.isVariableDeclaration(n)){const name=n.name.getText(tree);(variables[name]??=[]).push(n);}ts.forEachChild(n,walk);}walk(tree);
 if(!functions.setupDraft||!functions.Editor||!functions.HighlightOptions||variables.isHighlights?.length!==1||variables.technique?.length!==2)throw Error('La estructura del selector ha cambiado. No se ha modificado nada. Envía HighlightOptions.tsx actual.');
 const isHighlights=variables.isHighlights[0];if(!isHighlights.initializer||!ts.isArrowFunction(isHighlights.initializer)||ts.isBlock(isHighlights.initializer.body))throw Error('No se reconoce el filtro de técnicas.');
 const edits=[{start:functions.setupDraft.getStart(tree),end:functions.setupDraft.end,value:SETUP.trim()}];
 const body=isHighlights.initializer.body;edits.push({start:body.getStart(tree),end:body.end,value:'('+body.getText(tree)+') || isTraditionalHighlights(service)'});
 for(const variable of variables.technique){if(!variable.initializer)throw Error('No se reconoce el nombre de técnica.');edits.push({start:variable.initializer.getStart(tree),end:variable.initializer.end,value:"isTraditionalHighlights(service) ? 'Mechas tradicionales' : ("+variable.initializer.getText(tree)+')'});}
 const helper="\nfunction isTraditionalHighlights(service:Pick<SubService,'name'|'bookingName'>):boolean { const name=fold(service.name+' '+(service.bookingName||'')); return /\\bmechas?\\b/.test(name)&&/\\btradicional(?:es)?\\b/.test(name); }\n";
 if(functions.isTraditionalHighlights)throw Error('Ya existe otra adaptación de Mechas tradicionales. Envía el archivo actual.');
 edits.push({start:functions.variantAxes.getStart(tree),end:functions.variantAxes.getStart(tree),value:helper});
 let editorDetails;function findDetails(n){if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(tree)==='details'&&n.openingElement.attributes.properties.some(a=>a.name?.getText(tree)==='className'&&a.initializer?.getText(tree)==='"lst-highlights-editor"'))editorDetails=n;ts.forEachChild(n,findDetails);}findDetails(functions.Editor);
 if(!editorDetails)throw Error('No se encuentra el editor de opciones.');
 if(!editorDetails.openingElement.attributes.properties.some(a=>a.name?.getText(tree)==='open'))edits.push({start:editorDetails.openingElement.end-1,end:editorDetails.openingElement.end-1,value:' open={isTraditionalHighlights(service)}'});
 edits.push({start:editorDetails.openingElement.end,end:editorDetails.openingElement.end,value:"\n  {isTraditionalHighlights(service)&&service.variants?.some(v=>/\\b(?:corto|corta|short)\\b/.test(fold(v.name)))&&<p>Corto quedará fuera de Mechas tradicionales al aplicar estas opciones. Puedes mantenerlo por separado en Parciales · Corto. Revisa precios y completa los tiempos de SOFT y FULL antes de aplicar y guardar.</p>}\n"});
 for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.value+source.slice(edit.end);
 source='// '+marker+'\n'+source;parse('HighlightOptions.tsx',source);
 if(comparison){const t=parse('HighlightComparison.tsx',comparison);let label;function getLabel(n){if(ts.isVariableDeclaration(n)&&n.name.getText(t)==='label')label=n;ts.forEachChild(n,getLabel);}getLabel(t);
  if(!label?.initializer||!ts.isArrowFunction(label.initializer)||ts.isBlock(label.initializer.body))throw Error('No se reconoce la etiqueta de la comparativa. Envía HighlightComparison.tsx.');
  const b=label.initializer.body,condition="/\\bmechas?\\b/i.test(service.name+' '+(service.bookingName||''))&&/\\btradicional(?:es)?\\b/i.test(service.name+' '+(service.bookingName||''))";
  comparison=comparison.slice(0,b.getStart(t))+condition+" ? 'Mechas tradicionales' : ("+b.getText(t)+')'+comparison.slice(b.end);parse('HighlightComparison.tsx',comparison);
 }
 return {source,comparison};
}
module.exports={transform};
if(require.main===module){try{
 const root=process.cwd(),target=path.join(root,'src/HighlightOptions.tsx'),comparisonPath=path.join(root,'src/HighlightComparison.tsx');
 if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(target))throw Error('Ejecuta este archivo en Bolt junto a package.json, con SOFT/FULL por largos instalado.');
 const ts=require(require.resolve('typescript',{paths:[root]})),source=fs.readFileSync(target,'utf8'),comparison=fs.existsSync(comparisonPath)?fs.readFileSync(comparisonPath,'utf8'):null,updated=transform(source,comparison,ts);
 if(updated.source===source){console.log('La adaptación de Mechas tradicionales ya está instalada. Recarga la intranet, completa sus seis opciones, pulsa Aplicar y Guardar catálogo.');process.exit(0);}
 const backup=path.join(root,'respaldo-tradicionales-tres-largos-'+Date.now());fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'HighlightOptions.tsx'),source);if(comparison)fs.writeFileSync(path.join(backup,'HighlightComparison.tsx'),comparison);
 try{fs.writeFileSync(target,updated.source);if(updated.comparison)fs.writeFileSync(comparisonPath,updated.comparison);}catch(error){fs.writeFileSync(target,source);if(comparison)fs.writeFileSync(comparisonPath,comparison);throw error;}
 console.log('Adaptado como Balayage: tres largos y SOFT/FULL dentro. Se admite la configuración anterior con Corto; al Aplicar se preparan solo Medio, Largo y Extralargo. No se ha modificado todavía el catálogo del servidor. Recarga intranet → Catálogo → Mechas tradicionales → Opciones del servicio, completa precios y tiempos → Aplicar → Guardar catálogo. Respaldo: '+path.basename(backup)+'. Ejecuta npm run build y Publish / Update. Solo Bolt; sin cambios en Supabase.');
}catch(error){console.error(error.message);process.exitCode=1;}}
