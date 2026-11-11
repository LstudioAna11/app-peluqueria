export type StudioHourSpan={start:string;end:string};
export type StudioWeek=Record<string,StudioHourSpan[]>;
export type StudioHoursConfig={weeklyHours?:StudioWeek;scheduleMonday?:string;scheduleTueWed?:string;scheduleThuFri?:string;scheduleSaturday?:string};
export const STUDIO_WEEK_DAYS=[{key:'1',label:'Lunes'},{key:'2',label:'Martes'},{key:'3',label:'Miércoles'},{key:'4',label:'Jueves'},{key:'5',label:'Viernes'},{key:'6',label:'Sábado'},{key:'0',label:'Domingo'}];
export function studioHourMinute(value:unknown,end=false):number {
 if(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return NaN;
 const minute=Number(value.slice(0,2))*60+Number(value.slice(3));return end&&minute===0?1440:minute;
}
export function studioWeekErrors(week:unknown):string[]{
 if(!week||typeof week!=='object'||Array.isArray(week))return ['El horario semanal no es válido.'];
 const values=week as Record<string,unknown>,errors:string[]=[];
 for(const {key,label} of STUDIO_WEEK_DAYS){const spans=values[key];if(!Array.isArray(spans)||spans.length>8){errors.push(label+': revisa los tramos (máximo 8).');continue;}
  const ranges:{start:number;end:number}[]=[];
  for(const raw of spans){const span=raw as StudioHourSpan|null;const start=studioHourMinute(span?.start),end=studioHourMinute(span?.end,true);if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end){errors.push(label+': indica una apertura y un cierre posterior.');continue;}ranges.push({start,end});}
  ranges.sort((a,b)=>a.start-b.start);if(ranges.some((r,i)=>i>0&&r.start<ranges[i-1].end))errors.push(label+': hay tramos solapados.');
 }
 return errors;
}
export function studioLegacyHours(config:StudioHoursConfig,day:number):string {return day===0?'Cerrado':String(day===1?config.scheduleMonday:day<=3?config.scheduleTueWed:day<=5?config.scheduleThuFri:config.scheduleSaturday);}
export function studioLegacySpans(text:string,day:number):StudioHourSpan[]|null {
 if(/cerrado|closed/i.test(text)||!text.trim())return [];
 const matches=Array.from(text.matchAll(/(\d{1,2})(?::(\d{2})|h(?:\s*(\d{2}))?)/gi));
 if(!matches.length&&day===6)return [{start:'09:00',end:'19:00'}];
 if(!matches.length||matches.length%2)return null;
 const result:StudioHourSpan[]=[];for(let i=0;i<matches.length;i+=2){const format=(m:RegExpMatchArray,end=false)=>{const h=Number(m[1]),n=Number(m[2]||m[3]||0);return end&&h===24&&n===0?'00:00':String(h).padStart(2,'0')+':'+String(n).padStart(2,'0');};result.push({start:format(matches[i]),end:format(matches[i+1],true)});}return result;
}
export function studioReadWeek(config:StudioHoursConfig):StudioWeek {
 if(config.weeklyHours!==undefined)return config.weeklyHours;
 return Object.fromEntries(STUDIO_WEEK_DAYS.map(({key})=>[key,studioLegacySpans(studioLegacyHours(config,Number(key)),Number(key))||[]]));
}
export function studioImportErrors(config:StudioHoursConfig):string[]{
 if(config.weeklyHours!==undefined)return studioWeekErrors(config.weeklyHours);
 const issues=STUDIO_WEEK_DAYS.filter(({key})=>studioLegacySpans(studioLegacyHours(config,Number(key)),Number(key))===null).map(({label})=>label+': no se pudo interpretar el horario anterior.');
 return [...issues,...studioWeekErrors(studioReadWeek(config))];
}
export function studioDayRanges(config:StudioHoursConfig,day:number):{start:number;end:number}[]{
 const week=studioReadWeek(config);if(studioWeekErrors(week).length)return [];
 return (week[String(day)]||[]).map(span=>({start:studioHourMinute(span.start),end:studioHourMinute(span.end,true)})).sort((a,b)=>a.start-b.start);
}
export function studioScheduleLabel(config:StudioHoursConfig,day:number):string {
 if(config.weeklyHours===undefined)return studioLegacyHours(config,day);
 const ranges=studioDayRanges(config,day);const time=(n:number)=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 return ranges.length?ranges.map(span=>time(span.start)+' – '+time(span.end)).join(' · '):'Cerrado';
}
