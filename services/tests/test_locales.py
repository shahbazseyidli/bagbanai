"""Every server-side per-locale table must cover every supported locale.
Run: python services/tests/test_locales.py
(No DB / pytest / fastapi needed — the tables are read with `ast`, never imported.)

WHY THIS TEST EXISTS. Spanish shipped as the ninth UI locale on 2026-08-02 with full frontend
parity. The server was not updated, and nothing broke loudly: sixteen independent per-locale tables
across ten modules each fell back to Azerbaijani or English on their own. Measured 2026-10-10, a
Spanish account received its verification code in Azerbaijani, its first field named "Sahə 1", its
frost warning in Azerbaijani, its "your field is ready" email in English, and — worst — AI advice
written in Azerbaijani and STORED LABELLED `es`, which made the reader's own mismatch warning say
the text was fine.

TWO CHECKS, AND THE SECOND IS THE POINT.

1. KNOWN TABLES — every table in `TABLES` holds every locale in SUPPORTED_LOCALES.

2. DISCOVERY — walk the whole backend for dict literals that LOOK like locale tables (four or more
   SUPPORTED_LOCALES keys) and fail on any that `TABLES` does not list. Check 1 alone would have
   passed happily on 2026-08-02, because the problem was never a table with a hole in it — it was
   sixteen tables nobody had connected to the locale list. A new per-locale table must be declared
   here, which is the moment its author is told it needs all nine languages.

AST, NOT IMPORT, on purpose: this repo's Mac has no fastapi (see CLAUDE.md), so a test that
imported `app.routers.auth` could only ever run on the server. Keys in a dict literal are literal
strings, so reading them needs no evaluation — which also means a table whose VALUES reference
other names (advice.DISCLAIMERS uses DISCLAIMER) is checked just as well as a pure literal.
"""
import ast
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "services" / "app"

# Read the locale list out of its own module the same way — so this test cannot drift from it.
SUPPORTED: tuple[str, ...] = ()
for _node in ast.parse((APP / "locales.py").read_text(encoding="utf-8")).body:
    if isinstance(_node, ast.AnnAssign) and getattr(_node.target, "id", None) == "SUPPORTED_LOCALES":
        SUPPORTED = tuple(ast.literal_eval(_node.value))
assert SUPPORTED, "could not read SUPPORTED_LOCALES out of services/app/locales.py"

# (module path, dict name, what a missing locale costs the farmer).
# Keep the third column honest — it is the reason anyone will bother fixing a failure here.
TABLES: list[tuple[str, str, str]] = [
    ("locales.py",                 "LANG_NAMES",     "the model gets NO language instruction and answers in Azerbaijani"),
    ("ai/advice.py",               "DISCLAIMERS",    "advice disclaimer falls back"),
    ("ai/advice.py",               "_NOTIFY_TITLE",  "bell title in another language than the advice under it"),
    ("ai/chat.py",                 "_GATE_PAID",     "upgrade prompt falls back"),
    ("ai/chat.py",                 "_GATE_LIMIT",    "quota message falls back"),
    ("ai/emails/layout.py",        "_FOOTER",        "every email's footer + unsubscribe label falls back"),
    ("ai/emails/weekly.py",        "_LABELS",        "weekly digest stat tiles and section titles fall back"),
    ("routers/auth.py",            "_OTP_EMAIL",     "VERIFICATION CODE EMAIL falls back — signup critical path"),
    ("routers/auth.py",            "_MAGIC_EMAIL",   "sign-in link email falls back"),
    ("routers/email_prefs.py",     "_MSG",           "unsubscribe confirmation page falls back"),
    ("routers/fields.py",          "_FIELD_WORD",    "a new field is auto-named in the wrong language"),
    ("rules/alert_copy.py",        "ALERT_COPY",     "Telegram + web-push alerts fall back"),
]

# The three email copy tables are keyed locale → (role|variant|template) → content, and az/en are
# authored in catalog.py instead, so they are checked for the OTHER eight.
NESTED: list[tuple[str, str, str]] = [
    ("ai/emails/catalog_i18n.py", "WELCOME_EXTRA", "welcome email falls back to English"),
    ("ai/emails/catalog_i18n.py", "SIMPLE_EXTRA",  "the transactional 'field is ready' email falls back to English"),
    ("ai/emails/catalog_i18n.py", "WEEKLY_EXTRA",  "the weekly digest body falls back to English"),
]
AUTHORED_IN_CATALOG = ("az", "en")

# Tables that are per-locale but deliberately NOT nine-wide, with the reason. A table listed here
# is exempt from the discovery check; nothing else is.
EXEMPT: dict[tuple[str, str], str] = {
    # An OVERLAY, not a table: `{**DISCLAIMERS, "es": ...}`. It declares only the locale whose
    # wording differs (this summary compares the field with itself, so Spanish says "del propio
    # lote"); coverage comes from ai/advice.py::DISCLAIMERS, which IS checked above. The ** unpack
    # is also invisible to an AST key read, so counting its keys would be meaningless.
    ("ai/season_summary.py", "_DISCLAIMERS"): "overlay on ai/advice.py::DISCLAIMERS",
}

failures: list[str] = []


def _dicts_in(path: Path) -> dict[str, ast.Dict]:
    """Module-level `NAME = {...}` and `NAME: T = {...}` dict literals, by name."""
    out: dict[str, ast.Dict] = {}
    tree = ast.parse(path.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Dict):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    out[t.id] = node.value
        elif isinstance(node, ast.AnnAssign) and isinstance(node.value, ast.Dict):
            if isinstance(node.target, ast.Name):
                out[node.target.id] = node.value
    return out


def _keys(d: ast.Dict) -> set[str]:
    return {k.value for k in d.keys if isinstance(k, ast.Constant) and isinstance(k.value, str)}


def check_flat() -> None:
    for rel, name, cost in TABLES:
        path = APP / rel
        if not path.exists():
            failures.append(f"{rel}: file is gone — update TABLES in this test")
            continue
        found = _dicts_in(path)
        if name not in found:
            failures.append(f"{rel}::{name} no longer a module-level dict literal — update TABLES")
            continue
        missing = sorted(set(SUPPORTED) - _keys(found[name]))
        if missing:
            failures.append(f"{rel}::{name} missing {missing} → {cost}")


def check_nested() -> None:
    want = sorted(set(SUPPORTED) - set(AUTHORED_IN_CATALOG))
    for rel, name, cost in NESTED:
        found = _dicts_in(APP / rel)
        if name not in found:
            failures.append(f"{rel}::{name} no longer a module-level dict literal — update NESTED")
            continue
        table = found[name]
        missing = sorted(set(want) - _keys(table))
        if missing:
            failures.append(f"{rel}::{name} missing {missing} → {cost}")
            continue
        # Shape too: a locale present but half-filled sends a letter with an empty section.
        by_loc = {k.value: v for k, v in zip(table.keys, table.values)
                  if isinstance(k, ast.Constant) and isinstance(v, ast.Dict)}
        ref_loc = "en" if "en" in by_loc else want[0]
        ref = _keys(by_loc[ref_loc])
        for loc in want:
            gap = sorted(ref - _keys(by_loc[loc]))
            if gap:
                failures.append(f"{rel}::{name}[{loc}] missing sub-keys {gap} (vs {ref_loc})")


def check_discovery() -> None:
    """Any dict that smells like a locale table must be declared above."""
    known = {(rel, name) for rel, name, _ in TABLES} | {(rel, name) for rel, name, _ in NESTED}
    for path in sorted(APP.rglob("*.py")):
        if "__pycache__" in path.parts:
            continue
        rel = path.relative_to(APP).as_posix()
        for name, node in _dicts_in(path).items():
            keys = _keys(node)
            hits = keys & set(SUPPORTED)
            if len(hits) < 4:
                continue
            if (rel, name) in known or (rel, name) in EXEMPT:
                continue
            failures.append(
                f"{rel}::{name} looks like a locale table ({len(hits)} locale keys) but is not "
                f"declared in this test. Add it to TABLES/NESTED, or to EXEMPT with a reason.")


if __name__ == "__main__":
    check_flat()
    check_nested()
    check_discovery()
    if failures:
        print(f"FAIL — {len(failures)} problem(s); supported locales = {list(SUPPORTED)}\n")
        for f in failures:
            print("  •", f)
        sys.exit(1)
    n = len(TABLES) + len(NESTED)
    print(f"OK — {n} per-locale tables each cover all {len(SUPPORTED)} locales "
          f"({', '.join(SUPPORTED)}), and no undeclared locale table exists.")
