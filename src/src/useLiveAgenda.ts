import {useEffect,useRef,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import * as api from './studioApi';

// No appointment details travel over Broadcast; rows are read through the authenticated API.
export function useLiveAgenda(enabled:boolean,onRows:(rows:Record<string,any>[])=>void){
  const [status,setStatus]=useState('Conexión de la agenda…');
  const [notice,setNotice]=useState('');
  const applyRef=useRef(onRows);applyRef.current=onRows;
  const refreshRef=useRef<()=>void>(()=>{});
  useEffect(()=>{
    if(!enabled)return;
    let stopped=false,client:ReturnType<typeof createClient>|null=null,channel:ReturnType<ReturnType<typeof createClient>['channel']>|null=null;
    let timer:ReturnType<typeof setTimeout>|undefined,busy=false,again=false,ready=false;
    let ids=new Set<string>();
    const token=api.currentToken();
    const refresh=async()=>{
      if(stopped||!token||document.hidden)return;
      if(busy){again=true;return;}
      busy=true;
      try{
        const data=await api.syncAll<{appointments?:Record<string,any>[];role?:string}>(token,['appointments']);
        if(stopped||api.currentToken()!==token)return;
        if(data.role!=='admin'||!Array.isArray(data.appointments))throw new Error('No se pudo actualizar la agenda.');
        const nextIds=new Set(data.appointments.map(row=>String(row.id)));
        const added=ready?data.appointments.filter(row=>!ids.has(String(row.id))):[];
        ids=nextIds;ready=true;
        applyRef.current(data.appointments);
        if(added.length)setNotice(added.length===1?'Nueva cita recibida':'Nuevas citas recibidas: '+added.length);
      }catch(error){if(!stopped)setStatus('No se pudo actualizar la agenda. Pulsa Actualizar.');}
      finally{busy=false;if(again&&!stopped){again=false;void refresh();}}
    };
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>void refresh(),250);};
    refreshRef.current=()=>void refresh();
    let connectionGeneration=0;
    const connect=async()=>{
      const generation=++connectionGeneration;
      if(!token||document.hidden||stopped)return;
      try{
        const config=await api.fetchAgendaLive(token);
        if(stopped||document.hidden||generation!==connectionGeneration)return;
        client=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
        channel=client.channel(config.topic,{config:{private:false}})
          .on('broadcast',{event:'appointments_changed'},schedule)
          .subscribe((state)=>{
            if(stopped)return;
            if(state==='SUBSCRIBED'){setStatus('Agenda conectada en directo');void refresh();}
            else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT'||state==='CLOSED')setStatus('Conexión de agenda interrumpida. Pulsa Actualizar.');
          });
      }catch{if(!stopped)setStatus('No se pudo conectar la agenda en directo. Pulsa Actualizar.');}
    };
    const disconnect=()=>{connectionGeneration++;if(client&&channel)void client.removeChannel(channel);channel=null;if(client)client.realtime.disconnect();client=null;};
    const visibility=()=>{if(document.hidden){disconnect();setStatus('Agenda en pausa mientras esta pestaña está oculta');}else void connect();};
    const focus=()=>{if(!document.hidden)void refresh();};
    document.addEventListener('visibilitychange',visibility);window.addEventListener('focus',focus);
    void connect();
    return()=>{stopped=true;clearTimeout(timer);disconnect();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('focus',focus);refreshRef.current=()=>{};};
  },[enabled]);
  return {status,notice,dismiss:()=>setNotice(''),refresh:()=>refreshRef.current()};
}