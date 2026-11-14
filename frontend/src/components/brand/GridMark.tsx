// Erpcore's mark: a 3x3 register grid with the lit diagonal.
export default function GridMark({ cell = 6, gap = 3, className = "" }: { cell?: number; gap?: number; className?: string }) {
  const lit = new Set([2, 4, 6]);
  return (
    <span className={`grid grid-cols-3 ${className}`} style={{ gap }} aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className={lit.has(i) ? "bg-gold" : "bg-gold/25"}
          style={{ width: cell, height: cell, borderRadius: Math.max(1, cell / 4) }}
        />
      ))}
    </span>
  );
}
