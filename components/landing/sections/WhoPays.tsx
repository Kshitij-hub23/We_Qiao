import { Building2, Users, Network } from "lucide-react";
import { SectionShell } from "@/components/landing/ui/SectionShell";
import { SectionHeading } from "@/components/landing/ui/SectionHeading";
import { GlassCard } from "@/components/landing/ui/GlassCard";
import { Pill } from "@/components/landing/ui/Pill";
import { BulletItem } from "@/components/landing/ui/Bullet";
import { Reveal } from "@/components/landing/ui/Reveal";

const CARDS = [
  {
    label: "Today · B2B",
    icon: Building2,
    title: "Care providers",
    body: "Nursing homes, TCM practices, integrated clinics, and hospital pharmacies.",
    points: [
      "Fewer adverse drug events",
      "Shorter stays, reduced liability",
      "Audit-ready safety logging",
    ],
    roadmap: false,
  },
  {
    label: "Today · Patient-held",
    icon: Users,
    title: "The patient carries it",
    body: "The app travels with the patient between providers, bypassing hospital IT procurement. The patient is the bridge.",
    points: [],
    roadmap: false,
  },
  {
    label: "Tomorrow",
    icon: Network,
    title: "Population safety",
    body: "Anonymized, aggregate population-safety insights for public-health agencies and pharmacovigilance, GBA-scoped, federated, never raw patient data.",
    points: [],
    roadmap: true,
  },
];

/** Section 5, Who pays (Beat 5). Unambiguous payer model. */
export function WhoPays() {
  return (
    <SectionShell id="who-pays" band>
      <Reveal>
        <SectionHeading
          eyebrow="Business model"
          title="B2B today. Patient-held tomorrow."
        />
      </Reveal>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {CARDS.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.06}>
            <GlassCard
              className={`flex h-full flex-col p-6 ${
                c.roadmap ? "ring-1 ring-teal-200/70" : ""
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    c.roadmap
                      ? "bg-teal-100 text-teal-700"
                      : "bg-brand-100 text-brand-700"
                  }`}
                >
                  <c.icon className="h-4 w-4" aria-hidden />
                </span>
                {c.roadmap ? (
                  <Pill tone="roadmap">Roadmap</Pill>
                ) : (
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                    {c.label}
                  </span>
                )}
              </div>

              <h3 className="font-serif text-lg font-bold tracking-tight text-ink-900">
                {c.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{c.body}</p>

              {c.points.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {c.points.map((p) => (
                    <BulletItem key={p}>{p}</BulletItem>
                  ))}
                </ul>
              ) : null}
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
