// Polish terms of use — a translation of terms.az.ts. The "ai-limits" section quotes the pl
// DISCLAIMERS string from services/app/ai/advice.py verbatim.
import type { TermsDoc } from "./types";

export const termsPl: TermsDoc = {
  title: "Warunki korzystania",
  lead:
    "Ta strona wyjaśnia, co Agradex obiecuje i — co ważniejsze — czego nie obiecuje. To nie jest " +
    "szablon prawny: wszystko, co tu napisano, odpowiada dzisiejszemu stanowi produktu.",
  summary: [
    "Agradex to narzędzie wspierające decyzje; nie zastępuje agronoma, laboratorium ani wyjścia w pole.",
    "Porada SI to analiza automatyczna i może być błędna — ostateczna decyzja należy do Ciebie.",
    "Obecnie nie jest podłączony żaden system płatności: nie zbieramy danych kart i nic nie jest pobierane bez uprzedzenia.",
    "Dane Twojego gospodarstwa należą do Ciebie; nie sprzedajemy ich.",
    "Usługa działa na jednym serwerze, bez SLA i gwarantowanej dostępności.",
  ],
  sections: {
    service: {
      heading: "Czym jest usługa",
      body: [
        {
          kind: "p",
          text:
            "Agradex to platforma monitorowania upraw i zarządzania gospodarstwem zbudowana na " +
            "zdjęciach satelitarnych (Sentinel-2 oraz zharmonizowany produkt Landsat–Sentinel), " +
            "prognozach pogody, modelach agronomicznych i sztucznej inteligencji. Usługa obejmuje " +
            "stronę internetową, aplikację i instalowalną aplikację webową (PWA).",
        },
        {
          kind: "p",
          text:
            "Za platformą nie zgłoszono jeszcze zarejestrowanego podmiotu prawnego, dlatego " +
            "dokument nie wskazuje nazwy firmy, numeru rejestrowego ani prawa właściwego. Piszemy " +
            "o tym otwarcie, żeby nie powstało błędne wyobrażenie o tym, czym ten dokument jest. " +
            "Kontakt: info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Korzystając z usługi, akceptujesz te warunki. Jeśli się z nimi nie zgadzasz, nie " +
            "zakładaj konta albo zamknij istniejące.",
        },
      ],
    },
    account: {
      heading: "Konto",
      body: [
        {
          kind: "ul",
          items: [
            "Jeden adres e-mail odpowiada jednemu kontu; e-mail jest jednocześnie Twoim identyfikatorem logowania.",
            "Po rejestracji adres jest potwierdzany 6-cyfrowym kodem.",
            "Ochrona danych logowania należy do Ciebie; działania wykonane z Twojego konta uznaje się za Twoje.",
            "Musisz podawać prawdziwe dane — zwłaszcza granicę pola i uprawę, bo na nich opiera się cała analiza.",
            "Uprawnienia wewnątrz organizacji przydziela rola; właściciel organizacji może dodawać i usuwać członków.",
            "Konto możesz zamknąć w dowolnej chwili. Co się wtedy dzieje, opisano krok po kroku w Polityce prywatności.",
          ],
        },
      ],
    },
    "ai-limits": {
      heading: "Ograniczenia sztucznej inteligencji",
      body: [
        {
          kind: "p",
          text:
            "Pod każdą poradą SI drukowane jest dokładnie to zdanie: „Ta porada to automatyczna " +
            "analiza oparta na danych satelitarnych i polowych; przed decyzją sprawdź w terenie.” " +
            "To nie formalność, tylko dosłownie granica usługi.",
        },
        {
          kind: "ul",
          items: [
            "SI może się mylić: pole pod chmurami może odczytać błędnie, a jeśli karta pola jest niepełna, wynik też będzie niepełny.",
            "Diagnoza ze zdjęcia nigdy nie podaje konkretnej marki ani dawki środka ochrony roślin — kieruje do listy zarejestrowanych preparatów i do agronoma.",
            "Porada nie jest poradą weterynaryjną, fitosanitarną, prawną ani finansową.",
            "Wskaźniki satelitarne i modele nie zastępują analizy laboratoryjnej, próbki gleby ani wyjścia w pole.",
            "Przed zastosowaniem jakiegokolwiek środka chemicznego zawsze czytaj etykietę i przepisy lokalne.",
          ],
        },
      ],
    },
    "acceptable-use": {
      heading: "Dopuszczalne korzystanie",
      body: [
        { kind: "p", text: "Nie wolno:" },
        {
          kind: "ul",
          items: [
            "Wysyłać zautomatyzowanych zapytań masowych, zgarniać treści (scraping) ani próbować unieruchomić usługi sztucznym obciążeniem.",
            "Wchodzić bez zgody na cudze konto, próbować omijać mechanizmy bezpieczeństwa, umieszczać złośliwego kodu.",
            "Wgrywać danych, które nie należą do Ciebie i których nie masz prawa udostępniać (na przykład dokumentów polowych innego gospodarstwa).",
            "Publikować treści niezgodnych z prawem, sfałszowanych lub naruszających cudze prawa.",
            "Odsprzedawać usługi ani odpowiedzi SI osobom trzecim bez zgody.",
            "Stosować inżynierii wstecznej wobec kodu lub modeli platformy.",
          ],
        },
        {
          kind: "p",
          text:
            "Naruszenie tych zasad może prowadzić do zawieszenia konta. W takim wypadku " +
            "postaramy się wyjaśnić powód.",
        },
      ],
    },
    packages: {
      heading: "Pakiety i płatności",
      body: [
        {
          kind: "kv",
          rows: [
            {
              k: "Bezpłatny",
              v: "1 pole · 1 porada SI miesięcznie · brak czatu · wskaźniki satelitarne i pogoda w cenie.",
            },
            {
              k: "Pro — 10 AZN miesięcznie",
              v: "5 pól · 8 porad SI miesięcznie · 50 wiadomości czatu miesięcznie · karta pola, nawadnianie i okno zabiegowe.",
            },
            {
              k: "Business — 25 AZN miesięcznie",
              v: "Praktycznie bez limitu pól · 30 porad miesięcznie · 300 wiadomości czatu · 30 diagnoz ze zdjęć · benchmarki i raporty.",
            },
          ],
        },
        {
          kind: "p",
          text:
            "Nowo utworzona organizacja startuje z miesięcznym okresem próbnym Pro i po jego " +
            "zakończeniu sama wraca do pakietu bezpłatnego — nie ma automatycznych płatności.",
        },
        {
          kind: "p",
          text:
            "Najważniejsza uwaga: płatności nie są jeszcze podłączone. W kodzie nie ma żadnego " +
            "dostawcy płatności, nie zbieramy danych kart ani bankowych, a pakiety są obecnie " +
            "przyznawane ręcznie. Gdy plany płatne ruszą, ogłosimy to wcześniej; nikomu nic nie " +
            "zostanie pobrane bez uprzedzenia.",
        },
        { kind: "p", text: "Ceny podano w AZN." },
      ],
    },
    quotas: {
      heading: "Limity",
      body: [
        {
          kind: "p",
          text:
            "Porada SI, czat i diagnoza ze zdjęcia mają miesięczne limity zależne od pakietu. Po " +
            "wyczerpaniu limitu żądanie zostaje odrzucone wraz z podaniem powodu; limit zeruje " +
            "się w kolejnym miesiącu.",
        },
        {
          kind: "p",
          text:
            "Limity mają pokryć rzeczywisty koszt SI. Zastrzegamy sobie prawo do ograniczenia " +
            "korzystania, które nietypowo obciąża system.",
        },
        {
          kind: "p",
          text:
            "Szybkość przetwarzania danych satelitarnych zależy od czynników poza naszą " +
            "kontrolą: częstotliwości przelotu satelity nad Twoim polem i zachmurzenia.",
        },
      ],
    },
    ownership: {
      heading: "Do kogo należą dane",
      body: [
        {
          kind: "p",
          text:
            "Granice pól, dane z karty, notatki, zdjęcia, wpisy księgi — wszystko jest Twoje. " +
            "Udzielasz nam prawa do ich przetwarzania w celu świadczenia usługi (przechowywanie, " +
            "przetwarzanie, analiza, pokazywanie Tobie); nic ponad to.",
        },
        {
          kind: "ul",
          items: [
            "Nie sprzedajemy Twoich danych i nie przekazujemy ich w celach reklamowych.",
            "Wartości zagregowane (porównania, benchmarki) liczone są wyłącznie na grupach co najmniej 5 pól i nie wskazują konkretnego pola.",
            "Kod, projekt graficzny, modele wskaźników i treści platformy należą do nas.",
            "Odpowiadasz za to, by wgrywane treści były Twoje albo byś miał prawo je wgrać.",
          ],
        },
      ],
    },
    availability: {
      heading: "Dostępność",
      body: [
        {
          kind: "p",
          text:
            "Usługa działa na jednym serwerze i jest świadczona w miarę możliwości. Nie ma " +
            "gwarantowanej dostępności (brak SLA); możliwe są przerwy planowane i nieplanowane.",
        },
        {
          kind: "p",
          text:
            "Dane satelitarne nie są ciągłe: z powodu zachmurzenia i harmonogramu przelotów " +
            "przez kilka dni może nie być nowego zdjęcia. To nie awaria, tylko natura orbity.",
        },
        {
          kind: "p",
          text:
            "Możemy dodawać, zmieniać i usuwać funkcje. Jeśli usuniemy coś ważnego dla Ciebie, " +
            "postaramy się uprzedzić.",
        },
      ],
    },
    liability: {
      heading: "Odpowiedzialność",
      body: [
        {
          kind: "p",
          text:
            "Decyzje agronomiczne są Twoje. Nawadnianie, nawożenie, opryskiwanie, zbiór — każdą " +
            "z nich podejmuje osoba znająca pole, a Agradex nie odpowiada za jej skutek.",
        },
        {
          kind: "p",
          text:
            "W szczególności: jeśli w wyniku prac wykonanych (lub niewykonanych) na podstawie " +
            "porady platformy powstanie strata w plonie, spadek plonowania, wzrost kosztów albo " +
            "inna szkoda, nie bierzemy za to odpowiedzialności.",
        },
        {
          kind: "p",
          text:
            "Usługa jest świadczona „taka, jaka jest”; nie gwarantujemy kompletności ani " +
            "dokładności danych.",
        },
        {
          kind: "p",
          text:
            "Ta sekcja nie ogranicza praw przyznanych Ci bezwzględnie obowiązującymi przepisami " +
            "prawa miejscowego.",
        },
      ],
    },
    changes: {
      heading: "Zmiana warunków",
      body: [
        {
          kind: "p",
          text:
            "Wraz z rozwojem produktu będą zmieniać się te warunki. Data na górze strony " +
            "wskazuje ostatnią edycję.",
        },
        {
          kind: "p",
          text:
            "O istotnych zmianach — na przykład o uruchomieniu płatności — poinformujemy " +
            "wcześniej powiadomieniem w aplikacji lub e-mailem. Dalsze korzystanie z usługi po " +
            "zmianie oznacza akceptację nowych warunków.",
        },
      ],
    },
    contact: {
      heading: "Kontakt",
      body: [
        {
          kind: "p",
          text:
            "Pytania, skargi, prośba o kopię danych lub o ich usunięcie — wszystko na jeden " +
            "adres: info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Formalne dane podmiotu prawnego (nazwa firmy, rejestracja, adres, prawo właściwe) " +
            "jeszcze nie istnieją; ta sekcja zostanie zaktualizowana, gdy się pojawią.",
        },
      ],
    },
  },
};
