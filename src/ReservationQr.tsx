import React,{useEffect,useRef,useState} from 'react';
import qrcode from './qrEncoder';
export const SALON_QR_LINK='https://lstudioana.es/?reservar=1&origen=qr';
export function createReservationQrSvg():string{
 const factory=qrcode as unknown as (version:number,correction:string)=>{addData:(data:string,mode:string)=>void;make:()=>void;getModuleCount:()=>number;isDark:(row:number,column:number)=>boolean};
 const code=factory(0,'M');code.addData(SALON_QR_LINK,'Byte');code.make();
 const count=code.getModuleCount(),side=count+8;let modules='';
 for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(code.isDark(y,x))modules+=`M${x+4} ${y+4}h1v1h-1z`;
 return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1700" viewBox="0 0 640 850" role="img" aria-label="Reserva tu cita en L’Studio Ana"><rect width="640" height="850" rx="22" fill="#29231F"/><rect x="22" y="22" width="596" height="806" rx="16" fill="none" stroke="#B9955F" stroke-width="1.5"/><text x="320" y="82" fill="#E4C687" font-family="Georgia,serif" font-size="38" text-anchor="middle">L’Studio Ana</text><text x="320" y="112" fill="#D6CBB8" font-family="Arial,sans-serif" font-size="12" letter-spacing="5" text-anchor="middle">HAIR EXPERIENCE</text><text x="320" y="160" fill="#F3E7D5" font-family="Arial,sans-serif" font-size="20" text-anchor="middle">Tu próxima cita empieza aquí</text><svg x="64" y="192" width="512" height="512" viewBox="0 0 ${side} ${side}"><rect width="${side}" height="${side}" fill="#FFFFFF"/><path d="${modules}" fill="#211D1A" shape-rendering="crispEdges"/></svg><text x="320" y="751" fill="#F3E7D5" font-family="Arial,sans-serif" font-size="18" text-anchor="middle">Escanea para reservar tu experiencia</text><text x="320" y="789" fill="#E4C687" font-family="Arial,sans-serif" font-size="17" text-anchor="middle">lstudioana.es</text></svg>`;
}
type ReadyFile={file:File;url:string};
type ReadyQr={svg:ReadyFile;png?:ReadyFile};
const button:React.CSSProperties={display:'inline-block',padding:'10px 14px',minHeight:44,boxSizing:'border-box',border:'1px solid #B9955F',borderRadius:8,background:'#3E342C',color:'#FFF8EE',cursor:'pointer',textDecoration:'none',fontSize:14};
export default function ReservationQr(){
 const [ready,setReady]=useState<ReadyQr|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const lock=useRef(false),mounted=useRef(false);
 useEffect(()=>{
  mounted.current=true;let active=true;const urls:string[]=[];const image=new Image();
  try{
   const file=new File([createReservationQrSvg()],'LStudio-QR-reservas.svg',{type:'image/svg+xml'});
   const svg={file,url:URL.createObjectURL(file)};urls.push(svg.url);setReady({svg});
   image.onload=()=>{
    if(!active)return;
    try{
     const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=1700;
     const context=canvas.getContext('2d');if(!context)throw new Error('No se pudo preparar la imagen PNG. Usa el formato SVG.');
     context.drawImage(image,0,0,1280,1700);
     canvas.toBlob(blob=>{
      if(!active)return;
      if(!blob){setError('No se pudo preparar PNG. Puedes descargar el SVG.');return;}
      const pngFile=new File([blob],'LStudio-QR-reservas.png',{type:'image/png'}),png={file:pngFile,url:URL.createObjectURL(pngFile)};urls.push(png.url);setReady({svg,png});
     },'image/png');
    }catch(value){if(active)setError(value instanceof Error?value.message:'Puedes descargar el SVG.');}
   };
   image.onerror=()=>{if(active)setError('PNG no disponible en este navegador. Descarga el SVG.');};image.src=svg.url;
  }catch(value){setError(value instanceof Error?value.message:'No se pudo generar el QR.');}
  return()=>{active=false;mounted.current=false;image.onload=null;image.onerror=null;image.src='';urls.forEach(url=>URL.revokeObjectURL(url));};
 },[]);
 const save=async(item:ReadyFile)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');
  try{
   const picker=(window as any).showSaveFilePicker;
   if(typeof picker==='function'){
    const handle=await picker.call(window,{suggestedName:item.file.name});const writable=await handle.createWritable();
    try{await writable.write(item.file);await writable.close();}catch(value){try{await writable.abort();}catch{}throw value;}
    if(mounted.current)setNotice('Archivo guardado.');
   }else if(navigator.canShare?.({files:[item.file]}))await navigator.share({files:[item.file],title:'Reservas L’Studio Ana'});
   else if(mounted.current)setNotice('Pulsa «Descargar archivo» del formato que prefieras. Si estás en Bolt, abre la web publicada.');
  }catch(value){if(mounted.current&&!(value instanceof Error&&value.name==='AbortError'))setError(value instanceof Error?value.message:'No se pudo guardar el QR.');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 return <section style={{borderTop:'1px solid #806340',paddingTop:20,display:'grid',gap:14}} aria-label="QR de reservas para el salón">
  <h4 style={{margin:0,color:'#E4C687',fontSize:18,fontWeight:400}}>Tu QR de reservas</h4>
  <p style={{margin:0,fontSize:13,lineHeight:1.7,color:'#D6CBB8'}}>Para recepción, espejos o tarjetas. El código permanece igual cuando pausas o reactivas el acceso. La impresión conserva este diseño.</p>
  {ready?<div style={{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
   <img src={ready.svg.url} alt="QR para reservar en L’Studio Ana" style={{width:230,maxWidth:'100%',height:'auto',borderRadius:10}}/>
   <div style={{display:'grid',gap:16,flex:'1 1 230px',minWidth:0}}>
    <div><p style={{fontSize:13,margin:'0 0 8px'}}>PNG · Imagen para compartir o imprimir</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button type="button" style={button} disabled={busy||!ready.png} onClick={()=>ready.png&&void save(ready.png)}>{ready.png?'Guardar PNG':'Preparando PNG…'}</button>{ready.png&&<a style={button} href={ready.png.url} download={ready.png.file.name} target="_blank" rel="noopener noreferrer">Descargar archivo PNG</a>}</div></div>
    <div><p style={{fontSize:13,margin:'0 0 8px'}}>SVG · Para imprenta, sin perder definición</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button type="button" style={button} disabled={busy} onClick={()=>void save(ready.svg)}>Guardar SVG</button><a style={button} href={ready.svg.url} download={ready.svg.file.name} target="_blank" rel="noopener noreferrer">Descargar archivo SVG</a></div></div>
    <small style={{color:'#D6CBB8',overflowWrap:'anywhere'}}>Destino: {SALON_QR_LINK}</small>
   </div>
  </div>:<p role="status">Preparando el QR…</p>}
  {error&&<p role="alert" style={{color:'#FFB4A9',margin:0}}>{error}</p>}
  <div role="status" aria-live="polite">{notice}</div>
 </section>;
}
