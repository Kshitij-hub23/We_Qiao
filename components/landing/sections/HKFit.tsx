import { Hospital, Network, Globe } from "lucide-react";
import { SectionShell } from "@/components/landing/ui/SectionShell";
import { SectionHeading } from "@/components/landing/ui/SectionHeading";
import { GlassCard } from "@/components/landing/ui/GlassCard";
import { Reveal } from "@/components/landing/ui/Reveal";

const POINTS = [
  {
    icon: Hospital,
    title: "Integrated care is policy",
    body: "The Chinese Medicine Hospital of Hong Kong (香港中醫醫院) opened in December 2025. TCM + Western integration is the direction of travel.",
  },
  {
    icon: Network,
    title: "A biomed cluster to plug into",
    body: "Fits HKSTP's 300+ life-and-health-tech companies (60+ clinical-stage), plus its Incu-Bio and ITR programmes.",
  },
  {
    icon: Globe,
    title: "A bridge to the Greater Bay Area",
    body: "86M+ people, Shenzhen medtech manufacturing, and Mainland China access across the GBA.",
  },
];

const HERBS = [
  { en: "danshen", zh: "丹參", la: "Salvia miltiorrhiza" },
  { en: "dong quai", zh: "當歸", la: "Angelica sinensis" },
  { en: "ginseng", zh: "人參", la: "Panax ginseng" },
];

/** Section 6, HK / GBA fit (Beat 6). */
export function HKFit() {
  return (
    <SectionShell id="hk-fit">
      <Reveal>
        <SectionHeading eyebrow="Why Hong Kong" title="Hong Kong is the launchpad." />
      </Reveal>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {POINTS.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.06}>
            <GlassCard className="flex h-full flex-col p-6">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                <p.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="font-serif text-lg font-bold tracking-tight text-ink-900">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{p.body}</p>
            </GlassCard>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.05}>
        <div className="mt-6">
          <p className="mb-3 text-xs font-medium text-ink-400">
            Fully bilingual · 繁體中文 / English
          </p>
          <div className="flex flex-wrap gap-2">
            {HERBS.map((h) => (
              <span
                key={h.en}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs shadow-soft"
              >
                <span className="font-medium text-ink-700">{h.en}</span>
                <span className="text-ink-300">/</span>
                <span className="font-medium text-ink-800">{h.zh}</span>
                <span className="text-ink-300">/</span>
                <span className="italic text-ink-500">{h.la}</span>
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}
