// Controlled vocabularies for the field-metadata form (all labels Azerbaijani).
// Values are canonical (English/snake_case) so they match the seed crop list,
// crop_thresholds and the subsidy engine; labels are what the farmer sees.
// Free-text is still possible via the "Digər" (Other) fallback in the form.

export interface Opt {
  value: string;
  label: string;
}

// All crops present in the 2026 subsidy seed + a few common extras, grouped
// loosely (cereals → industrial → vegetables → nuts → fruit → citrus → berry).
export const CROP_OPTIONS: Opt[] = [
  { value: "wheat", label: "Buğda" },
  { value: "barley", label: "Arpa" },
  { value: "corn", label: "Qarğıdalı" },
  { value: "rice", label: "Çəltik" },
  { value: "millet", label: "Darı" },
  { value: "sorghum", label: "Sorqo" },
  { value: "cereals_legumes", label: "Dənli-paxlalılar" },
  { value: "cotton", label: "Pambıq" },
  { value: "sunflower", label: "Günəbaxan" },
  { value: "sugar_beet", label: "Şəkər çuğunduru" },
  { value: "soy", label: "Soya" },
  { value: "groundnut", label: "Yerfındığı" },
  { value: "tobacco_virginia", label: "Tütün (Virciniya)" },
  { value: "tobacco_other", label: "Tütün (digər)" },
  { value: "saffron", label: "Zəfəran" },
  { value: "tea", label: "Çay" },
  { value: "alfalfa", label: "Yonca" },
  { value: "potato", label: "Kartof" },
  { value: "vegetable", label: "Tərəvəz" },
  { value: "melon", label: "Bostan (qarpız/yemiş)" },
  { value: "hazelnut", label: "Fındıq" },
  { value: "walnut", label: "Qoz" },
  { value: "almond", label: "Badam" },
  { value: "chestnut", label: "Şabalıd" },
  { value: "pistachio", label: "Püstə" },
  { value: "apple", label: "Alma" },
  { value: "pear", label: "Armud" },
  { value: "peach_apricot", label: "Şaftalı / Ərik" },
  { value: "cherry", label: "Gilas / Albalı" },
  { value: "persimmon", label: "Xurma" },
  { value: "fig", label: "Əncir" },
  { value: "pomegranate", label: "Nar" },
  { value: "grape", label: "Üzüm" },
  { value: "olive", label: "Zeytun" },
  { value: "kiwi", label: "Kivi" },
  { value: "lemon_kumquat", label: "Limon / Kinkan" },
  { value: "mandarin_orange", label: "Mandarin / Portağal" },
  { value: "blackberry", label: "Böyürtkən" },
  { value: "raspberry", label: "Moruq" },
  { value: "currant", label: "Qarağat" },
  { value: "blueberry_soil", label: "Göy giləmeyvə (torpaqda)" },
  { value: "blueberry_pot", label: "Göy giləmeyvə (konteynerdə)" },
  { value: "berry_other", label: "Digər giləmeyvə" },
  { value: "fruit_other", label: "Digər meyvə" },
  { value: "windbreak", label: "Küləkqoruyucu zolaq" },
  { value: "other_crops", label: "Digər bitkilər" },
];

// Sort/variety suggestions per crop (Azerbaijani sorts where known). Crops not
// listed here simply get the free-text "Digər" fallback in the form.
export const VARIETY_OPTIONS_BY_CROP: Record<string, Opt[]> = {
  hazelnut: [
    "Ata-baba", "Yağlı", "Topqara", "Aşrəfli", "Qalib", "Ənvəri", "Sərək", "Xaçmaz",
  ].map((v) => ({ value: v, label: v })),
  wheat: [
    "Yumşaq buğda", "Bərk buğda", "Qobustan", "Nurlu-99", "Əkinçi-84",
    "Qiymətli-2/17", "Tale-38", "Bərəkətli-95", "Ruzi-84",
  ].map((v) => ({ value: v, label: v })),
  barley: [
    "Cəlilabad-19", "Qarabağ-7", "Pallidum-596", "Nutans-553", "Cəfəri",
  ].map((v) => ({ value: v, label: v })),
  corn: [
    "Zaqatala-68", "Qarabağ", "Şirin qarğıdalı", "Pioneer hibridi", "NK hibridi",
  ].map((v) => ({ value: v, label: v })),
  grape: [
    "Mədrəsə", "Bayanşirə", "Ağ şanı", "Qara şanı", "Təbrizi", "Mərəndi",
    "Rkatsiteli", "Kişmiş", "Şardone", "Kaberne", "Merlo",
  ].map((v) => ({ value: v, label: v })),
  apple: [
    "Cırhacı", "Zəngi", "Qızıl əhmədi", "Golden Delicious", "Fuji", "Gala",
    "Simirenko", "Ağ papaq",
  ].map((v) => ({ value: v, label: v })),
  pear: ["Nar armud", "Abbasbəyi", "Konfretnaya", "Williams"].map((v) => ({ value: v, label: v })),
  pomegranate: [
    "Gülöyşə", "Vələs", "Bala Mürsəl", "Şah nar", "Qırmızı qabıq",
  ].map((v) => ({ value: v, label: v })),
  peach_apricot: [
    "Ağcanabad ərik", "Badami ərik", "Xurmayı ərik", "Novrast", "Salami şaftalı", "Nektarin",
  ].map((v) => ({ value: v, label: v })),
  cherry: ["Xanım barmağı", "Gödək saplaq", "Napoleon", "Bigarreau"].map((v) => ({ value: v, label: v })),
  walnut: ["Seyfəddin", "Dəmiryol", "Chandler", "Fernor"].map((v) => ({ value: v, label: v })),
  almond: ["Nonpareil", "Ağ badam", "Nikitski", "Ferraduel"].map((v) => ({ value: v, label: v })),
  potato: ["Nevski", "Marfona", "Sante", "Kardinal", "Qırmızı"].map((v) => ({ value: v, label: v })),
  cotton: ["Gəncə-8", "Gəncə-110", "AP-317"].map((v) => ({ value: v, label: v })),
  tea: ["Azərbaycan-2", "Qruziya seleksiyası"].map((v) => ({ value: v, label: v })),
};

export const SOIL_TYPE_OPTIONS: Opt[] = [
  { value: "sandy", label: "Qumlu" },
  { value: "loamy_sand", label: "Qumsal" },
  { value: "loam", label: "Gillicəli (yüngül)" },
  { value: "clay_loam", label: "Ağır gillicə" },
  { value: "clay", label: "Gilli" },
  { value: "silty", label: "Lilli" },
  { value: "chernozem", label: "Qara torpaq (çernozem)" },
  { value: "chestnut_soil", label: "Şabalıdı torpaq" },
  { value: "grey_brown", label: "Boz-qəhvəyi torpaq" },
  { value: "yellow_soil", label: "Sarı torpaq" },
  { value: "mountain_forest", label: "Dağ-meşə torpağı" },
  { value: "meadow_grey", label: "Çəmən-boz torpaq" },
  { value: "alluvial", label: "Allüvial torpaq" },
  { value: "saline", label: "Şoran / şorakət" },
  { value: "peaty", label: "Torflu" },
  { value: "stony", label: "Daşlı-çınqıllı" },
];

export const IRRIGATION_METHOD_OPTIONS: Opt[] = [
  { value: "drip", label: "Damcı suvarma" },
  { value: "subsurface_drip", label: "Yeraltı damcı" },
  { value: "sprinkler", label: "Yağış yağdıran (sprinkler)" },
  { value: "micro_sprinkler", label: "Mikro-yağmurlama" },
  { value: "furrow", label: "Şırım üsulu" },
  { value: "basin", label: "Ləkli (basdırma) suvarma" },
  { value: "surface_flood", label: "Səthi / su basdırma" },
  { value: "rainfed", label: "Dəmyə (suvarılmır)" },
];

export const GROWTH_STAGE_OPTIONS: Opt[] = [
  { value: "germination", label: "Cücərmə / çıxış" },
  { value: "leaf_development", label: "Yarpaqlanma" },
  { value: "tillering", label: "Qardaşlanma" },
  { value: "stem_elongation", label: "Sürətli boy (gövdə)" },
  { value: "budding", label: "Qönçələmə" },
  { value: "flowering", label: "Çiçəkləmə" },
  { value: "fruit_set", label: "Meyvə bağlama" },
  { value: "fruit_development", label: "Meyvə böyüməsi" },
  { value: "ripening", label: "Yetişmə" },
  { value: "harvest", label: "Yığım" },
  { value: "dormancy", label: "Dinclik / yarpaq tökümü" },
];

export const TILLAGE_OPTIONS: Opt[] = [
  { value: "conventional", label: "Ənənəvi şum" },
  { value: "minimum", label: "Minimal becərmə" },
  { value: "no_till", label: "Sıfır becərmə (birbaşa səpin)" },
  { value: "strip_till", label: "Zolaqlı becərmə" },
  { value: "chiseling", label: "Dərin yumşaltma (çizel)" },
  { value: "disking", label: "Diskləmə" },
  { value: "harrowing", label: "Malalama" },
];

export const DIFFICULTY_TYPE_OPTIONS: Opt[] = [
  { value: "water_shortage", label: "Su çatışmazlığı" },
  { value: "salinity", label: "Şoranlaşma" },
  { value: "erosion", label: "Eroziya" },
  { value: "pests", label: "Zərərvericilər" },
  { value: "diseases", label: "Xəstəliklər" },
  { value: "weeds", label: "Alaq otları" },
  { value: "frost", label: "Şaxta zədəsi" },
  { value: "hail", label: "Dolu" },
  { value: "drought", label: "Quraqlıq" },
  { value: "flooding", label: "Su basma" },
  { value: "compaction", label: "Torpaq sıxlaşması" },
  { value: "nutrient_deficiency", label: "Qida çatışmazlığı" },
  { value: "other", label: "Digər" },
];

// Pests & diseases (hazelnut-relevant first, then general).
export const PEST_TYPE_OPTIONS: Opt[] = [
  { value: "nut_weevil", label: "Fındıq qurdu (fil böcəyi)" },
  { value: "big_bud_mite", label: "Fındıq tumurcuq gənəsi" },
  { value: "powdery_mildew", label: "Un şehi" },
  { value: "monilia", label: "Monilioz" },
  { value: "anthracnose", label: "Antraknoz" },
  { value: "aphids", label: "Mənənə" },
  { value: "caterpillars", label: "Tırtıllar" },
  { value: "shield_bug", label: "Taxtabiti (qalxanlı)" },
  { value: "scale_insect", label: "Çanaqlı yastıca" },
  { value: "phytophthora", label: "Fitoftora" },
  { value: "rust", label: "Pas xəstəliyi" },
  { value: "bacterial_blight", label: "Bakterial yanıqlıq" },
  { value: "other", label: "Digər" },
];

// pest_history.severity is stored numeric — keep numeric values, farmer-friendly labels.
export const SEVERITY_OPTIONS: Opt[] = [
  { value: "1", label: "1 – Zəif" },
  { value: "2", label: "2 – Orta" },
  { value: "3", label: "3 – Güclü" },
];

export const FERTILIZER_OPTIONS: Opt[] = [
  { value: "urea", label: "Karbamid (azot)" },
  { value: "ammonium_nitrate", label: "Ammonium nitrat" },
  { value: "ammonium_sulfate", label: "Ammonium sulfat" },
  { value: "superphosphate", label: "Superfosfat" },
  { value: "dap", label: "Diammonium fosfat (DAP)" },
  { value: "potassium_sulfate", label: "Kalium sulfat" },
  { value: "potassium_chloride", label: "Kalium xlorid" },
  { value: "npk", label: "NPK kompleks gübrə" },
  { value: "manure", label: "Peyin" },
  { value: "compost", label: "Kompost" },
  { value: "green_manure", label: "Yaşıl gübrə (sidr)" },
  { value: "micronutrients", label: "Mikroelement qarışığı" },
  { value: "other", label: "Digər" },
];
