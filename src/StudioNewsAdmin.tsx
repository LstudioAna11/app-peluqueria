import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import * as studioApi from './studioApi';
import {prepareCatalogImage} from './catalogImage';
import {verifyCatalogPhotoUrl} from './catalogPhotoDrafts';
const NEWS_CATEGORIES:Record<string,string>={servicios:'Nuevos servicios',cuidados:'Cuidados e inspiración',studio:'Vida en L’Studio',avisos:'Avisos del estudio'};
type NewsOption={id:string;label:string};
const newsToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const newsDate=(date:string)=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(date.slice(0,10)+'T12:00:00Z'));
function newsState(item:studioApi.StudioNewsSummary,today=newsToday()){return item.status==='draft'?'Borrador':item.start_date&&item.start_date>today?'Programada':item.end_date&&item.end_date<today?'Finalizada':'Publicada';}
const emptyNews=():studioApi.StudioNews=>({id:crypto.randomUUID(),title:'',summary:'',body:'',category:'studio',image_url:'',status:'draft',start_date:null,end_date:null,action:'none',service_id:null,created_at:'',updated_at:''});
export default function StudioNewsAdmin({admin=true,serviceOptions=[],onService}:{admin?:boolean;serviceOptions?:NewsOption[];onService?:(id:string,action:'service'|'booking')=>void}){
  const [filter,setFilter]=useState('Publicada'),[search,setSearch]=useState('');
  const [view,setView]=useState<'latest'|'list'|'detail'>(admin?'list':'latest');
  const [page,setPage]=useState(0),[list,setList]=useState<studioApi.StudioNewsPage|null>(null),[detail,setDetail]=useState<studioApi.StudioNews|null>(null);
  const [draft,setDraft]=useState<studioApi.StudioNews|null>(null),[preview,setPreview]=useState(false),[deleting,setDeleting]=useState<string|null>(null);
  const [busy,setBusy]=useState(false),[writing,setWriting]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const mounted=useRef(false),generation=useRef(0),writeLock=useRef(false),photoLock=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
  const token=()=>{const t=studioApi.currentToken();if(!t)throw new Error('Vuelve a iniciar sesión para consultar las novedades.');return t;};
  const report=(value:unknown)=>setError(value instanceof Error?value.message:'No se pudo completar la operación.');
  const load=async()=>{
    const request=++generation.current;setBusy(true);setError('');
    try{
      const session=token(),first=await studioApi.fetchNews(session,0,false);let items=[...first.items];
      if(!Number.isInteger(first.total)||first.total<0||first.total>4000||first.pageSize!==8)throw new Error('No se pudo comprobar el listado de novedades.');
      // Only summaries are loaded. Full text and images are requested when needed.
      for(let next=1;next<Math.ceil(first.total/8);next++){
        if(!mounted.current||request!==generation.current||studioApi.currentToken()!==session)return;
        const part=await studioApi.fetchNews(session,next,false);
        if(part.total!==first.total)throw new Error('Las publicaciones han cambiado. Pulsa Actualizar para ver el listado completo.');
        items.push(...part.items);
      }
      items=[...new Map(items.map(item=>[item.id,item])).values()];
      if(items.length!==first.total)throw new Error('El listado ha cambiado. Pulsa Actualizar para volver a comprobarlo.');
      if(mounted.current&&request===generation.current&&studioApi.currentToken()===session)setList({...first,items});
    }
    catch(e){if(mounted.current&&request===generation.current)report(e);}
    finally{if(mounted.current&&request===generation.current)setBusy(false);}
  };
  useEffect(()=>{if(view!=='detail')void load();},[admin,view]);
  // Refresh when returning to the app; no polling or background downloads.
  useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible'&&view!=='detail'&&!writeLock.current&&!photoLock.current)void load();};document.addEventListener('visibilitychange',refresh);return()=>document.removeEventListener('visibilitychange',refresh);},[admin,view]);
  const open=async(id:string,editing=false)=>{
    if(writeLock.current||photoLock.current)return;const request=++generation.current;setBusy(true);setError('');setMessage('');
    try{const {item}=await studioApi.fetchNewsDetail(token(),id);if(!mounted.current||request!==generation.current)return;if(editing){setDraft(item);setPreview(false);setDeleting(null);}else{setDetail(item);setView('detail');}}
    catch(e){if(mounted.current&&request===generation.current)report(e);}
    finally{if(mounted.current&&request===generation.current)setBusy(false);}
  };
  const change=(patch:Partial<studioApi.StudioNews>)=>setDraft(current=>current?{...current,...patch}:current);
  const save=async(event:React.FormEvent)=>{
    event.preventDefault();if(!draft||writeLock.current||photoLock.current)return;writeLock.current=true;setWriting(true);setError('');setMessage('');
    try{const {item}=await studioApi.saveNews(token(),draft);if(!mounted.current)return;setDraft(item);setMessage(item.status==='draft'?'Borrador guardado. Solo se ve en intranet.':newsState(item,today)==='Programada'?'Publicación programada. Aparecerá en la fecha indicada.':newsState(item,today)==='Finalizada'?'Guardada fuera de las fechas de publicación. No se muestra en el portal.':'Publicación guardada. Ya está disponible en el portal.');await load();}
    catch(e){if(mounted.current)report(e);}
    finally{writeLock.current=false;if(mounted.current)setWriting(false);}
  };
  const remove=async(item:studioApi.StudioNewsSummary)=>{
    if(writeLock.current||photoLock.current)return;writeLock.current=true;setWriting(true);setError('');setMessage('');
    try{await studioApi.deleteNews(token(),item.id,item.updated_at);if(!mounted.current)return;if(draft?.id===item.id)setDraft(null);setDeleting(null);setMessage('Publicación eliminada.');await load();}
    catch(e){if(mounted.current)report(e);}
    finally{writeLock.current=false;if(mounted.current)setWriting(false);}
  };
  const upload=async(file:File|undefined)=>{
    if(!file||!draft||writeLock.current||photoLock.current)return;photoLock.current=true;setUploading(true);setError('');setMessage('');const id=draft.id;
    try{const prepared=await prepareCatalogImage(file,true);const result=await studioApi.uploadServiceImage(token(),prepared.dataUrl);await verifyCatalogPhotoUrl(result.url);if(mounted.current){setDraft(current=>current?.id===id?{...current,image_url:result.url}:current);setMessage('Foto preparada. Guarda la publicación para conservarla.');}}
    catch(e){if(mounted.current)report(e);}
    finally{photoLock.current=false;if(mounted.current)setUploading(false);}
  };
  const today=newsToday();
  const stateCounts=Object.fromEntries(['Publicada','Programada','Borrador','Finalizada'].map(state=>[state,list?.items.filter(item=>newsState(item,today)===state).length||0]));
  const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const filtered=(list?.items||[]).filter(item=>(filter==='all'||newsState(item,today)===filter)&&(!search.trim()||normalize(item.title+' '+item.summary).includes(normalize(search.trim()))));
  const totalPages=Math.max(1,Math.ceil(filtered.length/8)),currentPage=Math.min(page,totalPages-1),visible=filtered.slice(currentPage*8,currentPage*8+8);
  const setTab=(state:string)=>{setFilter(state);setPage(0);setDeleting(null);};
  const publicationDates=(item:studioApi.StudioNewsSummary)=>item.start_date&&item.end_date?'Del '+newsDate(item.start_date)+' al '+newsDate(item.end_date):item.start_date?'Desde '+newsDate(item.start_date):item.end_date?'Hasta '+newsDate(item.end_date):'Sin límite de fechas';
  const article=(item:studioApi.StudioNews,forPreview=false)=><article className="lst-news-article">
    {item.image_url&&<img src={item.image_url} alt={item.title} loading="lazy" decoding="async" className="lst-news-cover"/>}
    <div className="lst-news-inner"><small>{NEWS_CATEGORIES[item.category]}</small><h3>{item.title||'Título de la novedad'}</h3><p className="lst-news-lead">{item.summary}</p><p className="lst-news-body">{item.body||'Aquí aparecerá el texto completo.'}</p>
      {item.action!=='none'&&item.service_id&&(forPreview||serviceOptions.some(s=>s.id===item.service_id))&&<button type="button" disabled={forPreview} className="lst-news-primary" onClick={()=>{if(!forPreview)onService?.(item.service_id!,item.action as 'service'|'booking');}}>{item.action==='booking'?'Elegir y reservar':'Ver servicio'} <ArrowRight size={15}/></button>}
    </div></article>;
  // No empty placeholder or loading flash on the portal home. Keep all hooks above this return.
  if(!admin&&view==='latest'&&!error&&(!list||list.items.length===0))return null;
  return <section className={`lst-news ${admin?'lst-news-admin':'lst-news-portal'}`} aria-label="El universo L’Studio">
    <style>{`
      .lst-news{color:#302822;min-width:0;font-size:13px;line-height:1.6;overflow-wrap:anywhere}
      .lst-news *{box-sizing:border-box}.lst-news h2,.lst-news h3,.lst-news p{margin:0}.lst-news h2{font-family:Georgia,serif;font-size:23px;font-weight:400;color:#E4C687;line-height:1.3}.lst-news h3{font-family:Georgia,serif;font-size:21px;font-weight:400;color:#876431;line-height:1.3}
      .lst-news-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}.lst-news-sub{color:#D6CBB8;font-size:12px;margin-top:4px!important}
      .lst-news button{min-height:44px;padding:9px 13px;border:1px solid #BBA47F;border-radius:9px;cursor:pointer;font-size:12px;background:#F4EFE7;color:#302822;display:inline-flex;align-items:center;justify-content:center;gap:6px}.lst-news button:disabled{opacity:.55;cursor:default}.lst-news button:focus-visible,.lst-news input:focus-visible,.lst-news textarea:focus-visible,.lst-news select:focus-visible{outline:2px solid #C49A58;outline-offset:3px}
      .lst-news button.lst-news-primary{background:#C49A58;color:#29231F;border-color:#C49A58;font-weight:600}.lst-news-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px}.lst-news-card,.lst-news-article,.lst-news-editor{background:#F4EFE7;border:1px solid #C8B79A;border-radius:13px;overflow:hidden}.lst-news-inner{padding:16px;display:flex;flex-direction:column;gap:10px}.lst-news small{font-size:11px;color:#705B40;letter-spacing:.03em}.lst-news-cover{width:100%;height:180px;object-fit:cover;display:block}.lst-news-article .lst-news-cover{height:auto;max-height:420px;object-fit:contain;background:#E8DFD1}.lst-news-lead{font-size:13px;color:#665448}.lst-news-body{font-size:13px;line-height:1.8;white-space:pre-wrap;color:#302822}.lst-news-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.lst-news-pagination{display:flex;gap:12px;align-items:center;justify-content:center;margin-top:14px;color:#E8D9C4}
      .lst-news-editor{padding:18px;margin-bottom:18px;display:grid;gap:12px}.lst-news-editor label{display:grid;gap:5px;font-size:12px;color:#493B2E}.lst-news-editor input,.lst-news-editor select,.lst-news-editor textarea{font:inherit;font-size:13px;width:100%;min-height:44px;background:#FFFDF9;color:#302822;border:1px solid #BBA47F;border-radius:7px;padding:10px;resize:vertical;color-scheme:light}.lst-news-editor fieldset{border:0;padding:0;margin:0;min-width:0;display:grid;gap:12px}.lst-news-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px}.lst-news-status{color:#DFD1BB;margin:8px 0!important}.lst-news-error{background:#F8DFD7;color:#782D20;padding:12px;border-radius:9px;margin-bottom:12px!important}.lst-news-message{background:#E4EAD9;color:#35452B;padding:12px;border-radius:9px;margin-bottom:12px!important}.lst-news-empty{background:#F4EFE7;border-radius:12px;padding:18px;color:#5C4A37}.lst-news-preview{border-top:1px solid #C8B79A;padding-top:12px;margin-top:8px}

      .lst-news-portal{padding-top:19px;border-top:1px solid rgba(212,187,143,.22)}
      .lst-news-portal .lst-news-header{margin-bottom:17px;align-items:flex-start}
      .lst-news-portal h2{font-family:'Cormorant Garamond','Playfair Display',Georgia,serif;font-size:21px;letter-spacing:.025em;color:#DDC49B}
      .lst-news-portal .lst-news-sub{font-size:11px;line-height:1.6;color:#B9AA96;margin-top:5px!important}
      .lst-news-portal button:not(.lst-news-primary){background:transparent;border:0;border-radius:3px;padding:9px 0;color:#DCC6A4;font-size:11px;letter-spacing:.035em;min-height:44px;justify-content:flex-start}
      .lst-news-portal button:not(.lst-news-primary):hover{text-decoration:underline;text-underline-offset:5px}
      .lst-news-portal .lst-news-card{border:1px solid rgba(200,173,129,.23);background:#2C251F;border-radius:9px;box-shadow:none}
      .lst-news-portal .lst-news-card h3{font-size:19px;color:#E7D8C0}
      .lst-news-portal .lst-news-card .lst-news-lead{color:#C9BCA9;font-size:12px}
      .lst-news-portal .lst-news-card small{color:#BBA687;font-size:10px}
      .lst-news-portal .lst-news-grid{gap:17px}
      .lst-news-portal .lst-news-article{border:1px solid #C8B79A;border-radius:9px}
      .lst-news-portal .lst-news-article h3{font-size:22px;color:#795C36}
      .lst-news-portal .lst-news-article .lst-news-inner{padding:22px;gap:14px}
      .lst-news-portal .lst-news-article .lst-news-body{font-size:13px;line-height:1.9}
      .lst-news-portal .lst-news-article .lst-news-primary{font-size:12px;align-self:flex-start;padding:10px 17px}
      .lst-news-feature{position:relative;isolation:isolate;overflow:hidden;border-radius:10px;border:1px solid rgba(200,173,129,.32);background:linear-gradient(135deg,#44362B,#231D18);min-height:250px;display:flex;align-items:flex-end}
      .lst-news-feature>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
      .lst-news-feature::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,12,9,.08) 0%,rgba(16,12,9,.36) 28%,rgba(16,12,9,.90) 68%,rgba(16,12,9,.97) 100%);z-index:-1;pointer-events:none}
      .lst-news-feature-content{width:100%;padding:62px 22px 17px;display:flex;flex-direction:column;align-items:flex-start;gap:9px}
      .lst-news-feature-content>small{color:#E4CEAC;font-size:9px;letter-spacing:.15em;text-transform:uppercase}
      .lst-news-feature-content>h3{color:#FFF5E5;font-size:25px;line-height:1.22;max-width:28ch;letter-spacing:.015em;text-wrap:pretty}
      .lst-news-feature-content>p{font-size:12px;line-height:1.65;color:#E2D5C2;max-width:48ch;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .lst-news-portal .lst-news-feature button{color:#F1D7B1;border-bottom:1px solid rgba(228,198,151,.55);min-height:44px;border-radius:0;padding:7px 0;gap:12px;font-size:11px}
      .lst-news-footer{display:flex;justify-content:flex-end;margin-top:3px}
      @media(max-width:420px){.lst-news-portal h2{font-size:20px}.lst-news-feature{min-height:245px}.lst-news-feature-content{padding:58px 18px 16px}.lst-news-feature-content>h3{font-size:23px}.lst-news-portal .lst-news-article .lst-news-inner{padding:18px}}

      .lst-news-admin{color:#FFF8EE}.lst-news-admin h2{font-size:25px}.lst-news-admin .lst-news-admin-controls{display:grid;gap:12px;margin:18px 0}
      .lst-news-admin .lst-news-tabs{display:flex;gap:8px;flex-wrap:wrap}.lst-news-admin .lst-news-tabs button[aria-pressed=true]{background:#C49A58;color:#29231F;border-color:#C49A58}.lst-news-tabs span{font-size:11px;opacity:.8}
      .lst-news-admin button:not(.lst-news-primary){background:transparent;color:#E4C687;border-color:#756047}.lst-news-admin .lst-news-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .lst-news-admin .lst-news-card{background:#29231F;border:1px solid #655039;border-radius:11px;display:flex;flex-direction:column}.lst-news-admin .lst-news-card .lst-news-cover{height:115px;object-fit:cover}.lst-news-admin .lst-news-card .lst-news-inner{padding:16px;gap:8px;flex:1}
      .lst-news-admin .lst-news-card h3{color:#E4C687;font-size:21px}.lst-news-admin .lst-news-card .lst-news-lead{color:#D6CBB8;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.lst-news-admin .lst-news-card small{color:#BDAE99}
      .lst-news-admin .lst-news-card .lst-news-actions{margin-top:auto;padding-top:7px}.lst-news-card-meta{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}.lst-news-badge{font-size:10px;border:1px solid #756047;padding:3px 8px;border-radius:20px;color:#D6CBB8}.lst-news-badge.state-Publicada{color:#BDE1B8;border-color:#526A4B}.lst-news-badge.state-Programada{color:#E4C687}.lst-news-dates{font-size:10px!important}
      .lst-news-admin .lst-news-empty{background:#29231F;border:1px dashed #756047;color:#D6CBB8;text-align:center;padding:30px 18px;display:grid;justify-items:center;gap:12px}.lst-news-admin .lst-news-empty strong{font-weight:400;font-family:Georgia,serif;font-size:20px;color:#E4C687}
      .lst-news-admin .lst-news-search{display:grid;gap:5px;max-width:430px;font-size:11px;color:#D6CBB8}.lst-news-admin .lst-news-search input,.lst-news-admin .lst-news-editor input,.lst-news-admin .lst-news-editor select,.lst-news-admin .lst-news-editor textarea{width:100%;padding:10px;border-radius:8px;border:1px solid #756047;background:#29231F;color:#FFF8EE;min-height:44px;font:inherit;color-scheme:dark}
      .lst-news-admin .lst-news-editor{background:#322A25;border-color:#756047}.lst-news-admin .lst-news-editor h3{color:#E4C687}.lst-news-admin .lst-news-editor label,.lst-news-admin .lst-news-editor small{color:#D6CBB8}
      .lst-news-admin .lst-news-more{position:relative;margin-left:auto;align-self:flex-end}.lst-news-more summary{cursor:pointer;list-style:none;min-height:44px;min-width:44px;display:flex;align-items:center;justify-content:center;font-size:23px;color:#E4C687;border:1px solid #756047;border-radius:8px}.lst-news-more summary::-webkit-details-marker{display:none}.lst-news-more summary:focus-visible{outline:2px solid #E4C687;outline-offset:3px}.lst-news-admin .lst-news-more>button{display:block;margin-top:7px;color:#FFB4A9;font-size:11px}
      .lst-news-client-preview{max-width:740px;margin:0 auto}.lst-news-admin .lst-news-client-preview .lst-news-portal{border-top:0;padding-top:0}.lst-news-admin .lst-news-client-preview .lst-news-body{color:#302822}.lst-news-admin .lst-news-client-preview .lst-news-article small{color:#705B40}
      .lst-news-admin .lst-news-preview .lst-news-article{margin-top:10px}.lst-news-admin .lst-news-preview .lst-news-article small{color:#705B40}.lst-news-admin .lst-news-preview .lst-news-article h3{color:#876431}.lst-news-admin .lst-news-preview .lst-news-article .lst-news-primary{align-self:flex-start}
      @media(max-width:800px){.lst-news-admin .lst-news-grid{grid-template-columns:1fr}.lst-news-admin .lst-news-card .lst-news-cover{height:120px}}@media(max-width:480px){.lst-news-admin .lst-news-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.lst-news-admin .lst-news-header>.lst-news-actions{width:100%}.lst-news-admin .lst-news-header>.lst-news-actions>button{flex:1}.lst-news-admin .lst-news-card .lst-news-actions{gap:6px}.lst-news-admin .lst-news-card .lst-news-actions>button{font-size:11px;padding:8px}.lst-news-admin .lst-news-card .lst-news-cover{height:100px}}
    `}</style>
    <header className="lst-news-header"><div><h2>Novedades del portal</h2><p className="lst-news-sub">Publica, programa y revisa lo que ven tus clientas.</p></div><div className="lst-news-actions">
      {admin&&<button type="button" disabled={writing||uploading||busy} className="lst-news-primary" onClick={()=>{setDraft(emptyNews());setPreview(false);setError('');setMessage('');setDeleting(null);}}>+ Nueva publicación</button>}
      {!admin&&view!=='latest'&&<button type="button" onClick={()=>{setDetail(null);setView(view==='detail'?'list':'latest');setPage(0);setError('');}}> <ArrowLeft size={15}/> {view==='detail'?'Novedades':'Volver'}</button>}
      {admin&&view==='detail'&&<button type="button" onClick={()=>{setDetail(null);setView('list');setError('');}}>← Volver a publicaciones</button>}
      {admin&&view!=='detail'&&<button type="button" disabled={busy||writing||uploading} onClick={()=>void load()} aria-label="Actualizar novedades">Actualizar</button>}
    </div></header>
    {view!=='detail'&&<div className="lst-news-admin-controls"><nav aria-label="Estado de las publicaciones" className="lst-news-tabs">{[['Publicada','Activas'],['Programada','Programadas'],['Borrador','Borradores'],['Finalizada','Histórico'],['all','Todas']].map(([value,label])=><button type="button" key={value} aria-pressed={filter===value} disabled={writing||uploading} onClick={()=>setTab(value)}>{label} <span>{list?(value==='all'?list.total:stateCounts[value]):'—'}</span></button>)}</nav><label className="lst-news-search">Buscar publicación<input type="search" value={search} maxLength={120} placeholder="Título o contenido del resumen…" onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label></div>}
    {error&&<div className="lst-news-error"><p role="alert">{error}</p>{!admin&&<button type="button" disabled={busy} onClick={()=>void load()}>Reintentar</button>}</div>}{message&&<p role="status" className="lst-news-message">{message}</p>}
    {admin&&draft&&view!=='detail'&&<form onSubmit={save} className="lst-news-editor"><h3>{draft.updated_at?'Editar publicación':'Nueva publicación'}</h3><fieldset disabled={writing||uploading}>
      <label>Título<input required maxLength={100} value={draft.title} onChange={e=>change({title:e.target.value})} placeholder="Una novedad para tu cabello"/></label>
      <label>Resumen de la tarjeta<textarea required maxLength={240} rows={2} value={draft.summary} onChange={e=>change({summary:e.target.value})}/></label>
      <label>Texto completo<textarea required maxLength={6000} rows={7} value={draft.body} onChange={e=>change({body:e.target.value})}/></label>
      <div className="lst-news-fields"><label>Sección<select value={draft.category} onChange={e=>change({category:e.target.value as studioApi.StudioNews['category']})}>{Object.entries(NEWS_CATEGORIES).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Visibilidad<select value={draft.status} onChange={e=>change({status:e.target.value as 'draft'|'published'})}><option value="draft">Borrador · solo intranet</option><option value="published">Publicar en el portal</option></select></label></div>
      <div className="lst-news-fields"><label>Publicar desde (opcional)<input type="date" value={draft.start_date||''} onChange={e=>change({start_date:e.target.value||null})}/></label><label>Mostrar hasta (opcional)<input type="date" min={draft.start_date||undefined} value={draft.end_date||''} onChange={e=>change({end_date:e.target.value||null})}/></label></div>
      <small>Las fechas siguen el horario de Elche. La fecha final está incluida. Sin fechas, una publicación activa se muestra hasta que la retires.</small>
      <label>Foto pública de la novedad (opcional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];e.target.value='';void upload(file);}}/></label>
      {draft.image_url&&<div className="lst-news-actions"><img src={draft.image_url} alt="Foto elegida" style={{width:120,height:85,objectFit:'cover',borderRadius:8}}/><button type="button" onClick={()=>change({image_url:''})}>Quitar de la publicación</button></div>}
      <div className="lst-news-fields"><label>Botón al final<select value={draft.action} onChange={e=>change({action:e.target.value as studioApi.StudioNews['action'],service_id:e.target.value==='none'?null:draft.service_id})}><option value="none">Sin botón</option><option value="service">Ver servicio</option><option value="booking">Elegir y reservar</option></select></label>
      {draft.action!=='none'&&<label>Servicio del botón<select required value={draft.service_id||''} onChange={e=>change({service_id:e.target.value||null})}><option value="">Selecciona un servicio</option>{draft.service_id&&!serviceOptions.some(s=>s.id===draft.service_id)&&<option value={draft.service_id}>Servicio no disponible · elige otro</option>}{serviceOptions.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>}</div>
      {draft.action==='booking'&&<small>El botón abre la ficha del servicio para elegir sus opciones y complementos antes de reservar.</small>}
      <div className="lst-news-actions"><button type="submit" className="lst-news-primary">{writing?'Guardando…':draft.status==='draft'?'Guardar borrador':'Guardar publicación'}</button><button type="button" onClick={()=>setPreview(v=>!v)}>{preview?'Ocultar vista previa':'Vista previa'}</button><button type="button" onClick={()=>{setDraft(null);setPreview(false);setMessage('');}}>Cerrar editor</button></div>
    </fieldset>{uploading&&<p role="status">Optimizando y preparando la foto…</p>}{preview&&<div className="lst-news-preview"><small>Vista previa del portal</small>{article(draft,true)}</div>}</form>}
    {busy&&<p role="status" className="lst-news-status">Cargando novedades…</p>}
    {view==='detail'&&detail?<div className="lst-news-client-preview"><p className="lst-news-status">Vista de clienta · {newsState(detail,today)}{newsState(detail,today)!=='Publicada'?' · Esta publicación no se muestra actualmente en el portal.':''}</p><div className="lst-news-portal">{article(detail,true)}</div><p className="lst-news-status">Los botones de servicio y reserva están desactivados en esta vista previa.</p></div>:!admin&&view==='latest'?<>
      {list?.items.slice(0,1).map(item=><article key={item.id} className="lst-news-feature">
        {item.image_url&&<img src={item.image_url} alt="" loading="lazy" decoding="async"/>}
        <div className="lst-news-feature-content"><small>{NEWS_CATEGORIES[item.category]}</small><h3>{item.title}</h3><p>{item.summary}</p>
          <button type="button" disabled={busy} aria-label={'Descubrir: '+item.title} onClick={()=>void open(item.id)}>Descubrir <ArrowRight size={15}/></button>
        </div>
      </article>)}
      {!!list?.total&&<div className="lst-news-footer"><button type="button" onClick={()=>{setPage(0);setView('list');}}>Ver todas las novedades <ArrowRight size={14}/></button></div>}
    </>:<>
      {!busy&&list&&!filtered.length&&<div className="lst-news-empty"><strong>{search?'No hay publicaciones con esa búsqueda.':filter==='Publicada'?'No hay novedades activas en el portal.':'No hay publicaciones en este apartado.'}</strong>{!search&&filter==='Publicada'&&stateCounts.Finalizada>0&&<><p>Las publicaciones finalizadas se conservan en el histórico.</p><button type="button" onClick={()=>setTab('Finalizada')}>Ver histórico →</button></>}</div>}
      <div className="lst-news-grid">{visible.map(item=><article key={item.id} className="lst-news-card">
        {item.image_url&&<img src={item.image_url} alt={item.title} loading="lazy" decoding="async" className="lst-news-cover"/>}<div className="lst-news-inner"><div className="lst-news-card-meta"><small>{NEWS_CATEGORIES[item.category]}</small><span className={'lst-news-badge state-'+newsState(item,today)}>{newsState(item,today)==='Publicada'?'Activa':newsState(item,today)}</span></div><h3>{item.title}</h3><p className="lst-news-lead">{item.summary}</p><small className="lst-news-dates">{publicationDates(item)}</small>
        <div className="lst-news-actions"><button type="button" disabled={busy||writing||uploading} onClick={()=>void open(item.id,admin)}>{admin?'Editar':'Leer novedad'} <ArrowRight size={14}/></button>{admin&&<><button type="button" disabled={writing||uploading||busy} onClick={()=>void open(item.id,false)}>Ver como clienta</button><details className="lst-news-more"><summary aria-label={'Más opciones de '+item.title}>⋯</summary><button type="button" disabled={writing||uploading||busy} onClick={()=>setDeleting(item.id)}>Eliminar publicación</button></details></>}</div>
        {admin&&deleting===item.id&&<div role="group" aria-label="Confirmar eliminación"><p>¿Eliminar esta publicación del estudio?</p><div className="lst-news-actions"><button type="button" disabled={writing||uploading} onClick={()=>void remove(item)}>Sí, eliminar</button><button type="button" disabled={writing} onClick={()=>setDeleting(null)}>Conservar</button></div></div>}
      </div></article>)}</div>
      {view==='list'&&totalPages>1&&<div className="lst-news-pagination"><button type="button" disabled={currentPage===0||busy||writing||uploading} onClick={()=>setPage(currentPage-1)}>Anterior</button><span>{currentPage+1} / {totalPages}</span><button type="button" disabled={currentPage+1>=totalPages||busy||writing||uploading} onClick={()=>setPage(currentPage+1)}>Siguiente</button></div>}
    </>}
  </section>;
}



