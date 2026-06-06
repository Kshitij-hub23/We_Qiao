import { GlassCard } from "./GlassCard";

export function LoadingState() {
  return (
    <GlassCard className="flex items-center justify-center gap-3 p-8">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
      <span className="text-sm font-medium text-ink-600">Checking for interactions…</span>
    </GlassCard>
  );
}
