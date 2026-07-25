"use client";

// YesNo — a three-way Bəli / Xeyr / Bilmirəm selector for tri-state booleans
// such as irrigation_available (true | false | null).

import { chipCls } from "./chip";
import { t } from "@/lib/i18n";

export interface YesNoProps {
  /** Current value: true (Bəli), false (Xeyr) or null (Bilmirəm). */
  value: boolean | null;
  /** Fired with the picked tri-state value. */
  onChange: (value: boolean | null) => void;
}

export default function YesNo({ value, onChange }: YesNoProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onChange(true)} className={chipCls(value === true)}>
        {t("app.field.info.yesNo.yes")}
      </button>
      <button type="button" onClick={() => onChange(false)} className={chipCls(value === false)}>
        {t("app.field.info.yesNo.no")}
      </button>
      <button type="button" onClick={() => onChange(null)} className={chipCls(value === null)}>
        {t("app.field.info.yesNo.unknown")}
      </button>
    </div>
  );
}
