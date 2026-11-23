--- a/src/HairAssessment.tsx
+++ b/src/HairAssessment.tsx
@@ -4,22 +4,22 @@
   currentToken, fetchHairAssessment, saveHairAssessment, hairAssessmentKeys, hairHabitKeys, chemicalHistoryKeys, StudioApiError,
   type HairAssessment, type HairAssessmentKey, type HairScores, type HairDetails, type HairDetailKey, type ChemicalVisit,
 } from './studioApi';
-import { chemicalDates, hairAssessmentLabel, intensityScores } from './hairAssessmentCopy';
+import { chemicalDates, hairAssessmentLabel, scalpIntensityScores } from './hairAssessmentCopy';
 import './hair-assessment.css';
 
 const labels = {
-  es: ['Cuero cabelludo','Cabello','Valoración general','Confort','Hidratación','Equilibrio de grasa','Brillo','Elasticidad','Porosidad','Cargando valoración…','No se pudo cargar la valoración.','Reintentar'],
-  en: ['Scalp','Hair','Overall assessment','Comfort','Hydration','Oil balance','Shine','Elasticity','Porosity','Loading assessment…','Could not load the assessment.','Retry'],
-  fr: ['Cuir chevelu','Cheveux','Évaluation générale','Confort','Hydratation','Équilibre du sébum','Brillance','Élasticité','Porosité','Chargement de l’évaluation…','Impossible de charger l’évaluation.','Réessayer'],
-  it: ['Cuoio capelluto','Capelli','Valutazione generale','Comfort','Idratazione','Equilibrio del sebo','Lucentezza','Elasticità','Porosità','Caricamento della valutazione…','Impossibile caricare la valutazione.','Riprova'],
-  pt: ['Couro cabeludo','Cabelo','Avaliação geral','Conforto','Hidratação','Equilíbrio da oleosidade','Brilho','Elasticidade','Porosidade','A carregar a avaliação…','Não foi possível carregar a avaliação.','Tentar novamente'],
-  de: ['Kopfhaut','Haar','Gesamtbeurteilung','Wohlbefinden','Feuchtigkeit','Talgbalance','Glanz','Elastizität','Porosität','Beurteilung wird geladen…','Die Beurteilung konnte nicht geladen werden.','Erneut versuchen'],
-  nl: ['Hoofdhuid','Haar','Algemene beoordeling','Comfort','Hydratatie','Talgbalans','Glans','Elasticiteit','Porositeit','Beoordeling laden…','De beoordeling kon niet worden geladen.','Opnieuw proberen'],
-  pl: ['Skóra głowy','Włosy','Ocena ogólna','Komfort','Nawilżenie','Równowaga sebum','Połysk','Elastyczność','Porowatość','Wczytywanie oceny…','Nie udało się wczytać oceny.','Spróbuj ponownie'],
-  cs: ['Pokožka hlavy','Vlasy','Celkové hodnocení','Pohodlí','Hydratace','Rovnováha mazu','Lesk','Pružnost','Poréznost','Načítání hodnocení…','Hodnocení se nepodařilo načíst.','Zkusit znovu'],
-  nb: ['Hodebunn','Hår','Helhetsvurdering','Komfort','Fuktighet','Talg­balanse','Glans','Elastisitet','Porøsitet','Laster vurderingen…','Kunne ikke laste vurderingen.','Prøv igjen'],
-  sv: ['Hårbotten','Hår','Helhetsbedömning','Komfort','Fukt','Talgbalans','Glans','Elasticitet','Porositet','Läser in bedömningen…','Det gick inte att läsa in bedömningen.','Försök igen'],
-  ar: ['فروة الرأس','الشعر','التقييم العام','الراحة','الترطيب','توازن الدهون','اللمعان','المرونة','المسامية','جارٍ تحميل التقييم…','تعذّر تحميل التقييم.','إعادة المحاولة'],
+  es: ['Cuero cabelludo','Cabello','Valoración general','Confort','Hidratación','Equilibrio de grasa','Brillo','Elasticidad','Equilibrio de la porosidad','Cargando valoración…','No se pudo cargar la valoración.','Reintentar'],
+  en: ['Scalp','Hair','Overall assessment','Comfort','Hydration','Oil balance','Shine','Elasticity','Porosity balance','Loading assessment…','Could not load the assessment.','Retry'],
+  fr: ['Cuir chevelu','Cheveux','Évaluation générale','Confort','Hydratation','Équilibre du sébum','Brillance','Élasticité','Équilibre de la porosité','Chargement de l’évaluation…','Impossible de charger l’évaluation.','Réessayer'],
+  it: ['Cuoio capelluto','Capelli','Valutazione generale','Comfort','Idratazione','Equilibrio del sebo','Lucentezza','Elasticità','Equilibrio della porosità','Caricamento della valutazione…','Impossibile caricare la valutazione.','Riprova'],
+  pt: ['Couro cabeludo','Cabelo','Avaliação geral','Conforto','Hidratação','Equilíbrio da oleosidade','Brilho','Elasticidade','Equilíbrio da porosidade','A carregar a avaliação…','Não foi possível carregar a avaliação.','Tentar novamente'],
+  de: ['Kopfhaut','Haar','Gesamtbeurteilung','Wohlbefinden','Feuchtigkeit','Talgbalance','Glanz','Elastizität','Ausgewogene Porosität','Beurteilung wird geladen…','Die Beurteilung konnte nicht geladen werden.','Erneut versuchen'],
+  nl: ['Hoofdhuid','Haar','Algemene beoordeling','Comfort','Hydratatie','Talgbalans','Glans','Elasticiteit','Porositeitsbalans','Beoordeling laden…','De beoordeling kon niet worden geladen.','Opnieuw proberen'],
+  pl: ['Skóra głowy','Włosy','Ocena ogólna','Komfort','Nawilżenie','Równowaga sebum','Połysk','Elastyczność','Równowaga porowatości','Wczytywanie oceny…','Nie udało się wczytać oceny.','Spróbuj ponownie'],
+  cs: ['Pokožka hlavy','Vlasy','Celkové hodnocení','Pohodlí','Hydratace','Rovnováha mazu','Lesk','Pružnost','Rovnováha poréznosti','Načítání hodnocení…','Hodnocení se nepodařilo načíst.','Zkusit znovu'],
+  nb: ['Hodebunn','Hår','Helhetsvurdering','Komfort','Fuktighet','Talg­balanse','Glans','Elastisitet','Balansert porøsitet','Laster vurderingen…','Kunne ikke laste vurderingen.','Prøv igjen'],
+  sv: ['Hårbotten','Hår','Helhetsbedömning','Komfort','Fukt','Talgbalans','Glans','Elasticitet','Balanserad porositet','Läser in bedömningen…','Det gick inte att läsa in bedömningen.','Försök igen'],
+  ar: ['فروة الرأس','الشعر','التقييم العام','الراحة','الترطيب','توازن الدهون','اللمعان','المرونة','توازن المسامية','جارٍ تحميل التقييم…','تعذّر تحميل التقييم.','إعادة المحاولة'],
 } as const;
 
 const groups = [
@@ -47,7 +47,7 @@
 export function assessmentPercentage(scores: HairScores, keys: readonly HairAssessmentKey[] = evaluatedKeys) {
   const values = keys.flatMap(key => {
     const score = scores[key];
-    return key === 'overall' || score === undefined ? [] : [intensityScores.includes(key) ? 100-score : score];
+    return key === 'overall' || score === undefined ? [] : [scalpIntensityScores.includes(key) ? 100-score : score];
   });
   return values.length ? Math.round(values.reduce((sum,value)=>sum+value,0)/values.length) : null;
 }
@@ -108,7 +108,7 @@
         return <section className="studio-hair-adn-group" key={index}>
           <h4><Icon size={16} aria-hidden="true" /> {copy[index]}</h4>
           {groupScore!==null && <ScoreRing value={groupScore} label={copy[index]} locale={locale}/>}
-          {rows.map(key => <div className="studio-hair-adn-reading" data-intensity={intensityScores.includes(key)} key={key}>
+          {rows.map(key => <div className="studio-hair-adn-reading" data-intensity={scalpIntensityScores.includes(key)} key={key}>
             <div><span>{metricLabel(locale,key)}</span><span>{format.format(scores[key]!)} / 100</span></div>
             <div aria-hidden="true" className="studio-hair-adn-track"><span style={{width:`${scores[key]}%`}} /></div>
           </div>)}
@@ -286,7 +286,7 @@
           assessment:<>
             <div className="studio-hair-adn-editor-overview">
               {overall!==null && <ScoreRing value={overall} label={labels.es[2]} locale="es-ES"/>}
-              <p>Valora de 0 a 100 y deja en blanco lo que no hayas evaluado. La sensibilidad, descamación, caspa, porosidad, daño químico y encrespamiento indican intensidad. Los valores altos de esos indicadores reducen el porcentaje.</p>
+              <p>En Cabello, 100 indica el mejor estado. En Cuero cabelludo, sensibilidad, descamación y caspa se valoran por intensidad: 0 indica ausencia. Deja en blanco lo que no hayas evaluado.</p>
             </div>
             <div className="studio-hair-adn-group-switch" role="group" aria-label="Zona de la valoración">
               {groups.map(({Icon},index) => (
--- a/src/hairAssessmentCopy.tsx
+++ b/src/hairAssessmentCopy.tsx
@@ -4,18 +4,18 @@
 type ExtraKey = typeof extraKeys[number];
 
 const copy = {
-  es: ['Valoración','Hábitos diarios','Historial químico','Sensibilidad','Descamación','Caspa','Daño químico','Encrespamiento','Alergias referidas','Alergia referida','Ninguna referida','Observación','Frecuencia de lavado','Momento del lavado','Secado habitual','Herramientas de calor','Tiempo dedicado al cuidado','Notas sobre tus hábitos','Última coloración','Última decoloración','Último alisado','Otros trabajos y observaciones','Porcentaje calculado a partir de los aspectos valorados en el salón.'],
-  en: ['Assessment','Daily habits','Chemical history','Sensitivity','Flaking','Dandruff','Chemical damage','Frizz','Reported allergies','Allergy reported','None reported','Note','Wash frequency','Time of day for washing','Usual drying method','Heat tools','Time spent on hair care','Notes on your habits','Last colour','Last bleach','Last straightening','Other treatments and notes','Percentage based on the areas assessed in the salon.'],
-  fr: ['Évaluation','Habitudes quotidiennes','Historique chimique','Sensibilité','Desquamation','Pellicules','Dommages chimiques','Frisottis','Allergies signalées','Allergie signalée','Aucune signalée','Note','Fréquence des lavages','Moment du lavage','Séchage habituel','Appareils chauffants','Temps consacré aux soins','Notes sur vos habitudes','Dernière coloration','Dernière décoloration','Dernier lissage','Autres prestations et notes','Pourcentage calculé à partir des aspects évalués au salon.'],
-  it: ['Valutazione','Abitudini quotidiane','Storico dei trattamenti chimici','Sensibilità','Desquamazione','Forfora','Danni chimici','Effetto crespo','Allergie riferite','Allergia riferita','Nessuna riferita','Nota','Frequenza del lavaggio','Momento del lavaggio','Asciugatura abituale','Strumenti a caldo','Tempo dedicato alla cura','Note sulle abitudini','Ultima colorazione','Ultima decolorazione','Ultima lisciatura','Altri trattamenti e note','Percentuale calcolata sugli aspetti valutati in salone.'],
-  pt: ['Avaliação','Hábitos diários','Histórico químico','Sensibilidade','Descamação','Caspa','Danos químicos','Frizz','Alergias referidas','Alergia referida','Nenhuma referida','Nota','Frequência de lavagem','Momento da lavagem','Secagem habitual','Ferramentas de calor','Tempo dedicado ao cuidado','Notas sobre os teus hábitos','Última coloração','Última descoloração','Último alisamento','Outros trabalhos e notas','Percentagem calculada a partir dos aspetos avaliados no salão.'],
-  de: ['Beurteilung','Tägliche Gewohnheiten','Chemische Behandlungen','Empfindlichkeit','Schuppung','Schuppen','Chemische Schäden','Frizz','Angegebene Allergien','Allergie angegeben','Keine angegeben','Hinweis','Waschhäufigkeit','Tageszeit der Haarwäsche','Übliche Trocknung','Hitzestylinggeräte','Zeit für die Haarpflege','Hinweise zu deinen Gewohnheiten','Letzte Färbung','Letzte Blondierung','Letzte Glättung','Weitere Behandlungen und Hinweise','Prozentwert aus den im Salon beurteilten Merkmalen.'],
-  nl: ['Beoordeling','Dagelijkse gewoonten','Chemische behandelingen','Gevoeligheid','Schilfering','Roos','Chemische schade','Pluis','Gemelde allergieën','Allergie gemeld','Geen gemeld','Opmerking','Wasfrequentie','Wasdagdeel','Gebruikelijke droogmethode','Warmtetools','Tijd voor haarverzorging','Notities over je gewoonten','Laatste kleuring','Laatste ontkleuring','Laatste ontkrulling','Andere behandelingen en notities','Percentage op basis van de kenmerken die in de salon zijn beoordeeld.'],
-  pl: ['Ocena','Codzienne nawyki','Historia zabiegów chemicznych','Wrażliwość','Łuszczenie','Łupież','Uszkodzenia chemiczne','Puszenie','Zgłoszone alergie','Zgłoszono alergię','Nie zgłoszono','Uwagi','Częstotliwość mycia','Pora mycia','Zwykły sposób suszenia','Urządzenia do stylizacji na gorąco','Czas na pielęgnację','Uwagi o nawykach','Ostatnia koloryzacja','Ostatnie rozjaśnianie','Ostatnie prostowanie','Inne zabiegi i uwagi','Wynik procentowy na podstawie cech ocenionych w salonie.'],
-  cs: ['Hodnocení','Denní návyky','Historie chemických úprav','Citlivost','Šupinatění','Lupy','Chemické poškození','Krepatění','Uvedené alergie','Alergie uvedena','Žádné uvedené','Poznámka','Četnost mytí','Doba mytí','Běžný způsob sušení','Tepelné nástroje','Čas na péči','Poznámky k návykům','Poslední barvení','Poslední zesvětlení','Poslední narovnání','Další úpravy a poznámky','Procento vychází z vlastností posouzených v salonu.'],
-  nb: ['Vurdering','Daglige vaner','Kjemisk historikk','Sensitivitet','Flassing','Flass','Kjemisk skade','Frizz','Oppgitte allergier','Allergi oppgitt','Ingen oppgitt','Merknad','Vaskefrekvens','Tidspunkt for vask','Vanlig tørkemetode','Varmeverktøy','Tid brukt på hårpleie','Merknader om vanene dine','Siste farging','Siste bleking','Siste kjemiske retting','Andre behandlinger og merknader','Prosent beregnet fra områdene som er vurdert i salongen.'],
-  sv: ['Bedömning','Dagliga vanor','Kemisk historik','Känslighet','Fjällning','Mjäll','Kemisk skada','Frissighet','Uppgivna allergier','Allergi uppgiven','Inga uppgivna','Anteckning','Tvättfrekvens','Tid på dagen för tvätt','Vanlig torkmetod','Värmeverktyg','Tid för hårvård','Anteckningar om dina vanor','Senaste färgning','Senaste blekning','Senaste kemiska rakbehandling','Övriga behandlingar och anteckningar','Procent enligt de egenskaper som bedömts i salongen.'],
-  ar: ['التقييم','العادات اليومية','سجل المعالجات الكيميائية','الحساسية','التقشّر','القشرة','التلف الكيميائي','الهيشان','الحساسية المبلّغ عنها','تم الإبلاغ عن حساسية','لم يُبلّغ عن حساسية','ملاحظة','عدد مرات الغسل','وقت الغسل','طريقة التجفيف المعتادة','أدوات التصفيف الحراري','الوقت المخصّص للعناية','ملاحظات عن عاداتك','آخر صبغة','آخر تفتيح','آخر فرد للشعر','معالجات وملاحظات أخرى','نسبة محسوبة من الجوانب التي قُيّمت في الصالون.'],
+  es: ['Valoración','Hábitos diarios','Historial químico','Sensibilidad','Descamación','Caspa','Estado frente al daño químico','Control del encrespamiento','Alergias referidas','Alergia referida','Ninguna referida','Observación','Frecuencia de lavado','Momento del lavado','Secado habitual','Herramientas de calor','Tiempo dedicado al cuidado','Notas sobre tus hábitos','Última coloración','Última decoloración','Último alisado','Otros trabajos y observaciones','Porcentaje calculado a partir de los aspectos valorados en el salón.'],
+  en: ['Assessment','Daily habits','Chemical history','Sensitivity','Flaking','Dandruff','Condition after chemical treatments','Frizz control','Reported allergies','Allergy reported','None reported','Note','Wash frequency','Time of day for washing','Usual drying method','Heat tools','Time spent on hair care','Notes on your habits','Last colour','Last bleach','Last straightening','Other treatments and notes','Percentage based on the areas assessed in the salon.'],
+  fr: ['Évaluation','Habitudes quotidiennes','Historique chimique','Sensibilité','Desquamation','Pellicules','État après traitements chimiques','Maîtrise des frisottis','Allergies signalées','Allergie signalée','Aucune signalée','Note','Fréquence des lavages','Moment du lavage','Séchage habituel','Appareils chauffants','Temps consacré aux soins','Notes sur vos habitudes','Dernière coloration','Dernière décoloration','Dernier lissage','Autres prestations et notes','Pourcentage calculé à partir des aspects évalués au salon.'],
+  it: ['Valutazione','Abitudini quotidiane','Storico dei trattamenti chimici','Sensibilità','Desquamazione','Forfora','Condizione dopo i trattamenti chimici','Controllo del crespo','Allergie riferite','Allergia riferita','Nessuna riferita','Nota','Frequenza del lavaggio','Momento del lavaggio','Asciugatura abituale','Strumenti a caldo','Tempo dedicato alla cura','Note sulle abitudini','Ultima colorazione','Ultima decolorazione','Ultima lisciatura','Altri trattamenti e note','Percentuale calcolata sugli aspetti valutati in salone.'],
+  pt: ['Avaliação','Hábitos diários','Histórico químico','Sensibilidade','Descamação','Caspa','Estado após tratamentos químicos','Controlo do frisado','Alergias referidas','Alergia referida','Nenhuma referida','Nota','Frequência de lavagem','Momento da lavagem','Secagem habitual','Ferramentas de calor','Tempo dedicado ao cuidado','Notas sobre os teus hábitos','Última coloração','Última descoloração','Último alisamento','Outros trabalhos e notas','Percentagem calculada a partir dos aspetos avaliados no salão.'],
+  de: ['Beurteilung','Tägliche Gewohnheiten','Chemische Behandlungen','Empfindlichkeit','Schuppung','Schuppen','Haarzustand nach chemischer Behandlung','Frizz-Kontrolle','Angegebene Allergien','Allergie angegeben','Keine angegeben','Hinweis','Waschhäufigkeit','Tageszeit der Haarwäsche','Übliche Trocknung','Hitzestylinggeräte','Zeit für die Haarpflege','Hinweise zu deinen Gewohnheiten','Letzte Färbung','Letzte Blondierung','Letzte Glättung','Weitere Behandlungen und Hinweise','Prozentwert aus den im Salon beurteilten Merkmalen.'],
+  nl: ['Beoordeling','Dagelijkse gewoonten','Chemische behandelingen','Gevoeligheid','Schilfering','Roos','Haarconditie na chemische behandelingen','Pluisbeheersing','Gemelde allergieën','Allergie gemeld','Geen gemeld','Opmerking','Wasfrequentie','Wasdagdeel','Gebruikelijke droogmethode','Warmtetools','Tijd voor haarverzorging','Notities over je gewoonten','Laatste kleuring','Laatste ontkleuring','Laatste ontkrulling','Andere behandelingen en notities','Percentage op basis van de kenmerken die in de salon zijn beoordeeld.'],
+  pl: ['Ocena','Codzienne nawyki','Historia zabiegów chemicznych','Wrażliwość','Łuszczenie','Łupież','Stan po zabiegach chemicznych','Kontrola puszenia','Zgłoszone alergie','Zgłoszono alergię','Nie zgłoszono','Uwagi','Częstotliwość mycia','Pora mycia','Zwykły sposób suszenia','Urządzenia do stylizacji na gorąco','Czas na pielęgnację','Uwagi o nawykach','Ostatnia koloryzacja','Ostatnie rozjaśnianie','Ostatnie prostowanie','Inne zabiegi i uwagi','Wynik procentowy na podstawie cech ocenionych w salonie.'],
+  cs: ['Hodnocení','Denní návyky','Historie chemických úprav','Citlivost','Šupinatění','Lupy','Stav po chemických úpravách','Kontrola krepatění','Uvedené alergie','Alergie uvedena','Žádné uvedené','Poznámka','Četnost mytí','Doba mytí','Běžný způsob sušení','Tepelné nástroje','Čas na péči','Poznámky k návykům','Poslední barvení','Poslední zesvětlení','Poslední narovnání','Další úpravy a poznámky','Procento vychází z vlastností posouzených v salonu.'],
+  nb: ['Vurdering','Daglige vaner','Kjemisk historikk','Sensitivitet','Flassing','Flass','Hårets tilstand etter kjemisk behandling','Kontroll på frizz','Oppgitte allergier','Allergi oppgitt','Ingen oppgitt','Merknad','Vaskefrekvens','Tidspunkt for vask','Vanlig tørkemetode','Varmeverktøy','Tid brukt på hårpleie','Merknader om vanene dine','Siste farging','Siste bleking','Siste kjemiske retting','Andre behandlinger og merknader','Prosent beregnet fra områdene som er vurdert i salongen.'],
+  sv: ['Bedömning','Dagliga vanor','Kemisk historik','Känslighet','Fjällning','Mjäll','Hårets skick efter kemisk behandling','Kontroll över frissighet','Uppgivna allergier','Allergi uppgiven','Inga uppgivna','Anteckning','Tvättfrekvens','Tid på dagen för tvätt','Vanlig torkmetod','Värmeverktyg','Tid för hårvård','Anteckningar om dina vanor','Senaste färgning','Senaste blekning','Senaste kemiska rakbehandling','Övriga behandlingar och anteckningar','Procent enligt de egenskaper som bedömts i salongen.'],
+  ar: ['التقييم','العادات اليومية','سجل المعالجات الكيميائية','الحساسية','التقشّر','القشرة','حالة الشعر بعد المعالجات الكيميائية','التحكم في الهيشان','الحساسية المبلّغ عنها','تم الإبلاغ عن حساسية','لم يُبلّغ عن حساسية','ملاحظة','عدد مرات الغسل','وقت الغسل','طريقة التجفيف المعتادة','أدوات التصفيف الحراري','الوقت المخصّص للعناية','ملاحظات عن عاداتك','آخر صبغة','آخر تفتيح','آخر فرد للشعر','معالجات وملاحظات أخرى','نسبة محسوبة من الجوانب التي قُيّمت في الصالون.'],
 } satisfies Record<string, readonly string[]>;
 
 export function hairAssessmentLabel(locale: string, key: ExtraKey): string {
@@ -23,7 +23,7 @@
   return (copy[lang] || copy.es)[extraKeys.indexOf(key)] ?? copy.es[extraKeys.indexOf(key)];
 }
 
-export const intensityScores: readonly HairAssessmentKey[] = [
-  'scalpSensitivity','scalpFlaking','scalpDandruff','hairPorosity','hairChemicalDamage','hairFrizz',
+export const scalpIntensityScores: readonly HairAssessmentKey[] = [
+  'scalpSensitivity','scalpFlaking','scalpDandruff',
 ];
 export const chemicalDates: readonly HairDetailKey[] = ['lastColor','lastBleach','lastStraightening'];
