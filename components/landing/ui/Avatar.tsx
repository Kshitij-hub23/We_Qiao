/** Circular avatar with white bold initials on a solid brand/teal/ink hex (STYLE_GUIDE.md §6). */
export function Avatar({
  initials,
  hex,
  className = "",
}: {
  initials: string;
  hex: string;
  className?: string;
}) {
  return (
    <span
      className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white ${className}`}
      style={{ backgroundColor: hex }}
    >
      {initials}
    </span>
  );
}
