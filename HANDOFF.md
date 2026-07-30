# Agradex — Handoff

**Vəziyyət (2026-07-30, `git` ilə yoxlanıb): heç nə iş üstündə deyil. `main` = məhsulun vəziyyətidir.**

`main` HEAD = **`decbdb2`** (2026-07-30, `fix(bakeoff): measure Anthropic the way production actually calls it`).
Başqa branch-da mənimsənilməmiş iş **yoxdur** — aşağıdakı cədvəl bunu sübutu ilə göstərir.

Bu fayl qəsdən qısadır. Davam etmək üçün lazım olan hər şey artıq üç yerdədir və bu fayl onları
təkrarlamır (təkrarlanan sənəd birincidən əvvəl köhnəlir):

| Nə lazımdır | Hara bax |
|---|---|
| İş konteksti, qərarlar, tələlər (deploy loop, miqrasiya sırası, xəritə qaydası, i18n tələsi) | `CLAUDE.md` |
| Açıq tasklar + status (⬜🔨🚀✅⏳❌), risklər, tövsiyə olunan növbə | `docs/ROADMAP.md` |
| Nə vaxt nə buraxılıb (və nəyin deploy statusu **sübut olunmayıb**) | `CHANGELOG.md` |
| Memarlıq / API / əməliyyat / qərar tarixçəsi | `docs/ARCHITECTURE.md` · `docs/API_REFERENCE.md` · `docs/OPERATIONS.md` · `docs/DECISIONS.md` |
| Gün-gün jurnal (ən tam mənbə) | `docs/SESSION_2026-07-25.md` · `docs/SESSION_2026-07-26.md` |

---

## Branch-lar — hamısı `main`-ə düşüb (`git` ilə yoxlanıb 2026-07-30)

`git branch --merged main` + hər biri üçün `git rev-list --count main..<branch>`:

| Branch | `main..<branch>` | Remote | Silmək təhlükəsizdirmi |
|---|---|---|---|
| `wip/onboarding-refine` | **0** | `origin/wip/onboarding-refine` var | ✅ bəli (local + remote) |
| `feat/ai-knowledge-layer` | **0** | `origin/feat/ai-knowledge-layer` var | ✅ bəli (local + remote) |
| `feat/sentinel2-sensor` | **0** | `origin/feat/sentinel2-sensor` var | ✅ bəli (local + remote) |
| `fix/qa-findings` | **0** | `origin/fix/qa-findings` var | ✅ bəli (local + remote) |
| `feat/hybrid-marketplace` | **0** | remote yoxdur (yalnız local) | ✅ bəli (local) |
| `claude/elated-pasteur-ac2cd7` | 1 (`143a548`) | remote yoxdur | ✅ bəli — **aşağıya bax** |
| `claude/wizardly-elbakyan-effab2` | 1 (`752bf91`) | remote yoxdur | ✅ bəli — **aşağıya bax** |

⚠️ **İki `claude/*` branch-ı `--merged` siyahısında görünmür, amma məzmunca `main`-dədir.** Onların
commit-ləri `main`-ə **cherry-pick/rebase** ilə düşüb, yəni hash fərqlidir. `git patch-id --stable` ilə
yoxlanıb — patch-lər **bayt-bayt eynidir**:

```
143a548  perf(field): drop dead raster plumbing…        = 0ec417a (main)   patch-id 26b8ff77…
752bf91  fix(mobile): opt into viewport-fit=cover…      = 27821a2 (main)   patch-id 7f8d8c6f…
```

**Mən heç bir branch silmirəm** — siyahı sahibin qərar verməsi üçündür. Silmək istəsən:
`git branch -d <local>` (merged olanlar üçün işləyəcək; iki `claude/*` üçün `-D` lazım olacaq, çünki
git onları hash-ə görə merged saymır) və `git push origin --delete <branch>` (yalnız remote-u olan 4-ü).

---

## Deploy — bir sətir

Push et, sonra serverdə **yalnız** `cd /opt/bagbanai && bash deploy/update.sh`.
İki şey burada tez-tez unudulur və hər ikisi `CLAUDE.md`-də açıq yazılıb:

1. **`update.sh` miqrasiya İŞLƏTMİR** — miqrasiya həmişə ayrıca, əl ilə və **düzgün sıra ilə**
   (əlavəedici sütunlar image-dən **əvvəl**; sütun DROP edən miqrasiya isə image ilə **birlikdə/sonra**).
   Ən yeni tətbiq olunmalı miqrasiyalar: **0055** (`login_tokens`) və **0056** (`ai_usage.source`),
   hər ikisi əlavəedicidir → **image-dən əvvəl**.
2. **Uğursuz build heç bir konteyner əvəz etmədən dayanır** (`set -euo pipefail`), yəni **yaşıl görünən sayt
   deploy-un düşdüyünə sübut deyil**. Çıxış statusunu / tail-i oxu. Bu Mac-da **node yoxdur** → yeganə TS
   gate serverin `docker build web`-idir.

## Bilinməyən (ilk növbədə bunu yoxla)

`CHANGELOG.md` [1.15.0]–[1.17.0] üçün qeyd olunub: **27–30 iyul işinin bir hissəsinin canlıda olduğu
repodan sübut edilə bilmir.** `81660df` + `a1b362e` dalğası canlı doğrulanıb (`31b6e58` ölçmələri qeyd
edir); `8f25630` (Terra Oracle) və `03eb081` (OneSoil mobil) dalğalarından sonra uğurlu build/deploy qeydi
yoxdur — hər ikisinin ardınca **build düzəlişi** commit-i gəlir, yəni o an `update.sh` dayanmışdı.
`decbdb2`-yə qədər olan son dalğa (magic link, 0055/0056) da təsdiqsizdir.

**Serverdə üç sorğu bunu bağlayır:**
```bash
docker compose -f deploy/docker-compose.prod.yml exec -T db psql -U bagban -d bagban \
  -c "select filename from public.schema_migrations order by 1 desc limit 6;"
docker compose -f deploy/docker-compose.prod.yml ps          # image tarixləri
curl -s https://app.agradex.com/api/health
```
