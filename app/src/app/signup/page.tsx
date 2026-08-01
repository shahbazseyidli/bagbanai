"use client";

// SIGNUP IS ONE FIELD: the email address.
//
// What used to be here was a three-step wizard — role picker, full name, password, country, region,
// a name-visibility switch, and a provider profile with multi-select specializations. All of it is
// gone, on the owner's call: a farmer who has not seen the product yet is being asked to make seven
// decisions before they can see anything. Everything still worth knowing is asked LATER, in
// /account, where it is optional (ProfileForm already covers name/country/region).
//
// This page no longer calls POST /api/auth/signup at all — it was the only caller in the repo.
// POST /api/auth/magic-link is signup and login in one, and consuming the emailed link is what
// verifies the address, so there is no separate verification step to render here either.
//
// TWO CONSEQUENCES, deliberate and both downstream of the owner's decision:
//   * the landing-quiz prefill that used to fill country/region from localStorage has no inputs
//     left to fill. The answers now reach the account through carryQuiz() once a session exists —
//     see components/auth/carryQuiz.ts, which is why that file is shared rather than local to login.
//   * provider self-registration is gone with the role picker. users.role defaults to 'farmer'
//     (migration 0031), so a lab/consultant/supplier account now needs an admin role change; the
//     /provider profile editor stays reachable from /more for anyone who already has the role.
import { useState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import MagicLinkForm from "@/components/auth/MagicLinkForm";
import GoogleButton from "@/components/auth/GoogleButton";

export default function SignupPage() {
  const [email, setEmail] = useState("");

  return (
    <div className="mx-auto max-w-sm">
      <div className="card">
        <h1 className="mb-4 text-xl font-bold text-slate-900">{t("auth.signupTitle")}</h1>
        <MagicLinkForm mode="signup" email={email} onEmailChange={setEmail} />
        {/* Signing up with Google IS signing in with it — same route, same account rules. No
            `next`: a brand-new account belongs on the home screen. */}
        <GoogleButton />
      </div>
      <Link href="/login" className="mt-4 block text-center text-sm text-emerald-700 hover:underline">
        {t("auth.toLogin")}
      </Link>
    </div>
  );
}
