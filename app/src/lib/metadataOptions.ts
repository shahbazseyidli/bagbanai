// Controlled vocabularies for the field-metadata form (all labels Azerbaijani).
// Values are canonical (English/snake_case) so they match the seed crop list,
// crop_thresholds and the subsidy engine; labels are what the farmer sees.
// Free-text is still possible via the "Digər" (Other) fallback in the form.

import { t, type I18nKey, getLocale } from "@/lib/i18n";

export interface Opt {
  value: string;
  label: string;
  /** i18n key for the localized label; when present, render via optLabel(). `label`
   * stays as the Azerbaijani fallback (also used for stable az-collation sorting). */
  labelKey?: I18nKey;
}

/** Localized display label for an option (or pH band): the labelKey translation when set,
 * otherwise the raw Azerbaijani `label`. Call at render time so the active locale applies. */
export function optLabel(o: { labelKey?: I18nKey; label: string }): string {
  return o.labelKey ? t(o.labelKey) : o.label;
}

// Alphabetical comparator for option labels (Azerbaijani collation).
const byAzLabel = (a: Opt, b: Opt): number => a.label.localeCompare(b.label, "az");

// Crop cycle — chosen first in the wizard to soft-filter the crop grid.
export const CYCLE_OPTIONS: Opt[] = [
  { value: "perennial", label: "Çoxillik əkmə (bağ/plantasiya)", labelKey: "app.meta.cycle.perennial" },
  { value: "annual", label: "Birillik əkin", labelKey: "app.meta.cycle.annual" },
  { value: "biennial", label: "İkiillik", labelKey: "app.meta.cycle.biennial" },
];

// Crop value → its typical cycle. Used as a soft filter in CropGrid (the user
// can always "Hamısını göstər" to see every crop regardless of cycle).
export const CROP_CYCLE: Record<string, "perennial" | "annual"> = {
  hazelnut: "perennial",
  walnut: "perennial",
  almond: "perennial",
  chestnut: "perennial",
  pistachio: "perennial",
  apple: "perennial",
  pear: "perennial",
  peach_apricot: "perennial",
  cherry: "perennial",
  persimmon: "perennial",
  fig: "perennial",
  pomegranate: "perennial",
  grape: "perennial",
  olive: "perennial",
  kiwi: "perennial",
  lemon_kumquat: "perennial",
  mandarin_orange: "perennial",
  blackberry: "perennial",
  raspberry: "perennial",
  currant: "perennial",
  blueberry_soil: "perennial",
  blueberry_pot: "perennial",
  berry_other: "perennial",
  fruit_other: "perennial",
  tea: "perennial",
  alfalfa: "perennial",
  nectarine: "perennial",
  quince: "perennial",
  mulberry: "perennial",
  feijoa: "perennial",
  strawberry: "perennial",
  plum: "perennial",
  windbreak: "perennial",
  wheat: "annual",
  barley: "annual",
  corn: "annual",
  rice: "annual",
  millet: "annual",
  sorghum: "annual",
  cereals_legumes: "annual",
  cotton: "annual",
  sunflower: "annual",
  sugar_beet: "annual",
  soy: "annual",
  groundnut: "annual",
  tobacco_virginia: "annual",
  tobacco_other: "annual",
  saffron: "annual",
  potato: "annual",
  vegetable: "annual",
  melon: "annual",
  rye: "annual",
  oats: "annual",
  buckwheat: "annual",
  chickpea: "annual",
  bean: "annual",
  lentil: "annual",
  broad_bean: "annual",
  flax: "annual",
  sesame: "annual",
  rapeseed: "annual",
  tomato: "annual",
  cucumber: "annual",
  onion: "annual",
  garlic: "annual",
  cabbage: "annual",
  eggplant: "annual",
  pepper: "annual",
  carrot: "annual",
  pumpkin: "annual",
  greens: "annual",
  other_crops: "annual",
};

// A pickable soil-pH category. `ph` is the representative value stored when the
// band is clicked; `hint` is the human range shown on the button.
export interface PhBand {
  value: string;
  label: string;
  labelKey?: I18nKey;
  ph: number;
  hint: string;
}

export const PH_BANDS: PhBand[] = [
  { value: "very_acidic", label: "Çox turş", labelKey: "app.meta.ph.very_acidic", ph: 5.0, hint: "pH < 5.5" },
  { value: "acidic", label: "Turş", labelKey: "app.meta.ph.acidic", ph: 6.0, hint: "5.5–6.5" },
  { value: "neutral", label: "Neytral", labelKey: "app.meta.ph.neutral", ph: 7.0, hint: "6.5–7.5" },
  { value: "alkaline", label: "Qələvi", labelKey: "app.meta.ph.alkaline", ph: 8.0, hint: "7.5–8.5" },
  { value: "very_alkaline", label: "Çox qələvi", labelKey: "app.meta.ph.very_alkaline", ph: 9.0, hint: "pH > 8.5" },
];

// All crops present in the 2026 subsidy seed + a few common extras. The concrete
// crops below are sorted alphabetically by Azerbaijani label at export time; the
// generic catch-all entries are always appended last, regardless of label.
const CROP_MAIN_OPTIONS: Opt[] = [
  { value: "wheat", label: "Buğda", labelKey: "app.meta.crop.wheat" },
  { value: "barley", label: "Arpa", labelKey: "app.meta.crop.barley" },
  { value: "corn", label: "Qarğıdalı", labelKey: "app.meta.crop.corn" },
  { value: "rice", label: "Çəltik", labelKey: "app.meta.crop.rice" },
  { value: "millet", label: "Darı", labelKey: "app.meta.crop.millet" },
  { value: "sorghum", label: "Sorqo", labelKey: "app.meta.crop.sorghum" },
  { value: "cereals_legumes", label: "Dənli-paxlalılar", labelKey: "app.meta.crop.cereals_legumes" },
  { value: "rye", label: "Çovdar", labelKey: "app.meta.crop.rye" },
  { value: "oats", label: "Vələmir", labelKey: "app.meta.crop.oats" },
  { value: "buckwheat", label: "Qarabaşaq", labelKey: "app.meta.crop.buckwheat" },
  { value: "chickpea", label: "Noxud", labelKey: "app.meta.crop.chickpea" },
  { value: "bean", label: "Lobya", labelKey: "app.meta.crop.bean" },
  { value: "lentil", label: "Mərci", labelKey: "app.meta.crop.lentil" },
  { value: "broad_bean", label: "Paxla", labelKey: "app.meta.crop.broad_bean" },
  { value: "cotton", label: "Pambıq", labelKey: "app.meta.crop.cotton" },
  { value: "sunflower", label: "Günəbaxan", labelKey: "app.meta.crop.sunflower" },
  { value: "sugar_beet", label: "Şəkər çuğunduru", labelKey: "app.meta.crop.sugar_beet" },
  { value: "soy", label: "Soya", labelKey: "app.meta.crop.soy" },
  { value: "groundnut", label: "Yerfındığı", labelKey: "app.meta.crop.groundnut" },
  { value: "flax", label: "Kətan", labelKey: "app.meta.crop.flax" },
  { value: "sesame", label: "Küncüt", labelKey: "app.meta.crop.sesame" },
  { value: "rapeseed", label: "Raps", labelKey: "app.meta.crop.rapeseed" },
  { value: "tobacco_virginia", label: "Tütün (Virciniya)", labelKey: "app.meta.crop.tobacco_virginia" },
  { value: "tobacco_other", label: "Tütün (digər)", labelKey: "app.meta.crop.tobacco_other" },
  { value: "saffron", label: "Zəfəran", labelKey: "app.meta.crop.saffron" },
  { value: "tea", label: "Çay", labelKey: "app.meta.crop.tea" },
  { value: "alfalfa", label: "Yonca", labelKey: "app.meta.crop.alfalfa" },
  { value: "potato", label: "Kartof", labelKey: "app.meta.crop.potato" },
  { value: "vegetable", label: "Tərəvəz", labelKey: "app.meta.crop.vegetable" },
  { value: "melon", label: "Bostan (qarpız/yemiş)", labelKey: "app.meta.crop.melon" },
  { value: "tomato", label: "Pomidor", labelKey: "app.meta.crop.tomato" },
  { value: "cucumber", label: "Xiyar", labelKey: "app.meta.crop.cucumber" },
  { value: "onion", label: "Soğan", labelKey: "app.meta.crop.onion" },
  { value: "garlic", label: "Sarımsaq", labelKey: "app.meta.crop.garlic" },
  { value: "cabbage", label: "Kələm", labelKey: "app.meta.crop.cabbage" },
  { value: "eggplant", label: "Badımcan", labelKey: "app.meta.crop.eggplant" },
  { value: "pepper", label: "Bibər", labelKey: "app.meta.crop.pepper" },
  { value: "carrot", label: "Kök", labelKey: "app.meta.crop.carrot" },
  { value: "pumpkin", label: "Balqabaq", labelKey: "app.meta.crop.pumpkin" },
  { value: "greens", label: "Göyərti", labelKey: "app.meta.crop.greens" },
  { value: "hazelnut", label: "Fındıq", labelKey: "app.meta.crop.hazelnut" },
  { value: "walnut", label: "Qoz", labelKey: "app.meta.crop.walnut" },
  { value: "almond", label: "Badam", labelKey: "app.meta.crop.almond" },
  { value: "chestnut", label: "Şabalıd", labelKey: "app.meta.crop.chestnut" },
  { value: "pistachio", label: "Püstə", labelKey: "app.meta.crop.pistachio" },
  { value: "apple", label: "Alma", labelKey: "app.meta.crop.apple" },
  { value: "pear", label: "Armud", labelKey: "app.meta.crop.pear" },
  { value: "peach_apricot", label: "Şaftalı / Ərik", labelKey: "app.meta.crop.peach_apricot" },
  { value: "nectarine", label: "Nektarin", labelKey: "app.meta.crop.nectarine" },
  { value: "cherry", label: "Gilas / Albalı", labelKey: "app.meta.crop.cherry" },
  { value: "persimmon", label: "Xurma", labelKey: "app.meta.crop.persimmon" },
  { value: "fig", label: "Əncir", labelKey: "app.meta.crop.fig" },
  { value: "pomegranate", label: "Nar", labelKey: "app.meta.crop.pomegranate" },
  { value: "quince", label: "Heyva", labelKey: "app.meta.crop.quince" },
  { value: "mulberry", label: "Tut", labelKey: "app.meta.crop.mulberry" },
  { value: "feijoa", label: "Feyxoa", labelKey: "app.meta.crop.feijoa" },
  { value: "plum", label: "Gavalı", labelKey: "app.meta.crop.plum" },
  { value: "grape", label: "Üzüm", labelKey: "app.meta.crop.grape" },
  { value: "olive", label: "Zeytun", labelKey: "app.meta.crop.olive" },
  { value: "kiwi", label: "Kivi", labelKey: "app.meta.crop.kiwi" },
  { value: "lemon_kumquat", label: "Limon / Kinkan", labelKey: "app.meta.crop.lemon_kumquat" },
  { value: "mandarin_orange", label: "Mandarin / Portağal", labelKey: "app.meta.crop.mandarin_orange" },
  { value: "blackberry", label: "Böyürtkən", labelKey: "app.meta.crop.blackberry" },
  { value: "raspberry", label: "Moruq", labelKey: "app.meta.crop.raspberry" },
  { value: "currant", label: "Qarağat", labelKey: "app.meta.crop.currant" },
  { value: "strawberry", label: "Çiyələk", labelKey: "app.meta.crop.strawberry" },
  { value: "blueberry_soil", label: "Göy giləmeyvə (torpaqda)", labelKey: "app.meta.crop.blueberry_soil" },
  { value: "blueberry_pot", label: "Göy giləmeyvə (konteynerdə)", labelKey: "app.meta.crop.blueberry_pot" },
];

// Generic catch-all entries — always listed last, after the sorted crop list.
const CROP_CATCH_ALL_OPTIONS: Opt[] = [
  { value: "other_crops", label: "Digər bitkilər", labelKey: "app.meta.crop.other_crops" },
  { value: "fruit_other", label: "Digər meyvə", labelKey: "app.meta.crop.fruit_other" },
  { value: "berry_other", label: "Digər giləmeyvə", labelKey: "app.meta.crop.berry_other" },
  { value: "windbreak", label: "Küləkqoruyucu zolaq", labelKey: "app.meta.crop.windbreak" },
];

export const CROP_OPTIONS: Opt[] = [
  ...[...CROP_MAIN_OPTIONS].sort(byAzLabel),
  ...CROP_CATCH_ALL_OPTIONS,
];

// Sort/variety suggestions per crop (Azerbaijani sorts where known). Crops not
// listed here simply get the free-text "Digər" fallback in the form.
// Variety value === proper cultivar name (same across languages); routed through t() for
// consistency. labelKey uses the raw name so optLabel() resolves the (identical) az string.
const variety = (v: string): Opt => ({ value: v, label: v, labelKey: `app.meta.variety.${v}` as I18nKey });

// Cultivar suggestions for markets outside Azerbaijan.
//
// WHY. The list below is the Azerbaijani registry, and it was the ONLY list — so a Turkish hazelnut
// grower, in a product that ships in Turkish, was offered "Ata-baba, Topqara, Aşrəfli" and had to
// fall back to free text for Tombul, the single most planted hazelnut cultivar on earth. The
// suggestions were right for one country and useless in the other seven.
//
// A cultivar name is a PROPER NOUN — "Tombul" is Tombul in every language — so these entries carry
// no labelKey: optLabel() renders the raw name and no dictionary entry is needed or wanted.
//
// SUGGESTIONS ONLY. VarietyChips always offers free text ("Digər") and "Bilmirəm", so a farmer
// whose cultivar is not listed was never blocked and still is not. Adding a market here changes
// what is OFFERED, never what is ACCEPTED — which is why a short, confident list beats a long
// speculative one. Crops absent for a locale fall back to the Azerbaijani list rather than to
// nothing: a Georgian or Iranian grower shares much of that registry.
const LOCALE_VARIETIES: Record<string, Record<string, string[]>> = {
  tr: {
    hazelnut: ["Tombul", "Palaz", "Çakıldak", "Foşa", "Mincane", "Sivri", "Kalınkara",
               "Kara Fındık", "Yağlı", "Uzunmusa", "Cavcava", "Allahverdi"],
    wheat: ["Bezostaja-1", "Gerek-79", "Tosunbey", "Müfitbey", "Kızıltan-91", "Ceyhan-99",
            "Adana-99", "Esperia"],
    grape: ["Sultaniye", "Öküzgözü", "Boğazkere", "Kalecik Karası", "Narince", "Emir",
            "Çavuş", "Razakı"],
    apple: ["Amasya", "Starking Delicious", "Golden Delicious", "Granny Smith", "Fuji",
            "Gala", "Braeburn"],
  },
  de: {
    grape: ["Riesling", "Müller-Thurgau", "Spätburgunder", "Dornfelder", "Silvaner",
            "Grauburgunder", "Weißburgunder"],
    apple: ["Elstar", "Braeburn", "Jonagold", "Gala", "Golden Delicious", "Boskoop", "Topaz"],
  },
  it: {
    grape: ["Sangiovese", "Nebbiolo", "Barbera", "Montepulciano", "Primitivo", "Trebbiano",
            "Glera", "Nero d'Avola"],
    apple: ["Golden Delicious", "Gala", "Fuji", "Granny Smith", "Renetta Canada", "Annurca"],
  },
  hu: {
    grape: ["Furmint", "Hárslevelű", "Kékfrankos", "Olaszrizling", "Kadarka", "Ezerjó",
            "Cserszegi fűszeres"],
    apple: ["Jonagold", "Idared", "Gala", "Golden Delicious", "Braeburn"],
  },
  pl: {
    apple: ["Ligol", "Szampion", "Jonagold", "Gloster", "Idared", "Cortland", "Gala",
            "Golden Delicious"],
  },
  ru: {
    apple: ["Антоновка", "Симиренко", "Мелба", "Голден Делишес", "Гала", "Джонаголд"],
    grape: ["Ркацители", "Изабелла", "Кишмиш", "Молдова", "Восторг"],
  },
};

/** Cultivars to suggest for a crop in the reader's market, falling back to the AZ registry. */
export function varietiesFor(crop: string | null | undefined, locale?: string): Opt[] {
  const c = crop ?? "";
  const loc = (locale || getLocale()).slice(0, 2);
  const local = LOCALE_VARIETIES[loc]?.[c];
  if (local?.length) {
    // No labelKey: a cultivar is a proper noun, and inventing app.meta.variety.Tombul would render
    // the KEY itself in every dictionary that lacks it.
    return local.map((v) => ({ value: v, label: v })).sort((a, b) => a.label.localeCompare(b.label, loc));
  }
  return VARIETY_OPTIONS_BY_CROP[c] ?? [];
}

export const VARIETY_OPTIONS_BY_CROP: Record<string, Opt[]> = {
  hazelnut: [
    "Ata-baba", "Yağlı", "Topqara", "Aşrəfli", "Qalib", "Ənvəri", "Sərək", "Xaçmaz",
  ].map(variety).sort(byAzLabel),
  wheat: [
    "Yumşaq buğda", "Bərk buğda", "Qobustan", "Nurlu-99", "Əkinçi-84",
    "Qiymətli-2/17", "Tale-38", "Bərəkətli-95", "Ruzi-84",
  ].map(variety).sort(byAzLabel),
  barley: [
    "Cəlilabad-19", "Qarabağ-7", "Pallidum-596", "Nutans-553", "Cəfəri",
  ].map(variety).sort(byAzLabel),
  corn: [
    "Zaqatala-68", "Qarabağ", "Şirin qarğıdalı", "Pioneer hibridi", "NK hibridi",
  ].map(variety).sort(byAzLabel),
  grape: [
    "Mədrəsə", "Bayanşirə", "Ağ şanı", "Qara şanı", "Təbrizi", "Mərəndi",
    "Rkatsiteli", "Kişmiş", "Şardone", "Kaberne", "Merlo",
  ].map(variety).sort(byAzLabel),
  apple: [
    "Cırhacı", "Zəngi", "Qızıl əhmədi", "Golden Delicious", "Fuji", "Gala",
    "Simirenko", "Ağ papaq",
  ].map(variety).sort(byAzLabel),
  pear: ["Nar armud", "Abbasbəyi", "Konfretnaya", "Williams"].map(variety).sort(byAzLabel),
  pomegranate: [
    "Gülöyşə", "Vələs", "Bala Mürsəl", "Şah nar", "Qırmızı qabıq",
  ].map(variety).sort(byAzLabel),
  peach_apricot: [
    "Ağcanabad ərik", "Badami ərik", "Xurmayı ərik", "Novrast", "Salami şaftalı", "Nektarin",
  ].map(variety).sort(byAzLabel),
  cherry: ["Xanım barmağı", "Gödək saplaq", "Napoleon", "Bigarreau"].map(variety).sort(byAzLabel),
  walnut: ["Seyfəddin", "Dəmiryol", "Chandler", "Fernor"].map(variety).sort(byAzLabel),
  almond: ["Nonpareil", "Ağ badam", "Nikitski", "Ferraduel"].map(variety).sort(byAzLabel),
  potato: ["Nevski", "Marfona", "Sante", "Kardinal", "Qırmızı"].map(variety).sort(byAzLabel),
  cotton: ["Gəncə-8", "Gəncə-110", "AP-317"].map(variety).sort(byAzLabel),
  tea: ["Azərbaycan-2", "Qruziya seleksiyası"].map(variety).sort(byAzLabel),
};

export const SOIL_TYPE_OPTIONS: Opt[] = [
  { value: "sandy", label: "Qumlu", labelKey: "app.meta.soil.sandy" },
  { value: "loamy_sand", label: "Qumsal", labelKey: "app.meta.soil.loamy_sand" },
  { value: "loam", label: "Gillicəli (yüngül)", labelKey: "app.meta.soil.loam" },
  { value: "clay_loam", label: "Ağır gillicə", labelKey: "app.meta.soil.clay_loam" },
  { value: "clay", label: "Gilli", labelKey: "app.meta.soil.clay" },
  { value: "silty", label: "Lilli", labelKey: "app.meta.soil.silty" },
  { value: "chernozem", label: "Qara torpaq (çernozem)", labelKey: "app.meta.soil.chernozem" },
  { value: "chestnut_soil", label: "Şabalıdı torpaq", labelKey: "app.meta.soil.chestnut_soil" },
  { value: "grey_brown", label: "Boz-qəhvəyi torpaq", labelKey: "app.meta.soil.grey_brown" },
  { value: "yellow_soil", label: "Sarı torpaq", labelKey: "app.meta.soil.yellow_soil" },
  { value: "mountain_forest", label: "Dağ-meşə torpağı", labelKey: "app.meta.soil.mountain_forest" },
  { value: "meadow_grey", label: "Çəmən-boz torpaq", labelKey: "app.meta.soil.meadow_grey" },
  { value: "alluvial", label: "Allüvial torpaq", labelKey: "app.meta.soil.alluvial" },
  { value: "saline", label: "Şoran / şorakət", labelKey: "app.meta.soil.saline" },
  { value: "peaty", label: "Torflu", labelKey: "app.meta.soil.peaty" },
  { value: "stony", label: "Daşlı-çınqıllı", labelKey: "app.meta.soil.stony" },
];

export const IRRIGATION_METHOD_OPTIONS: Opt[] = [
  { value: "drip", label: "Damcı suvarma", labelKey: "app.opt.irr.drip" },
  { value: "subsurface_drip", label: "Yeraltı damcı", labelKey: "app.opt.irr.subsurface_drip" },
  { value: "sprinkler", label: "Yağış yağdıran (sprinkler)", labelKey: "app.opt.irr.sprinkler" },
  { value: "micro_sprinkler", label: "Mikro-yağmurlama", labelKey: "app.opt.irr.micro_sprinkler" },
  { value: "furrow", label: "Şırım üsulu", labelKey: "app.opt.irr.furrow" },
  { value: "basin", label: "Ləkli (basdırma) suvarma", labelKey: "app.opt.irr.basin" },
  { value: "surface_flood", label: "Səthi / su basdırma", labelKey: "app.opt.irr.surface_flood" },
  { value: "rainfed", label: "Dəmyə (suvarılmır)", labelKey: "app.opt.irr.rainfed" },
];

export const GROWTH_STAGE_OPTIONS: Opt[] = [
  { value: "germination", label: "Cücərmə / çıxış", labelKey: "app.opt.stage.germination" },
  { value: "leaf_development", label: "Yarpaqlanma", labelKey: "app.opt.stage.leaf_development" },
  { value: "tillering", label: "Qardaşlanma", labelKey: "app.opt.stage.tillering" },
  { value: "stem_elongation", label: "Sürətli boy (gövdə)", labelKey: "app.opt.stage.stem_elongation" },
  { value: "budding", label: "Qönçələmə", labelKey: "app.opt.stage.budding" },
  { value: "flowering", label: "Çiçəkləmə", labelKey: "app.opt.stage.flowering" },
  { value: "fruit_set", label: "Meyvə bağlama", labelKey: "app.opt.stage.fruit_set" },
  { value: "fruit_development", label: "Meyvə böyüməsi", labelKey: "app.opt.stage.fruit_development" },
  { value: "ripening", label: "Yetişmə", labelKey: "app.opt.stage.ripening" },
  { value: "harvest", label: "Yığım", labelKey: "app.opt.stage.harvest" },
  { value: "dormancy", label: "Dinclik / yarpaq tökümü", labelKey: "app.opt.stage.dormancy" },
];

export const TILLAGE_OPTIONS: Opt[] = [
  { value: "conventional", label: "Ənənəvi şum", labelKey: "app.opt.till.conventional" },
  { value: "minimum", label: "Minimal becərmə", labelKey: "app.opt.till.minimum" },
  { value: "no_till", label: "Sıfır becərmə (birbaşa səpin)", labelKey: "app.opt.till.no_till" },
  { value: "strip_till", label: "Zolaqlı becərmə", labelKey: "app.opt.till.strip_till" },
  { value: "chiseling", label: "Dərin yumşaltma (çizel)", labelKey: "app.opt.till.chiseling" },
  { value: "disking", label: "Diskləmə", labelKey: "app.opt.till.disking" },
  { value: "harrowing", label: "Malalama", labelKey: "app.opt.till.harrowing" },
];

export const DIFFICULTY_TYPE_OPTIONS: Opt[] = [
  { value: "water_shortage", label: "Su çatışmazlığı", labelKey: "app.opt.diff.water_shortage" },
  { value: "salinity", label: "Şoranlaşma", labelKey: "app.opt.diff.salinity" },
  { value: "erosion", label: "Eroziya", labelKey: "app.opt.diff.erosion" },
  { value: "pests", label: "Zərərvericilər", labelKey: "app.opt.diff.pests" },
  { value: "diseases", label: "Xəstəliklər", labelKey: "app.opt.diff.diseases" },
  { value: "weeds", label: "Alaq otları", labelKey: "app.opt.diff.weeds" },
  { value: "frost", label: "Şaxta zədəsi", labelKey: "app.opt.diff.frost" },
  { value: "hail", label: "Dolu", labelKey: "app.opt.diff.hail" },
  { value: "drought", label: "Quraqlıq", labelKey: "app.opt.diff.drought" },
  { value: "flooding", label: "Su basma", labelKey: "app.opt.diff.flooding" },
  { value: "compaction", label: "Torpaq sıxlaşması", labelKey: "app.opt.diff.compaction" },
  { value: "nutrient_deficiency", label: "Qida çatışmazlığı", labelKey: "app.opt.diff.nutrient_deficiency" },
  { value: "other", label: "Digər", labelKey: "app.opt.diff.other" },
];

// Pests & diseases (hazelnut-relevant first, then general).
export const PEST_TYPE_OPTIONS: Opt[] = [
  { value: "nut_weevil", label: "Fındıq qurdu (fil böcəyi)", labelKey: "app.opt.pest.nut_weevil" },
  { value: "big_bud_mite", label: "Fındıq tumurcuq gənəsi", labelKey: "app.opt.pest.big_bud_mite" },
  { value: "powdery_mildew", label: "Un şehi", labelKey: "app.opt.pest.powdery_mildew" },
  { value: "monilia", label: "Monilioz", labelKey: "app.opt.pest.monilia" },
  { value: "anthracnose", label: "Antraknoz", labelKey: "app.opt.pest.anthracnose" },
  { value: "aphids", label: "Mənənə", labelKey: "app.opt.pest.aphids" },
  { value: "caterpillars", label: "Tırtıllar", labelKey: "app.opt.pest.caterpillars" },
  { value: "shield_bug", label: "Taxtabiti (qalxanlı)", labelKey: "app.opt.pest.shield_bug" },
  { value: "scale_insect", label: "Çanaqlı yastıca", labelKey: "app.opt.pest.scale_insect" },
  { value: "phytophthora", label: "Fitoftora", labelKey: "app.opt.pest.phytophthora" },
  { value: "rust", label: "Pas xəstəliyi", labelKey: "app.opt.pest.rust" },
  { value: "bacterial_blight", label: "Bakterial yanıqlıq", labelKey: "app.opt.pest.bacterial_blight" },
  { value: "other", label: "Digər", labelKey: "app.opt.pest.other" },
];

// pest_history.severity is stored numeric — keep numeric values, farmer-friendly labels.
export const SEVERITY_OPTIONS: Opt[] = [
  { value: "1", label: "1 – Zəif", labelKey: "app.opt.sev.1" },
  { value: "2", label: "2 – Orta", labelKey: "app.opt.sev.2" },
  { value: "3", label: "3 – Güclü", labelKey: "app.opt.sev.3" },
];

export const FERTILIZER_OPTIONS: Opt[] = [
  { value: "urea", label: "Karbamid (azot)", labelKey: "app.opt.fert.urea" },
  { value: "ammonium_nitrate", label: "Ammonium nitrat", labelKey: "app.opt.fert.ammonium_nitrate" },
  { value: "ammonium_sulfate", label: "Ammonium sulfat", labelKey: "app.opt.fert.ammonium_sulfate" },
  { value: "superphosphate", label: "Superfosfat", labelKey: "app.opt.fert.superphosphate" },
  { value: "dap", label: "Diammonium fosfat (DAP)", labelKey: "app.opt.fert.dap" },
  { value: "potassium_sulfate", label: "Kalium sulfat", labelKey: "app.opt.fert.potassium_sulfate" },
  { value: "potassium_chloride", label: "Kalium xlorid", labelKey: "app.opt.fert.potassium_chloride" },
  { value: "npk", label: "NPK kompleks gübrə", labelKey: "app.opt.fert.npk" },
  { value: "manure", label: "Peyin", labelKey: "app.opt.fert.manure" },
  { value: "compost", label: "Kompost", labelKey: "app.opt.fert.compost" },
  { value: "green_manure", label: "Yaşıl gübrə (sidr)", labelKey: "app.opt.fert.green_manure" },
  { value: "micronutrients", label: "Mikroelement qarışığı", labelKey: "app.opt.fert.micronutrients" },
  { value: "other", label: "Digər", labelKey: "app.opt.fert.other" },
];
