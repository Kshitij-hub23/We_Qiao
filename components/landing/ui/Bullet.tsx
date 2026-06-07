import type { ReactNode } from "react";

/** The single standardized indicator: a 10px brand-900 dot (STYLE_GUIDE.md §6). */
export function Bullet({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`mt-[0.4rem] inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-brand-900 ${className}`}
    />
  );
}

/** A list row using the standardized bullet. */
export function BulletItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li className={`flex gap-3 ${className}`}>
      <Bullet />
      <span className="text-sm leading-relaxed text-ink-800">{children}</span>
    </li>
  );
}
