const groups:Record<string,string>={
 color:'color',colores:'color',coloracion:'color',coloraciones:'color',tinte:'color',tintes:'color',tenir:'color',colour:'color',coloring:'color',colouring:'color',
 mecha:'mechas',mechas:'mechas',balayage:'mechas',babylight:'mechas',babylights:'mechas',highlights:'mechas',
 corte:'corte',cortes:'corte',cortar:'corte',cut:'corte',haircut:'corte',
 peinado:'peinado',peinados:'peinado',styling:'peinado',stylo:'peinado',secado:'peinado',secados:'peinado',
 tratamiento:'tratamiento',tratamientos:'tratamiento',terapia:'tratamiento',terapias:'tratamiento',therapy:'tratamiento',treatment:'tratamiento',treatments:'tratamiento',
 hombre:'hombre',hombres:'hombre',masculino:'hombre',masculinos:'hombre',men:'hombre',
 nino:'infantil',ninos:'infantil',nina:'infantil',ninas:'infantil',infantil:'infantil',infantiles:'infantil',kids:'infantil',children:'infantil',
};
const ignored=new Set(['a','al','de','del','el','la','los','las','un','una','unos','unas','y','o','para','con','mi','quiero','busco','necesito','cabello','pelo']);
function words(value:string):string[]{
 return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\bhead\s+spa\b/g,'headspa').trim().split(/\s+/).filter(Boolean)
  .map(word=>groups[word]||word).filter(word=>!ignored.has(word));
}
// Only identity fields are searchable. Descriptions, slogans and conditions do
// not turn a diagnosis, haircut or treatment into a colour service.
export function matchCatalogService(query:string,categories:string[],names:string[],variants:string[]):boolean{
 const wanted=words(query);if(!wanted.length)return !query.trim();
 const categoryWords=words(categories.join(' ')),nameWords=words(names.join(' '));
 const identity=[...categoryWords,...nameWords];
 // Highlights are their own service family, even inside a general colour category.
 const highlights=nameWords.includes('mechas')||(categoryWords.includes('mechas')&&!nameWords.includes('color'));
 if(wanted.includes('color')&&!wanted.includes('mechas')&&highlights)return false;
 const available=new Set([...identity,...words(variants.join(' '))]);
 return wanted.every(word=>available.has(word)||(word.length>=3&&[...available].some(value=>value.startsWith(word))));
}
