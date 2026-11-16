const HELPER="const groups:Record<string,string>={\n color:'color',colores:'color',coloracion:'color',coloraciones:'color',tinte:'color',tintes:'color',tenir:'color',colour:'color',coloring:'color',colouring:'color',\n mecha:'mechas',mechas:'mechas',balayage:'mechas',babylight:'mechas',babylights:'mechas',highlights:'mechas',\n corte:'corte',cortes:'corte',cortar:'corte',cut:'corte',haircut:'corte',\n peinado:'peinado',peinados:'peinado',styling:'peinado',stylo:'peinado',secado:'peinado',secados:'peinado',\n tratamiento:'tratamiento',tratamientos:'tratamiento',terapia:'tratamiento',terapias:'tratamiento',therapy:'tratamiento',treatment:'tratamiento',treatments:'tratamiento',\n hombre:'hombre',hombres:'hombre',masculino:'hombre',masculinos:'hombre',men:'hombre',\n nino:'infantil',ninos:'infantil',nina:'infantil',ninas:'infantil',infantil:'infantil',infantiles:'infantil',kids:'infantil',children:'infantil',\n};\nconst ignored=new Set(['a','al','de','del','el','la','los','las','un','una','unos','unas','y','o','para','con','mi','quiero','busco','necesito','cabello','pelo']);\nfunction words(value:string):string[]{\n return String(value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()\n  .replace(/[^\\p{L}\\p{N}]+/gu,' ').replace(/\\bhead\\s+spa\\b/g,'headspa').trim().split(/\\s+/).filter(Boolean)\n  .map(word=>groups[word]||word).filter(word=>!ignored.has(word));\n}\n// Only identity fields are searchable. Descriptions, slogans and conditions do\n// not turn a diagnosis, haircut or treatment into a colour service.\nexport function matchCatalogService(query:string,categories:string[],names:string[],variants:string[]):boolean{\n const wanted=words(query);if(!wanted.length)return !query.trim();\n const categoryWords=words(categories.join(' ')),nameWords=words(names.join(' '));\n const identity=[...categoryWords,...nameWords];\n // Highlights are their own service family, even inside a general colour category.\n const highlights=nameWords.includes('mechas')||(categoryWords.includes('mechas')&&!nameWords.includes('color'));\n if(wanted.includes('color')&&!wanted.includes('mechas')&&highlights)return false;\n const available=new Set([...identity,...words(variants.join(' '))]);\n return wanted.every(word=>available.has(word)||(word.length>=3&&[...available].some(value=>value.startsWith(word))));\n}\n";
'use strict';
const fs=require('fs'),path=require('path'),marker='lst-catalog-search-identity-v1';
function transform(source,ts){
 if(source.includes(marker))return source;
 const tree=ts.createSourceFile('App.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 if(tree.parseDiagnostics.length)throw Error('App.tsx tiene errores de sintaxis previos. No se ha cambiado nada.');
 const matches=[],shortcuts=[];function walk(n){
  if(ts.isVariableDeclaration(n)&&n.name.getText(tree)==='portalServiceMatches')matches.push(n);
  if(ts.isJsxExpression(n)&&n.expression&&ts.isBinaryExpression(n.expression)&&n.expression.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken&&ts.isJsxElement(n.expression.right)&&n.expression.right.openingElement.tagName.getText(tree)==='div'&&n.expression.right.children.some(child=>ts.isJsxExpression(child)&&child.getText(tree).includes('.map(word =>')&&child.getText(tree).includes('setPortalSearch(word)')))shortcuts.push(n);
  ts.forEachChild(n,walk);
 }walk(tree);
 if(matches.length!==1||shortcuts.length!==1)throw Error('La estructura del buscador ha cambiado. No se ha modificado nada. Envía App.tsx actual.');
 const filter=`portalServiceMatches = (category: CatalogCategory, service: SubService) => {
    if (service.active === false) return false;
    if (!portalSearchQuery) return true;
    return matchCatalogService(portalSearch,
      [categoryText(category), category.title],
      [bookingName(service), serviceText(service, 'name'), service.name],
      (service.variants || []).map(variant => variantText(variant, service)));
  }`;
 const edits=[{start:matches[0].getStart(tree),end:matches[0].end,text:filter},{start:shortcuts[0].getStart(tree),end:shortcuts[0].end,text:''}];
 let updated=source;for(const e of edits.sort((a,b)=>b.start-a.start))updated=updated.slice(0,e.start)+e.text+updated.slice(e.end);
 updated=updated.replace('Busca un servicio o una duda','¿Qué servicio estás buscando?').replace("?'Servicios y dudas':", "?'Buscar servicios':");
 // Remove the former broad synonym matcher if its only remaining use is the import.
 if((updated.match(/\bmatchesSearchQuery\b/g)||[]).length===1){
  const imports=ts.createSourceFile('App.tsx',updated,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const decl=imports.statements.find(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='./portalSearchHelp');
  if(decl?.importClause?.namedBindings&&ts.isNamedImports(decl.importClause.namedBindings)){
   const names=decl.importClause.namedBindings.elements.filter(n=>n.name.text!=='matchesSearchQuery').map(n=>n.getText(imports));
   updated=updated.slice(0,decl.getStart(imports))+(names.length?"import {"+names.join(',')+"} from './portalSearchHelp';":'')+updated.slice(decl.end);
  }
 }
 updated="import {matchCatalogService} from './catalogServiceSearch'; // "+marker+'\n'+updated;
 if(ts.createSourceFile('App.tsx',updated,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length)throw Error('No se pudo validar el cambio. No se ha modificado nada.');
 return updated;
}
module.exports={transform};
if(require.main===module){try{
 const root=process.cwd(),target=path.join(root,'src/App.tsx'),helper=path.join(root,'src/catalogServiceSearch.ts');
 if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(target))throw Error('Ejecuta este archivo en Bolt junto a package.json.');
 const ts=require(require.resolve('typescript',{paths:[root]})),original=fs.readFileSync(target,'utf8'),updated=transform(original,ts);
 if(updated===original){console.log('El buscador sin botones ya está instalado.');process.exit(0);}
 if(fs.existsSync(helper))throw Error('Ya existe catalogServiceSearch.ts. No se ha sobrescrito. Envía los archivos actuales.');
 const backup=path.join(root,'respaldo-buscador-catalogo-'+Date.now());fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'App.tsx'),original);
 try{fs.writeFileSync(helper,HELPER);fs.writeFileSync(target,updated);}catch(error){fs.writeFileSync(target,original);if(fs.existsSync(helper))fs.unlinkSync(helper);throw error;}
 console.log('Quitados los botones. El buscador usa nombre, categoría y variantes; Color separa Mechas y no busca en descripciones. Respaldo: '+path.basename(backup)+'. Ejecuta npm run build y Publish / Update. Solo Bolt; no requiere Supabase.');
}catch(error){console.error(error.message);process.exitCode=1;}}
