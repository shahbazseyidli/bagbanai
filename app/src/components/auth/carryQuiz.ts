"use client";

// The landing quiz (E13), carried into the account AFTER a session exists.
//
// WHY IT MOVED OUT OF login/page.tsx: it used to ride in the POST /api/auth/signup body, and login
// carried it as a repair for the visitor who took the quiz and then signed IN rather than up. There
// is no signup body any more — signup is an email address and a magic link — so
// POST /api/auth/onboarding after the session exists is now the ONLY route from localStorage to
// users.onboarding. Every path that ends in a live session must call this, or the four answers a
// visitor gave on the landing page are dropped on the floor. Today that is three paths: password
// login, OTP verification, and the magic link.
//
// Bounded to this visit on purpose: on a shared device the answers may belong to whoever was
// browsing rather than to the account being opened, and an hours-old quiz is the same person while a
// week-old one is a coin flip. An unfinished quiz has no completed_at (only the quiz's finish()
// stamps it), so the same gate also refuses to apply a half-answered one.
import { api } from "@/lib/api";
import { clearAnswers, loadAnswers } from "@/lib/onboardingQuiz";

const QUIZ_CARRY_MS = 24 * 60 * 60 * 1000;

export async function carryQuiz(): Promise<void> {
  const q = loadAnswers();
  if (!q) return;
  const done = q.completed_at ? Date.parse(q.completed_at) : NaN;
  if (Number.isFinite(done) && Date.now() - done < QUIZ_CARRY_MS) {
    try {
      await api.post("/api/auth/onboarding", { onboarding: q });
    } catch {
      /* a nicety, never a reason to block the sign-in */
    }
  }
  clearAnswers(); // fresh or stale, it has had its chance — don't leak it into the next account
}
