import React,{useEffect,useRef,useState} from 'react';
import * as studioApi from './studioApi';
import {createClientWorkbook,type ExportClient} from './clientExcel';
import {offlineConsultation} from './offlineSession';
const style:React.CSSProperties={padding:'10px 14px',background:'#3E342C',color:'#E4C687',border:'1px solid #B9955F',borderRadius:8,cursor:'pointer'};
type Prepared={file:File;url:string;owner:string;count:number};
export default function ClientExcelExport(){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[prepared,setPrepared]=useState<Prepared|null>(null);
  const ref=useRef<Prepared|null>(null),mounted=useRef(false),lock=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(ref.current)URL.revokeObjectURL(ref.current.url);ref.current=null;};},[]);
  const valid=(owner:string)=>studioApi.currentToken()===owner&&studioApi.storedRole()==='admin'&&!offlineConsultation();
  const prepare=async()=>{
    if(lock.current)return;const owner=studioApi.currentToken();
    if(!owner||!valid(owner)){setError('Conecta y accede a la intranet para exportar las clientas.');return;}
    lock.current=true;setBusy(true);setError('');
    if(ref.current)URL.revokeObjectURL(ref.current.url);ref.current=null;setPrepared(null);
    try{
      // Existing complete, authenticated backup endpoint: no row-cap truncation and no photo download.
      const source=await studioApi.fetchStudioBackup<{snapshot:{snapshotVersion:number;tables:{studio_clients:ExportClient[]};counts:Record<string,number>}}>(owner,false);
      if(!mounted.current)return;
      if(!valid(owner))throw new Error('La sesión ha cambiado. Prepara de nuevo la exportación.');
      const clients=source.snapshot?.tables?.studio_clients;
      if(source.snapshot?.snapshotVersion!==1||!Array.isArray(clients)||source.snapshot.counts?.studio_clients!==clients.length)throw new Error('No se recibió el listado completo. No se exportará un archivo parcial.');
      const file=new File([createClientWorkbook(clients)],'LStudio-clientas-'+new Date().toISOString().slice(0,10)+'.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const next={file,url:URL.createObjectURL(file),owner,count:clients.length};ref.current=next;setPrepared(next);
    }catch(value){if(mounted.current)setError(value instanceof Error?value.message:'No se pudo preparar Excel.');}
    finally{lock.current=false;if(mounted.current)setBusy(false);}
  };
  const save=async()=>{
    if(!prepared||lock.current)return;
    if(!valid(prepared.owner)){setError('Vuelve a entrar en la intranet y prepara otra exportación.');return;}
    setError('');lock.current=true;setBusy(true);
    try{
      const picker=(window as any).showSaveFilePicker;
      if(typeof picker==='function'){
        const handle=await picker.call(window,{suggestedName:prepared.file.name,types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}]});
        if(!valid(prepared.owner))throw new Error('La sesión ha cambiado.');
        const writable=await handle.createWritable();try{await writable.write(prepared.file);await writable.close();}catch(error){try{await writable.abort();}catch{}throw error;}
      }else if(navigator.canShare?.({files:[prepared.file]}))await navigator.share({files:[prepared.file],title:'Clientas L’Studio Ana'});
      else setError('Pulsa «Descargar archivo Excel» para guardarlo. Si estás en Bolt, abre primero la web publicada.');
    }catch(value){if(!(value instanceof Error&&value.name==='AbortError'))setError(value instanceof Error?value.message:'No se pudo guardar el archivo.');}
    finally{lock.current=false;setBusy(false);}
  };
  return <section style={{border:'1px solid #806340',borderRadius:10,padding:14,display:'grid',gap:10}} aria-label="Exportación de clientas">
    <div><button type="button" style={style} disabled={busy} onClick={()=>void prepare()}>{busy?'Preparando…':'Exportar a Excel'}</button></div>
    <small>Todas las clientas guardadas, incluidas las dadas de baja. Número, nombre, apellidos, teléfono y email. Sin PIN ni notas internas.</small>
    {prepared&&<><span>{prepared.count} clientas · Archivo preparado</span><div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button type="button" style={style} disabled={busy} onClick={()=>void save()}>Guardar Excel</button><a style={style} href={prepared.url} download={prepared.file.name} target="_blank" rel="noopener" onClick={e=>{if(!valid(prepared.owner)){e.preventDefault();setError('La sesión ha cambiado. Prepara otra exportación.');}}}>Descargar archivo Excel</a></div></>}
    {error&&<p role="alert" style={{margin:0}}>{error}</p>}
  </section>;
}
