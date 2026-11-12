// Ejecutar junto a package.json: node instalar-promos-novedades.cjs
function patchPromos(app,features,ts){
 const parse=(text,name)=>ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const all=(root,f)=>{const out=[];function walk(n){if(f(n))out.push(n);ts.forEachChild(n,walk);}walk(root);return out;};
 const one=(xs,name)=>{if(xs.length!==1)throw Error('No se reconoce '+name+'. No se ha cambiado nada. Envíame src/App.tsx y src/PortalFeatures.tsx para adaptarlo.');return xs[0];};
 const tag=(n,s)=>ts.isJsxElement(n)?n.openingElement.tagName.getText(s):ts.isJsxSelfClosingElement(n)?n.tagName.getText(s):'';
 const attrs=n=>ts.isJsxElement(n)?n.openingElement.attributes.properties:ts.isJsxSelfClosingElement(n)?n.attributes.properties:[];
 const attr=(n,name,s)=>attrs(n).find(a=>ts.isJsxAttribute(a)&&a.name.getText(s)===name);
 const string=(n,name,s)=>attr(n,name,s)?.initializer?.text||'';
 const apply=(text,edits)=>{for(const e of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,e.start)+e.text+text.slice(e.end);return text;};
 let source=parse(app,'App.tsx');const edits=[];
 const nav=one(all(source,n=>tag(n,source)==='nav'&&string(n,'className',source).split(/\s+/).includes('lst-bottom-nav')),'la barra inferior');
 const promo=one(all(nav,n=>tag(n,source)==='PromotionsPortalButton'),'el acceso de Promos');
 const news=one(all(source,n=>tag(n,source)==='StudioNews'),'las novedades del portal');
 if(!ts.isJsxSelfClosingElement(promo)||!ts.isJsxSelfClosingElement(news))throw Error('Los accesos tienen una estructura distinta. No se ha cambiado nada.');
 let parent=news.parent;while(parent&&!(ts.isJsxExpression(parent)&&/currentScreen\s*===\s*['"]clientPortal['"]/.test(parent.getText(source).slice(0,80))))parent=parent.parent;
 if(!parent)throw Error('No se reconoce el inicio del portal. No se ha cambiado nada.');
 const voucher=one(all(nav,n=>tag(n,source)==='button'&&n.getText(source).includes("setCurrentScreen('clientVouchersPage')")),'el botón de bonos y tarjetas');
 const label=one(all(voucher,n=>ts.isJsxElement(n)&&tag(n,source)==='span'&&['Bonos','Bonos y tarjetas'].includes(n.children.map(c=>c.getText(source)).join(''))),'la etiqueta de bonos');
 edits.push({start:label.getStart(source),end:label.end,text:'<span className="lst-voucher-label">Bonos y tarjetas</span>'});
 edits.push({start:promo.getStart(source),end:promo.end,text:''});
 edits.push({start:news.tagName.getStart(source),end:news.tagName.end,text:'StudioPortalNews'});
 const transfers=[['promotions','promotions'],['onReserve','onReserve'],['serviceOptions','promotionServiceOptions']].map(([from,to])=>{const a=attr(promo,from,source);if(!a?.initializer)throw Error('Falta la configuración de promociones. No se ha cambiado nada.');return to+'='+a.initializer.getText(source);}).join(' ');
 edits.push({start:news.end-2,end:news.end-2,text:' '+transfers+' '});
 app="import StudioPortalNews from './StudioPortalNews';\n"+apply(app,edits)+'\n// lst-promos-in-news-v1\n';
 source=parse(features,'PortalFeatures.tsx');const fe=[];
 const form=one(all(source,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='StudioNews'),'el componente de novedades');const param=form.parameters[0];
 if(!ts.isObjectBindingPattern(param?.name)||!param.type||!ts.isTypeLiteralNode(param.type)||param.getText(source).includes('promotionCards'))throw Error('Novedades tiene otra versión. No se ha cambiado nada.');
 fe.push({start:param.name.end-1,end:param.name.end-1,text:',promotionCards'},{start:param.type.end-1,end:param.type.end-1,text:';promotionCards?:React.ReactNode'});
 const guard="if(!admin&&view==='latest'&&!error&&(!list||list.items.length===0))return null;";
 const pos=features.indexOf(guard,form.getStart(source));if(pos<0||pos>form.end)throw Error('Novedades tiene otra lógica de visibilidad. No se ha cambiado nada.');
 fe.push({start:pos,end:pos+guard.length,text:"if(!admin&&view==='latest'&&!error&&!promotionCards&&(!list||list.items.length===0))return null;"});
 const header=one(all(form,n=>tag(n,source)==='header'&&string(n,'className',source)==='lst-news-header'),'la cabecera de novedades');
 const title=one(all(header,n=>tag(n,source)==='h2'&&n.children?.some(c=>ts.isJsxText(c)&&c.getText(source)==='El universo L’Studio')),'el título de novedades');
 fe.push({start:title.children.pos,end:title.children.end,text:"{admin?'El universo L’Studio':'Novedades del Studio'}"});
 fe.push({start:header.end,end:header.end,text:"\n    {!admin&&view!=='detail'&&promotionCards}\n"});
 features=apply(features,fe)+'\n// lst-news-promotion-slot-v1\n';
 for(const [text,name] of [[app,'App.tsx'],[features,'PortalFeatures.tsx']])if(parse(text,name).parseDiagnostics.length)throw Error('La comprobación del código no ha pasado. No se ha cambiado nada.');
 return {app,features};
};

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


const fs=require('fs'),path=require('path'),files={"StudioPortalNews.tsx": "import React,{useEffect,useRef,useState} from 'react';\nimport {ArrowRight,X,Tag} from 'lucide-react';\nimport {StudioNews} from './DeferredFeatures';\nimport {isVisiblePromotion,madridToday,promotionServiceIds,safePromotionImage,type Promotion} from './promotions';\nimport './studio-promo-news.css';\ntype Option={id:string;label:string};\ntype Props={promotions?:Promotion[];serviceOptions?:Option[];promotionServiceOptions?:Option[];onService?:(id:string,action:'service'|'booking')=>void;onReserve?:(promotion:Promotion)=>boolean};\nconst dateLabel=(date:string)=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(date+'T12:00:00Z'));\nexport default function StudioPortalNews({promotions=[],serviceOptions=[],promotionServiceOptions=serviceOptions,onService,onReserve}:Props){\n const [today,setToday]=useState(madridToday),[selectedId,setSelectedId]=useState<string|null>(null);\n const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement|null>(null);\n useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')setToday(madridToday());};const timer=window.setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);};},[]);\n const visible=promotions.filter(p=>isVisiblePromotion(p,today));\n const selected=visible.find(p=>p.id===selectedId);\n useEffect(()=>{const el=dialog.current;if(selected){if(el&&!el.open)el.showModal();}else if(selectedId){el?.close();setSelectedId(null);}},[selectedId,selected]);\n const close=()=>{dialog.current?.close();setSelectedId(null);trigger.current?.focus();};\n const reserve=()=>{const current=promotions.find(p=>p.id===selectedId);if(!current||!isVisiblePromotion(current,madridToday())){setToday(madridToday());close();return;}if(onReserve?.(current))close();};\n const cards=visible.length?<div className=\"spn-list\" aria-label=\"Promociones vigentes\">{visible.map(p=><article className=\"spn-card\" key={p.id}>\n  {safePromotionImage(p.imageUrl)&&<img src={safePromotionImage(p.imageUrl)} alt=\"\" loading=\"lazy\" decoding=\"async\"/>}\n  <div className=\"spn-body\"><small className=\"spn-kind\"><Tag size={13} aria-hidden=\"true\"/> Promoción</small><h3>{p.title}</h3>{p.price&&<strong className=\"spn-benefit\">{p.price}</strong>}{p.endDate&&<p className=\"spn-until\">Disponible hasta el {dateLabel(p.endDate)}</p>}\n  <button type=\"button\" aria-haspopup=\"dialog\" aria-label={'Ver promoción: '+p.title} onClick={event=>{if(!isVisiblePromotion(p,madridToday())){setToday(madridToday());return;}trigger.current=event.currentTarget;setSelectedId(p.id);}}>Ver promoción <ArrowRight size={15} aria-hidden=\"true\"/></button></div>\n </article>)}</div>:null;\n return <><StudioNews serviceOptions={serviceOptions} onService={onService} promotionCards={cards}/>\n {selected&&<dialog ref={dialog} className=\"spn-dialog\" aria-labelledby=\"spn-title\" onClose={()=>{setSelectedId(null);trigger.current?.focus();}}><header><span className=\"spn-kind\">Promoción del Studio</span><button type=\"button\" aria-label=\"Cerrar promoción\" onClick={close}><X size={21} aria-hidden=\"true\"/></button></header>{safePromotionImage(selected.imageUrl)&&<img src={safePromotionImage(selected.imageUrl)} alt=\"\"/>}<h2 id=\"spn-title\">{selected.title}</h2>{selected.description&&<p>{selected.description}</p>}{selected.price&&<strong className=\"spn-benefit\">{selected.price}</strong>}{selected.endDate&&<p className=\"spn-until\">Disponible hasta el {dateLabel(selected.endDate)}</p>}{promotionServiceIds(selected).length>0&&<><h3>Servicios incluidos</h3><ul>{promotionServiceIds(selected).map(id=><li key={id}>{promotionServiceOptions.find(s=>s.id===id)?.label||'Servicio no disponible'}</li>)}</ul></>}{selected.conditions&&<><h3>Condiciones</h3><p>{selected.conditions}</p></>}{onReserve&&promotionServiceIds(selected).length>0&&(promotionServiceIds(selected).every(id=>promotionServiceOptions.some(s=>s.id===id))?<button type=\"button\" className=\"spn-reserve\" onClick={reserve}>Reservar promoción <ArrowRight size={16} aria-hidden=\"true\"/></button>:<p>El servicio de esta promoción no está disponible para reservar ahora.</p>)}</dialog>}</>;\n}\n", "studio-promo-news.css": ".spn-list { display:grid; gap:12px; margin:0 0 14px; }\n.spn-card { display:flex; overflow:hidden; border:1px solid #8A6B43; border-radius:11px; background:#30271F; color:#FFF8EE; }\n.spn-card > img { width:100px; object-fit:cover; flex-shrink:0; }\n.spn-body { display:grid; gap:7px; padding:15px; flex:1; min-width:0; }\n.spn-kind { display:flex; align-items:center; gap:6px; color:#E4C687; font-size:10px; letter-spacing:.08em; text-transform:uppercase; }\n.spn-body h3 { margin:0; color:#FFF8EE; font-family:Georgia,serif; font-weight:400; font-size:19px; line-height:1.3; overflow-wrap:anywhere; }\n.spn-benefit { color:#F0D89E; font-size:15px; }.spn-until { color:#D6CBB8; font-size:12px; line-height:1.5; margin:0; }\n.lst-news-portal .spn-card button { display:flex; align-items:center; justify-content:flex-start; gap:10px; justify-self:start; padding:7px 0; border:0; border-bottom:1px solid #B9955F; border-radius:0; min-height:44px; color:#E4C687; background:transparent; font-size:12px; cursor:pointer; }\n.spn-dialog { width:calc(100% - 24px); max-width:520px; max-height:85dvh; overflow:auto; box-sizing:border-box; border:1px solid #947749; border-radius:14px; background:#29231F; color:#FFF8EE; padding:20px; }.spn-dialog::backdrop { background:#000b; }.spn-dialog header { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; }.spn-dialog header button { min-width:44px; min-height:44px; border:1px solid #655039; border-radius:8px; color:#E4C687; background:transparent; display:grid; place-items:center; cursor:pointer; }.spn-dialog > img { width:100%; max-height:230px; object-fit:cover; border-radius:8px; }.spn-dialog h2 { font-family:Georgia,serif; font-size:25px; font-weight:400; line-height:1.3; }.spn-dialog h3 { font-size:14px; }.spn-dialog p,.spn-dialog li { white-space:pre-wrap; overflow-wrap:anywhere; font-size:13px; line-height:1.7; }.spn-dialog .spn-reserve { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; min-height:48px; border:0; border-radius:8px; padding:12px; margin-top:18px; background:#C49A58; color:#29231F; font-weight:600; cursor:pointer; }\n.lst-bottom-nav .lst-voucher-label { max-width:80px; line-height:1.15; text-align:center; }\n@media(max-width:380px) { .spn-card > img { width:78px; }.spn-body { padding:12px; }.spn-body h3 { font-size:18px; } }\n"},bonosCss=".lst-bottom-nav.lst-with-bonos { padding-left: 4px; padding-right: 4px; box-sizing: border-box; }\n.lst-bottom-nav.lst-with-bonos > button { min-width: 44px; min-height: 44px; }\n.lst-bonos-page { width: 100%; max-width: 520px; box-sizing: border-box; }\n.lst-bonos-page > .lst-bonos { padding: 16px; box-sizing: border-box; }\n";
try{
 if(!fs.existsSync('package.json'))throw Error('Sube instalar-promos-novedades.cjs junto a package.json, fuera de src.');
 const appFile='src/App.tsx',featureFile='src/PortalFeatures.tsx';
 const original=fs.readFileSync(appFile,'utf8'),features=fs.readFileSync(featureFile,'utf8');
 const appDone=original.includes('// lst-promos-in-news-v1'),featuresDone=features.includes('// lst-news-promotion-slot-v1');
 for(const [name,text] of Object.entries(files))if(fs.existsSync('src/'+name)&&fs.readFileSync('src/'+name,'utf8')!==text)throw Error('El archivo '+name+' tiene otros cambios. No se ha cambiado nada. Envíamelo para conservarlos.');
 if(appDone&&featuresDone&&Object.keys(files).every(n=>fs.existsSync('src/'+n))){console.log('Promociones en Novedades y Bonos y tarjetas ya están instalados. Ejecuta npm run build y Publish / Update.');process.exit(0);}
 if(appDone||featuresDone)throw Error('Hay una instalación incompleta. No se ha cambiado nada. Envíame src/App.tsx y src/PortalFeatures.tsx.');
 const ts=require('typescript');const needsBonos=!original.includes('// lst-bonos-bottom-nav-v1');
 if(needsBonos&&fs.existsSync('src/portal-bonos-nav.css')&&fs.readFileSync('src/portal-bonos-nav.css','utf8')!==bonosCss)throw Error('El estilo de bonos tiene cambios. No se ha cambiado nada.');
 const base=needsBonos?patchBonos(original,ts):original;
 const result=patchPromos(base,features,ts);
 const changes={[appFile]:result.app,[featureFile]:result.features};for(const [name,text] of Object.entries(files))changes['src/'+name]=text;
 if(needsBonos)changes['src/portal-bonos-nav.css']=bonosCss;
 const backup='respaldo-promos-novedades-'+Date.now();fs.mkdirSync(backup);const previous=new Map();
 for(const file of Object.keys(changes)){previous.set(file,fs.existsSync(file)?fs.readFileSync(file):null);if(fs.existsSync(file)){const dest=path.join(backup,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);}}
 try{for(const [file,text] of Object.entries(changes))fs.writeFileSync(file,text);}catch(error){for(const [file,bytes] of previous)if(bytes===null){if(fs.existsSync(file))fs.unlinkSync(file);}else fs.writeFileSync(file,bytes);throw error;}
 console.log('Promociones vigentes en Novedades del Studio. Icono Promos retirado. Bonos y tarjetas en la barra. Se conservan gestión, fechas y reservas. Respaldo: '+backup+'. Ejecuta npm run build y Publish / Update. No requiere cambios en Supabase.');
}catch(error){console.error(error.code==='MODULE_NOT_FOUND'?'Ejecuta npm install y repite el instalador. No se ha cambiado nada.':error.message);process.exitCode=1;}
