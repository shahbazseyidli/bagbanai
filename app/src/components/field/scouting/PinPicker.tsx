"use client";

// Seven colour swatches for a scouting pin (6.5).
//
// The SELECTED swatch is drawn as a ring with a transparent centre, not as a filled dot with a
// tick. Filled-vs-filled forces the eye to compare saturation between two small circles, which is
// exactly the comparison that fails in sunlight on a phone held at arm's length in a field — and
// the one that colour-blindness breaks first. A ring is a difference in SHAPE, and shape survives
// both.
import { t, tf } from "@/lib/i18n";
import { PIN_COLORS, pinColorLabel } from "./pins";

export default function PinPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-label={t("app.field.scouting.color")}
        className="flex flex-wrap gap-1.5"
      >
        {PIN_COLORS.map((c) => {
          const active = c.name === value;
          return (
            <button
              key={c.name}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={tf("app.field.scouting.colorAria", { color: pinColorLabel(c.name) })}
              title={pinColorLabel(c.name)}
              disabled={disabled}
              onClick={() => onChange(c.name)}
              // 44px is the touch target; the swatch inside it is smaller. Sizing the SWATCH to 44
              // would make seven of them a wall of colour on a 375px screen.
              className="flex h-11 w-11 items-center justify-center rounded-lg border-[1.5px] border-transparent hover:border-slate-200 disabled:opacity-40"
            >
              <span
                className="block h-7 w-7 rounded-full"
                style={
                  active
                    ? { border: `4px solid ${c.hex}`, background: "transparent" }
                    : { background: c.hex, boxShadow: "0 0 0 1.5px rgba(15,23,42,0.15)" }
                }
              />
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{t("app.field.scouting.colorHint")}</p>
    </div>
  );
}
