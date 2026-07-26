"use client";

// Two buttons, not one file input: "take a photo" and "choose from gallery".
//
// Both photo surfaces used a bare <input type="file">, which on a phone opens the FILE PICKER. A
// farmer standing in the field tapping "photo" got a document browser. The fix is not simply to add
// capture="environment" to the existing input either — that attribute FORCES the camera and takes
// the gallery away, which breaks uploading a picture taken an hour ago. So: two inputs, each with
// the right hint, exactly the way the pattern that prompted this works (docs/ONESOIL_MOBILE_
// TEARDOWN.md §4.6 — "Take photo and Select photo are TWO separate buttons").
//
// capture is a hint, not a guarantee: a desktop browser ignores it and opens the file dialog, which
// is the correct behaviour there.
import { useRef } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { t } from "@/lib/i18n";

const ACCEPT = "image/jpeg,image/png,image/webp";

export default function PhotoInput({
  onPick,
  disabled = false,
  /** Name of the currently chosen file, shown back so the farmer knows the tap registered. */
  fileName,
}: {
  onPick: (file: File | null) => void;
  disabled?: boolean;
  fileName?: string | null;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Clearing the value on every pick is what makes re-selecting the SAME file fire onChange again —
  // without it, a farmer who retakes a photo they just discarded gets no event at all.
  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    onPick(e.target.files?.[0] ?? null);
    e.target.value = "";
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border-[1.5px] border-grass bg-mint-soft px-4 text-sm font-semibold text-grass-deep hover:border-grass-deep disabled:opacity-50"
        >
          <Camera className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("app.photoInput.take")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => galleryRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border-[1.5px] border-line bg-panel px-4 text-sm font-semibold text-ink-soft hover:border-grass hover:text-grass-deep disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("app.photoInput.choose")}
        </button>
      </div>

      {fileName ? (
        <p className="truncate text-xs text-ink-soft" title={fileName}>{fileName}</p>
      ) : null}

      {/* Off-screen rather than hidden: a display:none input is not reliably clickable on every
          mobile browser, and sr-only keeps it in the accessibility tree with a real label. */}
      <input
        ref={cameraRef}
        type="file"
        accept={ACCEPT}
        capture="environment"
        onChange={handle}
        aria-label={t("app.photoInput.take")}
        className="sr-only"
        tabIndex={-1}
      />
      <input
        ref={galleryRef}
        type="file"
        accept={ACCEPT}
        onChange={handle}
        aria-label={t("app.photoInput.choose")}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}
