--- a/src/App.tsx
+++ b/src/App.tsx
@@ -50,6 +50,7 @@
 import { promotionServiceIds } from './promotions';
 import { calculatePromotionDiscount, exactPrice } from './promotionPricing';
 import { cashQuickServices } from './cashQuickServices';
+import { HairAssessmentEditor } from './HairAssessment';
 import type { PromotionDiscount } from './promotionPricing';
 import { getBookingName, getAppointmentServiceNames, compactServiceText } from './serviceNames';
 import { catalogServiceCopy, catalogVariantCopy, sameCatalogText, serviceCardLabel } from './portalServiceCopy';
@@ -5900,6 +5901,7 @@
             <h3 id="passport-editor-title" style={{ color: '#E4C687', marginTop: 0 }}>Pasaporte · {passportDraft.nombre} {passportDraft.apellidos}</h3>
             <fieldset disabled={passportSaving} style={{border:0,padding:0,margin:0,minWidth:0}}>
             <p style={{ fontSize: '13px', color: '#D6CBB8', lineHeight: 1.6 }}>Estos datos serán visibles en el portal de la clienta. Incluye solo las notas que quieras compartir con ella.</p>
+            {passportDraft.serverId && <HairAssessmentEditor key={passportDraft.serverId} clientId={passportDraft.serverId}/>}
             {([['dniCapilar', 'DNI capilar / diagnóstico'], ['prescripcionCasa', 'Cuidado en casa'], ['ultimaVisita', 'Última visita registrada'], ['proximaVisitaSugerida', 'Próxima visita recomendada']] as const).map(([field, label]) => <label key={field} style={{ display: 'block', marginBottom: '16px', fontSize: '13px' }}>{label}<textarea value={passportDraft[field] || ''} onChange={e => setPassportDraft({ ...passportDraft, [field]: e.target.value })} rows={field === 'dniCapilar' || field === 'prescripcionCasa' ? 3 : 1} style={{ display: 'block', width: '100%', boxSizing: 'border-box', backgroundColor: '#322A25', color: '#FFF8EE', border: '1px solid #3A312A', borderRadius: '6px', padding: '10px', marginTop: '7px', fontSize: '14px' }} /></label>)}
             {passportDraft.serverId && <div style={{ marginBottom: 16 }}>
               <h4 style={{ color: '#E4C687', margin: '0 0 8px' }}>Rutina de productos</h4>
--- a/src/PortalFeatures.tsx
+++ b/src/PortalFeatures.tsx
@@ -1,5 +1,6 @@
 import spanish from './portalSpanish';
 import { ClientProductRoutine } from './Products';
+import { HairAssessmentPortal } from './HairAssessment';
 import GiftRecipientAdmin,{GiftPurchaseReceipts} from './GiftRecipientAdmin'; // lst-gift-recipient-v1
 import './passport-refine.css';
 import {Fingerprint as PassportHairIcon,Home as PassportHomeIcon} from 'lucide-react';
@@ -673,6 +674,7 @@
   
   <nav role="tablist" aria-label={t('profileSections')} className="lp-tabs">{tabs.map((item,index)=><button key={item.id} id={'lp-tab-'+item.id} type="button" role="tab" aria-selected={tab===item.id} aria-controls={'lp-panel-'+item.id} tabIndex={tab===item.id?0:-1} onClick={()=>select(item.id)} onKeyDown={event=>tabKey(event,index)}>{item.label}</button>)}</nav>
   <div className="lp-panel" id="lp-panel-hair" role="tabpanel" aria-labelledby="lp-tab-hair" hidden={tab!=='hair'}>
+   <HairAssessmentPortal key={client?.serverId || 'own-assessment'} locale={locale} title={t('hairDna')}/>
    <div className="lp-hair"><section className="lp-next" data-recommendation={hasRecommendation?'true':'false'}><small>{t('recommendedVisit')}</small><p>{hasRecommendation?recommendation:t('profileReturnHint')}</p>{hasRecommendation&&<><button className="lp-book" type="button" onClick={onBook}>{t('bookNext')}</button><details className="lp-recommend-extra"><summary>{t('profileMaintenance')}</summary><p>{t('maintenanceNote')}</p></details></>}</section>
    <details className="lp-fold"><summary><span className="lp-fold-label"><PassportHairIcon size={19} strokeWidth={1.5} aria-hidden="true"/>{t('hairDna')}</span><ChevronDown size={16} aria-hidden="true"/></summary><div className="lp-fold-body">{client?.dniCapilar||t('emptyDna')}</div></details>
    <details className="lp-fold"><summary><span className="lp-fold-label"><PassportHomeIcon size={19} strokeWidth={1.5} aria-hidden="true"/>{t('homeRitual')}</span><ChevronDown size={16} aria-hidden="true"/></summary><div className="lp-fold-body">{client?.prescripcionCasa||t('emptyCare')}</div></details>
--- a/src/studioApi.ts
+++ b/src/studioApi.ts
@@ -138,6 +138,17 @@
 
 export const pushPassport = (token: string, passport: Record<string, unknown>) =>
   call<{ ok: true }>("passport", { method: "PUT", token, body: passport });
+
+export const hairAssessmentKeys = [
+  'overall','scalpComfort','scalpHydration','scalpBalance','hairHydration','hairShine','hairElasticity','hairPorosity',
+] as const;
+export type HairAssessmentKey = typeof hairAssessmentKeys[number];
+export type HairScores = Partial<Record<HairAssessmentKey, number>>;
+export type HairAssessment = { scores: HairScores; revision: string; updated_at: string };
+export const fetchHairAssessment = (token: string, clientId?: string) =>
+  call<{ assessment: HairAssessment | null }>('passport-adn', { token, body: { clientId } });
+export const saveHairAssessment = (token: string, clientId: string, revision: string | null, scores: HairScores) =>
+  call<{ assessment: HairAssessment }>('passport-adn', { token, method: 'PUT', body: { clientId, revision, scores } });
 
 export const createClosure = (token: string, closure: Record<string, unknown>) =>
   call<{ ok: true; id: string }>("closure", { token, body: closure });
--- /dev/null
+++ b/src/HairAssessment.tsx
@@ -0,0 +1,164 @@
+import { useEffect, useRef, useState } from 'react';
+import { Fingerprint, Droplet, Sparkles } from 'lucide-react';
+import {
+  currentToken, fetchHairAssessment, saveHairAssessment, hairAssessmentKeys, StudioApiError,
+  type HairAssessment, type HairAssessmentKey, type HairScores,
+} from './studioApi';
+import './hair-assessment.css';
+
+const labels = {
+  es: ['Cuero cabelludo','Cabello','Valoración general','Confort','Hidratación','Equilibrio de grasa','Brillo','Elasticidad','Porosidad','Cargando valoración…','No se pudo cargar la valoración.','Reintentar'],
+  en: ['Scalp','Hair','Overall assessment','Comfort','Hydration','Oil balance','Shine','Elasticity','Porosity','Loading assessment…','Could not load the assessment.','Retry'],
+  fr: ['Cuir chevelu','Cheveux','Évaluation générale','Confort','Hydratation','Équilibre du sébum','Brillance','Élasticité','Porosité','Chargement de l’évaluation…','Impossible de charger l’évaluation.','Réessayer'],
+  it: ['Cuoio capelluto','Capelli','Valutazione generale','Comfort','Idratazione','Equilibrio del sebo','Lucentezza','Elasticità','Porosità','Caricamento della valutazione…','Impossibile caricare la valutazione.','Riprova'],
+  pt: ['Couro cabeludo','Cabelo','Avaliação geral','Conforto','Hidratação','Equilíbrio da oleosidade','Brilho','Elasticidade','Porosidade','A carregar a avaliação…','Não foi possível carregar a avaliação.','Tentar novamente'],
+  de: ['Kopfhaut','Haar','Gesamtbeurteilung','Wohlbefinden','Feuchtigkeit','Talgbalance','Glanz','Elastizität','Porosität','Beurteilung wird geladen…','Die Beurteilung konnte nicht geladen werden.','Erneut versuchen'],
+  nl: ['Hoofdhuid','Haar','Algemene beoordeling','Comfort','Hydratatie','Talgbalans','Glans','Elasticiteit','Porositeit','Beoordeling laden…','De beoordeling kon niet worden geladen.','Opnieuw proberen'],
+  pl: ['Skóra głowy','Włosy','Ocena ogólna','Komfort','Nawilżenie','Równowaga sebum','Połysk','Elastyczność','Porowatość','Wczytywanie oceny…','Nie udało się wczytać oceny.','Spróbuj ponownie'],
+  cs: ['Pokožka hlavy','Vlasy','Celkové hodnocení','Pohodlí','Hydratace','Rovnováha mazu','Lesk','Pružnost','Poréznost','Načítání hodnocení…','Hodnocení se nepodařilo načíst.','Zkusit znovu'],
+  nb: ['Hodebunn','Hår','Helhetsvurdering','Komfort','Fuktighet','Talg­balanse','Glans','Elastisitet','Porøsitet','Laster vurderingen…','Kunne ikke laste vurderingen.','Prøv igjen'],
+  sv: ['Hårbotten','Hår','Helhetsbedömning','Komfort','Fukt','Talgbalans','Glans','Elasticitet','Porositet','Läser in bedömningen…','Det gick inte att läsa in bedömningen.','Försök igen'],
+  ar: ['فروة الرأس','الشعر','التقييم العام','الراحة','الترطيب','توازن الدهون','اللمعان','المرونة','المسامية','جارٍ تحميل التقييم…','تعذّر تحميل التقييم.','إعادة المحاولة'],
+} as const;
+
+const groups = [
+  { Icon: Droplet, keys: ['scalpComfort','scalpHydration','scalpBalance'] },
+  { Icon: Sparkles, keys: ['hairHydration','hairShine','hairElasticity','hairPorosity'] },
+] as const;
+const labelIndex: Record<HairAssessmentKey, number> = {
+  overall:2, scalpComfort:3, scalpHydration:4, scalpBalance:5, hairHydration:4, hairShine:6, hairElasticity:7, hairPorosity:8,
+};
+type Draft = Partial<Record<HairAssessmentKey, string>>;
+const toDraft = (scores: HairScores): Draft =>
+  Object.fromEntries(hairAssessmentKeys.flatMap(key => scores[key] === undefined ? [] : [[key, String(scores[key])]]));
+const scoreOf = (value: string | undefined) => value !== undefined && /^\d{1,3}$/.test(value) && Number(value) <= 100 ? Number(value) : null;
+
+function AssessmentCharts({ scores, title, locale, date }: {
+  scores: HairScores; title: string; locale: string; date?: string;
+}) {
+  const language = locale.split('-')[0] as keyof typeof labels;
+  const copy = labels[language] || labels.es;
+  const format = new Intl.NumberFormat(locale);
+  return <section className="studio-hair-adn" aria-label={title}>
+    <header className="studio-hair-adn-heading">
+      <Fingerprint size={19} aria-hidden="true" />
+      <strong>{title}</strong>
+      {date && <time dateTime={date}>{new Intl.DateTimeFormat(locale, { dateStyle:'medium', timeZone:'Europe/Madrid' }).format(new Date(date))}</time>}
+    </header>
+    {scores.overall !== undefined && <div className="studio-hair-adn-overall">
+      <span className="studio-hair-adn-ring" aria-hidden="true" style={{background:`conic-gradient(#e1b575 ${scores.overall}%, #46382f 0)`}} />
+      <div><span>{copy[2]}</span><strong>{format.format(scores.overall)} <small>/ 100</small></strong></div>
+    </div>}
+    <div className="studio-hair-adn-groups">
+      {groups.map(({Icon,keys},index) => {
+        const rows=keys.filter(key => scores[key] !== undefined);
+        if (!rows.length) return null;
+        return <section className="studio-hair-adn-group" key={index}>
+          <h4><Icon size={16} aria-hidden="true" /> {copy[index]}</h4>
+          {rows.map(key => <div className="studio-hair-adn-reading" key={key}>
+            <div><span>{copy[labelIndex[key]]}</span><span>{format.format(scores[key]!)} / 100</span></div>
+            <div aria-hidden="true" className="studio-hair-adn-track"><span style={{width:`${scores[key]}%`}} /></div>
+          </div>)}
+        </section>;
+      })}
+    </div>
+  </section>;
+}
+
+export function HairAssessmentPortal({ title, locale = 'es-ES' }: { title: string; locale?: string }) {
+  const [assessment, setAssessment] = useState<HairAssessment | null>();
+  const [failed, setFailed] = useState(false);
+  const [attempt, setAttempt] = useState(0);
+  const copy = labels[locale.split('-')[0] as keyof typeof labels] || labels.es;
+  const token = currentToken();
+  useEffect(() => {
+    if (!token) return;
+    let active=true;
+    fetchHairAssessment(token).then(
+      ({assessment}) => { if (active) setAssessment(assessment); },
+      error => {
+        if (!active) return;
+        if (error instanceof StudioApiError && error.status === 404) setAssessment(null);
+        else setFailed(true);
+      },
+    );
+    return () => { active=false; };
+  }, [token,attempt]);
+  if (!token || assessment === null) return null;
+  if (failed) return <div className="studio-hair-adn-message" role="status">{copy[10]} <button type="button" onClick={() => { setFailed(false); setAttempt(value => value+1); }}>{copy[11]}</button></div>;
+  if (!assessment) return <small className="studio-hair-adn-message" role="status">{copy[9]}</small>;
+  return Object.keys(assessment.scores).length ? <AssessmentCharts scores={assessment.scores} title={title} locale={locale} date={assessment.updated_at}/> : null;
+}
+
+export function HairAssessmentEditor({ clientId }: { clientId: string }) {
+  const [saved, setSaved] = useState<HairAssessment | null>();
+  const [draft, setDraft] = useState<Draft>({});
+  const [busy, setBusy] = useState(false);
+  const [error, setError] = useState('');
+  const [notice, setNotice] = useState('');
+  const [attempt, setAttempt] = useState(0);
+  const request = useRef(false);
+  useEffect(() => {
+    const token=currentToken();
+    if (!token) { setError('Accede a la intranet para editar la valoración.'); return; }
+    let active=true;
+    fetchHairAssessment(token,clientId).then(
+      ({assessment}) => {
+        if (!active) return;
+        setSaved(assessment);
+        setDraft(toDraft(assessment?.scores ?? {}));
+      },
+      reason => { if (active) setError(reason instanceof Error ? reason.message : 'No se pudo cargar la valoración.'); },
+    );
+    return () => { active=false; };
+  }, [clientId,attempt]);
+
+  const scores: HairScores = {};
+  for (const key of hairAssessmentKeys) {
+    const score = scoreOf(draft[key]);
+    if (score !== null) scores[key] = score;
+  }
+  const invalid = hairAssessmentKeys.some(key => draft[key] && scoreOf(draft[key]) === null);
+  const dirty = hairAssessmentKeys.some(key => (draft[key] || '') !== (saved?.scores[key] === undefined ? '' : String(saved.scores[key])));
+  async function publish() {
+    const token=currentToken();
+    if (!token || saved === undefined || !dirty || invalid || request.current) return;
+    request.current=true;
+    setBusy(true); setError(''); setNotice('');
+    try {
+      const {assessment}=await saveHairAssessment(token,clientId,saved?.revision ?? null,scores);
+      setSaved(assessment); setDraft(toDraft(assessment.scores));
+      setNotice('Valoración publicada en el portal.');
+    } catch (reason) {
+      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la valoración.');
+    } finally {
+      request.current=false;
+      setBusy(false);
+    }
+  }
+  const input = (key: HairAssessmentKey) => <label key={key}>{labels.es[labelIndex[key]]}
+    <input inputMode="numeric" value={draft[key] ?? ''} disabled={busy} maxLength={3} placeholder="—"
+      aria-invalid={!!draft[key] && scoreOf(draft[key]) === null || undefined}
+      onChange={event => { const value=event.target.value; setNotice(''); setDraft(previous => ({...previous,[key]:value})); }} />
+  </label>;
+  return <details className="studio-hair-adn-editor">
+    <summary>ADN Capilar visual</summary>
+    {saved === undefined ? error
+      ? <p role="alert">{error} <button type="button" onClick={() => { setError(''); setAttempt(value=>value+1); }}>Reintentar</button></p>
+      : <p role="status">Cargando valoración…</p>
+      : <>
+        <p>Valora de 0 a 100 según tu observación. Deja en blanco lo que no hayas evaluado.</p>
+        {input('overall')}
+        <div className="studio-hair-adn-groups">
+          {groups.map(({keys},index) => <fieldset className="studio-hair-adn-group" key={index}><legend>{labels.es[index]}</legend>{keys.map(input)}</fieldset>)}
+        </div>
+        {Object.keys(scores).length>0 && <details><summary>Vista previa del portal</summary><AssessmentCharts scores={scores} title="ADN Capilar" locale="es-ES"/></details>}
+        {invalid && <p role="alert">Introduce números enteros de 0 a 100.</p>}
+        {error && <p role="alert">{error}</p>}
+        {notice && <p role="status">{notice}</p>}
+        <button type="button" disabled={busy || !dirty || !!invalid} onClick={() => void publish()}>
+          {busy ? 'Publicando…' : 'Guardar y mostrar en el portal'}
+        </button>
+      </>}
+  </details>;
+}
--- /dev/null
+++ b/src/hair-assessment.css
@@ -0,0 +1,39 @@
+.studio-hair-adn,
+.studio-hair-adn-editor {
+  padding: 14px;
+  border: 1px solid #806444;
+  border-radius: 12px;
+  background: #2b241f;
+  color: #fff8ee;
+}
+.studio-hair-adn-heading,
+.studio-hair-adn-overall,
+.studio-hair-adn-group h4 { display: flex; align-items: center; gap: 9px; }
+.studio-hair-adn-heading { flex-wrap: wrap; color: #e4c687; }
+.studio-hair-adn-heading time { margin-inline-start: auto; color: #d6cbb8; font-size: .78rem; }
+.studio-hair-adn-overall { margin: 14px 0; }
+.studio-hair-adn-ring { flex: 0 0 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; }
+.studio-hair-adn-ring::before { content: ''; width: 42px; height: 42px; border-radius: 50%; background: #2b241f; }
+.studio-hair-adn-overall span { color: #d6cbb8; font-size: .83rem; }
+.studio-hair-adn-overall strong { display: block; color: #e4c687; font-size: 1.3rem; line-height: 1.12; }
+.studio-hair-adn-overall small { font-size: .77rem; font-weight: 400; color: #d6cbb8; }
+.studio-hair-adn-groups { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%, 170px),1fr)); gap: 9px; }
+.studio-hair-adn-heading + .studio-hair-adn-groups { margin-top: 12px; }
+.studio-hair-adn-group { min-width: 0; margin: 0; padding: 10px; border: 1px solid #69523b; border-radius: 8px; background: #352b23; }
+.studio-hair-adn-group h4 { color: #e4c687; margin: 0 0 9px; font-size: .88rem; }
+.studio-hair-adn-reading + .studio-hair-adn-reading { margin-top: 9px; }
+.studio-hair-adn-reading > div:first-child { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 3px 8px; font-size: .77rem; }
+.studio-hair-adn-reading > div:first-child > :last-child { white-space: nowrap; color: #e4c687; font-variant-numeric: tabular-nums; }
+.studio-hair-adn-track { margin-top: 4px; height: 5px; border-radius: 99px; background: #4a3a2f; overflow: hidden; }
+.studio-hair-adn-track span { display: block; height: 100%; border-radius: inherit; background: #d5ab70; }
+.studio-hair-adn-message { color: #d6cbb8; font-size: .79rem; }
+.studio-hair-adn-editor { margin: 12px 0 16px; }
+.studio-hair-adn-editor summary { min-height: 35px; align-content: center; cursor: pointer; color: #e4c687; }
+.studio-hair-adn-editor p { margin: 8px 0; font-size: .82rem; }
+.studio-hair-adn-editor .studio-hair-adn-groups { margin: 9px 0; }
+.studio-hair-adn-editor legend { color: #e4c687; font-weight: 600; padding: 0 3px; }
+.studio-hair-adn-editor label { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: .82rem; min-height: 44px; }
+.studio-hair-adn-editor > label { max-width: 250px; }
+.studio-hair-adn-editor input { width: 55px; min-height: 40px; box-sizing: border-box; padding: 5px; text-align: center; color: #fff8ee; background: #29231f; border: 1px solid #806444; border-radius: 6px; }
+.studio-hair-adn-editor > button { margin-top: 8px; min-height: 44px; padding: 8px 12px; background: #e4c687; color: #211a15; border: 0; border-radius: 6px; font-weight: 600; cursor: pointer; }
+.studio-hair-adn-editor > button:disabled { opacity: .55; cursor: default; }
