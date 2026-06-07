import { Pill as PillIcon, FlaskConical, Unlink } from "lucide-react";
import { SectionShell } from "@/components/landing/ui/SectionShell";
import { SectionHeading } from "@/components/landing/ui/SectionHeading";
import { GlassCard } from "@/components/landing/ui/GlassCard";
import { Chip } from "@/components/landing/ui/Chip";
import { Reveal } from "@/components/landing/ui/Reveal";

const WM_MEDS = ["Warfarin", "Amlodipine", "Metformin", "Atorvastatin"];
const TCM_HERBS = [
  { name: "Danshen", zh: "丹參" },
  { name: "Dong quai", zh: "當歸" },
  { name: "Ginkgo", zh: "銀杏" },
  { name: "Ginseng", zh: "人參" },
];

/** Section 2, The Problem. Two records that never meet. */
export function Problem() {
  return (
    <SectionShell id="problem" band>
      <Reveal>
        <SectionHeading
          eyebrow="The problem"
          title="Two healthcare systems. Zero shared records."
        />
      </Reveal>
      <Reveal delay={0.05}>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-700">
          Hong Kong's first Chinese Medicine Hospital opened in December 2025. Formal TCM +
          Western integration is happening now, for a rapidly ageing population, but the two
          systems' records don't talk to each other. Dangerous interactions fall through the gap.
        </p>
      </Reveal>

      <div className="mt-10 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
        <Reveal className="h-full">
          <GlassCard className="flex h-full flex-col p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <PillIcon className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-800">Western Medicine record</p>
                <p className="text-xs text-ink-400">Cardiologist · hospital pharmacy</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {WM_MEDS.map((m) => (
                <Chip key={m}>{m}</Chip>
              ))}
            </div>
          </GlassCard>
        </Reveal>

        {/* "not connected" indicator between the two records */}
        <div className="relative flex items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-y-3 left-1/2 hidden w-px -translate-x-1/2 border-l border-dashed border-ink-300 md:block"
          />
          <span className="relative inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-[11px] font-medium text-ink-400 shadow-soft backdrop-blur-md">
            <Unlink className="h-3.5 w-3.5" aria-hidden />
            not connected
          </span>
        </div>

        <Reveal className="h-full" delay={0.05}>
          <GlassCard className="flex h-full flex-col p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                <FlaskConical className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-800">
                  TCM record <span className="text-ink-400">· 中醫紀錄</span>
                </p>
                <p className="text-xs text-ink-400">TCM practitioner · herbal dispensary</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {TCM_HERBS.map((h) => (
                <Chip key={h.name} sub={h.zh}>
                  {h.name}
                </Chip>
              ))}
            </div>
          </GlassCard>
        </Reveal>
      </div>

      <Reveal delay={0.05}>
        <GlassCard className="mt-6 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:gap-6">
          <p className="font-serif text-5xl font-bold tracking-tight text-brand-600">16.6%</p>
          <div>
            <p className="text-sm leading-relaxed text-ink-800">
              of Hong Kong outpatient users consulted{" "}
              <span className="font-semibold">both</span> Western and Chinese medicine, yet
              their two records never meet. Dual users skew older, with chronic disease.
            </p>
            <p className="mt-1.5 text-xs text-ink-400">
              HK Thematic Household Survey, 2005 (n=18,087) · Chung et al., BMC Health Serv Res
              2009 · PMID 19917139
            </p>
          </div>
        </GlassCard>
      </Reveal>
    </SectionShell>
  );
}
