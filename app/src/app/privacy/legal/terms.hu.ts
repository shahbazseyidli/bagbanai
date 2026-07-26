// Hungarian terms of use — a translation of terms.az.ts. The "ai-limits" section quotes the hu
// DISCLAIMERS string from services/app/ai/advice.py verbatim.
import type { TermsDoc } from "./types";

export const termsHu: TermsDoc = {
  title: "Felhasználási feltételek",
  lead:
    "Ez az oldal elmondja, mit ígér az Agradex, és — ami fontosabb — mit nem. Nem jogi sablon: " +
    "minden, ami itt szerepel, megfelel a termék mai állapotának.",
  summary: [
    "Az Agradex döntéstámogató eszköz; nem helyettesíti az agronómust, a laboratóriumot és a táblabejárást.",
    "Az MI-tanács automatikus elemzés, és tévedhet — a végső döntés az öné.",
    "Fizetési rendszer jelenleg nincs bekötve: bankkártyaadatot nem gyűjtünk, és értesítés nélkül semmit nem terhelünk.",
    "A gazdaságadatai az önéi; nem adjuk el őket.",
    "A szolgáltatás egyetlen szerveren fut, SLA és garantált rendelkezésre állás nélkül.",
  ],
  sections: {
    service: {
      heading: "Mi a szolgáltatás",
      body: [
        {
          kind: "p",
          text:
            "Az Agradex műholdfelvételekre (Sentinel-2 és a harmonizált Landsat–Sentinel " +
            "termék), időjárás-előrejelzésre, agronómiai modellekre és mesterséges " +
            "intelligenciára épülő táblamonitorozó és gazdaságirányítási platform. A " +
            "szolgáltatás része a weboldal, az alkalmazás és a telepíthető webalkalmazás (PWA).",
        },
        {
          kind: "p",
          text:
            "A platform mögött egyelőre nincs bejelentett, bejegyzett jogi személy, ezért a " +
            "dokumentum nem nevez meg cégnevet, cégjegyzékszámot és alkalmazandó jogot. Ezt " +
            "nyíltan leírjuk, nehogy téves kép alakuljon ki arról, mi ez a dokumentum. " +
            "Kapcsolat: info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "A szolgáltatás használatával elfogadja ezeket a feltételeket. Ha nem ért egyet, ne " +
            "hozzon létre fiókot, vagy zárja be a meglévőt.",
        },
      ],
    },
    account: {
      heading: "Fiók",
      body: [
        {
          kind: "ul",
          items: [
            "Egy e-mail-cím egy fióknak felel meg; az e-mail egyben a bejelentkezési azonosítója.",
            "Regisztráció után az e-mail-címet 6 jegyű kóddal erősítjük meg.",
            "A belépési adatok védelme az ön felelőssége; a fiókjából végzett műveletek az ön nevében történtnek számítanak.",
            "Pontos adatokat kell megadnia — különösen a táblahatárt és a kultúrát, mert az egész elemzés ezekre épül.",
            "A szervezeten belüli jogosultságokat a szerepkör adja; a szervezet tulajdonosa tagokat vehet fel és távolíthat el.",
            "A fiókját bármikor bezárhatja. Hogy ilyenkor mi történik, azt az Adatkezelési tájékoztató lépésről lépésre leírja.",
          ],
        },
      ],
    },
    "ai-limits": {
      heading: "A mesterséges intelligencia korlátai",
      body: [
        {
          kind: "p",
          text:
            "Minden MI-tanács alá pontosan ez a mondat kerül: „Ez a tanács műholdas és " +
            "tábla-adatokon alapuló automatikus elemzés; döntés előtt ellenőrizze a helyszínen.” " +
            "Ez nem formaság, hanem szó szerint a szolgáltatás határa.",
        },
        {
          kind: "ul",
          items: [
            "Az MI tévedhet: a felhő alatt lévő táblát félreolvashatja, és ha az adatlap hiányos, az eredmény is hiányos lesz.",
            "A fotódiagnózis soha nem nevez meg konkrét növényvédőszer-márkát vagy dózist — az engedélyezett készítmények listájához és egy agronómushoz irányít.",
            "A tanács nem állat-egészségügyi, növény-egészségügyi, jogi vagy pénzügyi tanácsadás.",
            "A műholdas indexek és a modellek nem helyettesítik a laborvizsgálatot, a talajmintavételt és a táblabejárást.",
            "Bármilyen vegyszer kijuttatása előtt mindig olvassa el a címkét és a helyi előírásokat.",
          ],
        },
      ],
    },
    "acceptable-use": {
      heading: "Elfogadható használat",
      body: [
        { kind: "p", text: "A következők nem megengedettek:" },
        {
          kind: "ul",
          items: [
            "Automatizált tömeges kérések küldése, a tartalom lehúzása (scraping), vagy a szolgáltatás mesterséges terheléssel való megbénítása.",
            "Más fiókjába engedély nélkül belépni, a biztonsági mechanizmusokat megkerülni, kártékony kódot elhelyezni.",
            "Olyan adatot feltölteni, amely nem az öné, és amelynek megosztására nincs joga (például egy másik gazdaság tábladokumentumait).",
            "Jogellenes, hamisított vagy mások jogát sértő tartalmat közzétenni.",
            "A szolgáltatást vagy az MI válaszait engedély nélkül szolgáltatásként harmadik feleknek továbbértékesíteni.",
            "A platform kódját vagy modelljeit visszafejteni.",
          ],
        },
        {
          kind: "p",
          text:
            "E szabályok megsértése a fiók felfüggesztéséhez vezethet. Ilyen esetben igyekszünk " +
            "elmagyarázni az okát.",
        },
      ],
    },
    packages: {
      heading: "Csomagok és fizetés",
      body: [
        {
          kind: "kv",
          rows: [
            {
              k: "Ingyenes",
              v: "1 tábla · havi 1 MI-tanács · csevegés nincs · a műholdas indexek és az időjárás benne vannak.",
            },
            {
              k: "Pro — havi 10 AZN",
              v: "5 tábla · havi 8 MI-tanács · havi 50 csevegésüzenet · tábla-adatlap, öntözés és permetezési ablak.",
            },
            {
              k: "Business — havi 25 AZN",
              v: "Gyakorlatilag korlátlan tábla · havi 30 tanács · 300 csevegésüzenet · 30 fotódiagnózis · viszonyítás és jelentések.",
            },
          ],
        },
        {
          kind: "p",
          text:
            "Az újonnan létrehozott szervezet 1 hónapos Pro próbaidőszakkal indul, és a próba " +
            "végén magától visszaáll az ingyenes csomagra — automatikus fizetés nincs.",
        },
        {
          kind: "p",
          text:
            "A legfontosabb megjegyzés: a fizetés még nincs bekötve. A kódban egyetlen fizetési " +
            "szolgáltató sincs, bankkártya- és bankadatot nem gyűjtünk, a csomagokat jelenleg " +
            "kézzel állítjuk be. Amikor a fizetős csomagok elindulnak, azt előre bejelentjük; " +
            "értesítés nélkül senkitől semmit nem vonunk le.",
        },
        { kind: "p", text: "Az árak AZN-ben szerepelnek." },
      ],
    },
    quotas: {
      heading: "Keretek",
      body: [
        {
          kind: "p",
          text:
            "Az MI-tanácsnak, a csevegésnek és a fotódiagnózisnak csomagonként havi kerete van. " +
            "Ha a keret elfogy, a kérést elutasítjuk, és megmondjuk az okát; a keret a következő " +
            "hónapban nullázódik.",
        },
        {
          kind: "p",
          text:
            "A keretek az MI valós költségét fedezik. Fenntartjuk a jogot, hogy korlátozzuk a " +
            "rendszert szokatlanul terhelő használatot.",
        },
        {
          kind: "p",
          text:
            "A műholdas feldolgozás sebessége rajtunk kívül álló tényezőktől függ: attól, " +
            "milyen gyakran halad el a műhold a tábla felett, és a felhőborítottságtól.",
        },
      ],
    },
    ownership: {
      heading: "Kié az adat",
      body: [
        {
          kind: "p",
          text:
            "A táblahatárok, az adatlap adatai, a jegyzetek, a fényképek, a naplótételek — mind " +
            "az önéi. A szolgáltatás nyújtásához (tárolás, feldolgozás, elemzés, megjelenítés) " +
            "megadja nekünk a kezelésük jogát; ezen túl semmit.",
        },
        {
          kind: "ul",
          items: [
            "Az adatait nem adjuk el, és hirdetési célra sem továbbítjuk.",
            "Az összesített mutatók (összehasonlítás, viszonyítás) csak legalább 5 táblából álló csoportokon számítódnak, és nem mutatnak konkrét táblára.",
            "A platform kódja, arculata, indexmodelljei és tartalma a miénk.",
            "Ön felel azért, hogy a feltöltött tartalom az öné, vagy jogosult a feltöltésére.",
          ],
        },
      ],
    },
    availability: {
      heading: "Rendelkezésre állás",
      body: [
        {
          kind: "p",
          text:
            "A szolgáltatás egyetlen szerveren fut, és „legjobb tudás szerinti” módon érhető el. " +
            "Garantált rendelkezésre állás (SLA) nincs; tervezett és nem tervezett kiesések " +
            "előfordulhatnak.",
        },
        {
          kind: "p",
          text:
            "A műholdas adat nem folytonos: a felhőborítás és a műhold visszatérési rendje miatt " +
            "napokig nem lesz új felvétel. Ez nem hiba, hanem a pálya természete.",
        },
        {
          kind: "p",
          text:
            "Funkciókat hozzáadhatunk, módosíthatunk vagy elvehetünk. Ha olyat veszünk el, ami " +
            "önnek fontos, igyekszünk előre szólni.",
        },
      ],
    },
    liability: {
      heading: "Felelősség",
      body: [
        {
          kind: "p",
          text:
            "Az agronómiai döntések az önéi. Öntözni, tápanyagot kijuttatni, permetezni, " +
            "betakarítani — mindegyik annak az embernek a döntése, aki ismeri a táblát, és az " +
            "Agradex nem felel a döntés eredményéért.",
        },
        {
          kind: "p",
          text:
            "Konkrétan: ha a platform tanácsa alapján elvégzett (vagy el nem végzett) munka " +
            "nyomán terméskiesés, hozamcsökkenés, költségnövekedés vagy más kár keletkezik, " +
            "ezért nem vállalunk felelősséget.",
        },
        {
          kind: "p",
          text:
            "A szolgáltatást „adott állapotában” nyújtjuk; nem garantáljuk, hogy az adatok " +
            "teljesek és pontosak.",
        },
        {
          kind: "p",
          text:
            "Ez a szakasz nem korlátozza azokat a jogokat, amelyeket a helyi jog kötelező " +
            "erővel biztosít önnek.",
        },
      ],
    },
    changes: {
      heading: "A feltételek változása",
      body: [
        {
          kind: "p",
          text:
            "Ahogy a termék változik, úgy változnak ezek a feltételek is. Az oldal tetején lévő " +
            "dátum a legutóbbi szerkesztést mutatja.",
        },
        {
          kind: "p",
          text:
            "A lényeges változásokat — például a fizetés elindulását — előre bejelentjük " +
            "alkalmazáson belüli értesítéssel vagy e-mailben. Ha a változás után tovább " +
            "használja a szolgáltatást, azzal elfogadja az új feltételeket.",
        },
      ],
    },
    contact: {
      heading: "Kapcsolat",
      body: [
        {
          kind: "p",
          text:
            "Kérdés, panasz, az adatai másolatának vagy törlésének kérése — minden egy címre: " +
            "info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "A jogi személyre vonatkozó formális adatok (cégnév, bejegyzés, cím, alkalmazandó " +
            "jog) egyelőre nem léteznek; ez a szakasz frissülni fog, amint megvannak.",
        },
      ],
    },
  },
};
