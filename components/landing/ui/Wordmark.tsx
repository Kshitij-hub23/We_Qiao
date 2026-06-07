/** The Qiáo wordmark lockup, STYLE_GUIDE.md §3. Dot in brand-500. */
export function Wordmark({
  className = "",
  sizeClass = "text-xl",
}: {
  className?: string;
  sizeClass?: string;
}) {
  return (
    <span
      className={`font-serif ${sizeClass} font-bold tracking-tight text-ink-900 ${className}`}
    >
      Qiáo <span className="text-brand-500">·</span> 橋
    </span>
  );
}
