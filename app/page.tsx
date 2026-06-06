/**
 * Placeholder home for the `backend` branch — confirms the app runs and that
 * the backend route + engine are reachable. The full intake → check → results
 * UI is built on the `frontend` branch and replaces this file.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="glass-strong rounded-3xl p-10">
        <h1 className="text-3xl font-semibold text-ink-900">Qiáo · 橋</h1>
        <p className="mt-3 text-ink-600">
          Backend branch is running. API route is live at{" "}
          <code className="rounded bg-white/70 px-1.5 py-0.5 text-brand-700">
            POST /api/conflicts/check
          </code>
          .
        </p>
        <p className="mt-2 text-sm text-ink-500">
          Engine health: <code className="text-teal-700">GET /api/engine/health</code>
        </p>
      </div>
    </main>
  );
}
