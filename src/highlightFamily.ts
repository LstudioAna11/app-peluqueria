export type HighlightFamily='balayage'|'babylights'|'hybrid'|'traditional';
const normalize=(value:string)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function highlightFamily(value:string):HighlightFamily|null{
 const text=normalize(value);
 if(/hybrid/.test(text))return 'hybrid';
 if(/babylights?/.test(text))return 'babylights';
 if(/balayage/.test(text))return 'balayage';
 if(/\bmechas?\b/.test(text)&&/\btradicional(?:es)?\b/.test(text))return 'traditional';
 return null;
}
export function highlightTechniqueLabel(value:string):string{
 const family=highlightFamily(value);
 return family==='traditional'?'Mechas tradicionales':family==='hybrid'?'Hybrid':family==='babylights'?'Babylights':family==='balayage'?'Balayage':'Mechas';
}
