import type { ComponentType } from "react";
import { FileCheck, ShieldAlert, Stethoscope, Layers, Quote } from "lucide-react";
import { SectionShell } from "@/components/landing/ui/SectionShell";
import { SectionHeading } from "@/components/landing/ui/SectionHeading";
import { GlassCard } from "@/components/landing/ui/GlassCard";
import { Reveal } from "@/components/landing/ui/Reveal";

type Card = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  quote?: string;
  attribution?: string;
  extra?: string;
};

const CARDS: Card[] = [
  {
    icon: FileCheck,
    title: "51 sourced interactions",
    body: "Every row is backed by a PMID, DOI, or a named authoritative database, not model output.",
    extra: "e.g. danshen ⇄ warfarin → Chan TYK, Ann Pharmacother 2001 · PMID 11302416",
  },
  {
    icon: ShieldAlert,
    title: "Adversarial citation audit",
    body: "We red-teamed our own dataset and caught a fabricated PMID before launch, then replaced it.",
  },
  {
    icon: Stethoscope,
    title: "Independently reviewed",
    quote: "…life-threatening conditions such as poisoning and bleeding.",
    attribution: "Dr. Zhou, China-trained TCM practitioner, Brussels",
  },
  {
    icon: Layers,
    title: "Honest evidence tiers",
    body: "established / probable / possible / theoretical, shown on every alert, never hidden.",
  },
];

/** Section 4, Evidence & credibility (Beat 4). Tanmay's section. */
export function Evidence() {
  return (
    <SectionShell id="evidence" band>
      <Reveal>
        <SectionHeading
          eyebrow="Evidence & credibility"
          title="Built on the literature, not on guesses."
        />
      </Reveal>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {CARDS.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.06}>
            <GlassCard className="flex h-full flex-col p-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <c.icon className="h-4 w-4" />
                </span>
                <h3 className="font-serif text-lg font-bold tracking-tight text-ink-900">
                  {c.title}
                </h3>
              </div>

              {c.quote ? (
                <blockquote>
                  <Quote className="mb-1.5 h-4 w-4 text-brand-300" aria-hidden />
                  <p className="text-sm italic leading-relaxed text-ink-700">{c.quote}</p>
                  <footer className="mt-2 text-xs text-ink-400">{c.attribution}</footer>
                </blockquote>
              ) : (
                <p className="text-sm leading-relaxed text-ink-700">{c.body}</p>
              )}

              {c.extra ? (
                <p className="mt-3 rounded-xl border border-white/60 bg-white/50 px-3 py-2 font-mono text-[11px] leading-relaxed text-ink-500">
                  {c.extra}
                </p>
              ) : null}
            </GlassCard>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.05}>
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink-600">
          We don't need a doctor on the team. The medicine comes from peer-reviewed literature,
          and a clinician is always in the loop.
        </p>
      </Reveal>
    </SectionShell>
  );
}
