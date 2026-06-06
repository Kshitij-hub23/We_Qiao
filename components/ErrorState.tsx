import { GlassCard } from "./GlassCard";
import { Button } from "./Button";

/** Shown when the request fails (most often: the engine is not running). */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <GlassCard className="p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-severity-major/10">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-severity-major">
          <path
            d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-ink-900">Couldn’t complete the check</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">{message}</p>
      {onRetry && (
        <div className="mt-5">
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </GlassCard>
  );
}
