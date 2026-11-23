--- a/src/HairAssessment.tsx
+++ b/src/HairAssessment.tsx
@@ -1,9 +1,10 @@
-import { useEffect, useRef, useState } from 'react';
+import { useEffect, useRef, useState, type ReactNode } from 'react';
 import { Fingerprint, Droplet, Sparkles } from 'lucide-react';
 import {
-  currentToken, fetchHairAssessment, saveHairAssessment, hairAssessmentKeys, StudioApiError,
-  type HairAssessment, type HairAssessmentKey, type HairScores,
+  currentToken, fetchHairAssessment, saveHairAssessment, hairAssessmentKeys, hairHabitKeys, chemicalHistoryKeys, StudioApiError,
+  type HairAssessment, type HairAssessmentKey, type HairScores, type HairDetails, type HairDetailKey, type ChemicalVisit,
 } from './studioApi';
+import { chemicalDates, hairAssessmentLabel, intensityScores } from './hairAssessmentCopy';
 import './hair-assessment.css';
 
 const labels = {
@@ -22,46 +23,122 @@
 } as const;
 
 const groups = [
-  { Icon: Droplet, keys: ['scalpComfort','scalpHydration','scalpBalance'] },
-  { Icon: Sparkles, keys: ['hairHydration','hairShine','hairElasticity','hairPorosity'] },
+  { Icon: Droplet, keys: ['scalpComfort','scalpHydration','scalpBalance','scalpSensitivity','scalpFlaking','scalpDandruff'] },
+  { Icon: Sparkles, keys: ['hairHydration','hairShine','hairElasticity','hairPorosity','hairChemicalDamage','hairFrizz'] },
 ] as const;
-const labelIndex: Record<HairAssessmentKey, number> = {
+const labelIndex = {
   overall:2, scalpComfort:3, scalpHydration:4, scalpBalance:5, hairHydration:4, hairShine:6, hairElasticity:7, hairPorosity:8,
-};
+} as const;
+const evaluatedKeys = hairAssessmentKeys.filter(key => key !== 'overall');
+const detailKeys = ['allergy','allergyNote',...hairHabitKeys,...chemicalHistoryKeys] as const;
+const emptyChemicalVisit: ChemicalVisit = { date:'',treatment:'',product:'',notes:'' };
 type Draft = Partial<Record<HairAssessmentKey, string>>;
 const toDraft = (scores: HairScores): Draft =>
   Object.fromEntries(hairAssessmentKeys.flatMap(key => scores[key] === undefined ? [] : [[key, String(scores[key])]]));
 const scoreOf = (value: string | undefined) => value !== undefined && /^\d{1,3}$/.test(value) && Number(value) <= 100 ? Number(value) : null;
-
-function AssessmentCharts({ scores, title, locale, date }: {
-  scores: HairScores; title: string; locale: string; date?: string;
+function metricLabel(locale: string, key: HairAssessmentKey) {
+  const language = locale.split('-')[0] as keyof typeof labels;
+  const copy = labels[language] || labels.es;
+  return key in labelIndex
+    ? copy[labelIndex[key as keyof typeof labelIndex]]
+    : hairAssessmentLabel(locale, key as 'scalpSensitivity' | 'scalpFlaking' | 'scalpDandruff' | 'hairChemicalDamage' | 'hairFrizz');
+}
+
+export function assessmentPercentage(scores: HairScores, keys: readonly HairAssessmentKey[] = evaluatedKeys) {
+  const values = keys.flatMap(key => {
+    const score = scores[key];
+    return key === 'overall' || score === undefined ? [] : [intensityScores.includes(key) ? 100-score : score];
+  });
+  return values.length ? Math.round(values.reduce((sum,value)=>sum+value,0)/values.length) : null;
+}
+
+type AssessmentSection = 'assessment' | 'habits' | 'chemistry';
+const sections: AssessmentSection[] = ['assessment','habits','chemistry'];
+function AssessmentSections({ locale, content, available = sections }: {
+  locale:string; content: Record<AssessmentSection, ReactNode>; available?: AssessmentSection[];
+}) {
+  const [selected,setSelected] = useState<AssessmentSection>('assessment');
+  const active = available.includes(selected) ? selected : available[0];
+  return <>
+    {available.length>1 && <nav className="studio-hair-adn-tabs" aria-label={hairAssessmentLabel(locale,'assessment')}>
+      {available.map(key=><button type="button" aria-pressed={key===active} key={key} onClick={()=>setSelected(key)}>{hairAssessmentLabel(locale,key)}</button>)}
+    </nav>}
+    {active && content[active]}
+  </>;
+}
+
+function ScoreRing({ value, label, locale }: { value: number; label:string; locale:string }) {
+  return <div className="studio-hair-adn-overall">
+    <span className="studio-hair-adn-ring" aria-hidden="true" style={{background:`conic-gradient(#e1b575 ${value}%, #46382f 0)`}} />
+    <div><span>{label}</span><strong>{new Intl.NumberFormat(locale,{style:'percent',maximumFractionDigits:0}).format(value/100)}</strong></div>
+  </div>;
+}
+
+function AssessmentCharts({ scores, details, locale }: {
+  scores: HairScores; details: HairDetails; locale: string;
 }) {
   const language = locale.split('-')[0] as keyof typeof labels;
   const copy = labels[language] || labels.es;
   const format = new Intl.NumberFormat(locale);
+  const overall = assessmentPercentage(scores);
+  return <>
+    {overall !== null && <><ScoreRing value={overall} label={copy[2]} locale={locale}/>
+      <p className="studio-hair-adn-caption">{hairAssessmentLabel(locale,'scoreExplanation')}</p></>}
+    <div className="studio-hair-adn-groups">
+      {groups.map(({Icon,keys},index) => {
+        const rows=keys.filter(key => scores[key] !== undefined);
+        const groupScore=assessmentPercentage(scores,keys);
+        const allergy=index===0 ? details.allergy : undefined;
+        if (groupScore===null && !allergy) return null;
+        return <section className="studio-hair-adn-group" key={index}>
+          <h4><Icon size={16} aria-hidden="true" /> {copy[index]}</h4>
+          {groupScore!==null && <ScoreRing value={groupScore} label={copy[index]} locale={locale}/>}
+          {rows.map(key => <div className="studio-hair-adn-reading" data-intensity={intensityScores.includes(key)} key={key}>
+            <div><span>{metricLabel(locale,key)}</span><span>{format.format(scores[key]!)} / 100</span></div>
+            <div aria-hidden="true" className="studio-hair-adn-track"><span style={{width:`${scores[key]}%`}} /></div>
+          </div>)}
+          {allergy && <p className="studio-hair-adn-caption"><strong>{hairAssessmentLabel(locale,allergy)}</strong>
+            {allergy==='reported' && details.allergyNote && <span> · {details.allergyNote}</span>}</p>}
+        </section>;
+      })}
+    </div>
+  </>;
+}
+
+function AssessmentProfile({ scores, details, title, locale, date }: {
+  scores: HairScores; details: HairDetails; title: string; locale: string; date?: string;
+}) {
+  const habits=hairHabitKeys.filter(key=>!!details[key]);
+  const chemistry=chemicalHistoryKeys.filter(key=>!!details[key]);
+  const visits=[...(details.chemicalHistory ?? [])].sort((a,b)=>b.date.localeCompare(a.date));
+  const available=sections.filter(key=>key==='assessment' ? assessmentPercentage(scores)!==null||!!details.allergy :
+    key==='habits' ? habits.length>0 : chemistry.length>0||visits.length>0);
+  if (!available.length) return null;
+  const displayDate = (value: string) => new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'Europe/Madrid'}).format(new Date(value));
+  function description(keys: readonly HairDetailKey[]) {
+    return <dl className="studio-hair-adn-details">{keys.map(key=><div key={key}>
+      <dt>{hairAssessmentLabel(locale,key)}</dt>
+      <dd>{chemicalDates.includes(key) ? displayDate(details[key]!+'T12:00:00Z') : details[key]}</dd>
+    </div>)}</dl>;
+  }
   return <section className="studio-hair-adn" aria-label={title}>
     <header className="studio-hair-adn-heading">
       <Fingerprint size={19} aria-hidden="true" />
       <strong>{title}</strong>
-      {date && <time dateTime={date}>{new Intl.DateTimeFormat(locale, { dateStyle:'medium', timeZone:'Europe/Madrid' }).format(new Date(date))}</time>}
+      {date && <time dateTime={date}>{displayDate(date)}</time>}
     </header>
-    {scores.overall !== undefined && <div className="studio-hair-adn-overall">
-      <span className="studio-hair-adn-ring" aria-hidden="true" style={{background:`conic-gradient(#e1b575 ${scores.overall}%, #46382f 0)`}} />
-      <div><span>{copy[2]}</span><strong>{format.format(scores.overall)} <small>/ 100</small></strong></div>
-    </div>}
-    <div className="studio-hair-adn-groups">
-      {groups.map(({Icon,keys},index) => {
-        const rows=keys.filter(key => scores[key] !== undefined);
-        if (!rows.length) return null;
-        return <section className="studio-hair-adn-group" key={index}>
-          <h4><Icon size={16} aria-hidden="true" /> {copy[index]}</h4>
-          {rows.map(key => <div className="studio-hair-adn-reading" key={key}>
-            <div><span>{copy[labelIndex[key]]}</span><span>{format.format(scores[key]!)} / 100</span></div>
-            <div aria-hidden="true" className="studio-hair-adn-track"><span style={{width:`${scores[key]}%`}} /></div>
-          </div>)}
-        </section>;
-      })}
-    </div>
+    <AssessmentSections locale={locale} available={available} content={{
+      assessment:<AssessmentCharts scores={scores} details={details} locale={locale}/>,
+      habits:description(habits), chemistry:<>
+        {chemistry.length>0 && description(chemistry)}
+        {visits.length>0 && <ul className="studio-hair-adn-history">{visits.map((visit,index)=><li key={index}>
+          {visit.date && <time dateTime={visit.date}>{displayDate(visit.date+'T12:00:00Z')}</time>}
+          <strong>{visit.treatment}</strong>
+          {visit.product && <p>{visit.product}</p>}
+          {visit.notes && <p>{visit.notes}</p>}
+        </li>)}</ul>}
+      </>,
+    }}/>
   </section>;
 }
 
@@ -87,12 +164,13 @@
   if (!token || assessment === null) return null;
   if (failed) return <div className="studio-hair-adn-message" role="status">{copy[10]} <button type="button" onClick={() => { setFailed(false); setAttempt(value => value+1); }}>{copy[11]}</button></div>;
   if (!assessment) return <small className="studio-hair-adn-message" role="status">{copy[9]}</small>;
-  return Object.keys(assessment.scores).length ? <AssessmentCharts scores={assessment.scores} title={title} locale={locale} date={assessment.updated_at}/> : null;
+  return <AssessmentProfile scores={assessment.scores} details={assessment.details ?? {}} title={title} locale={locale} date={assessment.updated_at}/>;
 }
 
 export function HairAssessmentEditor({ clientId }: { clientId: string }) {
   const [saved, setSaved] = useState<HairAssessment | null>();
   const [draft, setDraft] = useState<Draft>({});
+  const [details,setDetails] = useState<HairDetails>({});
   const [busy, setBusy] = useState(false);
   const [error, setError] = useState('');
   const [notice, setNotice] = useState('');
@@ -107,6 +185,7 @@
         if (!active) return;
         setSaved(assessment);
         setDraft(toDraft(assessment?.scores ?? {}));
+        setDetails(assessment?.details ?? {});
       },
       reason => { if (active) setError(reason instanceof Error ? reason.message : 'No se pudo cargar la valoración.'); },
     );
@@ -118,16 +197,29 @@
     const score = scoreOf(draft[key]);
     if (score !== null) scores[key] = score;
   }
-  const invalid = hairAssessmentKeys.some(key => draft[key] && scoreOf(draft[key]) === null);
-  const dirty = hairAssessmentKeys.some(key => (draft[key] || '') !== (saved?.scores[key] === undefined ? '' : String(saved.scores[key])));
+  const invalid = evaluatedKeys.some(key => draft[key] && scoreOf(draft[key]) === null);
+  const cleanDetails = Object.fromEntries(detailKeys.flatMap(key => {
+    const value = details[key]?.trim();
+    return value && (key !== 'allergyNote' || details.allergy === 'reported') ? [[key,value]] : [];
+  })) as HairDetails;
+  const visits=details.chemicalHistory ?? [];
+  const cleanVisits=visits.map(row=>({...row,treatment:row.treatment.trim(),product:row.product.trim(),notes:row.notes.trim()}))
+    .filter(row=>Object.values(row).some(Boolean));
+  if(cleanVisits.length) cleanDetails.chemicalHistory=cleanVisits;
+  const invalidHistory=cleanVisits.some(row=>!row.treatment);
+  const dirty = evaluatedKeys.some(key => (draft[key] || '') !== (saved?.scores[key] === undefined ? '' : String(saved.scores[key]))) ||
+    detailKeys.some(key=>(cleanDetails[key]??'')!==(saved?.details?.[key]??'')) ||
+    cleanVisits.length!==(saved?.details?.chemicalHistory?.length ?? 0) ||
+    cleanVisits.some((row,index)=>(Object.keys(row) as (keyof ChemicalVisit)[]).some(key=>row[key]!==saved?.details?.chemicalHistory?.[index]?.[key]));
   async function publish() {
     const token=currentToken();
-    if (!token || saved === undefined || !dirty || invalid || request.current) return;
+    if (!token || saved === undefined || !dirty || invalid || invalidHistory || request.current) return;
     request.current=true;
     setBusy(true); setError(''); setNotice('');
     try {
-      const {assessment}=await saveHairAssessment(token,clientId,saved?.revision ?? null,scores);
+      const {assessment}=await saveHairAssessment(token,clientId,saved?.revision ?? null,scores,cleanDetails);
       setSaved(assessment); setDraft(toDraft(assessment.scores));
+      setDetails(assessment.details ?? {});
       setNotice('Valoración publicada en el portal.');
     } catch (reason) {
       setError(reason instanceof Error ? reason.message : 'No se pudo guardar la valoración.');
@@ -136,27 +228,75 @@
       setBusy(false);
     }
   }
-  const input = (key: HairAssessmentKey) => <label key={key}>{labels.es[labelIndex[key]]}
+  const input = (key: HairAssessmentKey) => <label key={key}>{metricLabel('es',key)}
     <input inputMode="numeric" value={draft[key] ?? ''} disabled={busy} maxLength={3} placeholder="—"
       aria-invalid={!!draft[key] && scoreOf(draft[key]) === null || undefined}
       onChange={event => { const value=event.target.value; setNotice(''); setDraft(previous => ({...previous,[key]:value})); }} />
   </label>;
+  function setDetail(key: Exclude<keyof HairDetails,'chemicalHistory'>, value: string) {
+    setNotice('');
+    setDetails(previous=>({...previous,[key]:value}));
+  }
+  const detailInput = (key: HairDetailKey) => <label className="studio-hair-adn-detail-input" key={key}>{hairAssessmentLabel('es',key)}
+    {key==='habitNotes' || key==='chemicalNotes'
+      ? <textarea rows={3} maxLength={500} value={details[key] ?? ''} disabled={busy} onChange={event=>setDetail(key,event.target.value)}/>
+      : <input type={chemicalDates.includes(key) ? 'date' : 'text'} maxLength={100} value={details[key] ?? ''} disabled={busy}
+          onChange={event=>setDetail(key,event.target.value)}/>}
+  </label>;
+  const overall = assessmentPercentage(scores);
+  function setVisits(next: ChemicalVisit[]) {
+    setNotice('');
+    setDetails(previous=>({...previous,chemicalHistory:next}));
+  }
   return <details className="studio-hair-adn-editor">
     <summary>ADN Capilar visual</summary>
     {saved === undefined ? error
       ? <p role="alert">{error} <button type="button" onClick={() => { setError(''); setAttempt(value=>value+1); }}>Reintentar</button></p>
       : <p role="status">Cargando valoración…</p>
       : <>
-        <p>Valora de 0 a 100 según tu observación. Deja en blanco lo que no hayas evaluado.</p>
-        {input('overall')}
-        <div className="studio-hair-adn-groups">
-          {groups.map(({keys},index) => <fieldset className="studio-hair-adn-group" key={index}><legend>{labels.es[index]}</legend>{keys.map(input)}</fieldset>)}
-        </div>
-        {Object.keys(scores).length>0 && <details><summary>Vista previa del portal</summary><AssessmentCharts scores={scores} title="ADN Capilar" locale="es-ES"/></details>}
+        <AssessmentSections locale="es-ES" content={{
+          assessment:<>
+            <p>Valora de 0 a 100 y deja en blanco lo que no hayas evaluado. La sensibilidad, descamación, caspa, porosidad, daño químico y encrespamiento indican intensidad. Los valores altos de esos indicadores reducen el porcentaje.</p>
+            <div className="studio-hair-adn-groups">
+              {groups.map(({keys},index) => <fieldset className="studio-hair-adn-group" key={index}>
+                <legend>{labels.es[index]}</legend>{keys.map(input)}
+                {index===0 && <>
+                  <label className="studio-hair-adn-detail-input">Alergias referidas<select value={details.allergy || ''} disabled={busy} onChange={event=>setDetail('allergy',event.target.value)}>
+                    <option value="">Sin valorar</option><option value="none-reported">Ninguna referida</option><option value="reported">Alergia referida</option>
+                  </select></label>
+                  {details.allergy==='reported' && <label className="studio-hair-adn-detail-input">Observación de alergia
+                    <input maxLength={160} value={details.allergyNote ?? ''} disabled={busy} onChange={event=>setDetail('allergyNote',event.target.value)}/>
+                  </label>}
+                </>}
+              </fieldset>)}
+            </div>
+          </>,
+          habits:<div className="studio-hair-adn-editor-fields">{hairHabitKeys.map(detailInput)}</div>,
+          chemistry:<>
+            <div className="studio-hair-adn-editor-fields">{chemicalHistoryKeys.map(detailInput)}</div>
+            <div className="studio-hair-adn-history">{visits.map((visit,index)=><fieldset className="studio-hair-adn-group" key={index}>
+              <legend>Trabajo químico {index+1}</legend>
+              {(['date','treatment','product','notes'] as const).map(key=><label className="studio-hair-adn-detail-input" key={key}>
+                {({date:'Fecha',treatment:'Servicio realizado',product:'Producto utilizado',notes:'Notas que verá la clienta'})[key]}
+                {key==='notes' ? <textarea rows={2} maxLength={500} value={visit[key]} disabled={busy}
+                  onChange={event=>setVisits(visits.map((row,i)=>i===index ? {...row,[key]:event.target.value} : row))}/>
+                  : <input type={key==='date' ? 'date' : 'text'} maxLength={key==='product'?120:100}
+                    value={visit[key]} disabled={busy} onChange={event=>setVisits(visits.map((row,i)=>i===index ? {...row,[key]:event.target.value} : row))}/>}
+              </label>)}
+              <button type="button" disabled={busy} onClick={()=>setVisits(visits.filter((_,i)=>i!==index))}>Quitar trabajo</button>
+            </fieldset>)}</div>
+            <button type="button" disabled={busy||visits.length>=24} onClick={()=>setVisits([...visits,{...emptyChemicalVisit}])}>+ Añadir trabajo químico</button>
+          </>,
+        }}/>
+        {overall!==null && <p><strong>Valoración general · {overall}%</strong></p>}
+        {(overall!==null || Object.keys(cleanDetails).length>0) && <details>
+          <summary>Vista previa del portal</summary><AssessmentProfile scores={scores} details={cleanDetails} title="ADN Capilar" locale="es-ES"/>
+        </details>}
         {invalid && <p role="alert">Introduce números enteros de 0 a 100.</p>}
+        {invalidHistory && <p role="alert">Indica el servicio realizado en cada trabajo químico.</p>}
         {error && <p role="alert">{error}</p>}
         {notice && <p role="status">{notice}</p>}
-        <button type="button" disabled={busy || !dirty || !!invalid} onClick={() => void publish()}>
+        <button type="button" disabled={busy || !dirty || !!invalid || invalidHistory} onClick={() => void publish()}>
           {busy ? 'Publicando…' : 'Guardar y mostrar en el portal'}
         </button>
       </>}
--- /dev/null
+++ b/src/hairAssessmentCopy.ts
@@ -0,0 +1,29 @@
+import type { HairAssessmentKey, HairDetailKey } from './studioApi';
+
+const extraKeys = ['assessment','habits','chemistry','scalpSensitivity','scalpFlaking','scalpDandruff','hairChemicalDamage','hairFrizz','allergy','reported','none-reported','allergyNote','washFrequency','washTime','drying','heatTools','homeCareTime','habitNotes','lastColor','lastBleach','lastStraightening','chemicalNotes','scoreExplanation'] as const;
+type ExtraKey = typeof extraKeys[number];
+
+const copy = {
+  es: ['Valoración','Hábitos diarios','Historial químico','Sensibilidad','Descamación','Caspa','Daño químico','Encrespamiento','Alergias referidas','Alergia referida','Ninguna referida','Observación','Frecuencia de lavado','Momento del lavado','Secado habitual','Herramientas de calor','Tiempo dedicado al cuidado','Notas sobre tus hábitos','Última coloración','Última decoloración','Último alisado','Otros trabajos y observaciones','Porcentaje calculado a partir de los aspectos valorados en el salón.'],
+  en: ['Assessment','Daily habits','Chemical history','Sensitivity','Flaking','Dandruff','Chemical damage','Frizz','Reported allergies','Allergy reported','None reported','Note','Wash frequency','Time of day for washing','Usual drying method','Heat tools','Time spent on hair care','Notes on your habits','Last colour','Last bleach','Last straightening','Other treatments and notes','Percentage based on the areas assessed in the salon.'],
+  fr: ['Évaluation','Habitudes quotidiennes','Historique chimique','Sensibilité','Desquamation','Pellicules','Dommages chimiques','Frisottis','Allergies signalées','Allergie signalée','Aucune signalée','Note','Fréquence des lavages','Moment du lavage','Séchage habituel','Appareils chauffants','Temps consacré aux soins','Notes sur vos habitudes','Dernière coloration','Dernière décoloration','Dernier lissage','Autres prestations et notes','Pourcentage calculé à partir des aspects évalués au salon.'],
+  it: ['Valutazione','Abitudini quotidiane','Storico dei trattamenti chimici','Sensibilità','Desquamazione','Forfora','Danni chimici','Effetto crespo','Allergie riferite','Allergia riferita','Nessuna riferita','Nota','Frequenza del lavaggio','Momento del lavaggio','Asciugatura abituale','Strumenti a caldo','Tempo dedicato alla cura','Note sulle abitudini','Ultima colorazione','Ultima decolorazione','Ultima lisciatura','Altri trattamenti e note','Percentuale calcolata sugli aspetti valutati in salone.'],
+  pt: ['Avaliação','Hábitos diários','Histórico químico','Sensibilidade','Descamação','Caspa','Danos químicos','Frizz','Alergias referidas','Alergia referida','Nenhuma referida','Nota','Frequência de lavagem','Momento da lavagem','Secagem habitual','Ferramentas de calor','Tempo dedicado ao cuidado','Notas sobre os teus hábitos','Última coloração','Última descoloração','Último alisamento','Outros trabalhos e notas','Percentagem calculada a partir dos aspetos avaliados no salão.'],
+  de: ['Beurteilung','Tägliche Gewohnheiten','Chemische Behandlungen','Empfindlichkeit','Schuppung','Schuppen','Chemische Schäden','Frizz','Angegebene Allergien','Allergie angegeben','Keine angegeben','Hinweis','Waschhäufigkeit','Tageszeit der Haarwäsche','Übliche Trocknung','Hitzestylinggeräte','Zeit für die Haarpflege','Hinweise zu deinen Gewohnheiten','Letzte Färbung','Letzte Blondierung','Letzte Glättung','Weitere Behandlungen und Hinweise','Prozentwert aus den im Salon beurteilten Merkmalen.'],
+  nl: ['Beoordeling','Dagelijkse gewoonten','Chemische behandelingen','Gevoeligheid','Schilfering','Roos','Chemische schade','Pluis','Gemelde allergieën','Allergie gemeld','Geen gemeld','Opmerking','Wasfrequentie','Wasdagdeel','Gebruikelijke droogmethode','Warmtetools','Tijd voor haarverzorging','Notities over je gewoonten','Laatste kleuring','Laatste ontkleuring','Laatste ontkrulling','Andere behandelingen en notities','Percentage op basis van de kenmerken die in de salon zijn beoordeeld.'],
+  pl: ['Ocena','Codzienne nawyki','Historia zabiegów chemicznych','Wrażliwość','Łuszczenie','Łupież','Uszkodzenia chemiczne','Puszenie','Zgłoszone alergie','Zgłoszono alergię','Nie zgłoszono','Uwagi','Częstotliwość mycia','Pora mycia','Zwykły sposób suszenia','Urządzenia do stylizacji na gorąco','Czas na pielęgnację','Uwagi o nawykach','Ostatnia koloryzacja','Ostatnie rozjaśnianie','Ostatnie prostowanie','Inne zabiegi i uwagi','Wynik procentowy na podstawie cech ocenionych w salonie.'],
+  cs: ['Hodnocení','Denní návyky','Historie chemických úprav','Citlivost','Šupinatění','Lupy','Chemické poškození','Krepatění','Uvedené alergie','Alergie uvedena','Žádné uvedené','Poznámka','Četnost mytí','Doba mytí','Běžný způsob sušení','Tepelné nástroje','Čas na péči','Poznámky k návykům','Poslední barvení','Poslední zesvětlení','Poslední narovnání','Další úpravy a poznámky','Procento vychází z vlastností posouzených v salonu.'],
+  nb: ['Vurdering','Daglige vaner','Kjemisk historikk','Sensitivitet','Flassing','Flass','Kjemisk skade','Frizz','Oppgitte allergier','Allergi oppgitt','Ingen oppgitt','Merknad','Vaskefrekvens','Tidspunkt for vask','Vanlig tørkemetode','Varmeverktøy','Tid brukt på hårpleie','Merknader om vanene dine','Siste farging','Siste bleking','Siste kjemiske retting','Andre behandlinger og merknader','Prosent beregnet fra områdene som er vurdert i salongen.'],
+  sv: ['Bedömning','Dagliga vanor','Kemisk historik','Känslighet','Fjällning','Mjäll','Kemisk skada','Frissighet','Uppgivna allergier','Allergi uppgiven','Inga uppgivna','Anteckning','Tvättfrekvens','Tid på dagen för tvätt','Vanlig torkmetod','Värmeverktyg','Tid för hårvård','Anteckningar om dina vanor','Senaste färgning','Senaste blekning','Senaste kemiska rakbehandling','Övriga behandlingar och anteckningar','Procent enligt de egenskaper som bedömts i salongen.'],
+  ar: ['التقييم','العادات اليومية','سجل المعالجات الكيميائية','الحساسية','التقشّر','القشرة','التلف الكيميائي','الهيشان','الحساسية المبلّغ عنها','تم الإبلاغ عن حساسية','لم يُبلّغ عن حساسية','ملاحظة','عدد مرات الغسل','وقت الغسل','طريقة التجفيف المعتادة','أدوات التصفيف الحراري','الوقت المخصّص للعناية','ملاحظات عن عاداتك','آخر صبغة','آخر تفتيح','آخر فرد للشعر','معالجات وملاحظات أخرى','نسبة محسوبة من الجوانب التي قُيّمت في الصالون.'],
+} satisfies Record<string, readonly string[]>;
+
+export function hairAssessmentLabel(locale: string, key: ExtraKey): string {
+  const lang = locale.split('-')[0] as keyof typeof copy;
+  return (copy[lang] || copy.es)[extraKeys.indexOf(key)] ?? copy.es[extraKeys.indexOf(key)];
+}
+
+export const intensityScores: readonly HairAssessmentKey[] = [
+  'scalpSensitivity','scalpFlaking','scalpDandruff','hairPorosity','hairChemicalDamage','hairFrizz',
+];
+export const chemicalDates: readonly HairDetailKey[] = ['lastColor','lastBleach','lastStraightening'];
--- a/src/hair-assessment.css
+++ b/src/hair-assessment.css
@@ -16,6 +16,23 @@
 .studio-hair-adn-ring::before { content: ''; width: 42px; height: 42px; border-radius: 50%; background: #2b241f; }
 .studio-hair-adn-overall span { color: #d6cbb8; font-size: .83rem; }
 .studio-hair-adn-overall strong { display: block; color: #e4c687; font-size: 1.3rem; line-height: 1.12; }
+.studio-hair-adn-caption { margin: 8px 0; color: #d6cbb8; font-size: .78rem; overflow-wrap: anywhere; }
+.studio-hair-adn-tabs { display: flex; flex-wrap: wrap; gap: 5px; margin: 12px 0; }
+.studio-hair-adn-tabs button { min-height: 44px; border: 1px solid #806444; color: #e4c687; background: #352b23; padding: 6px 9px; border-radius: 6px; font: inherit; font-size: .8rem; cursor: pointer; }
+.studio-hair-adn-tabs button[aria-pressed="true"] { background: #e4c687; color: #211a15; border-color: #e4c687; }
+.studio-hair-adn-tabs button:focus-visible { outline: 2px solid #e4c687; outline-offset: 2px; }
+.studio-hair-adn-group .studio-hair-adn-overall { margin: 8px 0 12px; }
+.studio-hair-adn-group .studio-hair-adn-ring { flex-basis: 42px; height: 42px; }
+.studio-hair-adn-group .studio-hair-adn-ring::before { width: 32px; height: 32px; background: #352b23; }
+.studio-hair-adn-reading[data-intensity="true"] .studio-hair-adn-track span { background: #c57e63; }
+.studio-hair-adn-details { margin: 0; display: grid; gap: 8px; }
+.studio-hair-adn-details > div { padding: 8px; border: 1px solid #69523b; border-radius: 6px; background: #352b23; }
+.studio-hair-adn-details dt { font-size: .78rem; color: #e4c687; }
+.studio-hair-adn-details dd { margin: 4px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: .85rem; }
+.studio-hair-adn-history { display: grid; gap: 8px; list-style: none; padding: 0; margin: 10px 0; }
+.studio-hair-adn-history li { padding: 9px; border: 1px solid #69523b; border-radius: 6px; background: #352b23; }
+.studio-hair-adn-history time { color: #e4c687; display: block; font-size: .78rem; }
+.studio-hair-adn-history p { margin: 4px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: .85rem; }
 .studio-hair-adn-overall small { font-size: .77rem; font-weight: 400; color: #d6cbb8; }
 .studio-hair-adn-groups { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%, 170px),1fr)); gap: 9px; }
 .studio-hair-adn-heading + .studio-hair-adn-groups { margin-top: 12px; }
@@ -35,5 +52,8 @@
 .studio-hair-adn-editor label { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: .82rem; min-height: 44px; }
 .studio-hair-adn-editor > label { max-width: 250px; }
 .studio-hair-adn-editor input { width: 55px; min-height: 40px; box-sizing: border-box; padding: 5px; text-align: center; color: #fff8ee; background: #29231f; border: 1px solid #806444; border-radius: 6px; }
+.studio-hair-adn-editor-fields { display: grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap: 8px 12px; }
+.studio-hair-adn-editor label.studio-hair-adn-detail-input { display: grid; align-content: start; gap: 5px; margin: 5px 0; }
+.studio-hair-adn-detail-input :is(input,select,textarea) { width:100%; min-height:40px; box-sizing:border-box; padding:7px; text-align:start; color:#fff8ee; background:#29231f; border:1px solid #806444; border-radius:6px; font:inherit; }
 .studio-hair-adn-editor > button { margin-top: 8px; min-height: 44px; padding: 8px 12px; background: #e4c687; color: #211a15; border: 0; border-radius: 6px; font-weight: 600; cursor: pointer; }
 .studio-hair-adn-editor > button:disabled { opacity: .55; cursor: default; }
--- a/src/PortalFeatures.tsx
+++ b/src/PortalFeatures.tsx
@@ -677,8 +677,10 @@
    <HairAssessmentPortal key={client?.serverId || 'own-assessment'} locale={locale} title={t('hairDna')}/>
    <div className="lp-hair"><section className="lp-next" data-recommendation={hasRecommendation?'true':'false'}><small>{t('recommendedVisit')}</small><p>{hasRecommendation?recommendation:t('profileReturnHint')}</p>{hasRecommendation&&<><button className="lp-book" type="button" onClick={onBook}>{t('bookNext')}</button><details className="lp-recommend-extra"><summary>{t('profileMaintenance')}</summary><p>{t('maintenanceNote')}</p></details></>}</section>
    <details className="lp-fold"><summary><span className="lp-fold-label"><PassportHairIcon size={19} strokeWidth={1.5} aria-hidden="true"/>{t('hairDna')}</span><ChevronDown size={16} aria-hidden="true"/></summary><div className="lp-fold-body">{client?.dniCapilar||t('emptyDna')}</div></details>
-   <details className="lp-fold"><summary><span className="lp-fold-label"><PassportHomeIcon size={19} strokeWidth={1.5} aria-hidden="true"/>{t('homeRitual')}</span><ChevronDown size={16} aria-hidden="true"/></summary><div className="lp-fold-body">{client?.prescripcionCasa||t('emptyCare')}</div></details>
-   <ClientProductRoutine key={client?.serverId || 'own-routine'} t={t} locale={locale}/>
+   <details className="lp-fold"><summary><span className="lp-fold-label"><PassportHomeIcon size={19} strokeWidth={1.5} aria-hidden="true"/>{t('homeRitual')}</span><ChevronDown size={16} aria-hidden="true"/></summary>
+    {client?.prescripcionCasa && <div className="lp-fold-body">{client.prescripcionCasa}</div>}
+    <ClientProductRoutine key={client?.serverId || 'own-routine'} t={t} locale={locale}/>
+   </details>
    {client?.ultimaVisita&&stamp(client.ultimaVisita)>0&&stamp(client.ultimaVisita)<=Date.now()&&<p className="lp-quiet">{t('profileLastVisit')} · {client.ultimaVisita}</p>}
    </div>
   </div>
--- a/src/studioApi.ts
+++ b/src/studioApi.ts
@@ -140,15 +140,24 @@
   call<{ ok: true }>("passport", { method: "PUT", token, body: passport });
 
 export const hairAssessmentKeys = [
-  'overall','scalpComfort','scalpHydration','scalpBalance','hairHydration','hairShine','hairElasticity','hairPorosity',
+  'overall','scalpComfort','scalpHydration','scalpBalance','scalpSensitivity','scalpFlaking','scalpDandruff',
+  'hairHydration','hairShine','hairElasticity','hairPorosity','hairChemicalDamage','hairFrizz',
 ] as const;
 export type HairAssessmentKey = typeof hairAssessmentKeys[number];
 export type HairScores = Partial<Record<HairAssessmentKey, number>>;
-export type HairAssessment = { scores: HairScores; revision: string; updated_at: string };
+export const hairHabitKeys = ['washFrequency','washTime','drying','heatTools','homeCareTime','habitNotes'] as const;
+export const chemicalHistoryKeys = ['lastColor','lastBleach','lastStraightening','chemicalNotes'] as const;
+export type HairHabitKey = typeof hairHabitKeys[number];
+export type HairDetailKey = HairHabitKey | typeof chemicalHistoryKeys[number];
+export type ChemicalVisit = { date: string; treatment: string; product: string; notes: string };
+export type HairDetails = Partial<Record<HairDetailKey, string>> & {
+  allergy?: '' | 'reported' | 'none-reported'; allergyNote?: string; chemicalHistory?: ChemicalVisit[];
+};
+export type HairAssessment = { scores: HairScores; details?: HairDetails; revision: string; updated_at: string };
 export const fetchHairAssessment = (token: string, clientId?: string) =>
   call<{ assessment: HairAssessment | null }>('passport-adn', { token, body: { clientId } });
-export const saveHairAssessment = (token: string, clientId: string, revision: string | null, scores: HairScores) =>
-  call<{ assessment: HairAssessment }>('passport-adn', { token, method: 'PUT', body: { clientId, revision, scores } });
+export const saveHairAssessment = (token: string, clientId: string, revision: string | null, scores: HairScores, details: HairDetails) =>
+  call<{ assessment: HairAssessment }>('passport-adn', { token, method: 'PUT', body: { clientId, revision, scores, details } });
 
 export const createClosure = (token: string, closure: Record<string, unknown>) =>
   call<{ ok: true; id: string }>("closure", { token, body: closure });
