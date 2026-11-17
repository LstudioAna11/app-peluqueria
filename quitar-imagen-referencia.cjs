'use strict';
const fs=require('fs'),path=require('path');
const MARKER='lst-hide-two-consultation-reference-lines-v1';
function patch(source){
 if(source.includes(MARKER))return source;
 const pattern=/\{detailSub\.imageCredit\s*&&\s*(?=<p\b)/g;
 if([...source.matchAll(pattern)].length!==1)throw Error('La pantalla ha cambiado. No se ha modificado nada. Envíame el archivo src/App.tsx actual para adaptarlo.');
 const condition="{detailSub.imageCredit && !(/(?:test.*viabilidad|viabilidad.*resistencia|estudio.*visagismo)/.test(String(detailSub.name||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()) && /^imagen de referencia\\b/i.test(detailSub.imageCredit.trim())) && ";
 return '// '+MARKER+'\n'+source.replace(pattern,()=>condition);
}
module.exports={patch};
if(require.main===module){try{
 const file=path.resolve('src/App.tsx');
 if(!fs.existsSync('package.json')||!fs.existsSync(file))throw Error('Sube este instalador junto a package.json, fuera de src, y ejecútalo en esa carpeta de Bolt.');
 const before=fs.readFileSync(file,'utf8'),after=patch(before);
 if(after===before){console.log('El cambio ya está instalado. Publica con Publish / Update para verlo en la app.');process.exit(0);}
 const ts=require(require.resolve('typescript',{paths:[process.cwd()]}));
 for(const source of [before,after])if(ts.createSourceFile('App.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length)throw Error('No se ha podido validar App.tsx. No se ha cambiado nada. Envíame el archivo actual.');
 const backup=path.resolve('respaldo-referencias-'+Date.now());fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'App.tsx'),before);
 try{fs.writeFileSync(file,after);}catch(error){fs.writeFileSync(file,before);throw error;}
 console.log('Ocultadas las líneas Imagen de referencia y sus enlaces en Test de Viabilidad y Estudio de Visagismo. Fotos, descripciones y catálogo conservados. Copia: '+path.basename(backup)+'. Ejecuta npm run build y después Publish / Update. Solo Bolt; no pegar en Supabase.');
}catch(error){console.error(error.message);process.exitCode=1;}}
