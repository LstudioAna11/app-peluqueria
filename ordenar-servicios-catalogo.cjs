const COMPONENT="type Placement='before'|'after';\ntype Category={id:string;subservices:{id:string}[]};\n// Move by stable IDs in the complete array. Filters never remove hidden services.\nexport function moveCatalogService<T extends Category>(catalog:T[],categoryId:string,serviceId:string,targetId:string,placement:Placement):T[]{\n if(serviceId===targetId)return catalog;\n const category=catalog.find(item=>item.id===categoryId);if(!category)return catalog;\n const from=category.subservices.findIndex(item=>item.id===serviceId),target=category.subservices.findIndex(item=>item.id===targetId);\n if(from<0||target<0)return catalog;\n const rows=[...category.subservices],moved=rows.splice(from,1)[0],destination=rows.findIndex(item=>item.id===targetId)+(placement==='after'?1:0);\n rows.splice(destination,0,moved);\n if(rows.every((item,index)=>item===category.subservices[index]))return catalog;\n return catalog.map(item=>item.id===categoryId?{...item,subservices:rows} as T:item);\n}\nexport default function CatalogServiceOrder({serviceId,name,visibleIds,disabled=false,onMove}:{serviceId:string;name:string;visibleIds:string[];disabled?:boolean;onMove:(targetId:string,placement:Placement)=>void}){\n const index=visibleIds.indexOf(serviceId);\n const style={minWidth:44,minHeight:44,padding:'5px 9px',background:'#322A25',border:'1px solid #806340',borderRadius:7,color:'#E4C687',fontSize:19,cursor:'pointer'};\n return <div className=\"lst-service-order-v1\" role=\"group\" aria-label={'Orden de '+name} style={{display:'flex',gap:6,alignItems:'center'}}>\n  <span style={{fontSize:11,color:'#D6CBB8'}}>Orden</span>\n  <button type=\"button\" aria-label={'Subir '+name} title=\"Subir servicio\" disabled={disabled||index<=0} onClick={()=>{if(index>0)onMove(visibleIds[index-1],'before');}} style={style}>↑</button>\n  <button type=\"button\" aria-label={'Bajar '+name} title=\"Bajar servicio\" disabled={disabled||index<0||index>=visibleIds.length-1} onClick={()=>{if(index>=0&&index<visibleIds.length-1)onMove(visibleIds[index+1],'after');}} style={style}>↓</button>\n </div>;\n}\n";
'use strict';
const fs=require('fs'),path=require('path'),marker='lst-service-order-controls-v1';
function patchFiles(app,admin,ts){
 if(app.includes(marker)&&admin.includes(marker))return {app,admin};
 if(app.includes(marker)||admin.includes(marker))throw Error('El cambio está instalado parcialmente. Envía App.tsx y AdminPanelView.tsx actuales.');
 const parse=(name,text)=>{const tree=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);if(tree.parseDiagnostics.length)throw Error(name+' tiene errores de sintaxis. No se ha cambiado nada.');return tree;};
 const one=(tree,predicate,label)=>{const nodes=[];function walk(n){if(predicate(n))nodes.push(n);ts.forEachChild(n,walk);}walk(tree);if(nodes.length!==1)throw Error('Ha cambiado '+label+'. No se ha modificado nada. Envía los dos archivos actuales.');return nodes[0];};
 let tree=parse('AdminPanelView.tsx',admin);
 const heading=one(tree,n=>ts.isJsxElement(n)&&n.openingElement.attributes.properties.some(a=>a.name?.getText(tree)==='className'&&a.initializer?.getText(tree)==='"studio-catalog-service-heading"'),'la cabecera del servicio');
 let loop=heading.parent;while(loop&&!(ts.isCallExpression(loop)&&ts.isPropertyAccessExpression(loop.expression)&&loop.expression.name.text==='map'&&loop.arguments[0]&&ts.isArrowFunction(loop.arguments[0])&&loop.arguments[0].parameters[0]?.name.getText(tree)==='sub'))loop=loop.parent;
 if(!loop||!loop.expression.expression.getText(tree).startsWith('cat.subservices.filter('))throw Error('No se reconoce el filtro de servicios. No se ha modificado nada.');
 const visible=loop.expression.expression.getText(tree)+'.map(service=>service.id)';
 const controls=`<CatalogServiceOrder serviceId={sub.id} name={bookingName(sub)} visibleIds={${visible}} disabled={photoUploadBusy} onMove={(targetId,placement)=>setCatalog(previous=>moveCatalogService(previous,cat.id,sub.id,targetId,placement))}/>`;
 const insertion=heading.closingElement.getStart(tree);admin=admin.slice(0,insertion)+controls+'\n'+admin.slice(insertion);
 admin="import CatalogServiceOrder,{moveCatalogService} from './CatalogServiceOrder'; // "+marker+'\n'+admin;
 tree=parse('App.tsx',app);
 const save=one(tree,n=>ts.isVariableDeclaration(n)&&n.name.getText(tree)==='handleSaveCatalogMaster','el guardado de catálogo');
 let guard;function getGuard(n){if(ts.isIfStatement(n)&&n.expression.getText(tree)==='!stored'&&n.thenStatement.getText(tree).includes('categoría no encontrada'))guard=n;ts.forEachChild(n,getGuard);}getGuard(save);
 if(!guard)throw Error('No se reconoce la verificación del catálogo. No se ha modificado nada.');
 const check="\n        if(!catalogValuesMatch((stored.subservices||[]).map(item=>item.id),category.subservices.map(item=>item.id)))differences.push(category.title+': orden de servicios');";
 app=app.slice(0,guard.end)+check+app.slice(guard.end);app='// '+marker+'\n'+app;
 parse('App.tsx',app);parse('AdminPanelView.tsx',admin);
 return {app,admin};
}
module.exports={patchFiles};
if(require.main===module){try{
 const root=process.cwd(),paths={app:'src/App.tsx',admin:'src/AdminPanelView.tsx'},modulePath=path.join(root,'src/CatalogServiceOrder.tsx');
 if(!fs.existsSync(path.join(root,'package.json'))||Object.values(paths).some(file=>!fs.existsSync(path.join(root,file))))throw Error('Ejecuta este archivo en Bolt junto a package.json.');
 const ts=require(require.resolve('typescript',{paths:[root]})),before=Object.fromEntries(Object.entries(paths).map(([key,file])=>[key,fs.readFileSync(path.join(root,file),'utf8')])),after=patchFiles(before.app,before.admin,ts);
 if(before.app===after.app&&before.admin===after.admin){console.log('Las flechas de orden de servicios ya están instaladas.');process.exit(0);}
 if(fs.existsSync(modulePath))throw Error('Ya existe CatalogServiceOrder.tsx. No se ha sobrescrito. Envía el archivo actual.');
 if(ts.createSourceFile('CatalogServiceOrder.tsx',COMPONENT,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length)throw Error('No se pudo validar el control de orden. No se ha cambiado nada.');
 const backup=path.join(root,'respaldo-orden-servicios-'+Date.now());fs.mkdirSync(backup);for(const [key,file] of Object.entries(paths))fs.writeFileSync(path.join(backup,path.basename(file)),before[key]);
 try{fs.writeFileSync(modulePath,COMPONENT);for(const [key,file] of Object.entries(paths))fs.writeFileSync(path.join(root,file),after[key]);}catch(error){for(const [key,file] of Object.entries(paths))fs.writeFileSync(path.join(root,file),before[key]);if(fs.existsSync(modulePath))fs.unlinkSync(modulePath);throw error;}
 console.log('Instaladas flechas ↑ y ↓ en cada servicio para moverlo dentro de su categoría. Después de ordenar pulsa Guardar catálogo; se comprueba el orden leído del servidor. Respaldo: '+path.basename(backup)+'. Ejecuta npm run build y Publish / Update. Solo Bolt; sin cambios en Supabase.');
}catch(error){console.error(error.message);process.exitCode=1;}}
