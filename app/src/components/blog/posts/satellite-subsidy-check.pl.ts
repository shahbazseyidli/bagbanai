import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "satellite-subsidy-check",
  locale: "pl",
  title: "ARiMR sprawdza Twoje pole z satelity — co dokładnie widzi?",
  description:
    "Monitoring satelitarny ARiMR ocenia działki na podstawie wskaźników wegetacji. Co oznacza żółty i czerwony kolor, skąd biorą się zdjęcia geotagowane i jak sprawdzić pole wcześniej.",
  lead:
    "Krótka odpowiedź: pierwszą kontrolą nie jest już inspektor, tylko satelita. ARiMR prowadzi monitoring obszarowy (AMS) dla wniosków o płatności bezpośrednie, opierając się na zdjęciach wykonywanych co kilka dni i na wskaźnikach wegetacji. Wyniki widać po zalogowaniu do eWniosekPlus, w panelu „Wyniki monitoringu satelitarnego”, z oznaczeniem działek na mapie.",
  minutes: 5,
  datePublished: "2026-10-26",
  dateModified: "2026-10-26",
  sections: [
    {
      heading: "Co system faktycznie obserwuje?",
      paragraphs: [
        "Nie dokumenty, tylko powierzchnię. Zdjęcia satelitarne wykonywane co kilka dni pozwalają śledzić uprawę, zbiór, koszenie trawy i ugorowanie — czyli zdarzenia, które zmieniają wygląd pola z góry. Analizy budowane są na wskaźnikach wegetacji, które pomagają potwierdzić pokrycie terenu, a czasem także fazę rozwojową rośliny.",
        "Dlatego pojedyncze zdjęcie nie wystarcza i system go nie używa. Liczy się przebieg: goła gleba, wschody, zwarcie łanu, dojrzewanie, zbiór. Ten kształt odróżnia trwały użytek zielony od gruntu ornego, a łąkę skoszoną od porzuconej — i właśnie on jest porównywany z tym, co zadeklarowałeś.",
      ],
    },
    {
      heading: "Żółty i czerwony — co wtedy?",
      paragraphs: [
        "Działka oznaczona na żółto lub czerwono jest traktowana jako potencjalna nieprawidłowość. To nie jest jeszcze decyzja ani kara — to pytanie. Odpowiedzią, o którą prosi Agencja, jest zwykle przesłanie od 2 do 5 zdjęć geotagowanych, czyli fotografii z zapisaną pozycją GPS, wykonanych na tej konkretnej działce.",
        "W kampanii 2026 rolnicy mieli czas do 15 września, aby potwierdzić stan faktyczny albo zmienić deklarację. Termin już minął, ale mechanizm zostaje i powtórzy się w kolejnym roku — a przygotowanie do niego zajmuje jedno popołudnie, nie tydzień.",
      ],
      bullets: [
        "Zielony — zgodność potwierdzona, nic nie robisz",
        "Żółty / czerwony — potencjalna niezgodność, potrzebna reakcja",
        "Reakcja: 2–5 zdjęć geotagowanych albo korekta deklaracji",
        "Wyniki: eWniosekPlus → „Wyniki monitoringu satelitarnego”",
      ],
    },
    {
      heading: "Dlaczego to w sumie dobra wiadomość?",
      paragraphs: [
        "Bo monitoring zastąpił losowanie. Wcześniej kontrola oznaczała wizytę u wybranej części gospodarstw; teraz obserwowane są wszystkie działki, tym samym sposobem, bez przyjazdu i bez terminu do uzgodnienia. Przy zgodnym wyniku nie dzieje się nic — człowiek wkracza tylko tam, gdzie obraz nie zgadza się z deklaracją.",
        "Jest jeden warunek i jest po Twojej stronie: granica działki musi być prawidłowa. Piksele pobierane są z jej wnętrza. Jeśli obrys zachodzi na sąsiada, na drogę albo na zabudowę, pomiar przesuwa się razem z nim — i zadziała przeciwko Tobie, choć uprawa była w porządku.",
      ],
    },
    {
      heading: "Jak sprawdzić pole, zanim zrobi to Agencja?",
      paragraphs: [
        "Źródło jest otwarte. Zdjęcia Copernicus Sentinel-2 są bezpłatne, a wskaźniki wegetacji liczone są tą samą arytmetyką niezależnie od tego, kto je liczy. Nic nie stoi na przeszkodzie, żebyś zobaczył swoją działkę dokładnie tak, jak widzi ją system — tylko wcześniej.",
        "Agradex robi tę część za Ciebie: rysujesz granicę raz, a aplikacja pobiera historię Sentinel-2 dla tej działki i rysuje przebieg wskaźnika przez cały sezon. Nie wylicza dopłat i nie ocenia kwalifikowalności — to należy do Agencji. Pokazuje fizyczny zapis, na którym opiera się monitoring.",
      ],
    },
    {
      heading: "Czego satelita nie powie?",
      paragraphs: [
        "Nie nazwie choroby, nie zajrzy pod łan i nie odczyta umowy. Piksel 10 × 10 metrów to 100 m² — ognisko porażenia, pojedyncze drzewo czy wąska ścieżka przejazdowa nie mają własnego piksela. Wskaźnik mierzy odbite światło, a nie przyczynę: mówi, gdzie iść, nie co tam zastaniesz.",
        "Ta granica działa w obie strony. Ogranicza to, co monitoring może Ci zarzucić, i ogranicza to, czego możesz od mapy oczekiwać.",
      ],
    },
    {
      heading: "W skrócie",
      paragraphs: [
        "Monitoring satelitarny jest tańszy, równy dla wszystkich i mniej uciążliwy niż kontrole, które zastąpił — i działa na danych, które możesz odczytać sam. Przygotowanie jest nudne i całkowicie w Twoich rękach: popraw granice i wiedz, jak Twój sezon wygląda z góry, zanim ktoś o to zapyta.",
      ],
    },
  ],
  related: ["what-is-ndvi", "satellite-pass-frequency", "free-ndvi-map"],
};
