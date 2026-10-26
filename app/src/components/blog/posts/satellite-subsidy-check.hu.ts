import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "satellite-subsidy-check",
  locale: "hu",
  title: "A TMR műholdról nézi a tábláját — mit lát pontosan?",
  description:
    "A Kincstár Területi Monitoring Rendszere Sentinel-felvételekből ellenőrzi az egységes kérelmet. Mit jelent az egyeztető levél, mikor kell georeferált fotó, és hogyan nézheti meg a tábláját előbb.",
  lead:
    "Rövid válasz: az első ellenőr már nem ember, hanem műhold. A Magyar Államkincstár a Területi Monitoring Rendszeren (TMR) keresztül vizsgálja az egységes kérelemben bejelentett gazdálkodási gyakorlatokat, az Európai Űrügynökség Sentinel műholdcsaládjának felvételeire — vagy legalább ezzel egyenértékű adatokra, például georeferált fényképre — támaszkodva.",
  minutes: 5,
  datePublished: "2026-10-26",
  dateModified: "2026-10-26",
  sections: [
    {
      heading: "Mit néz a rendszer valójában?",
      paragraphs: [
        "Nem iratot, hanem felszínt. A műhold a tábla látható állapotát rögzíti: csupasz talaj, kelés, záródó állomány, betakarítás. Ezek a változások adják ki azt a mintázatot, amelyből a rendszer megállapítja, hogy a földön történt-e az, amit a kérelemben bejelentettek.",
        "Ezért egyetlen felvétel nem elég, és a rendszer nem is arra épül. Egy felhős nap, egy héttel korábbi kaszálás vagy egy épp tarlós állapot önmagában félrevezet — egy egész szezon felvételsorozata viszont már egy görbét rajzol ki, és azt nehéz félreérteni.",
      ],
    },
    {
      heading: "Egyeztető levél: ez a rendszer kérdése, nem ítélete",
      paragraphs: [
        "Ha a feldolgozás eltérést talál, a Kincstár egyeztető levelet küld, amely a lehetséges meg nem felelést jelzi. Ilyenkor a gazdálkodó kijavíthatja a kérelmet, vagy georeferált fényképpel igazolhatja a tábla tényleges állapotát. A fotók a mobilGAZDA alkalmazással készíthetők el.",
        "2026-ban a georeferált fénykép beküldése továbbra is önkéntes — de ha a műholdas feldolgozás továbbra is eltérést talál és nem érkezik fotó, az helyszíni ellenőrzést vonhat maga után. Vagyis az önkéntesség inkább a forma, mint a következmény kérdése.",
      ],
      bullets: [
        "Egyeztető levél — lehetséges eltérés jelzése, nem szankció",
        "Válasz: kérelem javítása vagy georeferált fotó (mobilGAZDA)",
        "A fotó 2026-ban önkéntes, de hiánya helyszíni ellenőrzéshez vezethet",
        "Határidők: főnövénynél 2026.09.30., másodvetésnél 2027.01.15.",
      ],
    },
    {
      heading: "Hol nézheti meg maga a felvételeket?",
      paragraphs: [
        "Az Egységes Kérelem térképi felületén megtekinthetők a Kincstár rendelkezésére álló nagy felbontású műholdfelvételek, havi bontásban — így a különböző időpontok állapota egymás mellé tehető. Ez a leggyorsabb módja annak, hogy egy egyeztető levél előtt lássa, mit mutat a tábla.",
        "A 2026-os kérelmeket április 15. és június 9. között lehetett benyújtani, és a június 9-i határidő jogvesztő volt. A főnövényre vonatkozó fotóhatáridő szeptember 30-án lejárt; a másodvetés fotói viszont 2027. január 15-ig még beküldhetők. Konkrét ügyben mindig a Kincstár aktuális közleménye vagy a falugazdász a mérvadó.",
      ],
    },
    {
      heading: "Miért jó ez a gazdálkodónak?",
      paragraphs: [
        "Mert a monitoring a mintavételt váltotta fel. Korábban az ellenőrzés azt jelentette, hogy a gazdaságok egy kiválasztott részéhez kiszállt valaki; ma minden tábla megfigyelés alatt áll, ugyanazzal a módszerrel, bejelentkezés és időpont-egyeztetés nélkül. Ahol a kép egyezik a bejelentéssel, ott nem történik semmi.",
        "Egy feltétel van, és az Öné: a tábla határának pontosnak kell lennie. A pixelek a határvonalon belülről származnak. Ha a rajz átlóg a szomszédra, az útra vagy egy épületre, a mérés is elcsúszik vele — és akkor is Ön ellen dolgozik, ha a gazdálkodás rendben volt.",
      ],
    },
    {
      heading: "Nézze meg a tábláját előbb",
      paragraphs: [
        "A forrás nyilvános. A Copernicus Sentinel-2 felvételek ingyenesek, és a vegetációs indexek ugyanazzal az aritmetikával készülnek, bárki számolja őket. Semmi nem akadályozza meg abban, hogy ugyanazt lássa, amit a rendszer — csak előbb.",
        "Az Agradex ezt a részt veszi le a válláról: a határt egyszer rajzolja meg, az alkalmazás pedig lehívja az adott tábla Sentinel-2 előzményeit, és kirajzolja az index alakulását a szezon során. Támogatást nem számol és jogosultságot nem bírál el — az a Kincstár dolga. Azt a fizikai nyomot mutatja meg, amire az ellenőrzés épül.",
      ],
    },
    {
      heading: "Mit nem mond meg a műhold?",
      paragraphs: [
        "Nem nevez meg betegséget, nem néz az állomány alá, és nem olvas szerződést. Egy 10 méteres pixel 100 négyzetmétert fed le: egy néhány méteres fertőzési góc, egy magányos fa vagy egy keskeny művelőút nem kap külön pixelt. Az index visszavert fényt mér, nem diagnózist — azt mondja meg, hová menjen ki, nem azt, mit fog ott találni.",
        "Ez a korlát mindkét irányba igaz: határt szab annak, amit a monitoring felróhat, és annak is, amit egy térképtől elvárhat.",
      ],
    },
  ],
  related: ["what-is-ndvi", "satellite-pass-frequency", "free-ndvi-map"],
};
