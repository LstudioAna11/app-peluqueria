import {useEffect,useState} from 'react';
import spanish from './portalSpanish';
export const portalLanguageCodes=['es','en','fr','it','pt','de','nl','pl','cs','nb','sv','ar'];
const cache:Record<string,Record<string,string>>={es:spanish};
let loading:Promise<void>|null=null;
function loadLanguages(){
 if(!loading)loading=import('./portalOtherLanguages').then(module=>{Object.assign(cache,module.default);}).catch(error=>{loading=null;throw error;});
 return loading;
}
export function usePortalTranslations(language:string){
 const [translations,setTranslations]=useState(()=>({...cache})),[languageError,setError]=useState(false),[attempt,retry]=useState(0);
 useEffect(()=>{
  let active=true;setError(false);
  if(cache[language]){setTranslations({...cache});return()=>{active=false;};}
  void loadLanguages().then(()=>{if(active)setTranslations({...cache});}).catch(()=>{if(active)setError(true);});
  return()=>{active=false;};
 },[language,attempt]);
 return {translations,languageError,retryLanguage:()=>retry(value=>value+1)};
}
