// Hungarian privacy policy — a translation of privacy.az.ts. Same section keys, same facts.
import type { PrivacyDoc } from "./types";

export const privacyHu: PrivacyDoc = {
  title: "Adatkezelési tájékoztató",
  lead:
    "Az Agradex műholdfelvételek, időjárási adatok és mesterséges intelligencia segítségével " +
    "figyeli a táblákat. Ez az oldal nem jogi sablon — úgy, ahogy van, elmondja, mit gyűjt " +
    "önről a rendszer, hol tárolja, kinek adja tovább, és mi történik, ha bezárja a fiókját.",
  summary: [
    "Minden adat az EU-n belül van — egyetlen helsinki (Finnország) szerveren, saját üzemeltetésű Postgres adatbázisban.",
    "Nincs hirdetési nyomkövető, analitikai pixel és harmadik féltől származó süti; ezért nincs hozzájárulási sáv sem.",
    "Az MI-hez tábla-adatok jutnak el, fiókadatok nem: a nevét, e-mail-címét és jelszókivonatát soha nem küldjük el a modell szolgáltatójának.",
    "Az egyetlen ismétlődő levél a heti összefoglaló (szerdánként); egy kattintással leiratkozhat.",
    "A fiók bezárása a személyt törli, de megőrzi az ön által írt bejegyzéseket — azok többé senkire nem mutatnak.",
  ],
  sections: {
    scope: {
      heading: "Mire terjed ki ez a dokumentum",
      body: [
        {
          kind: "p",
          text:
            "A tájékoztató az agradex.com (bemutató oldal), az app.agradex.com (alkalmazás) és a " +
            "telepíthető webalkalmazás (PWA) esetén érvényes. Mindhárom ugyanazon a szerveren, " +
            "ugyanazzal az adatbázissal működik.",
        },
        {
          kind: "p",
          text:
            "Az őszinteség kedvéért elöljáróban: az Agradex még fejlesztés alatt áll, és a " +
            "termék mögött nincs bejelentett, bejegyzett jogi személy (cégnév, cégjegyzékszám, " +
            "székhely). Ezért a dokumentum nem nevez meg formális adatkezelőt. Az adataival " +
            "kapcsolatos minden megkeresés a platformot működtető csapathoz jut el az " +
            "info@agradex.com címen.",
        },
        {
          kind: "p",
          text:
            "A dokumentum csak a mi rendszerünkre vonatkozik. Az Agradexből kivezető " +
            "hivatkozásoknak (például a műholdas adatforrások hivatalos oldalainak) saját " +
            "adatvédelmi szabályaik vannak.",
        },
      ],
    },
    "account-data": {
      heading: "Fiókadatok",
      body: [
        {
          kind: "p",
          text: "Regisztrációkor és a beállítások módosításakor ezeket tároljuk:",
        },
        {
          kind: "ul",
          items: [
            "E-mail-cím — ez a bejelentkezési azonosítója, és egyedi.",
            "Jelszó — kizárólag bcrypt kivonatként. A nyílt jelszót nem tároljuk, és nem is tudjuk visszaállítani.",
            "Név (megadása nem kötelező), a felület nyelve, ország és régió.",
            "Szerepkör: gazdálkodó, laboratórium, tanácsadó agronómus vagy beszállító.",
            "Területegység-beállítás (hektár / dönüm / szotka) — ha nem választ, az országból következik.",
            "Értesítési beállítások (mely csatornákat kapcsolta ki) és a hírlevélről való leiratkozás jelzése.",
            "Minden eszközre, amelyen bekapcsolja a push-értesítést, a böngésző által kiadott feliratkozás (kézbesítési cím, titkosítási kulcsok, böngészőazonosító) — leiratkozáskor a sor törlődik.",
            "Névláthatósági beállítás — látják-e a nevét más felhasználók.",
            "A bemutató oldal rövid kérdőívének válaszai (kultúra, ország, régió, fő probléma, igények), ha regisztráció előtt kitöltötte.",
            "Az e-mail-megerősítés állapota és egy ideiglenes 6 jegyű kód — a kód a felhasználás pillanatában törlődik.",
            "Utolsó aktivitás időpontja — óránként legfeljebb egyszer íródik, csak azért, hogy tudjuk, él-e a fiók.",
          ],
        },
        {
          kind: "p",
          text:
            "Az adatbázisban van telefonszám-oszlop, de a regisztrációs űrlap sosem kéri — " +
            "vagyis a gyakorlatban nem gyűjtünk telefonszámot. Bankkártya- és fizetési adatot " +
            "egyáltalán nem gyűjtünk (lásd „Csomagok és fizetés” a Felhasználási feltételekben).",
        },
      ],
    },
    "field-data": {
      heading: "Tábla- és gazdaságadatok",
      body: [
        { kind: "p", text: "A platform lényegi tartalma az ön által bevitt gazdaságadat:" },
        {
          kind: "ul",
          items: [
            "A térképen megrajzolt táblahatár és a terület (az adatbázisban mindig hektárban — az egységválasztás csak a megjelenítést érinti).",
            "Tábla, gazdaság és szervezet nevei.",
            "A tábla adatlapja: kultúra, fajta, vetés és betakarítás dátuma, talajtípus és pH, öntözési mód, fejlődési fázis, elővetemény, szabad szöveges jegyzetek.",
            "Táblabejárási megfigyelések, feltöltött fényképek, tábla-műveletek, termésadatok, feladatok és szezonok.",
            "Napló-, értékesítési, raktár- és géptételek, feltöltött dokumentumok.",
            "Talajlabor-vizsgálatok — a feltöltött szkennelt lap és a belőle OCR-rel kiolvasott értékek.",
          ],
        },
        { kind: "p", text: "Ezeken felül a rendszer maga számítja ki és tárolja:" },
        {
          kind: "ul",
          items: [
            "Felvételenként 9 index (NDVI, NDMI és a többi) statisztikáit, valamint a táblájára vágott raszterfájlokat.",
            "Az időjárás előzményeit, a tábla állapotpontszámát, a hőösszeget (GDD).",
            "Az MI-tanács szövegét, azt, milyen bemenetekből készült, melyik modell írta és milyen nyelven.",
            "Az MI-csevegés üzeneteit, az értesítéseket, a megosztási hivatkozások tokenjeit.",
            "Az MI-használat token- és költségelszámolását.",
            "Hét konkrét termékeseményt (kérdőív elindítva, tábla létrehozva, kultúra beállítva, első felvétel megnyitva, tanács elolvasva, Telegram összekötve, ellenőrzőlista kész) — ez a lista a kódban rögzített; semmi mást nem követünk.",
          ],
        },
      ],
    },
    storage: {
      heading: "Hol vannak az adatok",
      body: [
        {
          kind: "p",
          text:
            "Minden egyetlen Hetzner-szerveren van Helsinkiben (Finnország, Európai Unió). Az " +
            "adatbázis a saját Postgres 16 + PostGIS telepítésünk, amely azon a gépen Dockerben " +
            "fut. A feltöltött fájlok ugyanennek a szervernek a helyi lemezén, a műholdas " +
            "raszterek pedig ugyanazon a lemezen külön mappában vannak.",
        },
        {
          kind: "p",
          text:
            "Nem használunk menedzselt, harmadik féltől származó adatbázist (például Supabase-t) " +
            "és külső objektumtárolót (S3-at és hasonlókat) — ez tudatos architekturális döntés.",
        },
        {
          kind: "p",
          text:
            "A biztonsági mentések ugyanezen csapat által üzemeltetett szerveren, az Európai " +
            "Unión belül vannak. A mentésekre nincs formális megőrzési idő beállítva.",
        },
      ],
    },
    processors: {
      heading: "Kinek adjuk tovább az adatot",
      body: [
        {
          kind: "p",
          text:
            "Az alábbiak a platform által használt külső szolgáltatások. A lista teljes — " +
            "adatait nem adjuk át hirdetési hálózatoknak, adatkereskedőknek vagy marketing " +
            "platformoknak, és nem is értékesítjük.",
        },
        {
          kind: "kv",
          rows: [
            {
              k: "Anthropic (Claude)",
              v:
                "MI-tanács, csevegés, fotódiagnózis és a kutatási réteg. Ami elmegy: a tábla " +
                "neve, területe, a kultúra adatlapja (a jegyzetekkel együtt), indextrendek, " +
                "időjárás, legutóbbi megfigyelések, műveletek, nyitott feladatok, legutóbbi " +
                "termésadatok, az előző tanács összefoglalója, a legutóbbi csevegésfordulók és a " +
                "diagnózisra küldött fénykép. Ami nem: e-mail-cím, név, jelszókivonat.",
            },
            {
              k: "Resend",
              v:
                "E-mail-kézbesítés — a címzett címe, a megszólításban szereplő név és az üzenet " +
                "szövege. Ha be van állítva, tartalék csatornaként SMTP szolgál.",
            },
            {
              k: "Open-Meteo",
              v: "A tábla középpontjának koordinátái — a 7 napos előrejelzéshez és a párolgás (ET0) számításához.",
            },
            { k: "ISRIC SoilGrids", v: "A tábla koordinátái — a talajszelvény lekéréséhez." },
            {
              k: "FAOSTAT",
              v: "Országos szintű terméshozam-statisztika. Önről semmi nem távozik.",
            },
            {
              k: "EPPO",
              v:
                "Csak a kultúra neve, és csak ha be van állítva API-kulcs. Ma nincs beállítva, " +
                "így ehhez a szolgáltatáshoz egyáltalán nem megy kérés.",
            },
            {
              k: "NASA Earthdata (HLS) és Copernicus Sentinel-2",
              v:
                "Az adat hozzánk érkezik, nem öntől távozik: a felvételkeresés a tábla befoglaló " +
                "téglalapját és egy dátumtartományt küld. Fiókot, nevet, címet nem továbbítunk.",
            },
            {
              k: "OpenStreetMap Nominatim",
              v:
                "A térképkeresőbe beírt helynév (a böngészőből) és egy koordináta helynévvé " +
                "alakítása (a szerverről).",
            },
            {
              k: "Alaptérkép-kiszolgálók",
              v:
                "Az Esri World Imagery, az EOX s2cloudless, az OpenStreetMap, az OpenTopoMap és " +
                "a domborzati csempék közvetlenül a böngészőjébe töltődnek — vagyis ezek a " +
                "kiszolgálók látják az IP-címét és azt, melyik területet nézi.",
            },
            {
              k: "A böngésző push-szolgáltatása",
              v:
                "Ha bekapcsolja a push-értesítést, az üzenet a böngészője push-szolgáltatásán " +
                "keresztül érkezik (böngészőtől függően Google, Mozilla vagy Apple). A szöveg " +
                "titkosítva utazik, de a szolgáltatás látja az eszköze feliratkozási címét.",
            },
            {
              k: "Google (bejelentkezés Google-fiókkal)",
              v:
                "Csak akkor, ha Ön nyomja meg a „Folytatás Google-fiókkal” gombot. Ami a Google-hoz kerül: a böngészője (tehát az IP-címe) és az, hogy melyik alkalmazásba lép be. Amit a Google visszaad nekünk: a fiók állandó azonosítója, az e-mail-cím, hogy az meg van-e erősítve, és a megjelenítendő neve. A tábláiról, jegyzeteiről és műholdas adatairól semmi nem kerül a Google-hoz. Az oldalainkon nem töltődik be Google-szkript — a gomb közönséges hivatkozás, így a kattintásig a Google nem látja, hogy Ön az oldalunkon jár.",
            },
            {
              k: "Telegram",
              v:
                "Csak ha ön maga köti össze a botot. Ma nincs bot-token beállítva, a csatorna " +
                "alszik.",
            },
          ],
        },
      ],
    },
    ai: {
      heading: "Mesterséges intelligencia",
      body: [
        {
          kind: "p",
          text:
            "A tanács, a csevegés és a fotódiagnózis az Anthropic Claude modelljeivel működik. A " +
            "modellnek küldött kontextus a tábláról szól, nem az ön személyéről — az a kód, " +
            "amelyik összeállítja, egyetlen oszlopot sem olvas ki a fiókok táblájából.",
        },
        {
          kind: "p",
          text:
            "Minden MI-hívás tokenszámát és becsült költségét a saját adatbázisunkban rögzítjük; " +
            "ez a keretszámításhoz és a költségek ellenőrzéséhez kell.",
        },
        {
          kind: "p",
          text:
            "Ha az MI-kulcsot kivesszük a konfigurációból, a rendszer szépen visszavesz: nem " +
            "készül tanács, a csevegés nem válaszol, minden más tovább működik.",
        },
        {
          kind: "p",
          text:
            "Az MI válasza automatikus elemzés, és tévedhet. Korlátait a Felhasználási " +
            "feltételek külön ismertetik.",
        },
      ],
    },
    email: {
      heading: "E-mail",
      body: [
        {
          kind: "p",
          text:
            "Az egyetlen ismétlődő üzenet a heti összefoglaló — minden szerdán 07:00-kor (bakui " +
            "idő szerint) megy ki, és technikailag sem küldhető hetente többször.",
        },
        {
          kind: "p",
          text:
            "Ezen kívül csak tranzakciós üzenetek vannak: a megerősítő kód, az üdvözlő levél és " +
            "az a jelentés, amely akkor érkezik, amikor a táblája először elkészül. Mindegyik " +
            "24 óránként legfeljebb egyszer megy ki.",
        },
        {
          kind: "p",
          text:
            "Minden összefoglaló alján egykattintásos leiratkozó hivatkozás van — bejelentkezés " +
            "nélkül. Ugyanezt a beállítást a fiókoldalon is kikapcsolhatja. Figyelem: " +
            "leiratkozás után is érkeznek tranzakciós üzenetek (például a megerősítő kód), mert " +
            "azok nélkül a fiók nem működik.",
        },
        {
          kind: "p",
          text:
            "Hirdetési levelet nem küldünk, és a címét senkivel nem osztjuk meg. Az őszinteség " +
            "kedvéért: az összefoglaló szövege jelenleg a török, német, magyar, olasz és lengyel " +
            "nyelvű olvasókhoz angolul jut el — a fordítás még nem készült el.",
        },
      ],
    },
    cookies: {
      heading: "Sütik és böngészőtár",
      body: [
        { kind: "p", text: "Három süti van, mindegyik működési célú:" },
        {
          kind: "ul",
          items: [
            "bagban_session — a bejelentkezési munkamenet. httpOnly (a JavaScript nem olvassa), SameSite=Lax, https felett Secure, 7 nap. Semmi másra nem használjuk.",
            "bagban_locale — megjegyzi a választott nyelvet, 1 év.",
            "bagban_oauth_state — csak akkor jön létre, amikor megnyomja a „Folytatás Google-fiókkal” gombot, és kizárólag ennek a bejelentkezésnek a védelmére (CSRF). httpOnly, SameSite=Lax, Secure, 10 perc; a bejelentkezés végeztével törlődik.",
          ],
        },
        {
          kind: "p",
          text:
            "Ennyi. A kódban sehol nincs Google Analytics, Google Tag Manager, Plausible, " +
            "Hotjar, Mixpanel, PostHog, Facebook-pixel vagy bármilyen más nyomkövető. Épp ezért " +
            "nem mutat az oldal süti-hozzájárulási sávot — nincs mit kérdeznie.",
        },
        {
          kind: "p",
          text:
            "Ettől függetlenül a böngésző helyi tárolójában néhány felületi beállítás marad: az " +
            "alaptérkép, az adattakarékos mód, az offline sor, a kezdő ellenőrzőlista állapota és " +
            "a regisztráció előtt kitöltött kérdőív válaszai. Ezek az eszközén maradnak; a " +
            "kérdőív válaszai csak a regisztrációs kéréssel együtt jutnak el a szerverre.",
        },
      ],
    },
    visibility: {
      heading: "Ki látja az adatait",
      body: [
        {
          kind: "ul",
          items: [
            "A szervezete többi tagja — a szerepkörüknek megfelelően látják a táblákat; a jogosultságot minden kérésnél a szerver ellenőrzi.",
            "A megosztási hivatkozás (/s/…) szándékosan minimális, csak olvasható táblakártyát mutat bárkinek, akinél a hivatkozás van. A hivatkozás bármikor visszavonható.",
            "Tábla-hozzáférés — ha egyetlen táblát megoszt egy megnevezett felhasználóval, ő csak annak a táblának a jelentését látja (a többi tábláját, a gazdaságát és a csapatát nem). Bármikor visszavonhatja, és az illető is lemondhat róla.",
            "Ha kikapcsolja a névláthatóságot, a más felhasználók által látott felületeken a nevét „user_…” álnév váltja fel.",
            "Az összehasonlító és viszonyítási értékek legalább 5 másik táblából álló csoport nélkül nem számítódnak ki, és soha nem neveznek meg konkrét táblát vagy gazdaságot.",
            "A platformot működtető csapat — egy adminisztrációs felületen látja a használatot, az MI-költséget és a fiókokat minden szervezetben, a szerver üzemeltetőjeként pedig műszaki hozzáférése van az adatbázishoz.",
          ],
        },
      ],
    },
    retention: {
      heading: "Megőrzés és törlés",
      body: [
        {
          kind: "p",
          text:
            "A tábla törlése „lágy” törlés: eltűnik a listából és visszaállítható, fizikailag " +
            "nem kerül ki az adatbázisból.",
        },
        {
          kind: "p",
          text:
            "A fiók bezárása (a fiókoldalon lévő gomb) visszafordíthatatlan, és pontosan ezt " +
            "teszi:",
        },
        {
          kind: "ul",
          items: [
            "A megerősítéshez kézzel be kell írnia a saját e-mail-címét.",
            "Ha az ön tulajdonában lévő szervezetnek még vannak más aktív tagjai, a művelet elutasításra kerül — előbb adja át a szervezetet.",
            "Minden tagság törlődik, vagyis a hozzáférés azonnal megszűnik.",
            "Azoknak a szervezeteknek a tábláit, ahol ön volt az egyetlen tag, lágyan töröljük.",
            "Az e-mail-cím egy nem kézbesíthető belső címre íródik át — ez felszabadítja a valódi címét, így azzal újra regisztrálhat.",
            "A név, ország, régió, kérdőívválaszok és értesítési beállítások törlődnek; a jelszókivonat helyére olyan érték kerül, amelyet egyetlen jelszó sem állít elő; a fiók inaktívvá válik.",
          ],
        },
        {
          kind: "p",
          text:
            "Ami megmarad: az ön által írt bejegyzések — táblák, határok, megfigyelések, " +
            "naplótételek, termésadatok. Az ok műszaki, és nem titkoljuk: tizenöt tábla hivatkozik " +
            "a felhasználóra, és a kaszkádolt törlés egy dolgozó távozása miatt egy egész " +
            "gazdaság történetét semmisítené meg. Ezek a bejegyzések maradnak, de többé nem " +
            "kötődnek azonosítható személyhez. A használati elszámolás, a levélküldési napló és " +
            "az eseménysorok megőriznek egy felhasználóazonosítót, amely már senkire nem mutat.",
        },
        {
          kind: "p",
          text: "A műholdas és a számított adatokra nincs automatikus lejárat.",
        },
      ],
    },
    rights: {
      heading: "Jogai és amit ma megtehet",
      body: [
        { kind: "p", text: "Mindez a fiókoldalon, azonnal, önállóan elvégezhető:" },
        {
          kind: "ul",
          items: [
            "Jelszó módosítása.",
            "Név, ország és régió szerkesztése.",
            "A felület nyelvének és a területegységnek a módosítása.",
            "Az értesítési mátrix (kategória × csatorna) beállítása.",
            "A névláthatóság kikapcsolása.",
            "Leiratkozás a heti összefoglalóról.",
            "A fiók bezárása.",
          ],
        },
        {
          kind: "p",
          text:
            "A táblahatárok a tábla létrehozási képernyőjéről GeoJSON vagy KML formátumban " +
            "letölthetők.",
        },
        {
          kind: "p",
          text:
            "A teljes fiók automatikus exportja még nincs meg — ezt nem titkoljuk. Ha másolatot " +
            "kér az adatairól vagy azok teljes törlését, írjon az info@agradex.com címre, és " +
            "kézzel elkészítjük.",
        },
      ],
    },
    changes: {
      heading: "Változások",
      body: [
        {
          kind: "p",
          text:
            "Ez a dokumentum a rendszert írja le, ezért a rendszerrel együtt kell változnia. A " +
            "legutóbbi frissítés dátuma az oldal tetején látható.",
        },
        {
          kind: "p",
          text:
            "Ha lényegesen változik, mit gyűjtünk vagy hová továbbítjuk, azt előre jelezzük — " +
            "alkalmazáson belüli értesítéssel vagy a heti összefoglalóban.",
        },
      ],
    },
  },
};
