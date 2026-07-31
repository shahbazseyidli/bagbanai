"use client";

// E13 — the landing hero interaction. Four quick questions (crop → place → current difficulty →
// what you need) that end in a personalised summary and the sign-up CTA. It replaces the live map
// in the hero slot: the map is a beautiful toy for people who already understand the product, while
// this asks the visitor about their own farm and hands the answers to the account they create.
//
// Single-choice questions auto-advance; only the multi-select needs a Continue. Everything is a
// real <button>/<select> so keyboard and screen readers work, and the whole thing is skippable —
// "Keçin" goes straight to /signup, so the quiz can never become a wall in front of registration.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, MapPin, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getLocale, t, tf, tp } from "@/lib/i18n";
import { AZ_RAYONS } from "@/lib/regions";
import {
  EMPTY_ANSWERS,
  QUIZ_CHALLENGES,
  QUIZ_COUNTRY_CODES,
  QUIZ_CROPS,
  QUIZ_NEEDS,
  clearAnswers,
  countryName,
  loadAnswers,
  saveAnswers,
  type QuizAnswers,
} from "@/lib/onboardingQuiz";

const STEPS = 4;

/** Option button shared by every question — one visual language for all four steps. */
function Choice({
  emoji,
  label,
  selected,
  onClick,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`quiz-opt ${selected ? "quiz-opt-on" : ""}`}
    >
      <span aria-hidden="true" className="text-[19px] leading-none">{emoji}</span>
      <span className="text-left">{label}</span>
      {selected && <Check className="ml-auto h-4 w-4 shrink-0" aria-hidden="true" />}
    </button>
  );
}

export default function OnboardingQuiz() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0); // 0..3 questions, 4 = result
  const [a, setA] = useState<QuizAnswers>(EMPTY_ANSWERS);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [applied, setApplied] = useState(0);
  const locale = useMemo(() => (hydrated ? getLocale() : "az"), [hydrated]);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Restore a half-finished quiz (a visitor who scrolled away and came back keeps their answers).
  useEffect(() => {
    const saved = loadAnswers();
    if (saved) setA(saved);
    setHydrated(true);
  }, []);

  // Move focus to the new question so keyboard/screen-reader users are not left behind.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  // A signed-in visitor who (re)takes the quiz gets the answers written to their account.
  //
  // The apex is marketing even when you are signed in (app/page.tsx: `if (!appHost) return
  // <Landing/>`), so this is one logo click away from any logged-in farmer — and until now it wrote
  // to localStorage and stopped. POST /api/auth/onboarding is also the only caller of
  // _apply_onboarding_to_fields(): signup stores the blob in its INSERT and cannot apply it, because
  // a brand-new account has no fields yet. The "seed crop/region onto existing fields" half of E13
  // only ever runs from here.
  //
  // It lives on the LANDING and nowhere inside the app on purpose: localStorage is per-origin, the
  // quiz saves on agradex.com, and loadAnswers() on app.agradex.com is always null. A "sweep on app
  // start" caller would be dead code by construction — don't add one.
  //
  // Firing from an effect rather than from finish() is deliberate too: finish() runs the instant
  // "Nəticəni gör" is pressed, while AuthProvider resolves `user` from cache/`/me` asynchronously,
  // so reading `user` at that one instant would silently skip the save for anyone whose /me had not
  // landed yet. The effect simply re-runs when auth resolves.
  // Staleness is tracked with an attempt counter rather than the usual `let live = true` + cleanup:
  // this effect sets saveState, which is one of its own dependencies, so React tears the effect down
  // and re-runs it the moment we flip to "saving". A cleanup-based flag would therefore be false by
  // the time the POST resolved, and the card would sit on "saving" forever. The counter only goes
  // stale when a genuinely new attempt starts (a retry), which is the case we actually mean.
  const attemptRef = useRef(0);
  useEffect(() => {
    if (step !== STEPS || !user || saveState !== "idle") return;
    const attempt = ++attemptRef.current;
    setSaveState("saving");
    (async () => {
      try {
        const r = await api.post<{ fields_updated?: number }>("/api/auth/onboarding", { onboarding: a });
        if (attemptRef.current !== attempt) return;
        setApplied(r?.fields_updated ?? 0);
        setSaveState("saved");
        // It lives on the account now; don't let it replay into the next signup on this browser.
        clearAnswers();
      } catch {
        if (attemptRef.current === attempt) setSaveState("error");
      }
    })();
    // `a` is intentionally not a dependency: it is frozen by the time the result step renders, and
    // listing it would re-POST on every keystroke of a restarted quiz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, user, saveState]);

  /** Re-arm the effect after a failure — one code path, never a second inline call. */
  function retrySave() {
    setSaveState("idle");
  }

  /** Back to question one. Resetting the save state matters: without it a retake would keep showing
   *  the previous "saved" line and never POST the new answers. */
  function restart() {
    // Retire the in-flight attempt FIRST. Without this bump, a POST still running from the previous
    // pass passes its own `attemptRef.current !== attempt` guard, flips saveState to "saved" and
    // calls clearAnswers() — wiping the answers the visitor is at that moment retyping, since
    // update() writes every keystroke back through saveAnswers(). The effect's `saveState !== "idle"`
    // guard then refuses to run again, so the retake is silently never saved.
    attemptRef.current += 1;
    setSaveState("idle");
    setApplied(0);
    setStep(0);
  }

  function update(patch: Partial<QuizAnswers>, advance = false) {
    setA((cur) => {
      const next = { ...cur, ...patch };
      saveAnswers(next);
      return next;
    });
    if (advance) setStep((s) => Math.min(s + 1, STEPS));
  }

  function toggleNeed(v: string) {
    setA((cur) => {
      const needs = cur.needs.includes(v) ? cur.needs.filter((x) => x !== v) : [...cur.needs, v];
      const next = { ...cur, needs };
      saveAnswers(next);
      return next;
    });
  }

  function finish() {
    const next = { ...a, completed_at: new Date().toISOString() };
    saveAnswers(next);
    setA(next);
    setStep(STEPS);
  }

  const countries = useMemo(() => {
    const list = QUIZ_COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) }));
    list.sort((x, y) => x.name.localeCompare(y.name, locale));
    return list;
  }, [locale]);

  const cropLabel = a.crop ? t(QUIZ_CROPS.find((c) => c.value === a.crop)?.labelKey ?? "mkt.quiz.cropOther") : "";
  const place = [a.region, a.country ? countryName(a.country, locale) : ""].filter(Boolean).join(", ");

  return (
    <div className="mx-auto w-full max-w-[820px]">
      <style dangerouslySetInnerHTML={{ __html: QUIZ_CSS }} />
      <div className="lp-card quiz-card">
        {/* progress */}
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1.5" aria-hidden="true">
            {Array.from({ length: STEPS }, (_, i) => (
              <span key={i} className={`quiz-bar ${i < step ? "quiz-bar-done" : i === step ? "quiz-bar-now" : ""}`} />
            ))}
          </div>
          <span className="text-[12px] font-semibold tabular-nums text-slate-400">
            {Math.min(step + 1, STEPS)}/{STEPS}
          </span>
        </div>

        {step === 0 && (
          <div className="quiz-step">
            <p className="lp-eyebrow">{t("mkt.quiz.eyebrow")}</p>
            <h2 ref={headingRef} tabIndex={-1} className="quiz-q">{t("mkt.quiz.q1Title")}</h2>
            <p className="quiz-sub">{t("mkt.quiz.q1Sub")}</p>
            <div className="quiz-grid">
              {QUIZ_CROPS.map((c) => (
                <Choice
                  key={c.value}
                  emoji={c.emoji}
                  label={t(c.labelKey)}
                  selected={a.crop === c.value}
                  onClick={() => update({ crop: c.value }, true)}
                />
              ))}
              <Choice
                emoji="➕"
                label={t("mkt.quiz.cropOther")}
                selected={a.crop === "other"}
                onClick={() => update({ crop: "other" }, false)}
              />
            </div>
            {/* THE ONE PLACE THE CROP LIST WAS STILL A WALL. "Other" was a bare chip: picking it
                stored the literal string "other", which the field wizard then explicitly discarded,
                so a farmer growing something off our 12-item shortlist answered the question and
                had their answer thrown away. The research corpus counts 30+ crops that stopped a
                signup this way at the competitor. Now they can just type it, it rides into the
                account with the rest of the quiz, and it prefills their first field. */}
            {a.crop === "other" && (
              <input
                className="quiz-other-input mt-3 w-full rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-[15px]"
                autoFocus
                value={a.crop_other ?? ""}
                onChange={(e) => update({ crop_other: e.target.value }, false)}
                onBlur={() => { if (a.crop_other?.trim()) setStep((st) => Math.min(st + 1, STEPS)); }}
                placeholder={t("mkt.quiz.cropOtherPlaceholder")}
              />
            )}
          </div>
        )}

        {step === 1 && (
          <div className="quiz-step">
            <p className="lp-eyebrow">{t("mkt.quiz.eyebrow")}</p>
            <h2 ref={headingRef} tabIndex={-1} className="quiz-q">{t("mkt.quiz.q2Title")}</h2>
            <p className="quiz-sub">{t("mkt.quiz.q2Sub")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="quiz-field">
                <span className="quiz-label">{t("mkt.quiz.countryLabel")}</span>
                <select
                  className="quiz-input"
                  value={a.country}
                  onChange={(e) => update({ country: e.target.value, region: "" })}
                >
                  <option value="">{t("mkt.quiz.countryPlaceholder")}</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                  <option value="other">{t("mkt.quiz.countryOther")}</option>
                </select>
              </label>
              <label className="quiz-field">
                <span className="quiz-label">{t("mkt.quiz.regionLabel")}</span>
                {a.country === "AZ" ? (
                  <select
                    className="quiz-input"
                    value={a.region}
                    onChange={(e) => update({ region: e.target.value })}
                  >
                    <option value="">{t("mkt.quiz.regionPlaceholder")}</option>
                    {AZ_RAYONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="quiz-input"
                    value={a.region}
                    placeholder={t("mkt.quiz.regionPlaceholder")}
                    onChange={(e) => update({ region: e.target.value })}
                  />
                )}
              </label>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[12.5px] text-slate-500">
              <MapPin className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t("mkt.quiz.q2Note")}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="quiz-step">
            <p className="lp-eyebrow">{t("mkt.quiz.eyebrow")}</p>
            <h2 ref={headingRef} tabIndex={-1} className="quiz-q">{t("mkt.quiz.q3Title")}</h2>
            <p className="quiz-sub">{t("mkt.quiz.q3Sub")}</p>
            <div className="quiz-grid">
              {QUIZ_CHALLENGES.map((c) => (
                <Choice
                  key={c.value}
                  emoji={c.emoji}
                  label={t(c.labelKey)}
                  selected={a.challenge === c.value}
                  onClick={() => update({ challenge: c.value }, true)}
                />
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="quiz-step">
            <p className="lp-eyebrow">{t("mkt.quiz.eyebrow")}</p>
            <h2 ref={headingRef} tabIndex={-1} className="quiz-q">{t("mkt.quiz.q4Title")}</h2>
            <p className="quiz-sub">{t("mkt.quiz.q4Sub")}</p>
            <div className="quiz-grid">
              {QUIZ_NEEDS.map((n) => (
                <Choice
                  key={n.value}
                  emoji={n.emoji}
                  label={t(n.labelKey)}
                  selected={a.needs.includes(n.value)}
                  onClick={() => toggleNeed(n.value)}
                />
              ))}
            </div>
          </div>
        )}

        {step === STEPS && (
          <div className="quiz-step">
            <p className="lp-eyebrow">{t("mkt.quiz.resultEyebrow")}</p>
            <h2 ref={headingRef} tabIndex={-1} className="quiz-q">{t("mkt.quiz.resultTitle")}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {cropLabel && <span className="lp-chip">🌱 {cropLabel}</span>}
              {place && <span className="lp-chip">📍 {place}</span>}
              {a.needs.slice(0, 3).map((n) => {
                const need = QUIZ_NEEDS.find((x) => x.value === n);
                return need ? (
                  <span key={n} className="lp-chip">{need.emoji} {t(need.labelKey)}</span>
                ) : null;
              })}
            </div>
            <ul className="mt-4 space-y-2">
              {[
                t("mkt.quiz.plan1"),
                a.challenge && a.challenge !== "unsure" ? t("mkt.quiz.plan2") : t("mkt.quiz.plan2Alt"),
                t("mkt.quiz.plan3"),
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-[14.5px] text-slate-700">
                  <span className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-mint-soft text-grass-deep">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {user ? (
                // A plain <a>, not next/link: both targets are in the middleware's APP_PREFIXES, so on
                // the marketing apex they 307 to app.agradex.com. A full navigation follows that hop
                // cleanly, while next/link would have to unwind a cross-origin redirect out of an RSC
                // fetch — the same reason Nav.tsx reaches the app host with an anchor.
                <a href={applied > 0 ? "/fields" : "/onboarding"} className="lp-btn lp-btn-pri">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />{" "}
                  {t(applied > 0 ? "mkt.quiz.signedCtaFields" : "mkt.quiz.signedCtaField")}
                </a>
              ) : (
                <button type="button" className="lp-btn lp-btn-pri" onClick={() => router.push("/signup")}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> {t("mkt.quiz.resultCta")}
                </button>
              )}
              <button type="button" className="quiz-link" onClick={restart}>
                {t("mkt.quiz.resultRestart")}
              </button>
            </div>
            {user ? (
              <div className="mt-3 space-y-1 text-[12.5px] text-slate-500">
                {saveState === "saving" && <p>{t("mkt.quiz.saving")}</p>}
                {saveState === "saved" && (
                  <>
                    <p>{t("mkt.quiz.savedOk")}</p>
                    {/* Only ever stated when something actually changed: 0 cannot tell "no fields yet"
                        apart from "already filled in", and claiming either would be a guess. */}
                    {applied > 0 && (
                      <p>
                        {tf("mkt.quiz.savedApplied", {
                          count: applied,
                          noun: tp("app.plural.fields", applied),
                        })}
                      </p>
                    )}
                  </>
                )}
                {saveState === "error" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{t("mkt.quiz.saveError")}</span>
                    <button type="button" className="quiz-link" onClick={retrySave}>
                      {t("common.retry")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-[12.5px] text-slate-500">{t("mkt.quiz.resultNote")}</p>
            )}
          </div>
        )}

        {/* footer controls — never shown on the result step, which has its own CTA row */}
        {step < STEPS && (
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
            <button
              type="button"
              className="quiz-link disabled:opacity-40"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("mkt.quiz.back")}
            </button>
            <div className="flex items-center gap-3">
              {step === 2 && (
                <button type="button" className="quiz-link" onClick={() => update({ challenge: "" }, true)}>
                  {t("mkt.quiz.skip")}
                </button>
              )}
              {step === 1 && (
                <button
                  type="button"
                  className="lp-btn lp-btn-pri quiz-next"
                  onClick={() => setStep(2)}
                  disabled={!a.country}
                >
                  {t("mkt.quiz.next")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              {step === 3 && (
                <button type="button" className="lp-btn lp-btn-pri quiz-next" onClick={finish} disabled={!a.needs.length}>
                  {t("mkt.quiz.seeResult")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* "Skip straight to registration" is nonsense for someone already signed in. */}
      {!user && (
        <p className="mt-3 text-center text-[12.5px] text-slate-500">
          {t("mkt.quiz.footNote")}{" "}
          <Link href="/signup" className="lp-link font-semibold underline-offset-2 hover:underline">
            {t("mkt.quiz.footSkip")}
          </Link>
        </p>
      )}
    </div>
  );
}

const QUIZ_CSS = `
.quiz-card{padding:22px;border-radius:var(--r-lg)}
@media (min-width:640px){.quiz-card{padding:28px 30px}}
.quiz-bar{height:4px;flex:1;border-radius:999px;background:var(--line-2);transition:background .25s}
.quiz-bar-done{background:var(--green)}
.quiz-bar-now{background:linear-gradient(90deg,var(--green) 50%,var(--line-2) 50%)}
.quiz-step{animation:quizIn .28s ease both}
@keyframes quizIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.quiz-q{margin-top:10px;font-family:var(--font-display,inherit);font-size:clamp(21px,2.6vw,28px);font-weight:700;line-height:1.15;letter-spacing:-.02em;color:var(--brand-ink);outline:none}
.quiz-sub{margin-top:6px;font-size:14.5px;color:var(--brand-ink-2)}
.quiz-grid{margin-top:16px;display:grid;gap:8px;grid-template-columns:repeat(2,minmax(0,1fr))}
@media (min-width:560px){.quiz-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (min-width:820px){.quiz-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.quiz-opt{display:flex;align-items:center;gap:9px;min-height:52px;padding:10px 12px;border-radius:14px;border:1.5px solid var(--line-2);background:var(--panel);font-size:14px;font-weight:600;color:var(--brand-ink);text-align:left;transition:border-color .15s,background .15s,transform .06s}
.quiz-opt:hover{border-color:var(--green);background:var(--mint-soft)}
.quiz-opt:active{transform:translateY(1px)}
.quiz-opt:focus-visible{outline:2px solid var(--green);outline-offset:2px}
.quiz-opt-on{border-color:var(--green);background:var(--mint-soft);color:var(--grass-deep,#166b3b)}
.quiz-field{display:flex;flex-direction:column;gap:6px}
.quiz-label{font-size:12.5px;font-weight:600;color:var(--brand-ink-2)}
.quiz-input{min-height:48px;padding:0 12px;border-radius:12px;border:1.5px solid var(--line-2);background:var(--panel);font-size:15px;color:var(--brand-ink)}
.quiz-input:focus{outline:2px solid var(--green);outline-offset:1px;border-color:var(--green)}
.quiz-link{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 6px;font-size:14px;font-weight:600;color:var(--brand-ink-2)}
.quiz-link:hover{color:var(--green)}
.quiz-next:disabled{opacity:.45;box-shadow:none}
@media (prefers-reduced-motion: reduce){.quiz-step{animation:none}}
`;
