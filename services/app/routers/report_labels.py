"""Azerbaijani labels for the stored enum codes, EXTRACTED from app/src/lib/i18n.ts.

GENERATED, NOT AUTHORED. Every string below was copied out of the az dictionary — the same source
`t()` renders from — rather than translated again here. The printable report needs to turn
`hazelnut`, `alluvial`, `furrow`, `weeding` into words a farmer reads, and the platform already
knows all of them in eight languages; re-typing a second Azerbaijani vocabulary in Python would
have started drifting the day it was written. (The `_effective_area_unit` duplication in auth.py is
the standing example of what that costs.)

REGENERATE when the frontend vocabulary changes:
    the extraction lives in the commit that added this file — it parses the FIRST object literal in
    i18n.ts (the az dictionary, before `const DICTS`) and keeps the five families named below.

ONLY AZERBAIJANI, DELIBERATELY. The report itself is Azerbaijani today; when it moves to the
code+params contract the alerts use, this file goes away and the frontend resolves the codes.

Lookup is lower-cased, because the stored value is not consistently cased: the UI writes operation
types as Azerbaijani words ("Suvarma"), while seeded and imported rows carry English codes
("irrigation"). Anything unmapped falls through to the raw value, which for the AZ-word rows is
already correct.
"""

# app.meta.crop.* — 72 entries
_CROP_AZ = {
    'alfalfa': 'Yonca',
    'almond': 'Badam',
    'apple': 'Alma',
    'barley': 'Arpa',
    'bean': 'Lobya',
    'berry_other': 'Digər giləmeyvə',
    'blackberry': 'Böyürtkən',
    'blueberry_pot': 'Göy giləmeyvə (konteynerdə)',
    'blueberry_soil': 'Göy giləmeyvə (torpaqda)',
    'broad_bean': 'Paxla',
    'buckwheat': 'Qarabaşaq',
    'cabbage': 'Kələm',
    'carrot': 'Kök',
    'cereals_legumes': 'Dənli-paxlalılar',
    'cherry': 'Gilas / Albalı',
    'chestnut': 'Şabalıd',
    'chickpea': 'Noxud',
    'corn': 'Qarğıdalı',
    'cotton': 'Pambıq',
    'cucumber': 'Xiyar',
    'currant': 'Qarağat',
    'eggplant': 'Badımcan',
    'feijoa': 'Feyxoa',
    'fig': 'Əncir',
    'flax': 'Kətan',
    'fruit_other': 'Digər meyvə',
    'garlic': 'Sarımsaq',
    'grape': 'Üzüm',
    'greens': 'Göyərti',
    'groundnut': 'Yerfındığı',
    'hazelnut': 'Fındıq',
    'kiwi': 'Kivi',
    'lemon_kumquat': 'Limon / Kinkan',
    'lentil': 'Mərci',
    'mandarin_orange': 'Mandarin / Portağal',
    'melon': 'Bostan (qarpız/yemiş)',
    'millet': 'Darı',
    'mulberry': 'Tut',
    'nectarine': 'Nektarin',
    'oats': 'Vələmir',
    'olive': 'Zeytun',
    'onion': 'Soğan',
    'other_crops': 'Digər bitkilər',
    'peach_apricot': 'Şaftalı / Ərik',
    'pear': 'Armud',
    'pepper': 'Bibər',
    'persimmon': 'Xurma',
    'pistachio': 'Püstə',
    'plum': 'Gavalı',
    'pomegranate': 'Nar',
    'potato': 'Kartof',
    'pumpkin': 'Balqabaq',
    'quince': 'Heyva',
    'rapeseed': 'Raps',
    'raspberry': 'Moruq',
    'rice': 'Çəltik',
    'rye': 'Çovdar',
    'saffron': 'Zəfəran',
    'sesame': 'Küncüt',
    'sorghum': 'Sorqo',
    'soy': 'Soya',
    'strawberry': 'Çiyələk',
    'sugar_beet': 'Şəkər çuğunduru',
    'sunflower': 'Günəbaxan',
    'tea': 'Çay',
    'tobacco_other': 'Tütün (digər)',
    'tobacco_virginia': 'Tütün (Virciniya)',
    'tomato': 'Pomidor',
    'vegetable': 'Tərəvəz',
    'walnut': 'Qoz',
    'wheat': 'Buğda',
    'windbreak': 'Küləkqoruyucu zolaq',
}

# app.meta.soil.* — 16 entries
_SOIL_AZ = {
    'alluvial': 'Allüvial torpaq',
    'chernozem': 'Qara torpaq (çernozem)',
    'chestnut_soil': 'Şabalıdı torpaq',
    'clay': 'Gilli',
    'clay_loam': 'Ağır gillicə',
    'grey_brown': 'Boz-qəhvəyi torpaq',
    'loam': 'Gillicəli (yüngül)',
    'loamy_sand': 'Qumsal',
    'meadow_grey': 'Çəmən-boz torpaq',
    'mountain_forest': 'Dağ-meşə torpağı',
    'peaty': 'Torflu',
    'saline': 'Şoran / şorakət',
    'sandy': 'Qumlu',
    'silty': 'Lilli',
    'stony': 'Daşlı-çınqıllı',
    'yellow_soil': 'Sarı torpaq',
}

# app.opt.irr.* — 8 entries
_IRR_AZ = {
    'basin': 'Ləkli (basdırma) suvarma',
    'drip': 'Damcı suvarma',
    'furrow': 'Şırım üsulu',
    'micro_sprinkler': 'Mikro-yağmurlama',
    'rainfed': 'Dəmyə (suvarılmır)',
    'sprinkler': 'Yağış yağdıran (sprinkler)',
    'subsurface_drip': 'Yeraltı damcı',
    'surface_flood': 'Səthi / su basdırma',
}

# app.op.* — 8 entries
_OPTYPE_AZ = {
    'fertilizing': 'Gübrələmə',
    'harvest': 'Yığım',
    'irrigation': 'Suvarma',
    'pruning': 'Budama',
    'sowing': 'Əkin',
    'spraying': 'Çiləmə',
    'tillage': 'Şumlama',
    'weeding': 'Alaqotu',
}

# scout.cat.* — 7 entries
_SCOUTCAT_AZ = {
    'damage': 'Zədə',
    'disease': 'Xəstəlik',
    'nutrient': 'Qida çatışmazlığı',
    'other': 'Digər',
    'pest': 'Zərərverici',
    'water': 'Su stresi',
    'weed': 'Alaq otu',
}

# Codes that predate or sit outside the frontend vocabulary but exist in stored rows. Kept
# separate so a regeneration of the blocks above cannot silently drop them.
_OPTYPE_EXTRA = {
    "fertilization": "Gübrələmə",   # written by seeds/imports; the UI writes "Gübrələmə"
    "fertilizing": "Gübrələmə",
    "planting": "Əkin",
    "scouting": "Skautinq",
    "other": "Digər",
}
_OPTYPE_AZ = {**_OPTYPE_AZ, **_OPTYPE_EXTRA}

_SEVERITY_AZ = {
    "low": "Aşağı", "medium": "Orta", "high": "Yüksək",
    # The advice pipeline stores severity as AZ codes (see advice.Risk), not English.
    "aşağı": "Aşağı", "orta": "Orta", "yüksək": "Yüksək",
}

_SEASON_STATUS_AZ = {
    "preparation": "Hazırlıq", "planted": "Əkilib", "vegetation": "Vegetasiya",
    "harvest": "Yığım", "fallow": "Herik", "closed": "Bağlanıb",
}


def label(table: dict, value) -> str:
    """Look a stored code up, case-insensitively; unmapped values pass through unchanged."""
    s = (str(value).strip() if value is not None else "")
    if not s:
        return "—"
    return table.get(s.lower(), s)
