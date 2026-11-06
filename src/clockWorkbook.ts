import {clockMetrics,clockDate,clockDuration,type ClockReport} from './timeclockApi';
// Minimal OOXML workbook, with literal text cells (never formulas or macros).
const encoder = new TextEncoder();
const xml = (value:unknown) => String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').slice(0,32767).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function crc32(bytes:Uint8Array):number {let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function zip(files:Record<string,string>):Uint8Array {
  const chunks:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0,size=0;
  for(const [path,text] of Object.entries(files)){
    const name=encoder.encode(path),data=encoder.encode(text),crc=crc32(data);
    const local=new Uint8Array(30+name.length),view=new DataView(local.buffer);
    view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(10,0,true);view.setUint16(12,0x21,true);view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);local.set(name,30);
    const record=new Uint8Array(46+name.length),cv=new DataView(record.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(14,0x21,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);record.set(name,46);
    chunks.push(local,data);central.push(record);offset+=local.length+data.length;size+=record.length;
  }
  const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,central.length,true);ev.setUint16(10,central.length,true);ev.setUint32(12,size,true);ev.setUint32(16,offset,true);
  const output=new Uint8Array(offset+size+end.length);let cursor=0;for(const part of [...chunks,...central,end]){output.set(part,cursor);cursor+=part.length;}return output;
}

export function clockWorkbook(report:ClockReport):Blob{
 const totals=report.staff.map(person=>{
  const shifts=report.shifts.filter(s=>s.staff_id===person.id);const values=shifts.map(s=>clockMetrics(s,report));
  return [person.displayName,person.code,clockDuration(values.reduce((n,v)=>n+v.gross,0)),clockDuration(values.reduce((n,v)=>n+v.pause,0)),clockDuration(values.reduce((n,v)=>n+v.outsidePause,0)),shifts.filter(s=>!s.ended_at).length];
 });
 const sheets=[
  {name:'Resumen',rows:[['Registro de jornada',report.company.name],['NIF',report.company.taxId],['Centro',report.company.center],['Periodo',report.month],['Corte de consulta',clockDate(report.asOf)],['Persona','Código','Entre entrada y salida','Pausas','Fuera de pausa','Jornadas abiertas'],...totals]},
  {name:'Jornadas',rows:[['Persona','Entrada (Madrid)','Salida (Madrid)','Entrada original','Salida original','Duración en periodo','Pausas en periodo','Fuera de pausa','Correcciones','ID jornada'],...report.shifts.map(s=>{const v=clockMetrics(s,report);return [s.staff_name,clockDate(s.started_at),clockDate(s.ended_at),s.original_start?clockDate(s.original_start):'Añadida por administración',s.original_end?clockDate(s.original_end):'',clockDuration(v.gross),clockDuration(v.pause),clockDuration(v.outsidePause),s.correction_count,s.id];})]},
  {name:'Historial',rows:[['Persona','Acción','Registrado (Madrid)','Interfaz','Actor','Motivo','Detalle de corrección','ID jornada','ID evento'],...report.events.map(e=>[report.staff.find(s=>s.id===e.staffId)?.displayName||e.staffId,({in:'Entrada',out:'Salida',pause:'Inicia pausa',resume:'Termina pausa',adjust:'Corrección'})[e.action]||e.action,clockDate(e.at),e.source,e.actor,e.reason||'',e.action==='adjust'?JSON.stringify(e.payload):'',e.shiftId,e.id])]}
 ];
 if(sheets.some(s=>s.rows.length>100000))throw new Error('El informe supera el tamaño admitido. Filtra por estilista.');
 const declaration='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 const files:Record<string,string>={
 '[Content_Types].xml':declaration+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
 '_rels/.rels':declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
 'xl/workbook.xml':declaration+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>`<sheet name="${s.name}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>',
 'xl/_rels/workbook.xml.rels':declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+'</Relationships>'};
 for(const [index,sheet]of sheets.entries())files[`xl/worksheets/sheet${index+1}.xml`]=declaration+'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="15" width="25" customWidth="1"/></cols><sheetData>'+sheet.rows.map((row,i)=>`<row r="${i+1}">`+row.map((v,j)=>`<c r="${String.fromCharCode(65+j)}${i+1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')+'</row>').join('')+'</sheetData></worksheet>';
 return new Blob([new Uint8Array(zip(files)).buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
