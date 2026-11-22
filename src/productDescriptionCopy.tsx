type Descriptions = [shampoo: string, mask: string];

const originals: Descriptions = [
  'Champú matizador que limpia suavemente y neutraliza los reflejos amarillos para mantener un rubio más frío.',
  'Mascarilla que nutre en profundidad y matiza los reflejos amarillos. Deja el rubio más suave y luminoso.',
];

const translations: Partial<Record<string, Descriptions>> = {
  en: [
    'Toning shampoo that gently cleanses and neutralises yellow tones to keep blonde hair cooler.',
    'Deeply nourishing mask that tones down yellow tones. Leaves blonde hair softer and brighter.',
  ],
  fr: [
    'Shampooing déjaunissant qui nettoie en douceur et neutralise les reflets jaunes pour préserver un blond plus froid.',
    'Masque qui nourrit en profondeur et atténue les reflets jaunes. Il laisse les cheveux blonds plus doux et lumineux.',
  ],
  it: [
    'Shampoo tonalizzante che deterge delicatamente e neutralizza i riflessi gialli per mantenere un biondo più freddo.',
    'Maschera che nutre in profondità e attenua i riflessi gialli. Lascia i capelli biondi più morbidi e luminosi.',
  ],
  pt: [
    'Champô matizador que limpa suavemente e neutraliza os reflexos amarelos para manter um loiro mais frio.',
    'Máscara que nutre em profundidade e atenua os reflexos amarelos. Deixa o cabelo loiro mais suave e luminoso.',
  ],
  de: [
    'Tönungsshampoo, das sanft reinigt und Gelbstiche neutralisiert, damit das Blond kühler bleibt.',
    'Intensiv pflegende Maske, die Gelbstiche mildert. Sie macht blondes Haar weicher und lässt es strahlen.',
  ],
  nl: [
    'Tonershampoo die mild reinigt en gele tinten neutraliseert om blond haar koeler te houden.',
    'Masker dat het haar intensief voedt en gele tinten tempert. Maakt blond haar zachter en laat het meer stralen.',
  ],
  pl: [
    'Szampon tonujący, który delikatnie oczyszcza i neutralizuje żółte tony, by zachować chłodniejszy blond.',
    'Maska, która głęboko odżywia i łagodzi żółte tony. Pozostawia blond włosy miękkie i pełne blasku.',
  ],
  cs: [
    'Tónovací šampon, který jemně čistí a neutralizuje žluté tóny, aby blond odstín zůstal chladnější.',
    'Maska, která vlasy hloubkově vyživuje a tlumí žluté tóny. Blond vlasy jsou po ní hebčí a zářivější.',
  ],
  nb: [
    'Nyanserende sjampo som renser skånsomt og nøytraliserer gule toner for å bevare en kjøligere blondfarge.',
    'Hårmaske som gir dyp pleie og demper gule toner. Gjør blondt hår mykere og mer glansfullt.',
  ],
  sv: [
    'Nyanserande schampo som rengör skonsamt och neutraliserar gula toner för att bevara en kallare blond nyans.',
    'Hårinpackning som ger djup näring och dämpar gula toner. Gör blont hår mjukare och glansigare.',
  ],
  ar: [
    'شامبو لتعديل درجة اللون ينظّف الشعر بلطف ويحيّد الدرجات الصفراء للحفاظ على أشقر أبرد.',
    'ماسك يغذّي الشعر بعمق ويخفّف الدرجات الصفراء. يترك الشعر الأشقر أكثر نعومة وإشراقًا.',
  ],
};

const translatedNames: Partial<Record<string, Descriptions>> = {
  en: ['Purple shampoo', 'Purple mask'],
  fr: ['Shampooing violet', 'Masque violet'],
  it: ['Shampoo viola', 'Maschera viola'],
  pt: ['Champô violeta', 'Máscara violeta'],
  de: ['Violett-Shampoo', 'Violett-Haarmaske'],
  nl: ['Paarse shampoo', 'Paars haarmasker'],
  pl: ['Fioletowy szampon', 'Fioletowa maska'],
  cs: ['Fialový šampon', 'Fialová maska'],
  nb: ['Lillasjampo', 'Lilla hårmaske'],
  sv: ['Lila schampo', 'Lila hårinpackning'],
  ar: ['شامبو بنفسجي', 'ماسك بنفسجي'],
};

const originalsByName: Descriptions = ['champu morado', 'mascarilla morada'];
const language = (locale: string) => locale.split('-')[0].toLowerCase();
const normalizeText = (value: string) => value.normalize('NFKD').toLowerCase()
  .replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const normalizedDescriptions = originals.map(normalizeText);

export function productNameCopy(original: string, brand: string, locale = 'es'): string {
  const copy = translatedNames[language(locale)];
  const brandName = normalizeText(brand);
  if (!copy || !['blondme', 'blondme care'].includes(brandName)) return original;
  const match = original.trim().match(/^(.+?)(\s*(?:[·–—-]\s*)?\d+(?:[.,]\d+)?\s*ml)?$/iu);
  if (!match) return original;
  const index = originalsByName.indexOf(normalizeText(match[1]));
  return index === -1 ? original : copy[index] + (match[2] || '');
}

export function productDescriptionCopy(original: string, locale = 'es'): string {
  const copy = translations[language(locale)];
  if (!copy) return original;
  const index = normalizedDescriptions.indexOf(normalizeText(original));
  return copy[index] ?? original;
}
