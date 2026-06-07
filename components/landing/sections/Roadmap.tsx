import { ClipboardCheck, CalendarCheck, Network, BadgeCheck, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/landing/ui/SectionHeading";
import { GlassCard } from "@/components/landing/ui/GlassCard";
import { Pill } from "@/components/landing/ui/Pill";
import { Reveal } from "@/components/landing/ui/Reveal";

const ITEMS = [
  {
    icon: ClipboardCheck,
    title: "Digital prescription bridge",
    body: "Clinicians prescribe directly from a dashboard, closing the OCR-error failure mode where an 80-year-old types “Voltran” by hand.",
  },
  {
    icon: CalendarCheck,
    title: "Preventative screening planner",
    body: "Scheduled non-invasive screening, e.g. endoscopy for digestive cancers, a heavy regional disease burden.",
  },
  {
    icon: Network,
    title: "Anonymized federated data layer",
    body: "Population-safety insights, GBA-scoped and cross-border ready, never raw patient data.",
  },
  {
    icon: BadgeCheck,
    title: "Patient-held medication passport",
    body: "A read-only clinician view for frictionless adoption, no hospital IT lift.",
  },
];

/**
 * Section 7, Roadmap / Vision. Visually the "Act 2" seam: full-bleed terracotta wash + teal
 * accents + a prominent "not yet built" marker, so it never reads as already shipped.
 */
export function Roadmap() {
  return (
    <section
      id="roadmap"
      className="scroll-mt-20 border-y border-teal-200/50 bg-teal-50/40"
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-24">
        <Reveal>
          <Pill tone="roadmap">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Roadmap · not yet built
          </Pill>
        </Reveal>
        <Reveal delay={0.05}>
          <SectionHeading
            className="mt-4"
            eyebrow="Vision"
            title="Where this goes next."
            accent="teal"
          />
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {ITEMS.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.06}>
              <GlassCard className="flex h-full gap-4 p-6 ring-1 ring-teal-200/60">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                  <it.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-bold tracking-tight text-ink-900">
                    {it.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{it.body}</p>
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
