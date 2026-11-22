// lst-opinion-experiencia-v1
import React,{useEffect,useRef,useState} from 'react';
import {MessageSquare,ArrowUpRight,X} from 'lucide-react';
import './studio-reviews-card.css';
import spanish from './portalSpanish';
type Review={rating?:number;text?:string;relativePublishTimeDescription?:string;authorAttribution?:{displayName?:string;uri?:string;photoURI?:string}};
type PlaceData={rating?:number;userRatingCount?:number;reviews?:Review[]};
type PlacesLibrary={Place:new(options:{id:string})=>PlaceData&{fetchFields:(options:{fields:string[]})=>Promise<unknown>}};
type MapsWindow=Window&{google?:{maps?:{importLibrary:(name:string)=>Promise<PlacesLibrary>}};__lstGoogleReviewsReady?:()=>void};
const safeLink=(value:string|undefined)=>{try{const url=new URL(value||'');return url.protocol==='https:'?url.href:'';}catch{return '';}};
let loading:Promise<PlacesLibrary>|null=null;
export function loadReviewLibrary(key:string):Promise<PlacesLibrary>{
 const win=window as MapsWindow;
 if(win.google?.maps?.importLibrary)return win.google.maps.importLibrary('places');
 if(loading)return loading;
 loading=new Promise<PlacesLibrary>((resolve,reject)=>{
  // Never insert a second loader when another integration owns Google Maps.
  if(document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')){reject(Error('Google Maps ya se está cargando.'));return;}
  const script=document.createElement('script');script.async=true;
  let finished=false;
  const fail=()=>{if(finished)return;finished=true;clearTimeout(timer);script.remove();delete win.__lstGoogleReviewsReady;reject(Error('No se pudo conectar con Google.'));};
  const timer=window.setTimeout(fail,15000);
  win.__lstGoogleReviewsReady=()=>{
   if(finished)return;finished=true;clearTimeout(timer);delete win.__lstGoogleReviewsReady;
   const maps=win.google?.maps;if(!maps){reject(Error('Google Maps no está disponible.'));return;}
   maps.importLibrary('places').then(resolve,reject);
  };
  script.onerror=fail;
  script.src='https://maps.googleapis.com/maps/api/js?'+new URLSearchParams({key,loading:'async',libraries:'places',v:'weekly',language:'es',callback:'__lstGoogleReviewsReady'}).toString();
  document.head.appendChild(script);
 });
 loading.catch(()=>{loading=null;});return loading;
}
export default function StudioReviewsCard({googleUrl,mapsUrl,saving=false,children,t=(key)=>spanish[key],locale='es-ES'}:{t?:(key:string)=>string;locale?:string;googleUrl:string;mapsUrl:string;saving?:boolean;children:React.ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),alive=useRef(true),lock=useRef(false);
 const [data,setData]=useState<PlaceData|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const apiKey=String(import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY||'').trim(),placeId=String(import.meta.env.VITE_GOOGLE_PLACE_ID||'').trim();
 const ready=!!apiKey&&!!placeId,writeUrl=safeLink(googleUrl),readUrl=safeLink('https://www.google.com/maps/place//data=!4m4!3m3!1s0xd63b74c640bef21:0x1880a470fcd5f112!9m1!1b1')||safeLink(mapsUrl);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const read=async()=>{
  if(lock.current||data)return;lock.current=true;setBusy(true);setError('');
  try{const {Place}=await loadReviewLibrary(apiKey);const place=new Place({id:placeId});await place.fetchFields({fields:['rating','userRatingCount','reviews']});if(alive.current)setData({rating:place.rating,userRatingCount:place.userRatingCount,reviews:place.reviews||[]});}
  catch{if(alive.current)setError('reviewsUnavailable');}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 };
 return <section id="studio-google-reviews" tabIndex={-1} className="sr-card" aria-labelledby="sr-title">
  <div className="sr-heading"><span className="sr-icon"><MessageSquare size={23} strokeWidth={1.5} aria-hidden="true"/></span><div><small>{t('reviewsReal')}</small><h2 id="sr-title">{t('reviewsShare')}</h2></div></div>
  <p>{t('reviewsIntro')}</p>
  {writeUrl&&<a className="sr-primary" href={writeUrl} target="_blank" rel="noopener noreferrer">{t('reviewsWrite')} <ArrowUpRight size={17} aria-hidden="true"/></a>}
  <div className="sr-links">{ready?<button type="button" disabled={busy||!!data} onClick={()=>void read()}>{busy?t('portalLoading'):data?t('reviewsGoogle'):t('reviewsRead')}</button>:readUrl&&<a href={readUrl} target="_blank" rel="noopener noreferrer">{t('reviewsReadGoogle')} ↗</a>}<button type="button" onClick={()=>dialog.current?.showModal()}>{t('reviewsPrivate')}</button></div>
  {error&&<p role="status" className="sr-note">{t(error)} {readUrl&&<a href={readUrl} target="_blank" rel="noopener noreferrer">{t('reviewsReadGoogle')} ↗</a>}</p>}
  {data&&<section className="sr-reviews" aria-label={t('reviewsGoogle')}><div className="sr-rating">{Number.isFinite(data.rating)&&<strong aria-label={t('reviewsAverage').replace('{score}',data.rating?.toLocaleString(locale)??'')}>{data.rating?.toLocaleString(locale)} / 5</strong>}{Number.isFinite(data.userRatingCount)&&<span>{t('reviewsCount').replace('{count}',data.userRatingCount?.toLocaleString(locale)??'')}</span>}</div><p className="sr-note">{t('reviewsGoogleSelection')}</p>{data.reviews?.map((review,index)=><article key={index} className="sr-review"><header>{safeLink(review.authorAttribution?.uri)?<a href={safeLink(review.authorAttribution?.uri)} target="_blank" rel="noopener noreferrer">{review.authorAttribution?.displayName||t('reviewsGoogleUser')}</a>:<strong>{review.authorAttribution?.displayName||t('reviewsGoogleUser')}</strong>}{Number.isFinite(review.rating)&&<span>{review.rating} / 5</span>}</header>{review.relativePublishTimeDescription&&<small>{review.relativePublishTimeDescription}</small>}{review.text&&<p>{review.text}</p>}</article>)}{!data.reviews?.length&&<p className="sr-note">{t('reviewsEmpty')}</p>}<span className="sr-attribution" translate="no">Google Maps</span>{readUrl&&<a className="sr-all" href={readUrl} target="_blank" rel="noopener noreferrer">{t('reviewsReadGoogle')} ↗</a>}</section>}
  <dialog ref={dialog} className="sr-dialog" aria-labelledby="sr-private-title" onCancel={e=>{if(saving)e.preventDefault();}}><header className="sr-dialog-head"><h2 id="sr-private-title">{t('reviewsPrivateTitle')}</h2><button type="button" disabled={saving} aria-label={t('portalClose')} onClick={()=>dialog.current?.close()}><X size={21} aria-hidden="true"/></button></header><p className="sr-note">{t('reviewsIntro')}</p>{children}<p className="sr-note">{t('reviewsPrivacy')}</p></dialog>
 </section>;
}
