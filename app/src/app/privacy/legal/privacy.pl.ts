// Polish privacy policy — a translation of privacy.az.ts. Same section keys, same facts.
import type { PrivacyDoc } from "./types";

export const privacyPl: PrivacyDoc = {
  title: "Polityka prywatności",
  lead:
    "Agradex to platforma monitorująca uprawy przy pomocy zdjęć satelitarnych, danych " +
    "pogodowych i sztucznej inteligencji. Ta strona nie jest szablonem prawnym — wyjaśnia tak, " +
    "jak jest, co system o Tobie zbiera, gdzie to przechowuje, komu przekazuje i co się dzieje, " +
    "gdy zamkniesz konto.",
  summary: [
    "Wszystkie dane są w UE — na jednym serwerze w Helsinkach (Finlandia), w bazie Postgres, którą sami prowadzimy. Jeden wyjątek: tekst i zdjęcia wysyłane do analizy AI opuszczają UE na czas przetwarzania — zobacz „Podprzetwarzający” poniżej.",
    "Nie ma trackerów reklamowych, pikseli analitycznych ani plików cookie stron trzecich; dlatego nie ma też banera zgody.",
    "Do SI trafiają dane pola, a nie dane konta: imię, e-mail i skrót hasła nigdy nie są wysyłane do dostawcy modelu.",
    "Jedyna cykliczna wiadomość to cotygodniowe podsumowanie (w środy); wypisujesz się jednym kliknięciem.",
    "Zamknięcie konta usuwa osobę, ale zachowuje zapisy, które utworzyłeś — nie wskazują już na nikogo.",
  ],
  sections: {
    scope: {
      heading: "Czego dotyczy ten dokument",
      body: [
        {
          kind: "p",
          text:
            "Polityka obejmuje agradex.com (stronę informacyjną), app.agradex.com (aplikację) " +
            "oraz instalowalną aplikację webową (PWA). Wszystkie działają na tym samym serwerze " +
            "i na tej samej bazie danych.",
        },
        {
          kind: "p",
          text:
            "Dla uczciwości powiedzmy to od razu: Agradex jest wciąż w budowie, a za produktem " +
            "nie zgłoszono zarejestrowanego podmiotu prawnego (nazwy firmy, numeru rejestrowego, " +
            "siedziby). Dlatego dokument nie wskazuje formalnego administratora danych. Każde " +
            "zapytanie o Twoje dane trafia do zespołu prowadzącego platformę pod adresem " +
            "info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Dokument dotyczy wyłącznie naszego systemu. Odnośniki wyprowadzające poza Agradex " +
            "(na przykład do oficjalnych stron źródeł satelitarnych) mają własne zasady " +
            "prywatności.",
        },
      ],
    },
    "account-data": {
      heading: "Dane konta",
      body: [
        {
          kind: "p",
          text: "Oto co zapisujemy przy rejestracji i przy zmianie ustawień:",
        },
        {
          kind: "ul",
          items: [
            "Adres e-mail — jest Twoim identyfikatorem logowania i jest unikalny.",
            "Hasło — wyłącznie jako skrót bcrypt. Jawnego hasła nie przechowujemy i nie potrafimy go odtworzyć.",
            "Imię i nazwisko (opcjonalnie), język interfejsu, kraj i region.",
            "Rola: rolnik, laboratorium, doradca agronomiczny lub dostawca.",
            "Preferowana jednostka powierzchni (hektar / dönüm / sotka) — jeśli jej nie wybierzesz, wynika z kraju.",
            "Ustawienia powiadomień (które kanały wyłączyłeś) i znacznik rezygnacji z podsumowań e-mail.",
            "Dla każdego urządzenia, na którym włączysz powiadomienia push, subskrypcję wystawioną przez przeglądarkę (adres dostarczania, klucze szyfrowania, identyfikator przeglądarki) — po rezygnacji wiersz jest usuwany.",
            "Ustawienie widoczności nazwiska — czy Twoje nazwisko jest pokazywane innym użytkownikom.",
            "Odpowiedzi z krótkiej ankiety na stronie informacyjnej (uprawa, kraj, region, główny problem, potrzeby), jeśli wypełniłeś ją przed rejestracją.",
            "Stan weryfikacji e-maila oraz tymczasowy 6-cyfrowy kod — kod jest usuwany w chwili użycia.",
            "Czas ostatniej aktywności — zapisywany najwyżej raz na godzinę, tylko po to, by wiedzieć, czy konto jest używane.",
          ],
        },
        {
          kind: "p",
          text:
            "W bazie istnieje kolumna na numer telefonu, ale formularz rejestracji nigdy o niego " +
            "nie pyta — w praktyce numerów telefonu nie zbieramy. Danych karty ani płatności nie " +
            "zbieramy w ogóle (zob. „Pakiety i płatności” w Warunkach korzystania).",
        },
      ],
    },
    "field-data": {
      heading: "Dane pól i gospodarstwa",
      body: [
        { kind: "p", text: "Zasadniczą treścią platformy są wprowadzane przez Ciebie dane gospodarstwa:" },
        {
          kind: "ul",
          items: [
            "Granica pola narysowana na mapie i jego powierzchnia (w bazie zawsze w hektarach — wybór jednostki wpływa tylko na wyświetlanie).",
            "Nazwy pola, gospodarstwa i organizacji.",
            "Karta pola: uprawa, odmiana, daty siewu i zbioru, typ gleby i pH, sposób nawadniania, faza rozwojowa, przedplon, notatki.",
            "Obserwacje z lustracji, przesłane zdjęcia i sezony.",
            "Starsze zapisy, których już nie zbieramy, ale przechowujemy: zabiegi polowe, zapisy plonów, zadania, wpisy księgi, sprzedaży, magazynu i maszyn oraz wcześniej przesłane dokumenty. Te sekcje usunięto z produktu; Twoje zapisy nie zostały skasowane i są anonimizowane wraz z resztą przy zamknięciu konta.",
            "Laboratoryjne analizy gleby — przesłany skan i odczytane z niego przez OCR wartości.",
          ],
        },
        { kind: "p", text: "Ponadto system sam wylicza i przechowuje:" },
        {
          kind: "ul",
          items: [
            "Statystyki 9 wskaźników (NDVI, NDMI i pozostałe) dla każdej sceny oraz pliki rastrowe przycięte do Twojego pola.",
            "Historię pogody, wskaźnik kondycji pola, sumę temperatur efektywnych (GDD).",
            "Tekst porady SI, dane wejściowe, z których powstała, model, który ją napisał, i język.",
            "Wiadomości czatu z SI, powiadomienia, tokeny linków udostępniania.",
            "Rozliczenie tokenów i kosztów korzystania z SI.",
            "Siedem konkretnych zdarzeń produktowych (rozpoczęcie ankiety, utworzenie pola, ustawienie uprawy, pierwsza obejrzana scena, przeczytana porada, podłączenie Telegrama, ukończenie listy startowej) — ta lista jest zapisana na stałe w kodzie; nic innego nie jest śledzone.",
          ],
        },
      ],
    },
    storage: {
      heading: "Gdzie leżą dane",
      body: [
        {
          kind: "p",
          text:
            "Wszystko znajduje się na jednym serwerze Hetzner w Helsinkach (Finlandia, Unia " +
            "Europejska). Baza danych to nasza własna instalacja Postgres 16 + PostGIS działająca " +
            "na tej maszynie w Dockerze. Przesłane pliki leżą na lokalnym dysku tego samego " +
            "serwera, a rastry satelitarne w osobnym katalogu na tym samym dysku.",
        },
        {
          kind: "p",
          text:
            "Nie korzystamy z zarządzanej bazy danych innego dostawcy (np. Supabase) ani z " +
            "zewnętrznego magazynu obiektów (S3 i podobnych) — to świadoma decyzja " +
            "architektoniczna.",
        },
        {
          kind: "p",
          text:
            "Kopie zapasowe znajdują się na serwerze prowadzonym przez ten sam zespół, wewnątrz " +
            "Unii Europejskiej. Dla kopii zapasowych nie skonfigurowano formalnego okresu " +
            "przechowywania.",
        },
      ],
    },
    processors: {
      heading: "Komu przekazujemy dane",
      body: [
        {
          kind: "p",
          text:
            "Poniżej usługi zewnętrzne, z których korzysta platforma. Lista jest kompletna — " +
            "nie przekazujemy Twoich danych sieciom reklamowym, brokerom danych ani platformom " +
            "marketingowym i ich nie sprzedajemy.",
        },
        {
          kind: "kv",
          rows: [
            {
              k: "DeepSeek (model tekstowy)",
              v:
                "Porada SI, czat i warstwa badawcza. Co wychodzi: nazwa " +
                "pola, powierzchnia, karta uprawy (wraz z notatkami), trendy wskaźników, pogoda, " +
                "ostatnie obserwacje, zabiegi, " +
                "streszczenie poprzedniej porady i ostatnie tury czatu. " +
                "Co nie wychodzi: e-mail, nazwisko, skrót hasła — ani żadne zdjęcie, bo ten model " +
                "w ogóle nie potrafi czytać obrazów. Przetwarzanie odbywa się na własnych " +
                "serwerach DeepSeek (firma jest zarejestrowana w Chinach).",
            },
            {
              k: "Google (Gemini — tylko obrazy)",
              v:
                "Opisywanie zdjęć, diagnoza chorób/szkodników i odczyt raportu z laboratorium " +
                "glebowego. Co wychodzi: przesłany przez Ciebie obraz i uprawa pola. Uwaga: to, " +
                "co widnieje na skanie, wychodzi razem z nim — nazwa laboratorium, Twoje " +
                "nazwisko, adres; w odróżnieniu od kontekstu tekstowego to nie my wybieramy " +
                "zawartość obrazu. Do modelu tekstowego nie trafia żadne zdjęcie.",
            },
            {
              k: "Resend",
              v:
                "Dostarczanie poczty — adres odbiorcy, imię w powitaniu i treść wiadomości. " +
                "Jeśli jest skonfigurowany, kanałem zapasowym jest SMTP.",
            },
            {
              k: "Open-Meteo",
              v: "Współrzędne środka pola — do prognozy 7-dniowej i obliczenia parowania (ET0).",
            },
            { k: "ISRIC SoilGrids", v: "Współrzędne pola — aby pobrać profil glebowy." },
            {
              k: "FAOSTAT",
              v: "Statystyka plonów na poziomie kraju. O Tobie nie wychodzi nic.",
            },
            {
              k: "EPPO",
              v:
                "Tylko nazwa uprawy i tylko wtedy, gdy skonfigurowano klucz API. Dziś nie jest " +
                "skonfigurowany, więc do tej usługi nie idzie żadne zapytanie.",
            },
            {
              k: "NASA Earthdata (HLS) i Copernicus Sentinel-2",
              v:
                "Dane płyną do nas, a nie od Ciebie: wyszukiwanie scen wysyła prostokąt " +
                "opisujący pole i zakres dat. Konto, nazwisko i adres nie są przesyłane.",
            },
            {
              k: "OpenStreetMap Nominatim",
              v:
                "Nazwa miejsca wpisana w wyszukiwarkę mapy (z przeglądarki) oraz zamiana " +
                "współrzędnej na nazwę miejsca (z serwera).",
            },
            {
              k: "Serwery podkładów mapowych",
              v:
                "Esri World Imagery, EOX s2cloudless, OpenStreetMap, OpenTopoMap i kafle rzeźby " +
                "ładują się bezpośrednio do Twojej przeglądarki — te serwery widzą więc Twój " +
                "adres IP i to, jaki obszar oglądasz.",
            },
            {
              k: "Usługa push Twojej przeglądarki",
              v:
                "Jeśli włączysz powiadomienia push, wiadomość jest dostarczana przez usługę push " +
                "Twojej przeglądarki (zależnie od przeglądarki Google, Mozilla lub Apple). Treść " +
                "podróżuje zaszyfrowana, ale usługa widzi adres subskrypcji Twojego urządzenia.",
            },
            {
              k: "Google (logowanie przez Google)",
              v:
                "Tylko jeśli sam naciśniesz „Kontynuuj z Google”. Co trafia do Google: Twoja przeglądarka (czyli adres IP) i to, do jakiej aplikacji się logujesz. Co Google zwraca nam: stały identyfikator konta, adres e-mail, informację czy jest zweryfikowany, oraz Twoją nazwę wyświetlaną. O Twoich polach, notatkach i danych satelitarnych nie trafia do Google nic. Na naszych stronach nie ładuje się żaden skrypt Google — przycisk to zwykły odnośnik, więc dopóki go nie naciśniesz, Google nie widzi, że jesteś na naszej stronie.",
            },
            {
              k: "Telegram",
              v:
                "Tylko jeśli sam podłączysz bota. Dziś token bota nie jest skonfigurowany, kanał " +
                "jest uśpiony.",
            },
          ],
        },
      ],
    },
    ai: {
      heading: "Sztuczna inteligencja",
      body: [
        {
          kind: "p",
          text:
            "Porady, czat i badania działają na modelu tekstowym DeepSeek, a obrazy — opis " +
            "zdjęcia, diagnoza chorób i odczyt raportu laboratoryjnego — na modelu Gemini firmy " +
            "Google, ponieważ model tekstowy nie przyjmuje obrazów i żaden tam nie trafia. " +
            "Kontekst wysyłany do modelu dotyczy pola, a nie Twojej tożsamości — kod, który go " +
            "składa, nie czyta żadnej kolumny z tabeli kont. Wyjątkiem jest samo zdjęcie: to, co " +
            "się na nim znajduje, wychodzi razem z nim, a zeskanowany raport laboratoryjny jest " +
            "tego oczywistym przykładem.",
        },
        {
          kind: "p",
          text:
            "Liczba tokenów i szacunkowy koszt każdego wywołania SI są zapisywane w naszej bazie " +
            "— na potrzeby rozliczania limitów i kontroli kosztów.",
        },
        {
          kind: "p",
          text:
            "Jeśli klucz SI zostanie usunięty z konfiguracji, system degraduje się łagodnie: " +
            "porady nie powstają, czat nie odpowiada, cała reszta działa dalej.",
        },
        {
          kind: "p",
          text:
            "Odpowiedź SI to analiza automatyczna i może być błędna. Jej ograniczenia opisano " +
            "osobno w Warunkach korzystania.",
        },
      ],
    },
    email: {
      heading: "Poczta e-mail",
      body: [
        {
          kind: "p",
          text:
            "Jedyna cykliczna wiadomość to cotygodniowe podsumowanie — wysyłane w każdą środę o " +
            "07:00 czasu Baku i technicznie niemożliwe do wysłania częściej niż raz w tygodniu.",
        },
        {
          kind: "p",
          text:
            "Poza tym są tylko wiadomości transakcyjne: kod weryfikacyjny, wiadomość powitalna i " +
            "raport, który przychodzi, gdy Twoje pole jest gotowe po raz pierwszy. Każda z nich " +
            "wychodzi najwyżej raz na 24 godziny.",
        },
        {
          kind: "p",
          text:
            "Na dole każdego podsumowania jest link wypisania jednym kliknięciem — bez " +
            "logowania. To samo ustawienie można wyłączyć na stronie konta. Uwaga: nawet po " +
            "wypisaniu wiadomości transakcyjne (jak kod weryfikacyjny) nadal przychodzą, bo bez " +
            "nich konto nie działa.",
        },
        {
          kind: "p",
          text:
            "Nie wysyłamy poczty reklamowej i nie udostępniamy nikomu Twojego adresu. Dla " +
            "uczciwości: treść podsumowania dociera obecnie do czytelników tureckich, " +
            "niemieckich, węgierskich, włoskich i polskich po angielsku — tłumaczenie nie jest " +
            "jeszcze gotowe.",
        },
      ],
    },
    cookies: {
      heading: "Pliki cookie i pamięć przeglądarki",
      body: [
        { kind: "p", text: "Są trzy pliki cookie, wszystkie funkcjonalne:" },
        {
          kind: "ul",
          items: [
            "bagban_session — sesja logowania. httpOnly (JavaScript go nie czyta), SameSite=Lax, Secure po https, 7 dni. Do niczego innego nie służy.",
            "bagban_locale — zapamiętuje wybrany język, 1 rok.",
            "bagban_oauth_state — powstaje tylko wtedy, gdy naciśniesz „Kontynuuj z Google”, i wyłącznie po to, by zabezpieczyć to logowanie (CSRF). httpOnly, SameSite=Lax, Secure, 10 minut; usuwany zaraz po zalogowaniu.",
          ],
        },
        {
          kind: "p",
          text:
            "I to wszystko. W kodzie nie ma Google Analytics, Google Tag Managera, Plausible, " +
            "Hotjara, Mixpanela, PostHoga, piksela Facebooka ani żadnego innego trackera. " +
            "Właśnie dlatego strona nie pokazuje banera zgody na cookie — nie ma o co pytać.",
        },
        {
          kind: "p",
          text:
            "Osobno: w pamięci lokalnej przeglądarki zapisujemy kilka ustawień interfejsu — " +
            "podkład mapy, tryb oszczędzania danych, kolejkę offline, stan listy startowej i " +
            "odpowiedzi z ankiety wypełnionej przed rejestracją. Zostają one na Twoim " +
            "urządzeniu; odpowiedzi z ankiety trafiają na serwer wyłącznie razem z żądaniem " +
            "rejestracji.",
        },
      ],
    },
    visibility: {
      heading: "Kto widzi Twoje dane",
      body: [
        {
          kind: "ul",
          items: [
            "Pozostali członkowie Twojej organizacji — widzą jej pola zgodnie ze swoją rolą; uprawnienie jest sprawdzane na serwerze przy każdym żądaniu.",
            "Link udostępniania (/s/…) pokazuje każdemu, kto go ma, celowo minimalną kartę pola tylko do odczytu. Link możesz w każdej chwili unieważnić.",
            "Dostęp do pola — jeśli udostępnisz jedno pole wskazanej z nazwy osobie, zobaczy tylko raport tego pola (nie inne Twoje pola, gospodarstwo ani zespół). Możesz cofnąć dostęp w każdej chwili, ona również.",
            "Jeśli wyłączysz widoczność nazwiska, na powierzchniach widocznych dla innych użytkowników nazwisko zastępuje pseudonim „user_…”.",
            "Wartości porównawcze i benchmarki nie są liczone bez grupy co najmniej 5 innych pól i nigdy nie wskazują konkretnego pola ani gospodarstwa.",
            "Zespół prowadzący platformę — przez panel administracyjny widzi użycie, koszty SI i konta we wszystkich organizacjach, a jako operator serwera ma techniczny dostęp do bazy danych.",
          ],
        },
      ],
    },
    retention: {
      heading: "Przechowywanie i usuwanie",
      body: [
        {
          kind: "p",
          text:
            "Usunięcie pola jest „miękkie”: pole znika z listy i można je przywrócić, ale nie " +
            "jest fizycznie usuwane z bazy.",
        },
        {
          kind: "p",
          text:
            "Zamknięcie konta (przycisk na stronie konta) jest nieodwracalne i robi dokładnie " +
            "to:",
        },
        {
          kind: "ul",
          items: [
            "Aby potwierdzić, musisz ręcznie wpisać własny adres e-mail.",
            "Jeśli w organizacji, której jesteś właścicielem, są jeszcze inni aktywni członkowie, operacja zostaje odrzucona — najpierw przekaż organizację.",
            "Wszystkie członkostwa są usuwane, więc dostęp kończy się natychmiast.",
            "Pola organizacji, w których byłeś jedynym członkiem, są usuwane miękko.",
            "Adres e-mail zostaje zamieniony na niedziałający adres wewnętrzny — to zwalnia Twój prawdziwy adres, więc możesz się nim zarejestrować ponownie.",
            "Nazwisko, kraj, region, odpowiedzi z ankiety i ustawienia powiadomień są czyszczone; skrót hasła zastępuje wartość, której nie da się uzyskać żadnym hasłem; konto zostaje dezaktywowane.",
          ],
        },
        {
          kind: "p",
          text:
            "Co zostaje: zapisy, które utworzyłeś — pola, granice, obserwacje, wpisy księgi, " +
            "plony. Powód jest techniczny i go nie ukrywamy: piętnaście tabel odwołuje się do " +
            "użytkownika, a usuwanie kaskadowe zniszczyłoby historię całego gospodarstwa dlatego, " +
            "że odszedł jeden pracownik. Te zapisy pozostają, ale nie są już powiązane z możliwą " +
            "do zidentyfikowania osobą. Rozliczenie użycia, dziennik wysyłek e-mail i wiersze " +
            "zdarzeń zachowują identyfikator użytkownika, który już na nikogo nie wskazuje.",
        },
        {
          kind: "p",
          text: "Dla danych satelitarnych i pochodnych nie ma automatycznego wygasania.",
        },
      ],
    },
    rights: {
      heading: "Twoje prawa i co możesz zrobić dziś",
      body: [
        { kind: "p", text: "Wszystko to zrobisz samodzielnie i od razu na stronie konta:" },
        {
          kind: "ul",
          items: [
            "Zmienić hasło.",
            "Edytować nazwisko, kraj i region.",
            "Zmienić język interfejsu i jednostkę powierzchni.",
            "Ustawić macierz powiadomień (kategoria × kanał).",
            "Wyłączyć widoczność nazwiska.",
            "Zrezygnować z podsumowań e-mail.",
            "Zamknąć konto.",
          ],
        },
        {
          kind: "p",
          text:
            "Granice pól można pobrać w formacie GeoJSON lub KML z ekranu tworzenia pola.",
        },
        {
          kind: "p",
          text:
            "Automatycznego eksportu całego konta jeszcze nie ma — nie ukrywamy tego. Jeśli " +
            "chcesz kopię swoich danych albo ich całkowite usunięcie, napisz na " +
            "info@agradex.com, a przygotujemy to ręcznie.",
        },
      ],
    },
    changes: {
      heading: "Zmiany",
      body: [
        {
          kind: "p",
          text:
            "Ten dokument opisuje system, więc musi zmieniać się razem z nim. Data ostatniej " +
            "aktualizacji jest podana na górze strony.",
        },
        {
          kind: "p",
          text:
            "O istotnej zmianie tego, co zbieramy albo dokąd to trafia, poinformujemy z " +
            "wyprzedzeniem — powiadomieniem w aplikacji lub w cotygodniowym podsumowaniu.",
        },
      ],
    },
  },
};
