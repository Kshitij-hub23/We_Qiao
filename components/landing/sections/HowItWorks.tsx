import { ScanLine, ShieldCheck, TriangleAlert, Lock, FileText, Scale } from "lucide-react";
import { SectionShell } from "@/components/landing/ui/SectionShell";
import { SectionHeading } from "@/components/landing/ui/SectionHeading";
import { GlassCard } from "@/components/landing/ui/GlassCard";
import { Reveal } from "@/components/landing/ui/Reveal";

const STEPS = [
  {
    n: 1,
    icon: ScanLine,
    title: "Extract",
    body: "An LLM reads a handwritten or typed prescription and normalizes it into structured medicines and herbs.",
  },
  {
    n: 2,
    icon: ShieldCheck,
    title: "Check",
    body: "Each pair is checked deterministically against 51 sourced interactions, a lookup, not a guess.",
  },
  {
    n: 3,
    icon: TriangleAlert,
    title: "Alert",
    body: "Conflicts surface as explainable, severity-rated, citation-backed flags.",
  },
];

const TRUST = [
  { icon: Lock, text: "Patient data stays local on device" },
  { icon: FileText, text: "Every alert cites a real peer-reviewed source" },
  {
    icon: Scale,
    text: "Evidence tiers shown honestly: established / probable / possible / theoretical",
  },
];

/** Section 3, How it works (Beat 3). The "model extracts, rules decide" beat. */
export function HowItWorks() {
  return (
    <SectionShell id="how-it-works">
      <Reveal>
        <SectionHeading
          eyebrow="How it works"
          title="The model extracts. Verified data decides."
        />
      </Reveal>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.07}>
            <GlassCard className="flex h-full flex-col p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-sm font-bold text-white">
                  {s.n}
                </span>
                <s.icon className="h-5 w-5 text-brand-300" aria-hidden />
              </div>
              <h3 className="font-serif text-xl font-bold tracking-tight text-ink-900">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{s.body}</p>
            </GlassCard>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.05}>
        <p className="mt-7 text-center font-serif text-base italic text-ink-500">
          “The LLM never makes the safety call. That's the point.”
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {TRUST.map((t) => (
            <span
              key={t.text}
              className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs font-medium text-ink-700 shadow-soft backdrop-blur-md"
            >
              <t.icon className="h-4 w-4 text-brand-500" aria-hidden />
              {t.text}
            </span>
          ))}
        </div>
      </Reveal>
    </SectionShell>
  );
}
