export const searchNormalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
export function searchHelpTopics(query:string){const q=searchNormalize(query),topics:string[]=[];
 if(/\b(cancel\w*|anular|reprogram\w*)\b/.test(q)||(/\b(cambiar|cambio)\b/.test(q)&&/\b(cita|fecha|hora|reserva)\b/.test(q)))topics.push('appointments');
 if(/\b(reservar|reserva|reservas|agendar|coger cita|pedir cita)\b/.test(q))topics.push('booking');
 if(/\b(pago|pagar|bizum|anticipo|deposito|senal)\b/.test(q))topics.push('payment');
 if(/\b(precio\w*|cuesta|cuestan|vale|valen|coste|cuanto cuesta)\b/.test(q))topics.push('price');
 if(/\b(dura|duran|duracion|tiempo)\b/.test(q))topics.push('duration');
 if(/\b(incluye\w*|incluido\w*|entra|incluyen)\b/.test(q))topics.push('includes');
 if(/\b(horario\w*|abren|abrir|cierran|cerrado\w*)\b/.test(q))topics.push('hours');
 if(/\b(diferencia\w*|elegir|recomienda\w*|aconseja\w*)\b/.test(q)||/no se que/.test(q))topics.push('choice');
 if(/\b(caida|picor|caspa|herida\w*|alergia\w*|irritacion|dolor)\b/.test(q))topics.push('assessment');
 return topics;
}
const stop=new Set('que cual cuales cuanto cuanta cuantos cuantas dura duran duracion tiempo precio precios cuesta cuestan vale valen coste incluye incluyen incluido incluidos incluida incluidas entra quiero quisiera necesito tengo me mi mis el la los las un una unos unas de del al para por en con y o es son se hace hacer hacerme servicio servicios cabello pelo hola saber saberlo cuanto reservar reserva reservas agendar cita coger pedir como'.split(' '));
const alternatives:Record<string,string[]>={canas:['canas','cana','raiz','raices'],raiz:['raiz','raices'],raices:['raiz','raices'],tinte:['tinte','coloracion','raiz','raices'],mechas:['mechas','balayage','babylights'],peinar:['peinado','styling'],cortar:['corte','cut'],rizo:['rizo','rizos','rizado'],rizos:['rizo','rizos','rizado']};
export function matchesSearchQuery(query:string,text:string){const q=searchNormalize(query),hay=searchNormalize(text),topics=searchHelpTopics(q);
 if(topics.some(t=>['appointments','payment','hours','choice','assessment'].includes(t)))return false;
 const words=q.split(' ').filter(w=>w&&!stop.has(w));if(!words.length)return false;
 return words.every(word=>(alternatives[word]||[word]).some(value=>hay.includes(value)));
}
