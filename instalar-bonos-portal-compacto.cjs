// Ejecutar junto a package.json: node instalar-bonos-portal-compacto.cjs
function patchVoucherPortal(original,ts){
 const source=ts.createSourceFile('PortalFeatures.tsx',original,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
 const all=(root,p)=>{const xs=[];function walk(n){if(p(n))xs.push(n);ts.forEachChild(n,walk);}walk(root);return xs;};
 const one=(xs,label)=>{if(xs.length!==1)throw Error('No se reconoce '+label+'. No se ha cambiado nada. Envíame src/PortalFeatures.tsx para adaptarlo.');return xs[0];};
 const tag=n=>ts.isJsxElement(n)?n.openingElement.tagName.getText(source):ts.isJsxSelfClosingElement(n)?n.tagName.getText(source):'';
 const attr=(n,name)=>ts.isJsxElement(n)?n.openingElement.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(source)===name):undefined;
 const form=one(all(source,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='VoucherPanel'),'el apartado de bonos');
 const root=one(all(form,n=>ts.isReturnStatement(n)&&n.expression&&tag(n.expression)==='section'&&attr(n.expression,'className')?.initializer?.text==='lst-bonos'),'la pantalla de bonos').expression;
 const cls=attr(root,'className');edits.push({start:cls.initializer.getStart(source),end:cls.initializer.end,text:"{admin?'lst-bonos':'lst-bonos vpc-compact'}"});
 const swap=(from,to)=>{const start=original.indexOf(from,form.getStart(source));if(start<0||start>form.end)throw Error('El apartado de bonos tiene otra versión. No se ha cambiado nada.');edits.push({start,end:start+from.length,text:to});};
 swap("admin?'Tarjetas regalo y bonos':'Tus tarjetas y bonos'","admin?'Tarjetas regalo y bonos':'Bonos y tarjetas'");
 swap("admin?'Compras, cobros y sesiones del estudio.':'Un detalle para regalar. Un cuidado para volver.'","admin?'Compras, cobros y sesiones del estudio.':''");
 swap("<summary>{kind==='gift'?(admin?'Preparar tarjeta regalo':'Descubrir tarjetas regalo'):(admin?'Preparar bono 5×4':'Descubrir bonos de sesiones')}</summary>","<summary>{!admin&&(kind==='gift'?<VoucherGiftIcon size={20} strokeWidth={1.5} aria-hidden=\"true\"/>:<VoucherTicketIcon size={20} strokeWidth={1.5} aria-hidden=\"true\"/>)}{kind==='gift'?(admin?'Preparar tarjeta regalo':'Regalar una experiencia'):(admin?'Preparar bono 5×4':'Bonos de sesiones')}</summary>");
 swap('<summary>Me han regalado una tarjeta</summary>','<summary><VoucherPlusIcon size={20} strokeWidth={1.5} aria-hidden="true"/>Añadir tarjeta regalo</summary>');
 swap('<p className="vb-note">{admin?\'No hay tarjetas ni bonos para esta selección.\':\'Aquí aparecerán tus tarjetas regalo y tus bonos de sesiones.\'}</p>', '<p className={admin?\'vb-note\':\'vb-note vpc-empty\'}>{admin?\'No hay tarjetas ni bonos para esta selección.\':\'Todavía no tienes bonos ni tarjetas.\'}</p>');
 const wallet=one(root.children.filter(n=>ts.isJsxExpression(n)&&n.getText(source).startsWith("{(['gift','sessions'] as const).map(kind=>{")&&n.getText(source).includes('vb-wallet-heading')),'los bonos de la clienta');
 let raw=wallet.expression.getText(source);
 raw=raw.replace("(['gift','sessions'] as const).map(kind=>{","(admin?[null]:[true,false]).flatMap(onlyActive=>(['gift','sessions'] as const).map(kind=>{")
 .replace('const group=data?.vouchers.filter(v=>v.kind===kind)||[];','const group=data?.vouchers.filter(v=>v.kind===kind&&(admin||portalVoucherIsActive(v)===onlyActive))||[];')
 .replace('<section key={kind}>','<section key={kind+\'-\'+String(onlyActive)} className="vpc-wallet-group" data-wallet-active={onlyActive===true?\'true\':\'false\'}>')
 .replace("admin?'Tarjetas regalo registradas':'Mis tarjetas regalo'","admin?'Tarjetas regalo registradas':onlyActive?'Mis tarjetas regalo':'Otras tarjetas regalo'")
 .replace("admin?'Bonos de sesiones registrados':'Mis bonos de sesiones'","admin?'Bonos de sesiones registrados':onlyActive?'Mis bonos de sesiones':'Otros bonos de sesiones'");
 if(!raw.includes('portalVoucherIsActive(v)')||!raw.includes('className="vpc-wallet-group"'))throw Error('Los bonos tienen otra estructura. No se ha cambiado nada.');
 raw+=')';edits.push({start:wallet.expression.getStart(source),end:wallet.expression.end,text:raw});
 const helper="function portalVoucherIsActive(v:studioApi.StudioVoucher){return v.status==='active'&&(!v.expires_on||v.expires_on>=voucherToday())&&(voucherAvailable(v)>0||v.held_cents>0||v.held_sessions>0);}\n";
 edits.push({start:form.getStart(source),end:form.getStart(source),text:helper});
 for(const edit of edits.sort((a,b)=>b.start-a.start))original=original.slice(0,edit.start)+edit.text+original.slice(edit.end);
 const output="import './portal-vouchers-compact.css';\nimport {Gift as VoucherGiftIcon,Ticket as VoucherTicketIcon,Plus as VoucherPlusIcon} from 'lucide-react';\n"+original+'\n// lst-portal-vouchers-compact-v1\n';
 if(ts.createSourceFile('PortalFeatures.tsx',output,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length)throw Error('La comprobación del código no ha pasado. No se ha cambiado nada.');return output;
};


const fs=require('fs'),path=require('path'),css=".lst-bonos.vpc-compact { display:flex; flex-direction:column; gap:0; }\n.vpc-compact > * { order:1; }\n.vpc-compact > .vb-header { order:0; margin:0 0 10px; flex-wrap:nowrap; gap:12px; }\n.vpc-compact > .vb-header h2 { font-size:22px; line-height:1.3; }\n.vpc-compact > .vb-header small:empty { display:none; }\n.vpc-compact > .vb-header > button { padding:7px 0 7px 8px; border:0; font-size:11px; flex-shrink:0; }\n.lst-bonos.vpc-compact > details.vb-panel { order:3; display:block; background:transparent; border:0; border-bottom:1px solid #655039; border-radius:0; margin:0; padding:0; }\n.lst-bonos.vpc-compact > details.vb-panel > summary { display:flex; align-items:center; gap:11px; list-style:none; padding:10px 0; min-height:52px; font-size:13px; line-height:1.4; }\n.vpc-compact > details > summary::-webkit-details-marker { display:none; }\n.vpc-compact > details > summary::after { content:'⌄'; color:#D8C29A; margin-left:auto; padding:0 4px; }\n.vpc-compact > details[open] > summary::after { transform:rotate(180deg); }\n.vpc-compact > details > summary > svg { color:#E4C687; flex-shrink:0; }\n.vpc-compact > details > summary:focus-visible { outline:2px solid #E4C687; outline-offset:3px; }\n.vpc-compact > details.vb-panel[open] { padding-bottom:14px; }\n.vpc-compact > details[open] > :not(summary) { margin-top:12px; }\n.vpc-compact > .vpc-wallet-group { order:4; }\n.vpc-compact > .vpc-wallet-group[data-wallet-active=\"true\"] { order:2; }\n.vpc-compact > .vpc-wallet-group .vb-wallet-heading { font-size:17px; margin:14px 0 10px; }\n.vpc-compact > .vpc-empty { order:2; margin:2px 0 14px; font-size:12px; color:#C3B29A; }\n.vpc-compact > .vb-pager { order:5; }\n";
try{
 if(!fs.existsSync('package.json'))throw Error('Sube instalar-bonos-portal-compacto.cjs junto a package.json, fuera de src.');
 const file='src/PortalFeatures.tsx',extra='src/portal-vouchers-compact.css',original=fs.readFileSync(file,'utf8');
 if(fs.existsSync(extra)&&fs.readFileSync(extra,'utf8')!==css)throw Error('El estilo de bonos contiene otros cambios. No se ha cambiado nada. Envíamelo para conservarlos.');
 if(original.includes('// lst-portal-vouchers-compact-v1')&&fs.existsSync(extra)){console.log('Bonos y tarjetas compactos ya están instalados. Ejecuta npm run build y Publish / Update.');process.exit(0);}
 if(original.includes('// lst-portal-vouchers-compact-v1'))throw Error('Hay una instalación incompleta. No se ha cambiado nada. Envíame src/PortalFeatures.tsx.');
 const result=patchVoucherPortal(original,require('typescript')),backup='respaldo-bonos-portal-compacto-'+Date.now();fs.mkdirSync(backup);fs.writeFileSync(path.join(backup,'PortalFeatures.tsx'),original);const oldCss=fs.existsSync(extra)?fs.readFileSync(extra):null;
 try{fs.writeFileSync(extra,css);fs.writeFileSync(file,result);}catch(error){fs.writeFileSync(file,original);if(oldCss===null){if(fs.existsSync(extra))fs.unlinkSync(extra);}else fs.writeFileSync(extra,oldCss);throw error;}
 console.log('Portal de bonos compactado. Activos primero, filas con iconos y menos texto. Compras, Bizum, códigos y sesiones conservados. Respaldo: '+backup+'. Ejecuta npm run build y Publish / Update. No requiere cambios en Supabase.');
}catch(error){console.error(error.code==='MODULE_NOT_FOUND'?'Ejecuta npm install y repite el instalador. No se ha cambiado nada.':error.message);process.exitCode=1;}
