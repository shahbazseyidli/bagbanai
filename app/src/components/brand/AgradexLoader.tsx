// Brand loader — the pixel mark "scanning" the field, adapted from the branding kit's
// AgradexLoader.jsx. The 7 colored cells light bottom-left → top-right (a satellite sweep);
// ghost cells breathe faintly. Keyframes live in globals.css (.ax-loader). Under
// prefers-reduced-motion the animation stops on the FULL mark (globals.css override) — a frozen
// but complete logo, never an invisible one.
//
// Purely visual: aria-hidden, no text of its own — the caller (ui.tsx Spinner) provides the label.

const GHOST: Array<[number, number]> = [
  [3.5, 3.5], [18.5, 3.5], [33.5, 3.5],
  [3.5, 18.5], [18.5, 18.5],
  [3.5, 33.5], [48.5, 33.5],
  [33.5, 48.5], [48.5, 48.5],
];

// Lighting order = scan direction.
const PIXELS: Array<{ x: number; y: number; fill: string }> = [
  { x: 3.5, y: 48.5, fill: "#B25E2E" },
  { x: 18.5, y: 48.5, fill: "#E0A22C" },
  { x: 18.5, y: 33.5, fill: "#8FC03C" },
  { x: 33.5, y: 33.5, fill: "#3E9A45" },
  { x: 33.5, y: 18.5, fill: "#3E9A45" },
  { x: 48.5, y: 18.5, fill: "#147049" },
  { x: 48.5, y: 3.5, fill: "#147049" },
];

export default function AgradexLoader({
  size = 20,
  theme = "light",
  className = "",
}: {
  size?: number;
  /** "light" = on light backgrounds (ink ghosts), "dark" = on dark ones (paper ghosts). */
  theme?: "light" | "dark";
  className?: string;
}) {
  return (
    <svg
      className={`ax-loader ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ color: theme === "dark" ? "#F2F5EE" : "#0E2A21" }}
    >
      {GHOST.map(([x, y]) => (
        <rect key={`g-${x}-${y}`} className="ax-g" x={x} y={y} width="12" height="12" rx="2.5" />
      ))}
      {PIXELS.map((p, i) => (
        <rect
          key={`p-${i}`}
          className="ax-p"
          x={p.x}
          y={p.y}
          width="12"
          height="12"
          rx="2.5"
          fill={p.fill}
          style={{ animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </svg>
  );
}
