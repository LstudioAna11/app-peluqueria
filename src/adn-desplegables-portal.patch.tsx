--- a/src/HairAssessment.tsx
+++ b/src/HairAssessment.tsx
@@ -94,15 +94,15 @@
 }) {
   const band = showStatus ? scoreBands.find(({max}) => value <= max) : undefined;
   const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
-  return <div className="studio-hair-adn-overall" data-score-level={band?.level}>
+  return <span className="studio-hair-adn-overall" data-score-level={band?.level}>
     <span className="studio-hair-adn-ring" aria-hidden="true"
       style={{ background: `conic-gradient(var(--hair-score-color, #e1b575) ${value}%, #46382f 0)` }} />
-    <div>
+    <span>
       {label && <span>{label}</span>}
       <strong>{percent.format(value / 100)}</strong>
       {band && <small>{hairScoreLabel(locale,band.level)}</small>}
-    </div>
-  </div>;
+    </span>
+  </span>;
 }
 
 function ScoreLegend({ locale }: { locale: string }) {
@@ -118,8 +118,8 @@
   </ul>;
 }
 
-function AssessmentCharts({ scores, details, locale }: {
-  scores: HairScores; details: HairDetails; locale: string;
+function AssessmentCharts({ scores, details, locale, hairCharacteristics }: {
+  scores: HairScores; details: HairDetails; locale: string; hairCharacteristics?: ReactNode;
 }) {
   const language = locale.split('-')[0] as keyof typeof labels;
   const copy = labels[language] || labels.es;
@@ -129,22 +129,29 @@
   return <>
     {overall !== null && <><ScoreRing value={overall} label={copy[2]} locale={locale}/>
       <p className="studio-hair-adn-caption">{hairAssessmentLabel(locale,'scoreExplanation')}</p></>}
-    <div className="studio-hair-adn-groups">
+    <div className="studio-hair-adn-portal-zones">
       {groups.map(({Icon,keys},index) => {
-        const rows=keys.filter(key => scores[key] !== undefined);
+        const rows = keys.filter(key => scores[key] !== undefined);
         const groupScore = groupScores[index];
-        const allergy=index===0 ? details.allergy : undefined;
-        if (groupScore===null && !allergy) return null;
-        return <section className="studio-hair-adn-group" key={index}>
-          <h4><Icon size={16} aria-hidden="true" /> {copy[index]}</h4>
-          {groupScore!==null && <ScoreRing value={groupScore} locale={locale} showStatus/>}
-          {rows.map(key => <div className="studio-hair-adn-reading" data-intensity={scalpIntensityScores.includes(key)} key={key}>
-            <div><span>{metricLabel(locale,key)}</span><span>{format.format(scores[key]!)} / 100</span></div>
-            <div aria-hidden="true" className="studio-hair-adn-track"><span style={{width:`${scores[key]}%`}} /></div>
-          </div>)}
-          {allergy && <p className="studio-hair-adn-caption"><strong>{hairAssessmentLabel(locale,allergy)}</strong>
-            {allergy==='reported' && details.allergyNote && <span> · {details.allergyNote}</span>}</p>}
-        </section>;
+        const allergy = index === 0 ? details.allergy : undefined;
+        const characteristics = index === 1 ? hairCharacteristics : undefined;
+        if (groupScore === null && !allergy && !characteristics) return null;
+        return <details className="studio-hair-adn-fold studio-hair-adn-group studio-hair-adn-zone" key={index}>
+          <summary>
+            <span className="studio-hair-adn-zone-title"><Icon size={16} aria-hidden="true"/>{copy[index]}</span>
+            {groupScore !== null && <ScoreRing value={groupScore} locale={locale} showStatus/>}
+            <ChevronDown size={16} aria-hidden="true"/>
+          </summary>
+          <div className="studio-hair-adn-fold-content">
+            {rows.map(key => <div className="studio-hair-adn-reading" data-intensity={scalpIntensityScores.includes(key)} key={key}>
+              <div><span>{metricLabel(locale,key)}</span><span>{format.format(scores[key]!)} / 100</span></div>
+              <div aria-hidden="true" className="studio-hair-adn-track"><span style={{width:`${scores[key]}%`}} /></div>
+            </div>)}
+            {allergy && <p className="studio-hair-adn-caption"><strong>{hairAssessmentLabel(locale,allergy)}</strong>
+              {allergy==='reported' && details.allergyNote && <span> · {details.allergyNote}</span>}</p>}
+            {characteristics}
+          </div>
+        </details>;
       })}
     </div>
     {groupScores.some(value => value !== null) && <ScoreLegend locale={locale}/>}
@@ -176,17 +183,16 @@
       {date && <time dateTime={date}>{displayDate(date)}</time>}
     </header>
     <AssessmentSections locale={locale} available={available} content={{
-      assessment:<>
-        {hasChart && <AssessmentCharts scores={scores} details={details} locale={locale}/>}
-        {characteristics.length > 0 && <AssessmentDisclosure title={hairCharacteristicLabel(locale,'title')}>
+      assessment:<AssessmentCharts scores={scores} details={details} locale={locale}
+        hairCharacteristics={characteristics.length > 0 ? <div className="studio-hair-adn-zone-characteristics">
+          <h4>{hairCharacteristicLabel(locale,'title')}</h4>
           <dl className="studio-hair-adn-details studio-hair-adn-characteristics">
             {characteristics.map(key => <div key={key} data-wide={key === 'previousTreatments'}>
               <dt>{hairCharacteristicLabel(locale,key)}</dt>
               <dd>{hairCharacteristicValue(locale,key,details[key]!)}</dd>
             </div>)}
           </dl>
-        </AssessmentDisclosure>}
-      </>,
+        </div> : undefined}/>,
       habits:description(habits), chemistry:<>
         {chemistry.length>0 && description(chemistry)}
         {visits.length>0 && <ul className="studio-hair-adn-history">{visits.map((visit,index)=><li key={index}>
--- a/src/hair-assessment.css
+++ b/src/hair-assessment.css
@@ -172,3 +172,33 @@
   color: #d6cbb8;
   white-space: nowrap;
 }
+
+.studio-hair-adn-portal-zones {
+  display: grid;
+  gap: 7px;
+  margin-top: 9px;
+}
+.studio-hair-adn-zone { margin: 0; padding: 0; }
+.studio-hair-adn-zone > summary { min-height: 48px; gap: 8px; }
+.studio-hair-adn-zone > summary > svg { flex-shrink: 0; }
+.studio-hair-adn-zone-title {
+  flex: 1;
+  min-width: 0;
+  display: flex;
+  align-items: center;
+  gap: 6px;
+  overflow-wrap: anywhere;
+}
+.studio-hair-adn-zone-title svg { flex-shrink: 0; }
+.studio-hair-adn-zone .studio-hair-adn-overall {
+  flex: 0 1 auto;
+  min-width: 0;
+  margin: 0;
+  gap: 5px;
+}
+.studio-hair-adn-zone .studio-hair-adn-overall strong { font-size: .94rem; white-space: nowrap; }
+.studio-hair-adn-zone .studio-hair-adn-overall small { margin-top: 1px; font-size: .7rem; overflow-wrap: anywhere; }
+.studio-hair-adn-zone .studio-hair-adn-ring { flex-basis: 29px; height: 29px; }
+.studio-hair-adn-zone .studio-hair-adn-ring::before { width: 22px; height: 22px; }
+.studio-hair-adn-zone[open] > .studio-hair-adn-fold-content { padding-top: 8px; border-top: 1px solid #69523b; }
+.studio-hair-adn-zone-characteristics:not(:first-child) { margin-top: 12px; }
