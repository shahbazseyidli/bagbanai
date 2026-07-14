"use client";

// YesNo — a three-way Bəli / Xeyr / Bilmirəm selector for tri-state booleans
// such as irrigation_available (true | false | null).

import { chipCls } from "./chip";

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
        Bəli
      </button>
      <button type="button" onClick={() => onChange(false)} className={chipCls(value === false)}>
        Xeyr
      </button>
      <button type="button" onClick={() => onChange(null)} className={chipCls(value === null)}>
        Bilmirəm
      </button>
    </div>
  );
}
