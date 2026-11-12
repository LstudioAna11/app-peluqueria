import React from 'react';
import './portal-home-compact.css';
type HomeElement=React.ReactElement<any>;
const elements=(children:React.ReactNode)=>React.Children.toArray(children).filter(React.isValidElement) as HomeElement[];
export function portalHomeText(lang:string,key:'info'|'rate'){
 const copy:Record<string,[string,string]>={es:['Información del Studio','Valorar mi visita'],en:['Studio information','Rate my visit'],fr:['Informations du Studio','Évaluer ma visite'],it:['Informazioni sullo Studio','Valuta la mia visita'],pt:['Informações do Studio','Avaliar a minha visita'],de:['Studio-Informationen','Meinen Besuch bewerten'],nl:['Studio-informatie','Mijn bezoek beoordelen'],pl:['Informacje o Studio','Oceń moją wizytę'],cs:['Informace o studiu','Ohodnotit mou návštěvu'],nb:['Informasjon om studioet','Vurder besøket mitt'],sv:['Information om studion','Betygsätt mitt besök'],ar:['معلومات الاستوديو','تقييم زيارتي']};
 return (copy[lang]||copy.es)[key==='info'?0:1];
}
function compactHeader(header:HomeElement|undefined,hide:boolean,onLogout?:()=>unknown){
 if(!header||!hide)return header;
 return React.cloneElement(header,{},React.Children.map(header.props.children,(child)=>React.isValidElement<any>(child)&&child.type==='button'&&child.props.onClick===onLogout?<span key={child.key} aria-hidden="true" style={{width:40,display:'block'}}/>:child));
}
function compactHours(element:HomeElement|undefined,label:string){
 if(!element)return null;
 const inner=elements(element.props.children)[0];
 if(!inner||inner.type!=='details')return element;
 return <section key={element.key} className="lhc-hours"><h3>{label}</h3>{React.Children.toArray(inner.props.children).filter(child=>!React.isValidElement(child)||child.type!=='summary')}</section>;
}
export default function PortalHomeCompact({children,className='',style,welcomeText,infoLabel,hoursLabel,hideInnerLogout=false,onLogout,...rest}:React.HTMLAttributes<HTMLDivElement>&{welcomeText:string;infoLabel:string;hoursLabel:string;hideInnerLogout?:boolean;onLogout?:()=>unknown}){
 const slots:Record<string,HomeElement[]>={},other:React.ReactNode[]=[];
 for(const child of React.Children.toArray(children)){
  if(React.isValidElement<any>(child)&&typeof child.props['data-home-slot']==='string'){
   const key=child.props['data-home-slot'];(slots[key]??=[]).push(child);
  }else other.push(child);
 }
 const take=(key:string)=>slots[key]||[],intro=take('intro').flatMap(e=>elements(e.props.children)).flatMap(e=>elements(e.props.children));
 const personal=intro.filter(e=>e.type==='details');let removed=0;
 const introExtras=intro.filter(e=>{if(e.type==='details')return false;if(e.type==='p'&&removed<2){removed++;return false;}return true;});
 const header=take('header').map(e=>React.cloneElement(e,{},elements(e.props.children).map(h=>compactHeader(h,hideInnerLogout,onLogout))));
 const contact=take('contact').flatMap(e=>elements(e.props.children)).flatMap(e=>React.Children.toArray(e.props.children)).filter(e=>React.isValidElement<any>(e)&&!['strong','p'].includes(String(e.type)));
 const location=take('location').flatMap(e=>elements(e.props.children)).map(e=>React.cloneElement(e,{},React.Children.toArray(e.props.children).filter(child=>{
  if(!React.isValidElement<any>(child))return true;
  return !(child.type==='h3'||child.type==='p'&&typeof child.props.children==='string'&&child.props.children.startsWith('Un espacio para ti'));
 })));
 const known=new Set(['header','hero','intro','next','book','gifts','club','news','contact','hours','location','rating','social']);
 const extra=Object.entries(slots).filter(([key])=>!known.has(key)).flatMap(([,items])=>items);
 return <div {...rest} className={`${className} lhc-home`} style={{...style,maxWidth:960,width:'100%',display:'block',padding:0,background:'transparent',border:0}}>
 {header}
 <div className="lhc-layout"><div className="lhc-main">{take('hero')}<div className="lhc-welcome"><h1>{welcomeText}</h1>{introExtras}</div>{take('next')}{take('book')}</div>
 <div className="lhc-secondary">{take('gifts')}{take('club')}{take('news')}{other}{extra}
 <details className="lhc-info"><summary>{infoLabel}<span aria-hidden="true">⌄</span></summary><div className="lhc-info-body"><div className="lhc-phone">{contact}</div>{location}{take('hours').map(e=>compactHours(e,hoursLabel))}{take('social')}{personal}</div></details>
 {take('rating')}
 </div></div>
 </div>;
}
