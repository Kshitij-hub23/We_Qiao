import { Stethoscope, Quote } from "lucide-react";
import { SectionShell } from "@/components/landing/ui/SectionShell";
import { SectionHeading } from "@/components/landing/ui/SectionHeading";
import { GlassCard } from "@/components/landing/ui/GlassCard";
import { Reveal } from "@/components/landing/ui/Reveal";

type Card = { tag: string; quote: string };

/** Two extracts from Dr. Zhou's written assessment: the premise she validates, and the scale. */
const CARDS: Card[] = [
  {
    tag: "Why the check matters",
    quote:
      "Before recommending any Chinese medicine, every Western drug, proprietary medicine and supplement a patient takes must be reviewed in full. Combining the two blindly can do anything from blunting a drug to causing poisoning or bleeding.",
  },
  {
    tag: "What safe practice needs",
    quote:
      "When an interaction cannot be ruled out, the correct first step is to consult an authoritative herb-drug interaction database before anything else. A reliable, sourced reference for these combinations is exactly what clinical practice is missing.",
  },
  {
    tag: "The scale of the problem",
    quote:
      "The Chinese Pharmacopoeia lists 12,408 medicinal herbs, prescribed in combinations that vary by patient and practitioner. The number of variables is enormous, and no clinician can hold every interaction in their head.",
  },
];

/**
 * Medical-validation section, condensed to two quotes from a China-trained TCM clinician who
 * reviewed Qiáo's premise: the clinical need for the check, and the size of the problem space.
 */
export function MedicalValidation() {
  return (
    <SectionShell id="validation">
      <Reveal>
        <SectionHeading
          eyebrow="Medical validation"
          title="Reviewed by a practising clinician."
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Stethoscope className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-serif text-lg font-bold tracking-tight text-ink-900">
              Dr. Zhou
            </p>
            <p className="text-xs text-ink-500">
              China-trained TCM practitioner · acupuncture, tuina & rehabilitation · Brussels
            </p>
          </div>
        </div>
      </Reveal>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {CARDS.map((c, i) => (
          <Reveal key={c.tag} delay={0.05 + i * 0.06}>
            <GlassCard strong className="flex h-full flex-col p-7">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                {c.tag}
              </p>
              <Quote className="mb-2 h-5 w-5 text-brand-300" aria-hidden />
              <blockquote className="text-sm leading-relaxed text-ink-800">
                {c.quote}
              </blockquote>
            </GlassCard>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <p className="mt-5 text-xs text-ink-400">
          Paraphrased from Dr. Zhou's written assessment. Clinical judgement always rests with a
          qualified practitioner.
        </p>
      </Reveal>
    </SectionShell>
  );
}
