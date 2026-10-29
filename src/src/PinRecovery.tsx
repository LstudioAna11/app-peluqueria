import React,{useEffect,useRef,useState} from 'react';
import * as studioApi from './studioApi';

type Props={open:boolean;initialToken:string;onClose:()=>void;onSuccess:()=>void};
export default function PinRecovery({open,initialToken,onClose,onSuccess}:Props){
  const [mode,setMode]=useState<'request'|'reset'>(initialToken?'reset':'request');
  const [email,setEmail]=useState('');
  const [pin,setPin]=useState('');
  const [repeat,setRepeat]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [done,setDone]=useState(false);
  const [message,setMessage]=useState('');
  const lock=useRef(false);
  useEffect(()=>{
    if(!open)return;
    setMode(initialToken?'reset':'request');setEmail('');setPin('');setRepeat('');setError('');setDone(false);setMessage('');
  },[open,initialToken]);
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();if(lock.current)return;setError('');
    if(mode==='request'&&!/^\S+@\S+\.\S+$/.test(email.trim())){setError('Introduce el email de tu ficha.');return;}
    if(mode==='reset'&&(!/^\d{4}$/.test(pin)||pin!==repeat)){setError('Escribe el mismo PIN de cuatro cifras en ambos campos.');return;}
    lock.current=true;setBusy(true);
    try{
      if(mode==='request'){
        const result=await studioApi.requestPinReset(email.trim().toLowerCase());
        setMessage(result.message);setDone(true);
      }else{
        await studioApi.completePinReset(initialToken,pin);
        setPin('');setRepeat('');setDone(true);onSuccess();
      }
    }catch(value){setError(value instanceof Error?value.message:'No se pudo completar la solicitud. Reintenta.');}
    finally{lock.current=false;setBusy(false);}
  };
  if(!open)return null;
  const field:React.CSSProperties={display:'block',width:'100%',boxSizing:'border-box',marginTop:8,padding:13,border:'1px solid #8C6A4B',borderRadius:6,background:'#29231F',color:'#FFF8EE',fontSize:15};
  const button:React.CSSProperties={width:'100%',minHeight:48,padding:12,border:0,borderRadius:6,background:'#C99E52',color:'#29231F',fontSize:14,fontWeight:600,cursor:busy?'wait':'pointer'};
  return <div style={{position:'fixed',inset:0,zIndex:5000,background:'rgba(20,16,13,.94)',overflowY:'auto',padding:'32px 16px',boxSizing:'border-box',display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
    <section role="dialog" aria-modal="true" aria-labelledby="pin-recovery-title" aria-busy={busy} style={{width:'100%',maxWidth:430,margin:'auto 0',boxSizing:'border-box',padding:24,background:'#322A25',border:'1px solid #8C6A4B',borderRadius:12,color:'#FFF8EE'}}>
      <p style={{fontSize:11,letterSpacing:2,color:'#E4C687',margin:'0 0 12px'}}>L’STUDIO ANA</p>
      <h2 id="pin-recovery-title" style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:25,fontWeight:400,margin:'0 0 14px'}}>{done&&mode==='reset'?'Tu PIN está actualizado':mode==='reset'?'Elige tu nuevo PIN':'Recupera tu acceso'}</h2>
      {done?<>
        <p role="status" style={{fontSize:14,lineHeight:1.7,color:'#D6CBB8'}}>{mode==='reset'?'Ya puedes entrar con tu nuevo PIN. Conservas tu ficha, tus citas y tu pasaporte.':message}</p>
        <button type="button" style={button} onClick={onClose}>Volver al acceso</button>
      </>:<>
        <p style={{fontSize:13,lineHeight:1.7,color:'#D6CBB8'}}>{mode==='request'?'Introduce el email de tu ficha y te enviaremos un enlace para elegir un PIN nuevo.':'El enlace caduca a los 15 minutos. Elige un PIN de cuatro cifras y confírmalo.'}</p>
        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:16}}>
          {mode==='request'?<label style={{fontSize:13}}>Email de tu ficha<input autoFocus type="email" required maxLength={254} autoComplete="email" value={email} disabled={busy} onChange={event=>setEmail(event.target.value)} style={field}/></label>:<>
            <label style={{fontSize:13}}>Nuevo PIN<input autoFocus type="password" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="new-password" value={pin} disabled={busy} onChange={event=>setPin(event.target.value.replace(/\D/g,'').slice(0,4))} style={field}/></label>
            <label style={{fontSize:13}}>Repite el PIN<input type="password" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="new-password" value={repeat} disabled={busy} onChange={event=>setRepeat(event.target.value.replace(/\D/g,'').slice(0,4))} style={field}/></label>
          </>}
          {error&&<p role="alert" style={{fontSize:13,lineHeight:1.6,color:'#F2B8AC',margin:0}}>{error}</p>}
          <button type="submit" disabled={busy} style={button}>{busy?'Un momento…':mode==='request'?'Enviar enlace':'Guardar nuevo PIN'}</button>
        </form>
        {mode==='reset'&&<button type="button" disabled={busy} onClick={()=>{setMode('request');setPin('');setRepeat('');setError('');}} style={{background:'none',border:0,color:'#E4C687',padding:'12px 0',minHeight:44,fontSize:12,cursor:'pointer'}}>Solicitar otro enlace</button>}
        <button type="button" disabled={busy} onClick={onClose} style={{display:'block',background:'none',border:0,color:'#D6CBB8',padding:'12px 0',minHeight:44,fontSize:12,cursor:'pointer'}}>Volver al acceso</button>
      </>}
    </section>
  </div>;
}
