import React,{useEffect,useRef,useState} from 'react';
import {memoryCall,memoryDate,type Memories} from './memoriesApi';
import spanish from './portalSpanish';
const button:React.CSSProperties={minHeight:44,padding:'9px 12px',border:'1px solid #947749',borderRadius:8,background:'transparent',color:'#E4C687',cursor:'pointer'};
export default function MemoriesClient({t=(key)=>spanish[key],locale='es-ES'}:{t?:(key:string)=>string;locale?:string}){
 const formatNumber=(value:number)=>new Intl.NumberFormat(locale).format(value);
 const localizedDate=(value:string)=>{
  const date=new Date(value+'T12:00:00Z');
  return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'UTC'}).format(date):memoryDate(value);
 };
 const [data,setData]=useState<Memories|null>(null),[page,setPage]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');const generation=useRef(0);
 const load=async(target=page)=>{const run=++generation.current;setBusy(true);setError('');try{const result=await memoryCall<Memories>('list',{page:target});if(run===generation.current){setData(result);setPage(target);}}catch(e){if(run===generation.current){setData(null);setError(e instanceof Error&&locale==='es-ES'?e.message:'memoryError');}}finally{if(run===generation.current)setBusy(false);}};
 useEffect(()=>{void load(0);return()=>{generation.current++;};},[]);
 const a=data?.achievements;const badges:string[]=[];
 if(a){if(a.visits>=1)badges.push(t('memoryFirst'));for(const n of [5,10,20,50,100])if(a.visits>=n)badges.push(t('profileVisitCount').replace('{count}',formatNumber(n)));if(a.anniversaries>0)badges.push(t('memoryYears').replace('{count}',formatNumber(a.anniversaries)));if(a.club){badges.push(t('memoryLevel').replace('{level}',()=>a.club?.level??'')+(a.club.active?'':' · '+t('memoryPaused')));if(a.club.badges.organized)badges.push(t('memoryOrganised'));if(a.club.badges.streak)badges.push(t('memoryStreak'));}}
 return <section aria-label={t('memoryTitle')} style={{display:'grid',gap:14}}>
  <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}><h3 style={{fontSize:17,color:'#E4C687'}}>{t('memoryTitle')}</h3><button type="button" style={button} disabled={busy} onClick={()=>void load()}>{t(busy?'portalLoading':'portalRefresh')}</button></header>
  {error&&<p role="alert" style={{color:'#FFB4A9'}}>{error==='memoryError'?t(error):error}</p>}
  {a&&<section style={{padding:14,border:'1px solid #655039',borderRadius:10}}><h4 style={{margin:'0 0 10px',color:'#E4C687'}}>{t('memoryBadges')}</h4>{badges.length?<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{badges.map(b=><span key={b} style={{padding:'6px 10px',borderRadius:20,background:'#453626',color:'#EAD5B4',fontSize:12}}>✦ {b}</span>)}</div>:<p>{t('memoryStart')}</p>}<p style={{fontSize:12,color:'#C8B79E',marginTop:10}}>{t('profileVisitCount').replace('{count}',formatNumber(a.visits))}{a.firstVisit?' · '+t('memoryFirst')+': '+localizedDate(a.firstVisit):''}</p></section>}
  {data&&<><h4 style={{margin:0,color:'#E4C687'}}>{t('memoryOurs')}</h4>{!data.items.length&&<p>{t('memoryEmpty')}</p>}{data.items.map(m=><article key={m.id} style={{border:'1px solid #655039',borderRadius:10,padding:14,display:'grid',gap:8}}><time style={{fontSize:12,color:'#C8B79E'}}>{localizedDate(m.happened_on)}</time><h4 style={{fontSize:16,margin:0,color:'#EAD5B4',overflowWrap:'anywhere'}}>{m.title}</h4>{m.photoUrl&&<img src={m.photoUrl} alt={m.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true;}} style={{width:'100%',maxHeight:320,objectFit:'contain',borderRadius:8}}/>}{m.photo_id&&!m.photoUrl&&<small>{t('memoryPhotoUnavailable')}</small>}{m.body&&<p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{m.body}</p>}</article>)}{data.total>12&&<nav aria-label={t('memoryPages')} style={{display:'flex',gap:10,alignItems:'center'}}><button type="button" style={button} disabled={busy||page===0} onClick={()=>void load(page-1)}>{t('portalPrevious')}</button><span>{page+1} / {Math.ceil(data.total/12)}</span><button type="button" style={button} disabled={busy||(page+1)*12>=data.total} onClick={()=>void load(page+1)}>{t('portalNext')}</button></nav>}</>}
 </section>;
}
