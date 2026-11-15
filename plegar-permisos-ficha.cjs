'use strict';
const fs=require('fs'),path=require('path');
try{
 const root=process.cwd(),target=path.join(root,'src/ClientPermissions.tsx'),marker='lst-permissions-fold-v1';
 if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(target))throw Error('Ejecuta este archivo junto a package.json, fuera de src.');
 const text=fs.readFileSync(target,'utf8');if(text.includes(marker)){console.log('Los permisos de la ficha ya están plegados por defecto.');process.exit(0);}
 let ts;try{ts=require(require.resolve('typescript',{paths:[root]}));}catch{throw Error('Ejecuta npm install y vuelve a intentarlo.');}
 const ast=ts.createSourceFile('ClientPermissions.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);if(ast.parseDiagnostics.length)throw Error('El archivo contiene errores de sintaxis previos. No se ha cambiado nada.');
 const one=(items,test,label)=>{const result=items.filter(test);if(result.length!==1)throw Error('La estructura de '+label+' es diferente. No se ha cambiado nada. Envía ClientPermissions.tsx actual.');return result[0];};
 function nodes(n,test){const out=[];function walk(x){if(test(x))out.push(x);ts.forEachChild(x,walk);}walk(n);return out;}
 const functions=ast.statements.filter(ts.isFunctionDeclaration);if(functions.some(n=>n.name?.text==='PermissionStatusFold'))throw Error('Ya existe otro plegado de permisos. No se ha cambiado nada.');
 const entry=one(functions,n=>n.name?.text==='ClientPermissionStatus','entrada de ficha'),inner=one(functions,n=>n.name?.text==='PermissionStatusInner','contenido de permisos');
 const mount=one(nodes(entry,ts.isJsxSelfClosingElement),n=>n.tagName.getText(ast)==='PermissionStatusInner','componente de estado');
 const section=one(nodes(inner,ts.isJsxElement),n=>n.openingElement.tagName.getText(ast)==='section'&&n.openingElement.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.getText(ast)==='aria-label'&&a.initializer?.getText(ast)==='"Permisos de la clienta"'),'panel de permisos');
 const heading=one(section.children,n=>ts.isJsxElement(n)&&n.openingElement.tagName.getText(ast)==='strong'&&n.getText(ast).includes('Privacidad'),'título del panel');
 const style=one(section.openingElement.attributes.properties,n=>ts.isJsxAttribute(n)&&n.name.getText(ast)==='style','estilo del panel');
 const fold="\nfunction PermissionStatusFold({clientId}:{clientId:string}){\n const [expanded,setExpanded]=useState(false);\n return <details open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)} style={{border:'1px solid #806340',borderRadius:10,marginBottom:16,color:'#FFF8EE'}}><summary style={{display:'list-item',padding:'12px 14px',minHeight:46,boxSizing:'border-box',cursor:'pointer',color:'#E4C687',fontSize:14,lineHeight:1.6}}><strong>Privacidad y autorizaciones</strong></summary>{expanded&&<PermissionStatusInner key={clientId} clientId={clientId}/>}</details>;\n}\n";
 const edits=[{start:mount.tagName.getStart(ast),end:mount.tagName.end,value:'PermissionStatusFold'},{start:entry.end,end:entry.end,value:fold},{start:heading.getStart(ast),end:heading.end,value:''},{start:style.getStart(ast),end:style.end,value:"style={{padding:'0 14px 14px',display:'grid',gap:10}}"}];
 let updated=text;for(const e of edits.sort((a,b)=>b.start-a.start))updated=updated.slice(0,e.start)+e.value+updated.slice(e.end);updated='// '+marker+'\n'+updated;
 if(ts.createSourceFile('ClientPermissions.tsx',updated,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length)throw Error('No se pudo validar el cambio. No se ha modificado nada.');
 const backup=path.join(root,'respaldo-permisos-plegables-'+Date.now());fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'ClientPermissions.tsx'),text);
 try{fs.writeFileSync(target,updated);}catch(error){fs.writeFileSync(target,text);throw error;}
 console.log('Ficha actualizada: Privacidad y autorizaciones plegado por defecto. Se consulta al abrir. Respaldo: '+path.basename(backup)+'. Ejecuta npm run build y pulsa Publish / Update. No requiere cambios en Supabase.');
}catch(error){console.error(error.message);process.exitCode=1;}
