// Local catalogue guidance. No external AI, API calls or invented services.
export type AdvisorService={id:string;categoryId:string;name:string;active:boolean};
export type AdvisorResult={message:string;suggestions:{id:string;categoryId:string;reason:string}[];choices?:{label:string;query:string}[]};
type Intent={id:string;query:RegExp;names:RegExp;reason:string};
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}\s,.;]/gu,' ').replace(/\s+/g,' ').trim();
const intents:Intent[]=[
 {id:'roots',query:/\b(canas?|raiz|raices|tinte|grey|gray|roots|racines|ansatz|raizes)\b/,names:/\b(raiz|raices|canas?|coloracion|color)\b/,reason:'Has mencionado canas o raíz; este servicio figura en el catálogo de coloración.'},
 {id:'lights',query:/\b(mechas?|rubia|rubio|balayage|babylights|highlights|blond|iluminar|iluminacion|aclarar)\b/,names:/\b(mechas?|balayage|babylights|lights|iluminacion|rubios?)\b/,reason:'Has pedido aclarar o iluminar el cabello; esta opción corresponde a servicios de mechas o iluminación.'},
 {id:'toner',query:/\b(matiz|matizar|amarillo|amarillento|naranja|anaranjado|toner|pigmentos?)\b/,names:/\b(matiz|matizar|toner)\b/,reason:'Has mencionado el tono o un reflejo no deseado; esta opción es un servicio de matiz.'},
 {id:'gloss',query:/\b(brillo|apagado|refresh|gloss|cellophanes|shine|raviver)\b/,names:/\b(gloss|cellophanes|refresh|brillo)\b/,reason:'Has pedido brillo o refrescar el color; esta opción figura como un servicio de gloss, brillo o refresh.'},
 {id:'ends',query:/\b(puntas?|sanear|despuntar|recortar)\b/,names:/\b(puntas?|mantenimiento)\b/,reason:'Has mencionado sanear o mantener las puntas; esta opción está orientada a su mantenimiento.'},
 {id:'cut',query:/\b(cortar|corte|cortes|haircut|cut|coupe|taglio|schnitt|knip|strzyz|strih|klipp|flequillo)\b/,names:/\b(corte|cortar|cut|flequillo)\b/,reason:'Has pedido un corte; esta opción pertenece a los servicios de corte del catálogo.'},
 {id:'straight',query:/\b(alisar|alisado|liso|straight|straightening)\b/,names:/\b(alisado|alisar)\b/,reason:'Has pedido alisar; esta opción está identificada en el catálogo como un servicio de alisado.'},
 {id:'care',query:/\b(seco|seca|sequedad|hidratar|hidratacion|nutrir|nutricion|encrespamiento|frizz|care|soin|cura|pflege|verzorg|pleie|vard)\b/,names:/\b(hidratacion|nutricion|nutritiv\w*|botox|cauterizacion|tratamiento|terapia)\b/,reason:'Has mencionado sequedad o encrespamiento; esta opción es un servicio de cuidado. Ana debe valorar cuál se adapta a tu cabello.'},
 {id:'repair',query:/\b(roto|rotura|quebradizo|danado|decolorado|reparar|reconstruccion|reconstruir)\b/,names:/\b(reconstruccion|reconstructor\w*|reparacion|reparador\w*|resistencia|viabilidad)\b/,reason:'Has mencionado daño o rotura; este servicio aparece como reconstrucción, reparación o valoración de resistencia.'},
 {id:'curls',query:/\b(rizos?|rizado|rizada|curly|curls|definicion)\b/,names:/\b(rizos?|rizado|curly|definicion)\b/,reason:'Has mencionado tus rizos; esta opción está identificada como un servicio para cabello rizado.'},
 {id:'perm',query:/\b(moldeado|moldeador|permanente|ondular|ondeado)\b/,names:/\b(moldeado|moldeador|permanente|ondeado|textura)\b/,reason:'Has pedido crear ondas o un moldeado; esta opción corresponde a esos servicios.'},
 {id:'style',query:/\b(peinar|peinado|peinados|recogido|recogidos|evento|boda|styling|brushing|coiffage)\b/,names:/\b(peinado|peinados|styling|recogido|recogidos|brushing)\b/,reason:'Has pedido un peinado o acabado; esta opción corresponde a esos servicios.'},
 {id:'assessment',query:/\b(diagnostico|microcamara|cuero cabelludo|caida|picor|caspa|valoracion|visagismo)\b/,names:/\b(diagnostico|microcamara|valoracion|consulta|visagismo)\b/,reason:'Tu consulta necesita una valoración previa; puedes revisar este servicio y comentarlo con Ana.'},
];
const stop=new Set('quiero quisiera gustaria necesito tengo hacer hacerme cabello pelo servicio servicios para como cual cuales mejor puedes puede algo poco mucho una unas unos del los las con por que mi mis muy mas sin pero solo hola ayuda ayudame recomendar recomiendas aconsejas the and want hair please me my terapia tratamiento'.split(' '));
export function recommendServices(question:string,services:AdvisorService[]):AdvisorResult{
 const raw=normalize(question.slice(0,800));let positive=raw;const excluded=new Set<string>();
 // Negated requests do not count as positive interests (e.g. sin alisar, no quiero mechas).
 positive=positive.replace(/(?:\bno (?:quiero|busco|deseo|necesito) |\bsin |\bevitar )([^,.;]+?)(?=\s+(?:pero|aunque|solo|quiero|busco|necesito)\b|[,.;]|$)/g,(_all,part:string)=>{for(const rule of intents)if(rule.query.test(part))excluded.add(rule.id);return ' ';});
 const active=intents.filter(rule=>rule.query.test(positive)&&!excluded.has(rule.id));
 const has=(id:string)=>active.some(rule=>rule.id===id);
 // A broad request for a new look needs a choice, rather than three arbitrary matches.
 const tokens=positive.split(/[^\p{L}\p{N}]+/u).filter(token=>token.length>=3&&!stop.has(token));
 const male=/\b(hombre|masculino|caballero|chico|barba|barber)\b/.test(positive),female=/\b(mujer|femenino|chica)\b/.test(positive);
 const ranked=services.filter(s=>s.active&&s.name.trim()).map(service=>{
  const name=normalize(service.name);if((!male&&/\b(masculino|caballero|hombre|barba|barber)\b/.test(name))||(male&&/\b(mujer|femenino)\b/.test(name))||(female&&/\b(masculino|caballero|hombre)\b/.test(name)))return null;
  if(excluded.has('straight')&&/\b(alisado|alisar)\b/.test(name))return null;
  if(excluded.has('cut')&&/\b(corte|cut)\b/.test(name))return null;
  if(excluded.has('lights')&&intents.find(r=>r.id==='lights')!.names.test(name))return null;
  if(excluded.has('roots')&&intents.find(r=>r.id==='roots')!.names.test(name))return null;
  if(has('care')&&!has('straight')&&/\b(alisado|alisar)\b/.test(name))return null;
  if(has('roots')&&!has('lights')&&/\b(mechas?|balayage|babylights)\b/.test(name))return null;
  if(has('repair')&&!has('perm')&&/\b(moldeado|moldeador|permanente)\b/.test(name))return null;
  const matches=active.filter(rule=>rule.names.test(name));
  if(active.length&&!matches.length)return null;
  const nameTokens=new Set(name.split(/[^\p{L}\p{N}]+/u));let score=tokens.reduce((n,t)=>n+(nameTokens.has(t)?5:0),0);
  score+=matches.length*12;
  if(name===positive)score+=50;else if(positive.includes(name))score+=25;
  if(male&&/\b(masculino|caballero|hombre|barba|barber)\b/.test(name))score+=16;
  if(has('roots')&&/\b(raiz|raices|canas?)\b/.test(name))score+=14;
  if(has('ends')&&/\b(puntas?)\b/.test(name))score+=18;
  if(has('repair')&&intents.find(r=>r.id==='repair')!.names.test(name))score+=12;
  if(has('curls')&&/\b(rizos?|rizado|curly)\b/.test(name))score+=14;
  if(/\b(cambio|radical)\b/.test(positive)&&/\b(cambio|tendencia)\b/.test(name))score+=10;
  if(score===0)return null;
  const reason=matches.sort((a,b)=>Number(['roots','ends','repair','curls'].includes(b.id))-Number(['roots','ends','repair','curls'].includes(a.id)))[0]?.reason||'El nombre de este servicio coincide con lo que has escrito. Revisa su ficha para confirmar que es lo que buscas.';
  return {id:service.id,categoryId:service.categoryId,reason,score};
 }).filter((value):value is NonNullable<typeof value>=>value!==null).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 if(!ranked.length)return {message:active.length?'No encuentro una coincidencia clara entre los nombres de nuestros servicios. Cuéntame un poco más o consulta con Ana.':'Para orientarte mejor, dime qué te gustaría cambiar o cuidar.',suggestions:[],choices:[{label:'Canas o raíz',query:'Quiero retocar la raíz y cubrir canas'},{label:'Corte o puntas',query:'Quiero sanear las puntas'},{label:'Mechas',query:'Quiero iluminar el cabello con mechas'},{label:'Cuidado del cabello',query:'Tengo el cabello seco y quiero cuidarlo'}]};
 const specific=ranked.filter(value=>value.score>=Math.max(1,ranked[0].score-12)).slice(0,3);
 return {message:'Estas opciones del catálogo pueden encajar con lo que nos cuentas. Revisa cada ficha; Ana confirmará la opción adecuada.',suggestions:specific.map(({score,...suggestion})=>suggestion)};
}
