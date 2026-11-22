// lst-push-compact-v2
import React from 'react';
import spanish from './portalSpanish';
const row:React.CSSProperties={borderTop:'1px solid #655039',marginTop:6};
const summary:React.CSSProperties={minHeight:44,boxSizing:'border-box',padding:'10px 0',cursor:'pointer',color:'#E4C687',fontSize:13,lineHeight:1.6};
const list:React.CSSProperties={margin:'0 0 12px',paddingLeft:20,color:'#D6CBB8',fontSize:12,lineHeight:1.8};
const note:React.CSSProperties={fontSize:12,lineHeight:1.7,color:'#D6CBB8',margin:'0 0 12px'};
export default function PushSetupHelp({t = (key)=>spanish[key]}:{t?:(key:string)=>string}) {
  const enable = t('pushHelpAllow').replace('{enable}', () => t('pushEnable'));
  const test = t('pushHelpTest').replace('{test}', () => t('pushSendTest'));
  const steps = [
    { id: 'android', label: 'Android', preparation: t('pushHelpAndroid') },
    { id: 'apple', label: 'iPhone / iPad', preparation: t('pushHelpApple') },
    { id: 'desktop', label: t('pushHelpDesktop') },
  ];

  return <details aria-label={t('pushHelpTitle')} style={{marginTop:8}}>
    <summary style={{...summary,color:'#D8C29A',fontSize:12}}>{t('pushHelpTitle')}</summary>
    <div style={{paddingTop:4}}>
      {steps.map(({id,label,preparation})=><details key={id} style={row}>
        <summary style={summary}>{label}</summary>
        <ol style={list}>
          {preparation && <li>{preparation}</li>}
          <li>{t('pushHelpSignIn')}</li>
          <li>{enable}</li>
          <li>{test}</li>
        </ol>
        <p style={note}>{t('pushPermissionHelp')}</p>
      </details>)}
    </div>
  </details>;
}
