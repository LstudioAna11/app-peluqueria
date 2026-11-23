import type { HairAssessmentKey, HairDetailKey, HairCharacteristicKey } from './studioApi';

const extraKeys = ['assessment','habits','chemistry','scalpSensitivity','scalpFlaking','scalpDandruff','hairChemicalDamage','hairFrizz','allergy','reported','none-reported','allergyNote','washFrequency','washTime','drying','heatTools','homeCareTime','habitNotes','lastColor','lastBleach','lastStraightening','chemicalNotes','scoreExplanation'] as const;
type ExtraKey = typeof extraKeys[number];

const copy = {
  es: ['Valoración','Hábitos diarios','Historial químico','Sensibilidad','Descamación','Caspa','Estado frente al daño químico','Control del encrespamiento','Alergias referidas','Alergia referida','Ninguna referida','Observación','Frecuencia de lavado','Momento del lavado','Secado habitual','Herramientas de calor','Tiempo dedicado al cuidado','Notas sobre tus hábitos','Última coloración','Última decoloración','Último alisado','Otros trabajos y observaciones','Porcentaje calculado a partir de los aspectos valorados en el salón.'],
  en: ['Assessment','Daily habits','Chemical history','Sensitivity','Flaking','Dandruff','Condition after chemical treatments','Frizz control','Reported allergies','Allergy reported','None reported','Note','Wash frequency','Time of day for washing','Usual drying method','Heat tools','Time spent on hair care','Notes on your habits','Last colour','Last bleach','Last straightening','Other treatments and notes','Percentage based on the areas assessed in the salon.'],
  fr: ['Évaluation','Habitudes quotidiennes','Historique chimique','Sensibilité','Desquamation','Pellicules','État après traitements chimiques','Maîtrise des frisottis','Allergies signalées','Allergie signalée','Aucune signalée','Note','Fréquence des lavages','Moment du lavage','Séchage habituel','Appareils chauffants','Temps consacré aux soins','Notes sur vos habitudes','Dernière coloration','Dernière décoloration','Dernier lissage','Autres prestations et notes','Pourcentage calculé à partir des aspects évalués au salon.'],
  it: ['Valutazione','Abitudini quotidiane','Storico dei trattamenti chimici','Sensibilità','Desquamazione','Forfora','Condizione dopo i trattamenti chimici','Controllo del crespo','Allergie riferite','Allergia riferita','Nessuna riferita','Nota','Frequenza del lavaggio','Momento del lavaggio','Asciugatura abituale','Strumenti a caldo','Tempo dedicato alla cura','Note sulle abitudini','Ultima colorazione','Ultima decolorazione','Ultima lisciatura','Altri trattamenti e note','Percentuale calcolata sugli aspetti valutati in salone.'],
  pt: ['Avaliação','Hábitos diários','Histórico químico','Sensibilidade','Descamação','Caspa','Estado após tratamentos químicos','Controlo do frisado','Alergias referidas','Alergia referida','Nenhuma referida','Nota','Frequência de lavagem','Momento da lavagem','Secagem habitual','Ferramentas de calor','Tempo dedicado ao cuidado','Notas sobre os teus hábitos','Última coloração','Última descoloração','Último alisamento','Outros trabalhos e notas','Percentagem calculada a partir dos aspetos avaliados no salão.'],
  de: ['Beurteilung','Tägliche Gewohnheiten','Chemische Behandlungen','Empfindlichkeit','Schuppung','Schuppen','Haarzustand nach chemischer Behandlung','Frizz-Kontrolle','Angegebene Allergien','Allergie angegeben','Keine angegeben','Hinweis','Waschhäufigkeit','Tageszeit der Haarwäsche','Übliche Trocknung','Hitzestylinggeräte','Zeit für die Haarpflege','Hinweise zu deinen Gewohnheiten','Letzte Färbung','Letzte Blondierung','Letzte Glättung','Weitere Behandlungen und Hinweise','Prozentwert aus den im Salon beurteilten Merkmalen.'],
  nl: ['Beoordeling','Dagelijkse gewoonten','Chemische behandelingen','Gevoeligheid','Schilfering','Roos','Haarconditie na chemische behandelingen','Pluisbeheersing','Gemelde allergieën','Allergie gemeld','Geen gemeld','Opmerking','Wasfrequentie','Wasdagdeel','Gebruikelijke droogmethode','Warmtetools','Tijd voor haarverzorging','Notities over je gewoonten','Laatste kleuring','Laatste ontkleuring','Laatste ontkrulling','Andere behandelingen en notities','Percentage op basis van de kenmerken die in de salon zijn beoordeeld.'],
  pl: ['Ocena','Codzienne nawyki','Historia zabiegów chemicznych','Wrażliwość','Łuszczenie','Łupież','Stan po zabiegach chemicznych','Kontrola puszenia','Zgłoszone alergie','Zgłoszono alergię','Nie zgłoszono','Uwagi','Częstotliwość mycia','Pora mycia','Zwykły sposób suszenia','Urządzenia do stylizacji na gorąco','Czas na pielęgnację','Uwagi o nawykach','Ostatnia koloryzacja','Ostatnie rozjaśnianie','Ostatnie prostowanie','Inne zabiegi i uwagi','Wynik procentowy na podstawie cech ocenionych w salonie.'],
  cs: ['Hodnocení','Denní návyky','Historie chemických úprav','Citlivost','Šupinatění','Lupy','Stav po chemických úpravách','Kontrola krepatění','Uvedené alergie','Alergie uvedena','Žádné uvedené','Poznámka','Četnost mytí','Doba mytí','Běžný způsob sušení','Tepelné nástroje','Čas na péči','Poznámky k návykům','Poslední barvení','Poslední zesvětlení','Poslední narovnání','Další úpravy a poznámky','Procento vychází z vlastností posouzených v salonu.'],
  nb: ['Vurdering','Daglige vaner','Kjemisk historikk','Sensitivitet','Flassing','Flass','Hårets tilstand etter kjemisk behandling','Kontroll på frizz','Oppgitte allergier','Allergi oppgitt','Ingen oppgitt','Merknad','Vaskefrekvens','Tidspunkt for vask','Vanlig tørkemetode','Varmeverktøy','Tid brukt på hårpleie','Merknader om vanene dine','Siste farging','Siste bleking','Siste kjemiske retting','Andre behandlinger og merknader','Prosent beregnet fra områdene som er vurdert i salongen.'],
  sv: ['Bedömning','Dagliga vanor','Kemisk historik','Känslighet','Fjällning','Mjäll','Hårets skick efter kemisk behandling','Kontroll över frissighet','Uppgivna allergier','Allergi uppgiven','Inga uppgivna','Anteckning','Tvättfrekvens','Tid på dagen för tvätt','Vanlig torkmetod','Värmeverktyg','Tid för hårvård','Anteckningar om dina vanor','Senaste färgning','Senaste blekning','Senaste kemiska rakbehandling','Övriga behandlingar och anteckningar','Procent enligt de egenskaper som bedömts i salongen.'],
  ar: ['التقييم','العادات اليومية','سجل المعالجات الكيميائية','الحساسية','التقشّر','القشرة','حالة الشعر بعد المعالجات الكيميائية','التحكم في الهيشان','الحساسية المبلّغ عنها','تم الإبلاغ عن حساسية','لم يُبلّغ عن حساسية','ملاحظة','عدد مرات الغسل','وقت الغسل','طريقة التجفيف المعتادة','أدوات التصفيف الحراري','الوقت المخصّص للعناية','ملاحظات عن عاداتك','آخر صبغة','آخر تفتيح','آخر فرد للشعر','معالجات وملاحظات أخرى','نسبة محسوبة من الجوانب التي قُيّمت في الصالون.'],
} satisfies Record<string, readonly string[]>;

export function hairAssessmentLabel(locale: string, key: ExtraKey): string {
  const lang = locale.split('-')[0] as keyof typeof copy;
  return (copy[lang] || copy.es)[extraKeys.indexOf(key)] ?? copy.es[extraKeys.indexOf(key)];
}

export const scalpIntensityScores: readonly HairAssessmentKey[] = [
  'scalpSensitivity','scalpFlaking','scalpDandruff',
];
export const chemicalDates: readonly HairDetailKey[] = ['lastColor','lastBleach','lastStraightening'];

const characteristicCopy: Record<string, readonly string[]> = {
  es: ['Características del cabello','Tipo de cabello','Textura','Densidad','Porosidad','Estado actual','Tratamientos previos','Liso','Ondulado','Rizado','Muy rizado','Fino','Medio','Grueso','Baja','Media','Alta'],
  en: ['Hair characteristics','Hair type','Texture','Density','Porosity','Current condition','Previous treatments','Straight','Wavy','Curly','Coily','Fine','Medium','Coarse','Low','Medium','High'],
  fr: ['Caractéristiques des cheveux','Type de cheveux','Texture','Densité','Porosité','État actuel','Traitements précédents','Raides','Ondulés','Bouclés','Crépus','Fins','Moyens','Épais','Faible','Moyenne','Élevée'],
  it: ['Caratteristiche dei capelli','Tipo di capelli','Texture','Densità','Porosità','Condizione attuale','Trattamenti precedenti','Lisci','Mossi','Ricci','Molto ricci','Fini','Medi','Spessi','Bassa','Media','Alta'],
  pt: ['Características do cabelo','Tipo de cabelo','Textura','Densidade','Porosidade','Estado atual','Tratamentos anteriores','Liso','Ondulado','Encaracolado','Crespo','Fino','Médio','Grosso','Baixa','Média','Alta'],
  de: ['Haarmerkmale','Haartyp','Haarstruktur','Haardichte','Porosität','Aktueller Zustand','Frühere Behandlungen','Glatt','Wellig','Lockig','Kraus','Fein','Mittel','Dick','Gering','Mittel','Hoch'],
  nl: ['Haarkenmerken','Haartype','Textuur','Haardichtheid','Porositeit','Huidige conditie','Eerdere behandelingen','Steil','Golvend','Krullend','Kroes','Fijn','Gemiddeld','Dik','Laag','Gemiddeld','Hoog'],
  pl: ['Charakterystyka włosów','Typ włosów','Tekstura','Gęstość','Porowatość','Obecna kondycja','Wcześniejsze zabiegi','Proste','Falowane','Kręcone','Mocno kręcone','Cienkie','Średnie','Grube','Niska','Średnia','Wysoka'],
  cs: ['Vlastnosti vlasů','Typ vlasů','Textura','Hustota','Poréznost','Současný stav','Předchozí ošetření','Rovné','Vlnité','Kudrnaté','Silně kudrnaté','Jemné','Střední','Silné','Nízká','Střední','Vysoká'],
  nb: ['Hårets egenskaper','Hårtype','Tekstur','Tetthet','Porøsitet','Nåværende tilstand','Tidligere behandlinger','Rett','Bølgete','Krøllete','Veldig krøllete','Fint','Middels','Grovt','Lav','Middels','Høy'],
  sv: ['Hårets egenskaper','Hårtyp','Textur','Täthet','Porositet','Nuvarande skick','Tidigare behandlingar','Rakt','Vågigt','Lockigt','Mycket lockigt','Fint','Medel','Grovt','Låg','Medel','Hög'],
  ar: ['خصائص الشعر','نوع الشعر','ملمس الشعر','الكثافة','المسامية','الحالة الحالية','المعالجات السابقة','مستقيم','مموج','مجعد','شديد التجعد','ناعم','متوسط','سميك','منخفضة','متوسطة','عالية'],
};

const characteristicLabelIndex = {
  title: 0, hairType: 1, hairTexture: 2, hairDensity: 3, hairPorosityLevel: 4, hairCondition: 5, previousTreatments: 6,
} as const;

const choiceLabelIndex: Record<string, number> = {
  straight: 7, wavy: 8, curly: 9, coily: 10, fine: 11, medium: 15, thick: 13, low: 14, high: 16,
};

export function hairCharacteristicLabel(locale: string, key: HairCharacteristicKey | 'title') {
  const labels = characteristicCopy[locale.split('-')[0]] ?? characteristicCopy.es;
  return labels[characteristicLabelIndex[key]];
}

export function hairCharacteristicValue(locale: string, key: HairCharacteristicKey, value: string) {
  if (key === 'hairCondition' || key === 'previousTreatments') return value;
  const labels = characteristicCopy[locale.split('-')[0]] ?? characteristicCopy.es;
  const index = key === 'hairTexture' && value === 'medium' ? 12 : choiceLabelIndex[value];
  return labels[index] ?? value;
}
