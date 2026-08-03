// Minimal Markdown renderer for AI-generated prose. Models sprinkle **bold**, *italic*, `code`,
// "- " bullets and "#" headings into replies even when the prompt forbids it, and rows already in
// public.advice / public.ai_chat_messages cannot be regenerated — so the fix lives at render time.
// Deliberately tiny and lossless: anything the parser doesn't recognize passes through verbatim.
// No HTML is ever injected — output is React elements, so this is XSS-inert by construction.
import type { ReactNode } from "react";

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\s][^*\n]*\*)/g;

/** Inline pass: **bold**, `code`, *italic*. Returns nodes safe to place inside any element. */
export function mdInline(text: string | null | undefined): ReactNode {
  if (!text) return text ?? null;
  if (!/[*`]/.test(text)) return text;
  const parts = text.split(INLINE);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={i} className="rounded bg-black/[.06] px-1 font-mono text-[0.92em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

/** Block pass for chat bubbles: paragraphs, "- "/"• "/"* " bullets, "#" headings → styled lines.
 *  Keeps the visual rhythm of whitespace-pre-wrap text without showing raw markers. */
export function MdText({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let bullets: ReactNode[] = [];
  const flush = () => {
    if (bullets.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="my-1 list-disc space-y-0.5 pl-4">
          {bullets}
        </ul>,
      );
      bullets = [];
    }
  };
  lines.forEach((line, i) => {
    const bullet = line.match(/^\s*(?:[-•]|\*)\s+(.*)$/);
    const heading = line.match(/^\s*#{1,4}\s+(.*)$/);
    if (bullet) {
      bullets.push(<li key={i}>{mdInline(bullet[1])}</li>);
      return;
    }
    flush();
    if (heading) {
      out.push(
        <p key={i} className="mt-1.5 font-semibold">
          {mdInline(heading[1])}
        </p>,
      );
    } else if (line.trim() === "") {
      out.push(<span key={i} className="block h-2" aria-hidden="true" />);
    } else {
      out.push(
        <p key={i} className="my-0">
          {mdInline(line)}
        </p>,
      );
    }
  });
  flush();
  return <div className={className}>{out}</div>;
}
