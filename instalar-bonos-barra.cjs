// Colocar junto a package.json. Ejecutar: node instalar-bonos-barra.cjs
function patchBonos(original,ts){
 const parse=s=>ts.createSourceFile('App.tsx',s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const tag=(n,s)=>ts.isJsxElement(n)?n.openingElement.tagName.getText(s):ts.isJsxSelfClosingElement(n)?n.tagName.getText(s):'';
 const attributes=n=>ts.isJsxElement(n)?n.openingElement.attributes.properties:ts.isJsxSelfClosingElement(n)?n.attributes.properties:[];
 const attr=(n,name,s)=>attributes(n).find(a=>ts.isJsxAttribute(a)&&a.name.getText(s)===name);
 const value=(n,name,s)=>{const a=attr(n,name,s);return a?.initializer&&ts.isStringLiteral(a.initializer)?a.initializer.text:'';};
 const all=(root,pred)=>{const out=[];const walk=n=>{if(pred(n))out.push(n);ts.forEachChild(n,walk);};walk(root);return out;};
 const one=(nodes,label)=>{if(nodes.length!==1)throw Error('No se reconoce '+label+'. No se ha cambiado nada. Envíame src/App.tsx para adaptarlo.');return nodes[0];};
 const apply=(s,edits)=>{for(const e of edits.sort((a,b)=>b.start-a.start||b.end-a.end))s=s.slice(0,e.start)+e.text+s.slice(e.end);return s;};
 // Undo only the previous home layout, preserving current content and callbacks.
 let s=original,source=parse(s),compact=all(source,n=>tag(n,source)==='PortalHomeCompact');
 if(compact.length){
  const root=one(compact,'el inicio compacto'),edits=[];
  edits.push({start:root.openingElement.tagName.getStart(source),end:root.openingElement.tagName.end,text:'div'},{start:root.closingElement.tagName.getStart(source),end:root.closingElement.tagName.end,text:'div'});
  for(const name of ['welcomeText','infoLabel','hoursLabel','hideInnerLogout','onLogout']){const a=attr(root,name,source);if(!a)throw Error('El inicio compacto es diferente. No se ha cambiado nada.');edits.push({start:a.getStart(source),end:a.end,text:''});}
  for(const child of root.children){
   if(tag(child,source)==='div'&&attr(child,'data-home-slot',source)){
    if(attributes(child).length!==1)throw Error('Hay una personalización del inicio que debe conservarse. No se ha cambiado nada.');
    edits.push({start:child.openingElement.getStart(source),end:child.openingElement.end,text:''},{start:child.closingElement.getStart(source),end:child.closingElement.end,text:''});
   }
  }
  for(const node of all(root,n=>!!attr(n,'data-home-decorative',source))){const a=attr(node,'data-home-decorative',source);edits.push({start:a.getStart(source),end:a.end,text:''});}
  for(const node of all(root,n=>tag(n,source)==='NpsFeedbackForm')){const a=attr(node,'summaryLabel',source);if(a?.getText(source).includes('portalHomeText'))edits.push({start:a.getStart(source),end:a.end,text:''});}
  const imports=all(source,n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='./PortalHomeCompact');for(const node of imports)edits.push({start:node.getStart(source),end:node.end,text:''});
  s=apply(s,edits).replace('// lst-portal-home-compact-v1','');source=parse(s);
 }
 const edits=[];
 const nav=one(all(source,n=>tag(n,source)==='nav'&&value(n,'className',source).split(/\s+/).includes('lst-bottom-nav')),'la barra inferior');
 const home=one(all(source,n=>tag(n,source)==='VoucherHub'),'la tarjeta de bonos del inicio');
 // Require that the voucher entry really belongs to the client home.
 let parent=home.parent;while(parent&&!(ts.isJsxExpression(parent)&&parent.getText(source).startsWith("{currentScreen === 'clientPortal'")))parent=parent.parent;
 if(!parent)throw Error('La tarjeta de bonos tiene otra ubicación. No se ha cambiado nada.');
 const raw=home.getText(source).replace(/^<VoucherHub\b/,'<VoucherPanel');
 edits.push({start:home.getStart(source),end:home.end,text:''});
 const profile=one(all(nav,n=>tag(n,source)==='button'&&n.getText(source).includes("setCurrentScreen('clientHistoryPage')")),'el botón de Perfil');
 edits.push({start:profile.getStart(source),end:profile.getStart(source),text:`<button type="button" className={currentScreen === 'clientVouchersPage' ? 'lst-bottom-active' : ''} aria-current={currentScreen === 'clientVouchersPage' ? 'page' : undefined} onClick={() => { setViewServiceDetail(null); setCurrentScreen('clientVouchersPage'); window.scrollTo({top:0,behavior:'smooth'}); }}>
 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8H7.5A2.5 2.5 0 1 1 10 5.5L12 8Zm0 0h4.5A2.5 2.5 0 1 0 14 5.5L12 8Z"/></svg><span>Bonos</span>
 </button>\n`});
 const classAttr=attr(nav,'className',source);edits.push({start:classAttr.initializer.getStart(source),end:classAttr.initializer.end,text:'"lst-bottom-nav lst-with-bonos"'});
 const state=one(all(source,n=>ts.isVariableDeclaration(n)&&ts.isArrayBindingPattern(n.name)&&n.name.elements.some(e=>e.name?.getText(source)==='currentScreen')),'el estado de navegación');
 const call=state.initializer;if(!ts.isCallExpression(call)||call.typeArguments?.length!==1||!ts.isUnionTypeNode(call.typeArguments[0]))throw Error('La navegación tiene otra estructura. No se ha cambiado nada.');
 const admin=one(all(source,n=>tag(n,source)==='LazyAdminPanelView'),'la entrada de administración');
 const adminScreen=attr(admin,'setCurrentScreen',source);
 if(adminScreen?.initializer?.getText(source)!=='{setCurrentScreen}')throw Error('La navegación de administración tiene otra estructura. No se ha cambiado nada.');
 edits.push({start:adminScreen.initializer.getStart(source),end:adminScreen.initializer.end,text:"{next => setCurrentScreen(previous => typeof next === 'function' ? next(previous === 'clientVouchersPage' ? 'clientPortal' : previous) : next)}"});
 const union=call.typeArguments[0];if(union.getText(source).includes('clientVouchersPage'))throw Error('Ya hay otra pantalla de bonos. No se ha cambiado nada.');
 edits.push({start:union.end,end:union.end,text:" | 'clientVouchersPage'"});
 edits.push({start:parent.getStart(source),end:parent.getStart(source),text:`{currentScreen === 'clientVouchersPage' && <section className="lst-bonos-page" aria-label="Tarjetas regalo y bonos">${raw}</section>}\n`});
 s=apply(s,edits);
 if(parse(s).parseDiagnostics.length)throw Error('La comprobación del código no ha pasado. No se ha cambiado nada.');
 return "import './portal-bonos-nav.css';\n"+s+'\n// lst-bonos-bottom-nav-v1\n';
};


const fs=require('fs'),path=require('path'),css=".lst-bottom-nav.lst-with-bonos { padding-left: 4px; padding-right: 4px; box-sizing: border-box; }\n.lst-bottom-nav.lst-with-bonos > button { min-width: 44px; min-height: 44px; }\n.lst-bonos-page { width: 100%; max-width: 520px; box-sizing: border-box; }\n.lst-bonos-page > .lst-bonos { padding: 16px; box-sizing: border-box; }\n";
try{
 if(!fs.existsSync('package.json'))throw Error('Sube instalar-bonos-barra.cjs junto a package.json, fuera de src.');
 const file='src/App.tsx',extra='src/portal-bonos-nav.css';
 const original=fs.readFileSync(file,'utf8');
 if(original.includes('// lst-bonos-bottom-nav-v1')){
  if(!fs.existsSync(extra)||fs.readFileSync(extra,'utf8')!==css)throw Error('La instalación existente tiene cambios. Envíame src/App.tsx y portal-bonos-nav.css para conservarlos.');
  console.log('Bonos ya está en la barra inferior. Ejecuta npm run build y Publish / Update.');process.exit(0);
 }
 if(fs.existsSync(extra)&&fs.readFileSync(extra,'utf8')!==css)throw Error('Ya existe otra versión de portal-bonos-nav.css. No se ha cambiado nada.');
 const text=patchBonos(original,require('typescript'));
 const backup='respaldo-bonos-barra-'+Date.now();fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'App.tsx'),original);
 if(fs.existsSync(extra))fs.copyFileSync(extra,path.join(backup,'portal-bonos-nav.css'));
 try{fs.writeFileSync(extra,css);fs.writeFileSync(file,text);}catch(error){fs.writeFileSync(file,original);if(fs.existsSync(path.join(backup,'portal-bonos-nav.css')))fs.copyFileSync(path.join(backup,'portal-bonos-nav.css'),extra);else if(fs.existsSync(extra))fs.unlinkSync(extra);throw error;}
 console.log('Bonos añadido a la barra inferior. Tarjeta retirada del inicio. Diseño anterior conservado/restaurado. Servicios y Promos sin cambios. Respaldo: '+backup+'. Ejecuta npm run build y Publish / Update. No requiere cambios en Supabase.');
}catch(error){console.error(error.code==='MODULE_NOT_FOUND'?'Ejecuta npm install y vuelve a lanzar el instalador. No se ha cambiado nada.':error.message);process.exitCode=1;}
