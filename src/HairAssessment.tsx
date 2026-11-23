import { useEffect, useRef, useState } from 'react';
import { Fingerprint, Droplet, Sparkles } from 'lucide-react';
import {
  currentToken, fetchHairAssessment, saveHairAssessment, hairAssessmentKeys, StudioApiError,
  type HairAssessment, type HairAssessmentKey, type HairScores,
} from './studioApi';
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
  { Icon: Droplet, keys: ['scalpComfort','scalpHydration','scalpBalance'] },
  { Icon: Sparkles, keys: ['hairHydration','hairShine','hairElasticity','hairPorosity'] },
] as const;
const labelIndex: Record<HairAssessmentKey, number> = {
  overall:2, scalpComfort:3, scalpHydration:4, scalpBalance:5, hairHydration:4, hairShine:6, hairElasticity:7, hairPorosity:8,
};
type Draft = Partial<Record<HairAssessmentKey, string>>;
const toDraft = (scores: HairScores): Draft =>
  Object.fromEntries(hairAssessmentKeys.flatMap(key => scores[key] === undefined ? [] : [[key, String(scores[key])]]));
const scoreOf = (value: string | undefined) => value !== undefined && /^\d{1,3}$/.test(value) && Number(value) <= 100 ? Number(value) : null;

function AssessmentCharts({ scores, title, locale, date }: {
  scores: HairScores; title: string; locale: string; date?: string;
}) {
  const language = locale.split('-')[0] as keyof typeof labels;
  const copy = labels[language] || labels.es;
  const format = new Intl.NumberFormat(locale);
  return <section className="studio-hair-adn" aria-label={title}>
    <header className="studio-hair-adn-heading">
      <Fingerprint size={19} aria-hidden="true" />
      <strong>{title}</strong>
      {date && <time dateTime={date}>{new Intl.DateTimeFormat(locale, { dateStyle:'medium', timeZone:'Europe/Madrid' }).format(new Date(date))}</time>}
    </header>
    {scores.overall !== undefined && <div className="studio-hair-adn-overall">
      <span className="studio-hair-adn-ring" aria-hidden="true" style={{background:`conic-gradient(#e1b575 ${scores.overall}%, #46382f 0)`}} />
      <div><span>{copy[2]}</span><strong>{format.format(scores.overall)} <small>/ 100</small></strong></div>
    </div>}
    <div className="studio-hair-adn-groups">
      {groups.map(({Icon,keys},index) => {
        const rows=keys.filter(key => scores[key] !== undefined);
        if (!rows.length) return null;
        return <section className="studio-hair-adn-group" key={index}>
          <h4><Icon size={16} aria-hidden="true" /> {copy[index]}</h4>
          {rows.map(key => <div className="studio-hair-adn-reading" key={key}>
            <div><span>{copy[labelIndex[key]]}</span><span>{format.format(scores[key]!)} / 100</span></div>
            <div aria-hidden="true" className="studio-hair-adn-track"><span style={{width:`${scores[key]}%`}} /></div>
          </div>)}
        </section>;
      })}
    </div>
  </section>;
}

export function HairAssessmentPortal({ title, locale = 'es-ES' }: { title: string; locale?: string }) {
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
  if (!token || assessment === null) return null;
  if (failed) return <div className="studio-hair-adn-message" role="status">{copy[10]} <button type="button" onClick={() => { setFailed(false); setAttempt(value => value+1); }}>{copy[11]}</button></div>;
  if (!assessment) return <small className="studio-hair-adn-message" role="status">{copy[9]}</small>;
  return Object.keys(assessment.scores).length ? <AssessmentCharts scores={assessment.scores} title={title} locale={locale} date={assessment.updated_at}/> : null;
}

export function HairAssessmentEditor({ clientId }: { clientId: string }) {
  const [saved, setSaved] = useState<HairAssessment | null>();
  const [draft, setDraft] = useState<Draft>({});
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
  const invalid = hairAssessmentKeys.some(key => draft[key] && scoreOf(draft[key]) === null);
  const dirty = hairAssessmentKeys.some(key => (draft[key] || '') !== (saved?.scores[key] === undefined ? '' : String(saved.scores[key])));
  async function publish() {
    const token=currentToken();
    if (!token || saved === undefined || !dirty || invalid || request.current) return;
    request.current=true;
    setBusy(true); setError(''); setNotice('');
    try {
      const {assessment}=await saveHairAssessment(token,clientId,saved?.revision ?? null,scores);
      setSaved(assessment); setDraft(toDraft(assessment.scores));
      setNotice('Valoración publicada en el portal.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la valoración.');
    } finally {
      request.current=false;
      setBusy(false);
    }
  }
  const input = (key: HairAssessmentKey) => <label key={key}>{labels.es[labelIndex[key]]}
    <input inputMode="numeric" value={draft[key] ?? ''} disabled={busy} maxLength={3} placeholder="—"
      aria-invalid={!!draft[key] && scoreOf(draft[key]) === null || undefined}
      onChange={event => { const value=event.target.value; setNotice(''); setDraft(previous => ({...previous,[key]:value})); }} />
  </label>;
  return <details className="studio-hair-adn-editor">
    <summary>ADN Capilar visual</summary>
    {saved === undefined ? error
      ? <p role="alert">{error} <button type="button" onClick={() => { setError(''); setAttempt(value=>value+1); }}>Reintentar</button></p>
      : <p role="status">Cargando valoración…</p>
      : <>
        <p>Valora de 0 a 100 según tu observación. Deja en blanco lo que no hayas evaluado.</p>
        {input('overall')}
        <div className="studio-hair-adn-groups">
          {groups.map(({keys},index) => <fieldset className="studio-hair-adn-group" key={index}><legend>{labels.es[index]}</legend>{keys.map(input)}</fieldset>)}
        </div>
        {Object.keys(scores).length>0 && <details><summary>Vista previa del portal</summary><AssessmentCharts scores={scores} title="ADN Capilar" locale="es-ES"/></details>}
        {invalid && <p role="alert">Introduce números enteros de 0 a 100.</p>}
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <button type="button" disabled={busy || !dirty || !!invalid} onClick={() => void publish()}>
          {busy ? 'Publicando…' : 'Guardar y mostrar en el portal'}
        </button>
      </>}
  </details>;
}
