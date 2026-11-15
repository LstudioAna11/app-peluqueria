'use strict';
const fs=require('fs'),path=require('path');
try{
 const root=process.cwd(),target=path.join(root,'src/AdminPanelView.tsx'),marker='lst-clients-compact-rows-v1';
 if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(target))throw Error('Ejecuta este archivo junto a package.json, fuera de src.');
 const text=fs.readFileSync(target,'utf8');if(text.includes(marker)){console.log('El listado de clientas ya está compacto.');process.exit(0);}
 let ts;try{ts=require(require.resolve('typescript',{paths:[root]}));}catch{throw Error('Ejecuta npm install y vuelve a intentarlo.');}
 const ast=ts.createSourceFile('AdminPanelView.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);if(ast.parseDiagnostics.length)throw Error('El archivo tiene errores de sintaxis previos. No se ha cambiado nada.');
 function nodes(parent,test){const all=[];function walk(n){if(test(n))all.push(n);ts.forEachChild(n,walk);}walk(parent);return all;}
 const one=(items,test,label)=>{const found=items.filter(test);if(found.length!==1)throw Error('La estructura de '+label+' ha cambiado. No se ha modificado nada. Envía AdminPanelView.tsx actual.');return found[0];};
 const txt=n=>n.getText(ast),tag=n=>ts.isJsxElement(n)?n.openingElement.tagName.getText(ast):'',parts=n=>n.children.filter(c=>!ts.isJsxText(c)||c.text.trim());
 const article=one(nodes(ast,ts.isJsxElement),n=>tag(n)==='article'&&n.openingElement.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.getText(ast)==='key'&&a.initializer?.getText(ast)==='{c.idNum}')&&txt(n).includes('client-details-'),'fila de clienta');
 const children=parts(article),header=one(children,n=>tag(n)==='div'&&txt(n).includes('Ver ficha'),'cabecera de clienta'),detail=one(children,n=>ts.isJsxExpression(n)&&txt(n).startsWith('{expandedClientId === c.idNum &&'),'ficha desplegable');
 const headerParts=parts(header);if(headerParts.length!==4)throw Error('Hay datos adicionales en la cabecera. No se ha modificado nada.');
 const nameBox=one(headerParts,n=>tag(n)==='div'&&txt(n).includes('{c.nombre} {c.apellidos}')&&txt(n).includes('Sin teléfono'),'nombre'),visits=one(headerParts,n=>tag(n)==='div'&&txt(n).includes('Última visita:')&&txt(n).includes('Próxima cita:'),'resumen de visitas'),status=one(headerParts,n=>tag(n)==='span'&&txt(n).includes('c.archivedAt'),'estado'),actions=one(headerParts,n=>tag(n)==='div'&&txt(n).includes('onStartClientAppointment'),'acciones');
 const actionParts=parts(actions),newAppointment=one(actionParts,n=>ts.isJsxExpression(n)&&txt(n).includes('onStartClientAppointment'),'nueva cita'),view=one(actionParts,n=>tag(n)==='button'&&txt(n).includes('setExpandedClientId'),'ver ficha');if(actionParts.length!==2)throw Error('Hay acciones adicionales en la fila. No se ha cambiado nada.');
 const body=one(nodes(detail,ts.isJsxElement),n=>tag(n)==='div'&&n.openingElement.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.getText(ast)==='id'&&a.initializer?.getText(ast).includes('client-details-')),'contenido de ficha');
 if(!txt(body).includes('<strong>Teléfono:</strong>'))throw Error('No se encuentra el teléfono dentro de la ficha. No se ha cambiado nada.');
 const compactStyle="style={{minHeight:44,padding:'6px 10px',fontSize:12,color:'#E4C687',whiteSpace:'nowrap'}}";
 const oldStyle=view.openingElement.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(ast)==='style');
 const viewOpen=oldStyle?txt(view.openingElement).replace(txt(oldStyle),compactStyle):txt(view.openingElement).slice(0,-1)+' '+compactStyle+'>';
 const viewButton=viewOpen+view.children.map(txt).join('')+txt(view.closingElement);
 const compact="<div className=\""+marker+"\" style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto auto',alignItems:'center',gap:8,padding:'4px 10px'}}>"+
 "<strong title={c.nombre+' '+c.apellidos} style={{fontSize:14,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.nombre} {c.apellidos}</strong>"+
 "<span style={{fontSize:12,whiteSpace:'nowrap',color:c.archivedAt?'#F5C7B8':'#BDE1B8'}}>{c.archivedAt?'De baja':'Activa'}</span>"+viewButton+'</div>';
 const quick="<div style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:10,paddingBottom:10,borderBottom:'1px solid #655039'}}>"+txt(visits)+txt(newAppointment)+'</div>';
 const edits=[{start:header.getStart(ast),end:header.end,value:compact},{start:body.openingElement.end,end:body.openingElement.end,value:quick}];let updated=text;for(const e of edits.sort((a,b)=>b.start-a.start))updated=updated.slice(0,e.start)+e.value+updated.slice(e.end);
 if(ts.createSourceFile('AdminPanelView.tsx',updated,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length)throw Error('No se pudo validar el nuevo listado. No se ha cambiado nada.');
 const backup=path.join(root,'respaldo-clientas-compactas-'+Date.now());fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'AdminPanelView.tsx'),text);
 try{fs.writeFileSync(target,updated);}catch(error){fs.writeFileSync(target,text);throw error;}
 console.log('Listado compacto instalado: nombre, estado y Ver ficha. Visitas, teléfono y Nueva cita dentro de la ficha. Respaldo: '+path.basename(backup)+'. Ejecuta npm run build y pulsa Publish / Update. No requiere cambios en Supabase.');
}catch(error){console.error(error.message);process.exitCode=1;}
