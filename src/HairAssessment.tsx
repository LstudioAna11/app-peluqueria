import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Fingerprint, Droplet, Sparkles } from 'lucide-react';
import {
  currentToken, fetchHairAssessment, saveHairAssessment, hairAssessmentKeys, hairHabitKeys, chemicalHistoryKeys, StudioApiError,
  type HairAssessment, type HairAssessmentKey, type HairScores, type HairDetails, type HairDetailKey, type ChemicalVisit,
} from './studioApi';
import { chemicalDates, hairAssessmentLabel, intensityScores } from './hairAssessmentCopy';
import './hair-assessment.css';

const labels = {
  es: ['Cuero cabelludo','Cabello','Valoración general','Confort','Hidratación','Equilibrio de grasa','Brillo','Elasticidad','Porosidad','Cargando valoración…','No se pudo cargar la valoración.','Reintentar'],
  en: ['Scalp','Hair','Overall assessment','Comfort','Hydration','Oil balance','Shine','Elasticity','Porosity','Loading assessment…','Could not load the assessment.','Retry'],
  fr: ['Cuir chevelu','Cheveux','Évaluation générale','Confort','Hydratation','Équilibre du sébum','Brillance','Élasticité','Porosité','Chargement de l’évaluation…','Impossible de charger l’évaluation.','Réessayer'],
  it: ['Cuoio capelluto','Capelli','Valutazione generale','Comfort','Idratazione','Equilibrio del sebo','Lucentezza','Elasticità','Porosità','Caricamento della valutazione…','Impossibile caricare la valutazione.','Riprova'],
  pt: ['Couro cabeludo','Cabelo','Avaliação geral','Conforto','Hidratação','Equilíbrio da oleosidade','Brilho','Elasticidade','Porosidade','A carregar a avaliação…','Não foi possível carregar a avaliação.','Tentar novamente'],
  de: ['Kopfhaut','Haar','Gesamtbeurteilung','Wohlbefinden','Feuchtigkeit','Talgbalance','Glanz','Elastizität','Porosität','Beurteilung wird geladen…','Die Beurteilung konnte nicht geladen werden.','Erneut versuchen'],
  nl: ['Hoofdhuid','Haar','Algemene beoordeling','Comfort','Hydratatie','Talgbalans','Glans','Elasticiteit','Porositeit','Beoordeling laden…','De beoordeling kon niet worden geladen.','Opnieuw proberen'],
  pl: ['Skóra głowy','Włosy','Ocena ogólna','Komfort','Nawilżenie','Równowaga sebum','Połysk','Elastyczność','Porowatość','Wczytywanie oceny…','Nie udało się wczytać oceny.','Spróbuj ponownie'],
  cs: ['Pokožka hlavy','Vlasy','Celkové hodnocení','Pohodlí','Hydratace','Rovnováha mazu','Lesk','Pružnost','Poréznost','Načítání hodnocení…','Hodnocení se nepodařilo načíst.','Zkusit znovu'],
  nb: ['Hodebunn','Hår','Helhetsvurdering','Komfort','Fuktighet','Talg­balanse','Glans','Elastisitet','Porøsitet','Laster vurderingen…','Kunne ikke laste vurderingen.','Prøv igjen'],
  sv: ['Hårbotten','Hår','Helhetsbedömning','Komfort','Fukt','Talgbalans','Glans','Elasticitet','Porositet','Läser in bedömningen…','Det gick inte att läsa in bedömningen.','Försök igen'],
  ar: ['فروة الرأس','الشعر','التقييم العام','الراحة','الترطيب','توازن الدهون','اللمعان','المرونة','المسامية','جارٍ تحميل التقييم…','تعذّر تحميل التقييم.','إعادة المحاولة'],
} as const;

const groups = [
  { Icon: Droplet, keys: ['scalpComfort','scalpHydration','scalpBalance','scalpSensitivity','scalpFlaking','scalpDandruff'] },
  { Icon: Sparkles, keys: ['hairHydration','hairShine','hairElasticity','hairPorosity','hairChemicalDamage','hairFrizz'] },
] as const;
const labelIndex = {
  overall:2, scalpComfort:3, scalpHydration:4, scalpBalance:5, hairHydration:4, hairShine:6, hairElasticity:7, hairPorosity:8,
} as const;
const evaluatedKeys = hairAssessmentKeys.filter(key => key !== 'overall');
const detailKeys = ['allergy','allergyNote',...hairHabitKeys,...chemicalHistoryKeys] as const;
const emptyChemicalVisit: ChemicalVisit = { date:'',treatment:'',product:'',notes:'' };
type Draft = Partial<Record<HairAssessmentKey, string>>;
const toDraft = (scores: HairScores): Draft =>
  Object.fromEntries(hairAssessmentKeys.flatMap(key => scores[key] === undefined ? [] : [[key, String(scores[key])]]));
const scoreOf = (value: string | undefined) => value !== undefined && /^\d{1,3}$/.test(value) && Number(value) <= 100 ? Number(value) : null;
function metricLabel(locale: string, key: HairAssessmentKey) {
  const language = locale.split('-')[0] as keyof typeof labels;
  const copy = labels[language] || labels.es;
  return key in labelIndex
    ? copy[labelIndex[key as keyof typeof labelIndex]]
    : hairAssessmentLabel(locale, key as 'scalpSensitivity' | 'scalpFlaking' | 'scalpDandruff' | 'hairChemicalDamage' | 'hairFrizz');
}

export function assessmentPercentage(scores: HairScores, keys: readonly HairAssessmentKey[] = evaluatedKeys) {
  const values = keys.flatMap(key => {
    const score = scores[key];
    return key === 'overall' || score === undefined ? [] : [intensityScores.includes(key) ? 100-score : score];
  });
  return values.length ? Math.round(values.reduce((sum,value)=>sum+value,0)/values.length) : null;
}

function globalAssessmentPercentage(scores: HairScores, includeScalp?: boolean) {
  return assessmentPercentage(scores, includeScalp === true ? evaluatedKeys : groups[1].keys);
}

const diagnosisLabels: Record<string, string> = {
  es: 'Notas del diagnóstico', en: 'Assessment notes', fr: 'Notes du diagnostic', it: 'Note della valutazione',
  pt: 'Notas da avaliação', de: 'Beurteilungsnotizen', nl: 'Notities bij de beoordeling', pl: 'Notatki z oceny',
  cs: 'Poznámky k hodnocení', nb: 'Vurderingsnotater', sv: 'Bedömningsanteckningar', ar: 'ملاحظات التقييم',
};

type AssessmentSection = 'assessment' | 'habits' | 'chemistry';
const sections: AssessmentSection[] = ['assessment','habits','chemistry'];
function AssessmentSections({ locale, content, available = sections }: {
  locale:string; content: Record<AssessmentSection, ReactNode>; available?: AssessmentSection[];
}) {
  return <>
    {available.includes('assessment') && content.assessment}
    {available.filter(key => key !== 'assessment').map(key => (
      <AssessmentDisclosure key={key} title={hairAssessmentLabel(locale,key)}>{content[key]}</AssessmentDisclosure>
    ))}
  </>;
}

function AssessmentDisclosure({ title, children }: { title: string; children: ReactNode }) {
  return <details className="studio-hair-adn-fold">
    <summary>{title}<ChevronDown size={16} aria-hidden="true"/></summary>
    <div className="studio-hair-adn-fold-content">{children}</div>
  </details>;
}

function ScoreRing({ value, label, locale }: { value: number; label:string; locale:string }) {
  return <div className="studio-hair-adn-overall">
    <span className="studio-hair-adn-ring" aria-hidden="true" style={{background:`conic-gradient(#e1b575 ${value}%, #46382f 0)`}} />
    <div><span>{label}</span><strong>{new Intl.NumberFormat(locale,{style:'percent',maximumFractionDigits:0}).format(value/100)}</strong></div>
  </div>;
}

function AssessmentCharts({ scores, details, locale }: {
  scores: HairScores; details: HairDetails; locale: string;
}) {
  const language = locale.split('-')[0] as keyof typeof labels;
  const copy = labels[language] || labels.es;
  const format = new Intl.NumberFormat(locale);
  const overall = globalAssessmentPercentage(scores, details.includeScalp);
  return <>
    {overall !== null && <><ScoreRing value={overall} label={copy[2]} locale={locale}/>
      <p className="studio-hair-adn-caption">{hairAssessmentLabel(locale,'scoreExplanation')}</p></>}
    <div className="studio-hair-adn-groups">
      {groups.map(({Icon,keys},index) => {
        const rows=keys.filter(key => scores[key] !== undefined);
        const groupScore=assessmentPercentage(scores,keys);
        const allergy=index===0 ? details.allergy : undefined;
        if (groupScore===null && !allergy) return null;
        return <section className="studio-hair-adn-group" key={index}>
          <h4><Icon size={16} aria-hidden="true" /> {copy[index]}</h4>
          {groupScore!==null && <ScoreRing value={groupScore} label={copy[index]} locale={locale}/>}
          {rows.map(key => <div className="studio-hair-adn-reading" data-intensity={intensityScores.includes(key)} key={key}>
            <div><span>{metricLabel(locale,key)}</span><span>{format.format(scores[key]!)} / 100</span></div>
            <div aria-hidden="true" className="studio-hair-adn-track"><span style={{width:`${scores[key]}%`}} /></div>
          </div>)}
          {allergy && <p className="studio-hair-adn-caption"><strong>{hairAssessmentLabel(locale,allergy)}</strong>
            {allergy==='reported' && details.allergyNote && <span> · {details.allergyNote}</span>}</p>}
        </section>;
      })}
    </div>
  </>;
}

function AssessmentProfile({ scores, details, title, locale, date, notes }: {
  scores: HairScores; details: HairDetails; title: string; locale: string; date?: string; notes?: string;
}) {
  const habits=hairHabitKeys.filter(key=>!!details[key]);
  const chemistry=chemicalHistoryKeys.filter(key=>!!details[key]);
  const visits=[...(details.chemicalHistory ?? [])].sort((a,b)=>b.date.localeCompare(a.date));
  const available=sections.filter(key=>key==='assessment' ? assessmentPercentage(scores)!==null||!!details.allergy :
    key==='habits' ? habits.length>0 : chemistry.length>0||visits.length>0);
  if (!available.length && !notes) return null;
  const displayDate = (value: string) => new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'Europe/Madrid'}).format(new Date(value));
  function description(keys: readonly HairDetailKey[]) {
    return <dl className="studio-hair-adn-details">{keys.map(key=><div key={key}>
      <dt>{hairAssessmentLabel(locale,key)}</dt>
      <dd>{chemicalDates.includes(key) ? displayDate(details[key]!+'T12:00:00Z') : details[key]}</dd>
    </div>)}</dl>;
  }
  return <section className="studio-hair-adn" aria-label={title}>
    <header className="studio-hair-adn-heading">
      <Fingerprint size={19} aria-hidden="true" />
      <strong>{title}</strong>
      {date && <time dateTime={date}>{displayDate(date)}</time>}
    </header>
    <AssessmentSections locale={locale} available={available} content={{
      assessment:<AssessmentCharts scores={scores} details={details} locale={locale}/>,
      habits:description(habits), chemistry:<>
        {chemistry.length>0 && description(chemistry)}
        {visits.length>0 && <ul className="studio-hair-adn-history">{visits.map((visit,index)=><li key={index}>
          {visit.date && <time dateTime={visit.date}>{displayDate(visit.date+'T12:00:00Z')}</time>}
          <strong>{visit.treatment}</strong>
          {visit.product && <p>{visit.product}</p>}
          {visit.notes && <p>{visit.notes}</p>}
        </li>)}</ul>}
      </>,
    }}/>
    {notes && <AssessmentDisclosure title={diagnosisLabels[locale.split('-')[0]] || diagnosisLabels.es}>
      <p className="studio-hair-adn-notes">{notes}</p>
    </AssessmentDisclosure>}
  </section>;
}

export function HairAssessmentPortal({ title, locale = 'es-ES', notes }: { title: string; locale?: string; notes?: string }) {
  const [assessment, setAssessment] = useState<HairAssessment | null>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const copy = labels[locale.split('-')[0] as keyof typeof labels] || labels.es;
  const token = currentToken();
  useEffect(() => {
    if (!token) return;
    let active=true;
    fetchHairAssessment(token).then(
      ({assessment}) => { if (active) setAssessment(assessment); },
      error => {
        if (!active) return;
        if (error instanceof StudioApiError && error.status === 404) setAssessment(null);
        else setFailed(true);
      },
    );
    return () => { active=false; };
  }, [token,attempt]);
  const notesText = notes?.trim();
  const profile = <AssessmentProfile scores={assessment?.scores ?? {}} details={assessment?.details ?? {}}
    title={title} locale={locale} date={assessment?.updated_at} notes={notesText}/>;
  if (!token || assessment === null) return profile;
  if (failed) return <>
    <div className="studio-hair-adn-message" role="status">{copy[10]} <button type="button" onClick={() => { setFailed(false); setAttempt(value => value+1); }}>{copy[11]}</button></div>
    {profile}
  </>;
  if (!assessment && !notesText) return <small className="studio-hair-adn-message" role="status">{copy[9]}</small>;
  return profile;
}

export function HairAssessmentEditor({ clientId }: { clientId: string }) {
  const groupId = useId();
  const [activeGroup, setActiveGroup] = useState(0);
  const [saved, setSaved] = useState<HairAssessment | null>();
  const [draft, setDraft] = useState<Draft>({});
  const [details,setDetails] = useState<HairDetails>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const request = useRef(false);
  useEffect(() => {
    const token=currentToken();
    if (!token) { setError('Accede a la intranet para editar la valoración.'); return; }
    let active=true;
    fetchHairAssessment(token,clientId).then(
      ({assessment}) => {
        if (!active) return;
        setSaved(assessment);
        setDraft(toDraft(assessment?.scores ?? {}));
        setDetails(assessment?.details ?? {});
      },
      reason => { if (active) setError(reason instanceof Error ? reason.message : 'No se pudo cargar la valoración.'); },
    );
    return () => { active=false; };
  }, [clientId,attempt]);

  const scores: HairScores = {};
  for (const key of hairAssessmentKeys) {
    const score = scoreOf(draft[key]);
    if (score !== null) scores[key] = score;
  }
  const invalid = evaluatedKeys.some(key => draft[key] && scoreOf(draft[key]) === null);
  const cleanDetails = Object.fromEntries(detailKeys.flatMap(key => {
    const value = details[key]?.trim();
    return value && (key !== 'allergyNote' || details.allergy === 'reported') ? [[key,value]] : [];
  })) as HairDetails;
  if (details.includeScalp === true) cleanDetails.includeScalp = true;
  const visits=details.chemicalHistory ?? [];
  const cleanVisits=visits.map(row=>({...row,treatment:row.treatment.trim(),product:row.product.trim(),notes:row.notes.trim()}))
    .filter(row=>Object.values(row).some(Boolean));
  if(cleanVisits.length) cleanDetails.chemicalHistory=cleanVisits;
  const invalidHistory=cleanVisits.some(row=>!row.treatment);
  const dirty = evaluatedKeys.some(key => (draft[key] || '') !== (saved?.scores[key] === undefined ? '' : String(saved.scores[key]))) ||
    (cleanDetails.includeScalp === true) !== (saved?.details?.includeScalp === true) ||
    detailKeys.some(key=>(cleanDetails[key]??'')!==(saved?.details?.[key]??'')) ||
    cleanVisits.length!==(saved?.details?.chemicalHistory?.length ?? 0) ||
    cleanVisits.some((row,index)=>(Object.keys(row) as (keyof ChemicalVisit)[]).some(key=>row[key]!==saved?.details?.chemicalHistory?.[index]?.[key]));
  async function publish() {
    const token=currentToken();
    if (!token || saved === undefined || !dirty || invalid || invalidHistory || request.current) return;
    request.current=true;
    setBusy(true); setError(''); setNotice('');
    try {
      const {assessment}=await saveHairAssessment(token,clientId,saved?.revision ?? null,scores,cleanDetails);
      setSaved(assessment); setDraft(toDraft(assessment.scores));
      setDetails(assessment.details ?? {});
      setNotice('Valoración publicada en el portal.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la valoración.');
    } finally {
      request.current=false;
      setBusy(false);
    }
  }
  const input = (key: HairAssessmentKey) => <label key={key}>{metricLabel('es',key)}
    <input inputMode="numeric" value={draft[key] ?? ''} disabled={busy} maxLength={3} placeholder="—"
      aria-invalid={!!draft[key] && scoreOf(draft[key]) === null || undefined}
      onChange={event => { const value=event.target.value; setNotice(''); setDraft(previous => ({...previous,[key]:value})); }} />
  </label>;
  function setDetail(key: typeof detailKeys[number], value: string) {
    setNotice('');
    setDetails(previous=>({...previous,[key]:value}));
  }
  const detailInput = (key: HairDetailKey) => <label className="studio-hair-adn-detail-input" key={key}>{hairAssessmentLabel('es',key)}
    {key==='habitNotes' || key==='chemicalNotes'
      ? <textarea rows={3} maxLength={500} value={details[key] ?? ''} disabled={busy} onChange={event=>setDetail(key,event.target.value)}/>
      : <input type={chemicalDates.includes(key) ? 'date' : 'text'} maxLength={100} value={details[key] ?? ''} disabled={busy}
          onChange={event=>setDetail(key,event.target.value)}/>}
  </label>;
  const overall = globalAssessmentPercentage(scores, cleanDetails.includeScalp);
  function setVisits(next: ChemicalVisit[]) {
    setNotice('');
    setDetails(previous=>({...previous,chemicalHistory:next}));
  }
  return <details className="studio-hair-adn-editor">
    <summary>ADN Capilar visual</summary>
    {saved === undefined ? error
      ? <p role="alert">{error} <button type="button" onClick={() => { setError(''); setAttempt(value=>value+1); }}>Reintentar</button></p>
      : <p role="status">Cargando valoración…</p>
      : <>
        <AssessmentSections locale="es-ES" content={{
          assessment:<>
            <div className="studio-hair-adn-editor-overview">
              {overall!==null && <ScoreRing value={overall} label={labels.es[2]} locale="es-ES"/>}
              <p>Valora de 0 a 100 y deja en blanco lo que no hayas evaluado. La sensibilidad, descamación, caspa, porosidad, daño químico y encrespamiento indican intensidad. Los valores altos de esos indicadores reducen el porcentaje.</p>
            </div>
            <div className="studio-hair-adn-group-switch" role="group" aria-label="Zona de la valoración">
              {groups.map(({Icon},index) => (
                <button key={index} type="button" aria-pressed={activeGroup === index} aria-controls={`${groupId}-${index}`}
                  onClick={() => setActiveGroup(index)}>
                  <Icon size={16} aria-hidden="true"/>{labels.es[index]}
                </button>
              ))}
            </div>
            <div className="studio-hair-adn-groups studio-hair-adn-editor-groups">
              {groups.map(({keys},index) => <fieldset id={`${groupId}-${index}`} data-active={activeGroup === index}
                className="studio-hair-adn-group" key={index}>
                <legend>{labels.es[index]}</legend>{keys.map(input)}
                {index===0 && <>
                  <label className="studio-hair-adn-include-scalp">
                    <input type="checkbox" checked={details.includeScalp === true} disabled={busy} onChange={event => {
                      const includeScalp = event.target.checked;
                      setNotice('');
                      setDetails(previous => ({ ...previous, includeScalp }));
                    }}/>
                    Incluir cuero cabelludo en el porcentaje global
                  </label>
                  <label className="studio-hair-adn-detail-input">Alergias referidas<select value={details.allergy || ''} disabled={busy} onChange={event=>setDetail('allergy',event.target.value)}>
                    <option value="">Sin valorar</option><option value="none-reported">Ninguna referida</option><option value="reported">Alergia referida</option>
                  </select></label>
                  {details.allergy==='reported' && <label className="studio-hair-adn-detail-input">Observación de alergia
                    <input maxLength={160} value={details.allergyNote ?? ''} disabled={busy} onChange={event=>setDetail('allergyNote',event.target.value)}/>
                  </label>}
                </>}
              </fieldset>)}
            </div>
          </>,
          habits:<div className="studio-hair-adn-editor-fields">{hairHabitKeys.map(detailInput)}</div>,
          chemistry:<>
            <div className="studio-hair-adn-editor-fields">{chemicalHistoryKeys.map(detailInput)}</div>
            <div className="studio-hair-adn-history">{visits.map((visit,index)=><fieldset className="studio-hair-adn-group" key={index}>
              <legend>Trabajo químico {index+1}</legend>
              {(['date','treatment','product','notes'] as const).map(key=><label className="studio-hair-adn-detail-input" key={key}>
                {({date:'Fecha',treatment:'Servicio realizado',product:'Producto utilizado',notes:'Notas que verá la clienta'})[key]}
                {key==='notes' ? <textarea rows={2} maxLength={500} value={visit[key]} disabled={busy}
                  onChange={event=>setVisits(visits.map((row,i)=>i===index ? {...row,[key]:event.target.value} : row))}/>
                  : <input type={key==='date' ? 'date' : 'text'} maxLength={key==='product'?120:100}
                    value={visit[key]} disabled={busy} onChange={event=>setVisits(visits.map((row,i)=>i===index ? {...row,[key]:event.target.value} : row))}/>}
              </label>)}
              <button type="button" disabled={busy} onClick={()=>setVisits(visits.filter((_,i)=>i!==index))}>Quitar trabajo</button>
            </fieldset>)}</div>
            <button type="button" disabled={busy||visits.length>=24} onClick={()=>setVisits([...visits,{...emptyChemicalVisit}])}>+ Añadir trabajo químico</button>
          </>,
        }}/>
        {(assessmentPercentage(scores)!==null || detailKeys.some(key => cleanDetails[key]) || cleanVisits.length>0) && <details>
          <summary>Vista previa del portal</summary><AssessmentProfile scores={scores} details={cleanDetails} title="ADN Capilar" locale="es-ES"/>
        </details>}
        {invalid && <p role="alert">Introduce números enteros de 0 a 100.</p>}
        {invalidHistory && <p role="alert">Indica el servicio realizado en cada trabajo químico.</p>}
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <button type="button" disabled={busy || !dirty || !!invalid || invalidHistory} onClick={() => void publish()}>
          {busy ? 'Publicando…' : 'Guardar y mostrar en el portal'}
        </button>
      </>}
  </details>;
}
