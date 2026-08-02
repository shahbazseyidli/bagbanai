# Auto-generated email translations (ru/tr/de/hu/it/pl). Source: email i18n workflow.
# az/en live in catalog.py; these merge into COPY there. Do not hand-edit — regenerate.
#
# SIMPLE_EXTRA holds ONE template id, data_ready, and it can never hold more than catalog.py's
# `_SIMPLE_AZ` does — the merge loop iterates that dict. Eleven other ids (no_field_d1/d3/d7,
# no_crop, inactive_10d/30d, trial_ending, edu_ndvi, edu_ledger, edu_invite, digest_weekly) were
# carried here long after E15 folded them into the weekly digest; they were removed on 2026-08-02
# because several still described the farm ledger, productivity zones and VRA in five languages,
# and unreachable copy is exactly what a future edit revives by accident.

WELCOME_EXTRA = {
  "tr": {
    "farmer": {
      "subject": "Agradex'e hoş geldiniz 🌱",
      "preheader": "Tarlanızı uzaydan izleyin — 2 adımda başlayın.",
      "heading": "Hoş geldiniz, {name}! 🌱",
      "intro": [
        "Ben Agradex ekibinden Ülker'im. Agradex sizin <b>uydu ve yapay zeka yardımcınızdır</b> — her tarlayı uzaydan görün, stresi erken yakalayın ve bir sonraki adımı AI agronomdan alın.",
        "İki adımda başlayalım:"
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>İlk tarlanızı ekleyin</b> — haritada sınırı 2 dakikada çizin."
        },
        {
          "n": 2,
          "text": "<b>Ürünü seçin</b> — ürüne uygun sağlık eşikleri ve öneriler açılsın."
        }
      ],
      "cta": {
        "label": "Tarlamı ekleyeyim →",
        "url": "{add_field_url}"
      },
      "outro": [
        "Sorunuz mu var? Bu e-postaya yanıt yazın — her birini okuyorum."
      ],
      "signoff": "İrem Çelik — Agradex"
    },
    "consultant": {
      "subject": "Agradex — agronom çalışma alanınız hazır",
      "preheader": "Tüm müşteri tarlalarını tek haritadan yönetin.",
      "heading": "Tüm müşteri tarlalarını tek haritadan yönetin",
      "intro": [
        "Hoş geldiniz, {name}. Agronom olarak <b>çok tarlalı çalışma alanına</b> sahip olursunuz: NDVI · NDMI · NDRE trendleri, mevsimlik referans çizgileri ve danışmanlık verdiğiniz tüm çiftlikler için AI analizi."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Tarlaları ekleyin veya içe aktarın</b> (shapefile .zip desteklenir)."
        },
        {
          "n": 2,
          "text": "<b>Müşterileri davet edin</b> — her biri kendi kuruluşunda, kontrol sizde kalır."
        }
      ],
      "cta": {
        "label": "Çalışma alanını aç →",
        "url": "{app_url}"
      },
      "outro": [
        "Sorunuz olursa, doğrudan bu e-postaya yanıt yazın."
      ],
      "signoff": "İrem Çelik — Agradex"
    },
    "lab": {
      "subject": "Agradex — laboratuvar profiliniz hazır",
      "preheader": "Toprak analizi siparişlerini Agradex'te kabul edin.",
      "heading": "Çiftçilerden analiz siparişleri kabul edin",
      "intro": [
        "Hoş geldiniz, {name}. Agradex laboratuvarınızı çiftçilerle buluşturur — <b>toprak ve yaprak analizi siparişlerini</b> doğrudan platformda kabul edin."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Lab profilinizi tamamlayın</b> — hizmetler, fiyatlar, hizmet bölgesi."
        },
        {
          "n": 2,
          "text": "<b>Siparişleri kabul edin</b> — sonuçları doğrudan çiftçiyle paylaşın."
        }
      ],
      "cta": {
        "label": "Profilimi tamamlayayım →",
        "url": "{app_url}"
      },
      "outro": [
        "Yardım gerekirse, bu e-postaya yanıt yazın."
      ],
      "signoff": "İrem Çelik — Agradex"
    },
    "supplier": {
      "subject": "Agradex — tedarikçi hesabınız hazır",
      "preheader": "Çiftçilere ulaşın, ürünlerinizi yayınlayın.",
      "heading": "Çiftçilere ulaşın, ürünlerinizi yayınlayın",
      "intro": [
        "Hoş geldiniz, {name}. Agradex sizi bölgenizdeki çiftçilerle buluşturur — <b>gübre, tohum ve hizmetlerinizi</b> katalogda yayınlayın, talepler alın."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Kataloğunuzu yayınlayın</b> — ürünler, fiyatlar, bölge."
        },
        {
          "n": 2,
          "text": "<b>Talepleri kabul edin</b> — ilgilenen çiftçilerle doğrudan iletişim."
        }
      ],
      "cta": {
        "label": "Kataloğumu aç →",
        "url": "{app_url}"
      },
      "outro": [
        "Sorunuz olursa, bu e-postaya yanıt yazın."
      ],
      "signoff": "İrem Çelik — Agradex"
    }
  },
  "it": {
    "farmer": {
      "subject": "Benvenuto su Agradex 🌱",
      "preheader": "Monitora il tuo campo dallo spazio — inizia in 2 passi.",
      "heading": "Benvenuto, {name}! 🌱",
      "intro": [
        "Sono Ülkər, del team Agradex. Agradex è il tuo <b>assistente satellitare e di intelligenza artificiale</b> — osserva ogni campo dallo spazio, individua lo stress in anticipo e chiedi all'agronomo AI la prossima mossa.",
        "Iniziamo in due passi:"
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Aggiungi il tuo primo campo</b> — traccia il confine sulla mappa in 2 minuti."
        },
        {
          "n": 2,
          "text": "<b>Scegli la coltura</b> — sblocca soglie di salute e consigli su misura per la coltura."
        }
      ],
      "cta": {
        "label": "Aggiungi il mio campo →",
        "url": "{add_field_url}"
      },
      "outro": [
        "Hai domande? Rispondi a questa email — leggo ogni messaggio."
      ],
      "signoff": "Chiara Moretti — Agradex"
    },
    "consultant": {
      "subject": "Agradex — il tuo spazio di lavoro da agronomo è pronto",
      "preheader": "Gestisci tutti i campi dei clienti da un'unica mappa.",
      "heading": "Gestisci tutti i campi dei clienti da un'unica mappa",
      "intro": [
        "Benvenuto, {name}. Come agronomo ricevi uno <b>spazio di lavoro multi-campo</b>: trend NDVI · NDMI · NDRE, linee di base stagionali e l'analisi AI per tutte le aziende che segui."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Aggiungi o importa i campi</b> (supportato lo shapefile .zip)."
        },
        {
          "n": 2,
          "text": "<b>Invita i clienti</b> — ognuno nella propria organizzazione, il controllo resta a te."
        }
      ],
      "cta": {
        "label": "Apri lo spazio di lavoro →",
        "url": "{app_url}"
      },
      "outro": [
        "Se hai domande, rispondi direttamente a questa email."
      ],
      "signoff": "Chiara Moretti — Agradex"
    },
    "lab": {
      "subject": "Agradex — il tuo profilo di laboratorio è pronto",
      "preheader": "Ricevi ordini di analisi del suolo su Agradex.",
      "heading": "Ricevi ordini di analisi dagli agricoltori",
      "intro": [
        "Benvenuto, {name}. Agradex collega il tuo laboratorio agli agricoltori — ricevi <b>ordini di analisi del suolo e fogliari</b> direttamente sulla piattaforma."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Completa il profilo del laboratorio</b> — servizi, prezzi, area di copertura."
        },
        {
          "n": 2,
          "text": "<b>Accetta gli ordini</b> — condividi i risultati direttamente con l'agricoltore."
        }
      ],
      "cta": {
        "label": "Completa il mio profilo →",
        "url": "{app_url}"
      },
      "outro": [
        "Se ti serve aiuto, rispondi a questa email."
      ],
      "signoff": "Chiara Moretti — Agradex"
    },
    "supplier": {
      "subject": "Agradex — il tuo account fornitore è pronto",
      "preheader": "Raggiungi gli agricoltori, pubblica i tuoi prodotti.",
      "heading": "Raggiungi gli agricoltori, pubblica i tuoi prodotti",
      "intro": [
        "Benvenuto, {name}. Agradex ti collega agli agricoltori della tua zona — pubblica nel catalogo i tuoi <b>fertilizzanti, sementi e servizi</b> e ricevi richieste."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Pubblica il tuo catalogo</b> — prodotti, prezzi, zona."
        },
        {
          "n": 2,
          "text": "<b>Ricevi le richieste</b> — contatto diretto con gli agricoltori interessati."
        }
      ],
      "cta": {
        "label": "Apri il mio catalogo →",
        "url": "{app_url}"
      },
      "outro": [
        "Se hai domande, rispondi a questa email."
      ],
      "signoff": "Chiara Moretti — Agradex"
    }
  },
  "de": {
    "farmer": {
      "subject": "Willkommen bei Agradex 🌱",
      "preheader": "Beobachten Sie Ihr Feld aus dem All — in 2 Schritten loslegen.",
      "heading": "Willkommen, {name}! 🌱",
      "intro": [
        "Ich bin Ülkər vom Agradex-Team. Agradex ist Ihr <b>Satelliten- und KI-Assistent</b> — sehen Sie jedes Feld aus dem All, erkennen Sie Stress früh und holen Sie sich den nächsten Schritt vom KI-Agronomen.",
        "Starten wir in zwei Schritten:"
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Fügen Sie Ihr erstes Feld hinzu</b> — zeichnen Sie die Grenze in 2 Minuten auf der Karte."
        },
        {
          "n": 2,
          "text": "<b>Wählen Sie die Kultur</b> — kulturspezifische Gesundheitsschwellen und Empfehlungen werden freigeschaltet."
        }
      ],
      "cta": {
        "label": "Feld hinzufügen →",
        "url": "{add_field_url}"
      },
      "outro": [
        "Haben Sie Fragen? Antworten Sie einfach auf diese E-Mail — ich lese jede einzelne."
      ],
      "signoff": "Johanna Brandt — Agradex"
    },
    "consultant": {
      "subject": "Agradex — Ihr Agronomen-Arbeitsbereich ist bereit",
      "preheader": "Verwalten Sie alle Kundenfelder von einer Karte aus.",
      "heading": "Verwalten Sie alle Kundenfelder von einer Karte aus",
      "intro": [
        "Willkommen, {name}. Als Agronom erhalten Sie einen <b>Mehrfeld-Arbeitsbereich</b>: NDVI · NDMI · NDRE-Trends, saisonale Basislinien und die KI-Analyse für alle Betriebe, die Sie beraten."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Fügen Sie Felder hinzu oder importieren Sie sie</b> (Shapefile .zip wird unterstützt)."
        },
        {
          "n": 2,
          "text": "<b>Laden Sie Kunden ein</b> — jeder in seiner eigenen Organisation, die Kontrolle bleibt bei Ihnen."
        }
      ],
      "cta": {
        "label": "Arbeitsbereich öffnen →",
        "url": "{app_url}"
      },
      "outro": [
        "Bei Fragen antworten Sie einfach direkt auf diese E-Mail."
      ],
      "signoff": "Johanna Brandt — Agradex"
    },
    "lab": {
      "subject": "Agradex — Ihr Laborprofil ist bereit",
      "preheader": "Nehmen Sie Bodenanalyse-Aufträge über Agradex an.",
      "heading": "Nehmen Sie Analyseaufträge von Landwirten an",
      "intro": [
        "Willkommen, {name}. Agradex verbindet Ihr Labor mit Landwirten — nehmen Sie <b>Boden- und Blattanalyse-Aufträge</b> direkt auf der Plattform an."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Vervollständigen Sie Ihr Laborprofil</b> — Leistungen, Preise, Einzugsgebiet."
        },
        {
          "n": 2,
          "text": "<b>Nehmen Sie Aufträge an</b> — teilen Sie die Ergebnisse direkt mit dem Landwirt."
        }
      ],
      "cta": {
        "label": "Profil vervollständigen →",
        "url": "{app_url}"
      },
      "outro": [
        "Wenn Sie Hilfe brauchen, antworten Sie auf diese E-Mail."
      ],
      "signoff": "Johanna Brandt — Agradex"
    },
    "supplier": {
      "subject": "Agradex — Ihr Lieferantenkonto ist bereit",
      "preheader": "Erreichen Sie Landwirte, präsentieren Sie Ihre Produkte.",
      "heading": "Erreichen Sie Landwirte, präsentieren Sie Ihre Produkte",
      "intro": [
        "Willkommen, {name}. Agradex verbindet Sie mit Landwirten in Ihrer Region — präsentieren Sie <b>Dünger, Saatgut und Ihre Dienstleistungen</b> im Katalog und erhalten Sie Anfragen."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Stellen Sie Ihren Katalog ein</b> — Produkte, Preise, Region."
        },
        {
          "n": 2,
          "text": "<b>Nehmen Sie Anfragen an</b> — direkter Kontakt mit interessierten Landwirten."
        }
      ],
      "cta": {
        "label": "Katalog öffnen →",
        "url": "{app_url}"
      },
      "outro": [
        "Bei Fragen antworten Sie auf diese E-Mail."
      ],
      "signoff": "Johanna Brandt — Agradex"
    }
  },
  "pl": {
    "farmer": {
      "subject": "Witamy w Agradex 🌱",
      "preheader": "Obserwuj swoje pole z kosmosu — zacznij w 2 krokach.",
      "heading": "Witaj, {name}! 🌱",
      "intro": [
        "Jestem Ülkər z zespołu Agradex. Agradex to Twój <b>asystent satelitarny i oparty na sztucznej inteligencji</b> — zobacz każde pole z kosmosu, wychwyć stres wcześnie i poproś agronoma AI o kolejny krok.",
        "Zacznijmy w dwóch krokach:"
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Dodaj swoje pierwsze pole</b> — narysuj granicę na mapie w 2 minuty."
        },
        {
          "n": 2,
          "text": "<b>Wybierz uprawę</b> — odblokuj progi zdrowia i porady dopasowane do uprawy."
        }
      ],
      "cta": {
        "label": "Dodaj moje pole →",
        "url": "{add_field_url}"
      },
      "outro": [
        "Masz pytania? Odpisz na tę wiadomość — czytam każdą."
      ],
      "signoff": "Emilia Wójcik — Agradex"
    },
    "consultant": {
      "subject": "Agradex — Twoja przestrzeń robocza agronoma jest gotowa",
      "preheader": "Zarządzaj wszystkimi polami klientów z jednej mapy.",
      "heading": "Zarządzaj wszystkimi polami klientów z jednej mapy",
      "intro": [
        "Witaj, {name}. Jako agronom otrzymujesz <b>przestrzeń roboczą dla wielu pól</b>: trendy NDVI · NDMI · NDRE, sezonowe linie bazowe oraz analizę AI dla wszystkich gospodarstw, którym doradzasz."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Dodaj lub zaimportuj pola</b> (obsługiwany jest shapefile .zip)."
        },
        {
          "n": 2,
          "text": "<b>Zaproś klientów</b> — każdy w swojej organizacji, kontrola zostaje po Twojej stronie."
        }
      ],
      "cta": {
        "label": "Otwórz przestrzeń roboczą →",
        "url": "{app_url}"
      },
      "outro": [
        "Jeśli masz pytania, odpisz bezpośrednio na tę wiadomość."
      ],
      "signoff": "Emilia Wójcik — Agradex"
    },
    "lab": {
      "subject": "Agradex — Twój profil laboratorium jest gotowy",
      "preheader": "Przyjmuj zamówienia na analizy gleby w Agradex.",
      "heading": "Przyjmuj zamówienia na analizy od rolników",
      "intro": [
        "Witaj, {name}. Agradex łączy Twoje laboratorium z rolnikami — przyjmuj <b>zamówienia na analizy gleby i liści</b> bezpośrednio na platformie."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Uzupełnij profil laboratorium</b> — usługi, ceny, obszar działania."
        },
        {
          "n": 2,
          "text": "<b>Przyjmuj zamówienia</b> — udostępniaj wyniki bezpośrednio rolnikowi."
        }
      ],
      "cta": {
        "label": "Uzupełnij mój profil →",
        "url": "{app_url}"
      },
      "outro": [
        "Jeśli potrzebujesz pomocy, odpisz na tę wiadomość."
      ],
      "signoff": "Emilia Wójcik — Agradex"
    },
    "supplier": {
      "subject": "Agradex — Twoje konto dostawcy jest gotowe",
      "preheader": "Dotrzyj do rolników, wystaw swoje produkty.",
      "heading": "Dotrzyj do rolników, wystaw swoje produkty",
      "intro": [
        "Witaj, {name}. Agradex łączy Cię z rolnikami w Twoim regionie — wystaw <b>nawozy, nasiona i usługi</b> w katalogu i otrzymuj zapytania."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Wystaw swój katalog</b> — produkty, ceny, region."
        },
        {
          "n": 2,
          "text": "<b>Przyjmuj zapytania</b> — bezpośredni kontakt z zainteresowanymi rolnikami."
        }
      ],
      "cta": {
        "label": "Otwórz mój katalog →",
        "url": "{app_url}"
      },
      "outro": [
        "Jeśli masz pytania, odpisz na tę wiadomość."
      ],
      "signoff": "Emilia Wójcik — Agradex"
    }
  },
  "hu": {
    "farmer": {
      "subject": "Üdvözöljük az Agradexben 🌱",
      "preheader": "Kövesse a tábláját az űrből — kezdje 2 lépésben.",
      "heading": "Üdvözöljük, {name}! 🌱",
      "intro": [
        "Ülkər vagyok az Agradex csapatából. Az Agradex az Ön <b>műholdas és mesterséges intelligencia asszisztense</b> — lássa minden tábláját az űrből, észlelje időben a stresszt, és kérje a következő lépést az AI agronómustól.",
        "Kezdjük két lépésben:"
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Adja hozzá első tábláját</b> — rajzolja meg a határt a térképen 2 perc alatt."
        },
        {
          "n": 2,
          "text": "<b>Válassza ki a növénykultúrát</b> — nyíljanak meg a kultúrához illő egészségi küszöbök és tanácsok."
        }
      ],
      "cta": {
        "label": "Hozzáadom a táblámat →",
        "url": "{add_field_url}"
      },
      "outro": [
        "Van kérdése? Válaszoljon erre a levélre — mindet elolvasom."
      ],
      "signoff": "Réka Tóth — Agradex"
    },
    "consultant": {
      "subject": "Agradex — az agronómus munkafelülete készen áll",
      "preheader": "Kezelje az összes ügyfél tábláját egyetlen térképről.",
      "heading": "Kezelje az összes ügyfél tábláját egyetlen térképről",
      "intro": [
        "Üdvözöljük, {name}. Agronómusként <b>több táblás munkafelületet</b> kap: NDVI · NDMI · NDRE trendek, szezonális alapvonalak és AI-elemzés minden gazdaságra, amelynek tanácsot ad."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Adjon hozzá vagy importáljon táblákat</b> (shapefile .zip támogatott)."
        },
        {
          "n": 2,
          "text": "<b>Hívja meg az ügyfeleket</b> — mindegyik a saját szervezetében, az ellenőrzés Önnél marad."
        }
      ],
      "cta": {
        "label": "Munkafelület megnyitása →",
        "url": "{app_url}"
      },
      "outro": [
        "Ha kérdése van, válaszoljon közvetlenül erre a levélre."
      ],
      "signoff": "Réka Tóth — Agradex"
    },
    "lab": {
      "subject": "Agradex — a laboratóriumi profilja készen áll",
      "preheader": "Fogadjon talajvizsgálati megrendeléseket az Agradexben.",
      "heading": "Fogadjon vizsgálati megrendeléseket a gazdálkodóktól",
      "intro": [
        "Üdvözöljük, {name}. Az Agradex összeköti laboratóriumát a gazdálkodókkal — fogadja a <b>talaj- és levélvizsgálati megrendeléseket</b> közvetlenül a platformon."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Töltse ki laboratóriumi profilját</b> — szolgáltatások, árak, lefedett régió."
        },
        {
          "n": 2,
          "text": "<b>Fogadja a megrendeléseket</b> — ossza meg az eredményeket közvetlenül a gazdálkodóval."
        }
      ],
      "cta": {
        "label": "Kitöltöm a profilom →",
        "url": "{app_url}"
      },
      "outro": [
        "Ha segítségre van szüksége, válaszoljon erre a levélre."
      ],
      "signoff": "Réka Tóth — Agradex"
    },
    "supplier": {
      "subject": "Agradex — a beszállítói fiókja készen áll",
      "preheader": "Érje el a gazdálkodókat, tegye közzé termékeit.",
      "heading": "Érje el a gazdálkodókat, tegye közzé termékeit",
      "intro": [
        "Üdvözöljük, {name}. Az Agradex összeköti Önt a régiójában lévő gazdálkodókkal — tegye közzé <b>műtrágyáit, vetőmagjait és szolgáltatásait</b> a katalógusban, és fogadjon megkereséseket."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Tegye közzé katalógusát</b> — termékek, árak, régió."
        },
        {
          "n": 2,
          "text": "<b>Fogadja a megkereséseket</b> — közvetlen kapcsolat az érdeklődő gazdálkodókkal."
        }
      ],
      "cta": {
        "label": "Katalógusom megnyitása →",
        "url": "{app_url}"
      },
      "outro": [
        "Ha kérdése van, válaszoljon erre a levélre."
      ],
      "signoff": "Réka Tóth — Agradex"
    }
  },
  "ru": {
    "farmer": {
      "subject": "Добро пожаловать в Agradex 🌱",
      "preheader": "Смотрите на свои поля из космоса — начните за 2 шага.",
      "heading": "Добро пожаловать, {name}! 🌱",
      "intro": [
        "Меня зовут Ülkər, я из команды Agradex. Agradex — ваш <b>помощник на базе спутников и AI</b>: видеть каждое поле из космоса, вовремя замечать стресс и получать следующий шаг от AI-агронома.",
        "Начнём за два шага:"
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Добавьте первое поле</b> — обведите границу на карте за 2 минуты."
        },
        {
          "n": 2,
          "text": "<b>Укажите культуру</b> — откроются пороги здоровья и рекомендации под вашу культуру."
        }
      ],
      "cta": {
        "label": "Добавить поле →",
        "url": "{add_field_url}"
      },
      "outro": [
        "Есть вопросы? Просто ответьте на это письмо — я читаю каждое."
      ],
      "signoff": "Марина Ковалева — Agradex"
    },
    "consultant": {
      "subject": "Agradex — ваше рабочее место агронома готово",
      "preheader": "Все поля клиентов на одной карте.",
      "heading": "Все поля клиентов на одной карте",
      "intro": [
        "Добро пожаловать, {name}. Как агроном вы получаете <b>рабочее место сразу для многих полей</b>: тренды NDVI · NDMI · NDRE, сезонные базовые линии и зоны для дифференцированного внесения по всем хозяйствам, которые вы консультируете."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Добавьте или импортируйте поля</b> (поддерживается shapefile .zip)."
        },
        {
          "n": 2,
          "text": "<b>Пригласите клиентов</b> — каждый в своей организации, контроль остаётся за вами."
        }
      ],
      "cta": {
        "label": "Открыть рабочее место →",
        "url": "{app_url}"
      },
      "outro": [
        "Есть вопросы? Ответьте прямо на это письмо."
      ],
      "signoff": "Марина Ковалева — Agradex"
    },
    "lab": {
      "subject": "Agradex — профиль лаборатории готов",
      "preheader": "Принимайте заказы на анализ почвы в Agradex.",
      "heading": "Принимайте заказы на анализы от фермеров",
      "intro": [
        "Добро пожаловать, {name}. Agradex связывает вашу лабораторию с фермерами — принимайте <b>заказы на анализ почвы и листьев</b> прямо на платформе."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Заполните профиль лаборатории</b> — услуги, цены, регион обслуживания."
        },
        {
          "n": 2,
          "text": "<b>Принимайте заказы</b> — результаты передавайте фермеру напрямую."
        }
      ],
      "cta": {
        "label": "Заполнить профиль →",
        "url": "{app_url}"
      },
      "outro": [
        "Нужна помощь? Просто ответьте на это письмо."
      ],
      "signoff": "Марина Ковалева — Agradex"
    },
    "supplier": {
      "subject": "Agradex — аккаунт поставщика готов",
      "preheader": "Дойдите до фермеров, разместите свои товары.",
      "heading": "Дойдите до фермеров, разместите свои товары",
      "intro": [
        "Добро пожаловать, {name}. Agradex связывает вас с фермерами вашего региона — разместите <b>удобрения, семена и услуги</b> в каталоге и получайте запросы."
      ],
      "steps": [
        {
          "n": 1,
          "text": "<b>Разместите каталог</b> — товары, цены, регион."
        },
        {
          "n": 2,
          "text": "<b>Принимайте запросы</b> — прямая связь с заинтересованными фермерами."
        }
      ],
      "cta": {
        "label": "Открыть мой каталог →",
        "url": "{app_url}"
      },
      "outro": [
        "Есть вопросы? Ответьте на это письмо."
      ],
      "signoff": "Марина Ковалева — Agradex"
    }
  }
}

SIMPLE_EXTRA = {
  "ru": {
    "data_ready": {
      "subject": "Спутниковая карта поля «{field}» готова 🛰️",
      "preheader": "Посмотрите первую карту NDVI и оценку состояния посевов.",
      "heading": "Ваше поле теперь видно из космоса 🛰️",
      "intro": [
        "Спутниковый анализ поля <b>«{field}»</b> ({area} га) готов. Посмотрите первую карту NDVI и оценку состояния посевов."
      ],
      "cta": {
        "label": "Открыть поле →",
        "url": "{field_url}"
      },
      "outro": [
        "Как только придёт следующий снимок со спутника, AI-агроном автоматически подготовит рекомендацию."
      ],
      "signoff": "Марина Ковалева — Agradex"
    }
  },
  "tr": {
    "data_ready": {
      "subject": "“{field}” tarlanızın uydu haritası hazır 🛰️",
      "preheader": "İlk NDVI haritasını ve sağlık puanını şimdi görün.",
      "heading": "Tarlanız artık uzaydan görünüyor 🛰️",
      "intro": [
        "<b>“{field}”</b> ({area} ha) için uydu analizi hazır. İlk NDVI haritasını ve bitki sağlığı puanını şimdi görün."
      ],
      "cta": {
        "label": "Tarlayı aç →",
        "url": "{field_url}"
      },
      "outro": [
        "Sonraki uydu görüntüsü geldiğinde AI agronom otomatik olarak öneri hazırlayacak."
      ],
      "signoff": "İrem Çelik — Agradex"
    }
  },
  "it": {
    "data_ready": {
      "subject": "La mappa satellitare del campo «{field}» è pronta 🛰️",
      "preheader": "Guarda subito la prima mappa NDVI e il punteggio di salute.",
      "heading": "Il tuo campo è ora visibile dallo spazio 🛰️",
      "intro": [
        "L'analisi satellitare per <b>«{field}»</b> ({area} ha) è pronta. Guarda subito la prima mappa NDVI e il punteggio di salute delle piante."
      ],
      "cta": {
        "label": "Apri il campo →",
        "url": "{field_url}"
      },
      "outro": [
        "Quando arriverà la prossima scena satellitare, l'agronomo AI preparerà automaticamente un consiglio."
      ],
      "signoff": "Chiara Moretti — Agradex"
    }
  },
  "de": {
    "data_ready": {
      "subject": "Die Satellitenkarte Ihres Feldes „{field}“ ist bereit 🛰️",
      "preheader": "Sehen Sie jetzt die erste NDVI-Karte und den Gesundheitswert.",
      "heading": "Ihr Feld ist jetzt aus dem All sichtbar 🛰️",
      "intro": [
        "Die Satellitenanalyse für <b>„{field}“</b> ({area} ha) ist bereit. Sehen Sie jetzt die erste NDVI-Karte und den Pflanzengesundheitswert."
      ],
      "cta": {
        "label": "Feld öffnen →",
        "url": "{field_url}"
      },
      "outro": [
        "Sobald die nächste Satellitenaufnahme eintrifft, erstellt der KI-Agronom automatisch eine Empfehlung."
      ],
      "signoff": "Johanna Brandt — Agradex"
    }
  },
  "pl": {
    "data_ready": {
      "subject": "Mapa satelitarna Twojego pola „{field}” jest gotowa 🛰️",
      "preheader": "Zobacz teraz pierwszą mapę NDVI i ocenę zdrowia.",
      "heading": "Twoje pole jest już widoczne z kosmosu 🛰️",
      "intro": [
        "Analiza satelitarna dla <b>„{field}”</b> ({area} ha) jest gotowa. Zobacz teraz pierwszą mapę NDVI i ocenę zdrowia roślin."
      ],
      "cta": {
        "label": "Otwórz pole →",
        "url": "{field_url}"
      },
      "outro": [
        "Gdy pojawi się kolejna scena satelitarna, agronom AI automatycznie przygotuje poradę."
      ],
      "signoff": "Emilia Wójcik — Agradex"
    }
  },
  "hu": {
    "data_ready": {
      "subject": "A(z) „{field}” tábla műholdas térképe készen áll 🛰️",
      "preheader": "Nézze meg most az első NDVI-térképet és az egészségi értéket.",
      "heading": "A tábláját már az űrből is látni 🛰️",
      "intro": [
        "A(z) <b>„{field}”</b> ({area} ha) műholdas elemzése készen áll. Nézze meg most az első NDVI-térképet és a növény egészségi értékét."
      ],
      "cta": {
        "label": "Tábla megnyitása →",
        "url": "{field_url}"
      },
      "outro": [
        "Amikor megérkezik a következő műholdas felvétel, az AI agronómus automatikusan tanácsot készít."
      ],
      "signoff": "Réka Tóth — Agradex"
    }
  }
}

# The variant-keyed weekly digest (E15) — the ONE recurring email. az/en are authored in catalog.py;
# every other locale used to fall through to English. RU is a launch-tier locale, so it gets a real
# translation of all four variants. Keyed locale → variant → content, merged into COPY["weekly"].
WEEKLY_EXTRA = {
  "tr": {
    "calm": {
      "subject": "Haftalık özet: {fields_label}, her şey yolunda",
      "preheader": "Sağlık puanı, NDVI eğilimi ve yapay zeka önerisi — tek bakışta.",
      "heading": "Bu hafta tarlalarınız",
      "intro": [
        "Merhaba{name_suffix}! Bu hafta tarlalarınızda acil bir durum olmadı — işte kısa özeti."
      ],
      "outro": [
        "Acil uyarılar uygulamaya anında düşer; e-posta haftada bir, çarşamba sabahı gelir.",
        "Sorunuz mu var? Bu e-postayı yanıtlayın — hepsini okuyorum."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "alerts": {
      "subject": "⚠️ {alerts_label} — haftalık özetiniz",
      "preheader": "En çok dikkat isteyen tarla: “{field}”.",
      "heading": "Bu hafta dikkat isteyenler",
      "intro": [
        "Merhaba{name_suffix}! Bu hafta tarlalarınızda <b>{alerts_label}</b> oluştu. En çok dikkat isteyen tarla: <b>“{field}”</b>.",
        "Hepsi aşağıda. Tarlaya çıkmadan önce bir dakikanızı ayırmaya değer."
      ],
      "outro": [
        "Acil uyarılar uygulamaya anında düşer; e-posta haftada bir, çarşamba sabahı gelir.",
        "Sorunuz mu var? Bu e-postayı yanıtlayın — hepsini okuyorum."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "no_crop": {
      "subject": "Tek bir adım kaldı: “{field}” için ürünü seçin",
      "preheader": "Ürün seçimi ürüne özel eşikleri devreye alır.",
      "heading": "Tek bir adım kaldı: ürünü seçin",
      "intro": [
        "Merhaba{name_suffix}! Tarlalarınız uzaydan görünüyor, ama ürün henüz seçilmedi. Seçtiğiniz anda Agradex <b>ürüne özel sağlık eşiklerini</b>, gübre normlarını ve daha isabetli önerileri uygulayabilir.",
        "Bir dakika sürer. Haftalık özet de aşağıda."
      ],
      "outro": [
        "Bu e-posta haftada bir, çarşamba sabahı gelir."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "no_fields": {
      "subject": "İlk tarlanızı 2 dakikada ekleyin",
      "preheader": "Uydunun tarlanızı görmesi için tek gereken bir sınır.",
      "heading": "Bir tarla her şeyi değiştirir",
      "intro": [
        "Merhaba{name_suffix}! Hesabınız hazır, ama henüz bir tarla eklemediniz. <b>Uydunun tarlanızı “görmesi” için tek gereken bir sınır.</b>",
        "Çizmek istemiyor musunuz? Haritada tarlaya <b>dokunun</b> — Agradex sınırı sizin için bulur."
      ],
      "outro": [
        "Bir engel olduysa tek satırla yanıtlayın, yardımcı olayım.",
        "Bir tarla eklediğiniz anda bu e-posta yerini haftalık tarla özetinize bırakır."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    }
  },
  "de": {
    "calm": {
      "subject": "Ihre Woche: {fields_label}, alles ruhig",
      "preheader": "Gesundheitswert, NDVI-Trend und KI-Rat — auf einen Blick.",
      "heading": "Diese Woche auf Ihren Feldern",
      "intro": [
        "Hallo{name_suffix}! Diese Woche ist auf Ihren Feldern nichts Dringendes passiert — hier die Kurzfassung."
      ],
      "outro": [
        "Dringende Warnungen erscheinen sofort in der App; die E-Mail kommt einmal pro Woche, Mittwochmorgen.",
        "Fragen? Antworten Sie einfach auf diese E-Mail — ich lese jede."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "alerts": {
      "subject": "⚠️ {alerts_label} — Ihre Wochenübersicht",
      "preheader": "Das Feld, das Sie am dringendsten braucht: „{field}“.",
      "heading": "Was diese Woche Ihre Aufmerksamkeit braucht",
      "intro": [
        "Hallo{name_suffix}! Diese Woche gab es auf Ihren Feldern <b>{alerts_label}</b>. Am dringendsten braucht Sie <b>„{field}“</b>.",
        "Alles steht unten. Ein Blick lohnt sich, bevor Sie rausfahren."
      ],
      "outro": [
        "Dringende Warnungen erscheinen sofort in der App; die E-Mail kommt einmal pro Woche, Mittwochmorgen.",
        "Fragen? Antworten Sie einfach auf diese E-Mail — ich lese jede."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "no_crop": {
      "subject": "Ein Schritt fehlt: Kultur für „{field}“ festlegen",
      "preheader": "Mit der Kultur greifen kulturspezifische Normen.",
      "heading": "Ein Schritt fehlt: Kultur festlegen",
      "intro": [
        "Hallo{name_suffix}! Ihre Felder sind aus dem All sichtbar, aber es ist noch keine Kultur eingetragen. Sobald Sie eine wählen, kann Agradex <b>kulturspezifische Schwellenwerte</b>, Düngernormen und genauere Empfehlungen anwenden.",
        "Das dauert eine Minute. Die Wochenübersicht steht ebenfalls unten."
      ],
      "outro": [
        "Diese E-Mail kommt einmal pro Woche, Mittwochmorgen."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "no_fields": {
      "subject": "Ihr erstes Feld in 2 Minuten",
      "preheader": "Der Satellit braucht nur eine Feldgrenze.",
      "heading": "Ein Feld macht den Unterschied",
      "intro": [
        "Hallo{name_suffix}! Ihr Konto ist bereit, aber es ist noch kein Feld angelegt. <b>Der Satellit braucht nur eine Grenze, um Ihr Feld zu „sehen“.</b>",
        "Sie möchten nicht zeichnen? <b>Tippen</b> Sie das Feld auf der Karte an — Agradex erkennt die Grenze für Sie."
      ],
      "outro": [
        "Wenn etwas im Weg war, antworten Sie mit einer Zeile — ich helfe.",
        "Sobald Sie ein Feld anlegen, wird aus dieser E-Mail Ihre wöchentliche Feldübersicht."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    }
  },
  "hu": {
    "calm": {
      "subject": "Heti összefoglaló: {fields_label}, minden rendben",
      "preheader": "Egészségpontszám, NDVI-trend és MI-tanács — egy pillantásra.",
      "heading": "Ez a hét a tábláin",
      "intro": [
        "Üdvözlöm{name_suffix}! Ezen a héten nem történt sürgős esemény a tábláin — itt a rövid összefoglaló."
      ],
      "outro": [
        "A sürgős riasztások azonnal megjelennek az alkalmazásban; az e-mail hetente egyszer, szerda reggel érkezik.",
        "Kérdése van? Válaszoljon erre az e-mailre — mindet elolvasom."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "alerts": {
      "subject": "⚠️ {alerts_label} — heti összefoglalója",
      "preheader": "A legtöbb figyelmet igénylő tábla: „{field}”.",
      "heading": "Mi igényel figyelmet ezen a héten",
      "intro": [
        "Üdvözlöm{name_suffix}! Ezen a héten a tábláin <b>{alerts_label}</b> keletkezett. A legtöbb figyelmet a <b>„{field}”</b> tábla igényli.",
        "Mind lent található. Érdemes rászánni egy percet, mielőtt kimegy a földre."
      ],
      "outro": [
        "A sürgős riasztások azonnal megjelennek az alkalmazásban; az e-mail hetente egyszer, szerda reggel érkezik.",
        "Kérdése van? Válaszoljon erre az e-mailre — mindet elolvasom."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "no_crop": {
      "subject": "Egy lépés maradt: adja meg a „{field}” tábla növényét",
      "preheader": "A növény kiválasztása bekapcsolja a növényspecifikus küszöböket.",
      "heading": "Egy lépés maradt: adja meg a növényt",
      "intro": [
        "Üdvözlöm{name_suffix}! A táblái már láthatók a műholdról, de a növény még nincs megadva. Amint kiválasztja, az Agradex <b>növényspecifikus egészségküszöböket</b>, tápanyagnormákat és pontosabb javaslatokat tud alkalmazni.",
        "Egy percbe telik. A heti összefoglaló szintén lent található."
      ],
      "outro": [
        "Ez az e-mail hetente egyszer, szerda reggel érkezik."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "no_fields": {
      "subject": "Adja hozzá első tábláját 2 perc alatt",
      "preheader": "A műholdnak csak egy határvonalra van szüksége.",
      "heading": "Egyetlen tábla mindent megváltoztat",
      "intro": [
        "Üdvözlöm{name_suffix}! A fiókja készen áll, de még nincs hozzáadva tábla. <b>A műholdnak csak egy határvonal kell, hogy „lássa” a tábláját.</b>",
        "Nem szeretne rajzolni? Egyszerűen <b>koppintson</b> a táblára a térképen — az Agradex megkeresi a határt."
      ],
      "outro": [
        "Ha valami közbejött, válaszoljon egy sorral — segítek.",
        "Amint hozzáad egy táblát, ebből az e-mailből a heti tábla-összefoglalója lesz."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    }
  },
  "it": {
    "calm": {
      "subject": "La tua settimana: {fields_label}, tutto tranquillo",
      "preheader": "Punteggio di salute, andamento NDVI e consiglio AI — in un colpo d'occhio.",
      "heading": "Questa settimana nei tuoi campi",
      "intro": [
        "Ciao{name_suffix}! Questa settimana non è successo nulla di urgente nei tuoi campi — ecco il riepilogo breve."
      ],
      "outro": [
        "Gli avvisi urgenti arrivano subito nell'app; l'email arriva una volta a settimana, il mercoledì mattina.",
        "Domande? Rispondi a questa email — le leggo tutte."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "alerts": {
      "subject": "⚠️ {alerts_label} — il tuo riepilogo settimanale",
      "preheader": "Il campo che ha più bisogno di te: «{field}».",
      "heading": "Cosa richiede la tua attenzione questa settimana",
      "intro": [
        "Ciao{name_suffix}! Questa settimana nei tuoi campi si è verificato: <b>{alerts_label}</b>. Il campo che ha più bisogno di te è <b>«{field}»</b>.",
        "Trovi tutto qui sotto. Vale un minuto prima di andare in campo."
      ],
      "outro": [
        "Gli avvisi urgenti arrivano subito nell'app; l'email arriva una volta a settimana, il mercoledì mattina.",
        "Domande? Rispondi a questa email — le leggo tutte."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "no_crop": {
      "subject": "Manca un passo: imposta la coltura per «{field}»",
      "preheader": "Scegliere la coltura attiva le soglie specifiche.",
      "heading": "Manca un passo: imposta la coltura",
      "intro": [
        "Ciao{name_suffix}! I tuoi campi sono visibili dallo spazio, ma la coltura non è ancora impostata. Appena la scegli, Agradex può applicare <b>soglie di salute specifiche per coltura</b>, norme di concimazione e consigli più precisi.",
        "Ci vuole un minuto. Il riepilogo della settimana è qui sotto."
      ],
      "outro": [
        "Questa email arriva una volta a settimana, il mercoledì mattina."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "no_fields": {
      "subject": "Aggiungi il tuo primo campo in 2 minuti",
      "preheader": "Al satellite serve solo un confine per vedere il campo.",
      "heading": "Un campo cambia tutto",
      "intro": [
        "Ciao{name_suffix}! Il tuo account è pronto, ma non hai ancora aggiunto un campo. <b>Al satellite serve solo un confine per “vedere” il tuo campo.</b>",
        "Non vuoi disegnarlo? <b>Tocca</b> il campo sulla mappa — Agradex rileva il confine per te."
      ],
      "outro": [
        "Se qualcosa non ha funzionato, rispondi con una riga e ti aiuto.",
        "Appena aggiungi un campo, questa email diventa il tuo riepilogo settimanale."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    }
  },
  "pl": {
    "calm": {
      "subject": "Twój tydzień: {fields_label}, spokojnie",
      "preheader": "Wynik zdrowia, trend NDVI i porada AI — na jeden rzut oka.",
      "heading": "Ten tydzień na Twoich polach",
      "intro": [
        "Cześć{name_suffix}! W tym tygodniu nie wydarzyło się nic pilnego na Twoich polach — oto krótkie podsumowanie."
      ],
      "outro": [
        "Pilne alerty pojawiają się w aplikacji od razu; e-mail przychodzi raz w tygodniu, w środę rano.",
        "Pytania? Po prostu odpowiedz na tego e-maila — czytam każdy."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "alerts": {
      "subject": "⚠️ {alerts_label} — Twoje podsumowanie tygodnia",
      "preheader": "Pole, które najbardziej Cię potrzebuje: „{field}”.",
      "heading": "Co wymaga uwagi w tym tygodniu",
      "intro": [
        "Cześć{name_suffix}! W tym tygodniu na Twoich polach odnotowano: <b>{alerts_label}</b>. Najbardziej potrzebuje Cię pole <b>„{field}”</b>.",
        "Wszystko znajdziesz poniżej. Warto poświęcić minutę przed wyjazdem w pole."
      ],
      "outro": [
        "Pilne alerty pojawiają się w aplikacji od razu; e-mail przychodzi raz w tygodniu, w środę rano.",
        "Pytania? Po prostu odpowiedz na tego e-maila — czytam każdy."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "no_crop": {
      "subject": "Został jeden krok: ustaw uprawę dla pola „{field}”",
      "preheader": "Wybór uprawy włącza progi dopasowane do niej.",
      "heading": "Został jeden krok: ustaw uprawę",
      "intro": [
        "Cześć{name_suffix}! Twoje pola są już widoczne z satelity, ale uprawa nie jest jeszcze ustawiona. Gdy ją wybierzesz, Agradex zastosuje <b>progi zdrowia dopasowane do uprawy</b>, normy nawożenia i trafniejsze porady.",
        "To zajmie minutę. Podsumowanie tygodnia znajdziesz poniżej."
      ],
      "outro": [
        "Ten e-mail przychodzi raz w tygodniu, w środę rano."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    },
    "no_fields": {
      "subject": "Dodaj pierwsze pole w 2 minuty",
      "preheader": "Satelicie wystarczy granica, żeby zobaczyć Twoje pole.",
      "heading": "Jedno pole zmienia wszystko",
      "intro": [
        "Cześć{name_suffix}! Twoje konto jest gotowe, ale nie ma w nim jeszcze żadnego pola. <b>Satelicie wystarczy granica, żeby „zobaczyć” Twoje pole.</b>",
        "Nie chcesz rysować? Po prostu <b>dotknij</b> pola na mapie — Agradex sam wykryje granicę."
      ],
      "outro": [
        "Jeśli coś stanęło na przeszkodzie, odpisz jedną linijką — pomogę.",
        "Gdy tylko dodasz pole, ten e-mail zmieni się w tygodniowe podsumowanie Twoich pól."
      ],
      "signoff": "Ülkər Nəsirova — Agradex"
    }
  },
  "ru": {
    "calm": {
      "subject": "Сводка за неделю: {fields_label} — без тревог",
      "preheader": "Оценка здоровья, тренд NDVI и совет AI — одним взглядом.",
      "heading": "Ваши поля на этой неделе",
      "intro": [
        "Здравствуйте{name_suffix}! На этой неделе на ваших полях ничего срочного не произошло — вот короткая сводка."
      ],
      "outro": [
        "Срочные оповещения приходят в приложение сразу; письмо — раз в неделю, в среду утром.",
        "Есть вопросы? Ответьте на это письмо — я читаю каждое."
      ],
      "signoff": "Марина Ковалева — Agradex"
    },
    "alerts": {
      "subject": "⚠️ {alerts_label} — ваша сводка за неделю",
      "preheader": "Больше всего внимания требует поле «{field}».",
      "heading": "Что требует внимания на этой неделе",
      "intro": [
        "Здравствуйте{name_suffix}! На этой неделе на ваших полях зафиксировано: <b>{alerts_label}</b>. Больше всего внимания требует поле <b>«{field}»</b>.",
        "Все они перечислены ниже. Стоит потратить минуту перед выездом в поле."
      ],
      "outro": [
        "Срочные оповещения приходят в приложение сразу; письмо — раз в неделю, в среду утром.",
        "Есть вопросы? Ответьте на это письмо — я читаю каждое."
      ],
      "signoff": "Марина Ковалева — Agradex"
    },
    "no_crop": {
      "subject": "Остался один шаг: укажите культуру для поля «{field}»",
      "preheader": "Выбор культуры включает нормы под эту культуру.",
      "heading": "Остался один шаг: укажите культуру",
      "intro": [
        "Здравствуйте{name_suffix}! Ваши поля уже видны со спутника, но культура пока не указана. Как только вы её выберете, Agradex сможет применить <b>пороги здоровья под культуру</b>, нормы удобрений и давать более точные рекомендации.",
        "Это займёт минуту. Ниже — сводка за неделю."
      ],
      "outro": [
        "Это письмо приходит раз в неделю, в среду утром."
      ],
      "signoff": "Марина Ковалева — Agradex"
    },
    "no_fields": {
      "subject": "Добавьте первое поле за 2 минуты",
      "preheader": "Чтобы спутник увидел ваше поле, нужна только граница.",
      "heading": "Одно поле меняет всё",
      "intro": [
        "Здравствуйте{name_suffix}! Аккаунт готов, но поле вы пока не добавили. <b>Чтобы спутник «увидел» ваше поле, достаточно обвести границу.</b>",
        "Не хотите рисовать? Просто <b>коснитесь</b> поля на карте — Agradex определит границу сам."
      ],
      "outro": [
        "Если что-то не получается, ответьте одной строкой — помогу.",
        "Как только вы добавите поле, вместо этого письма будет приходить сводка по вашим полям."
      ],
      "signoff": "Марина Ковалева — Agradex"
    }
  }
}
