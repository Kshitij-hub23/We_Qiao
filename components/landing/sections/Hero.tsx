import { ChevronDown, ArrowLeftRight } from "lucide-react";
import { Reveal } from "@/components/landing/ui/Reveal";
import { Pill } from "@/components/landing/ui/Pill";
import { DemoButton } from "@/components/landing/ui/DemoButton";
import { AlertCard } from "@/components/landing/ui/AlertCard";

/** Section 1, Hook (Beat 1). The hero narrative IS the headline. */
export function Hero() {
  return (
    <section
      id="top"
      className="mx-auto w-full max-w-5xl px-4 pb-12 pt-6 sm:px-6 sm:pb-24 sm:pt-16"
    >
      <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div>
          <Reveal>
            <Pill tone="white" className="mb-4">
              <ArrowLeftRight className="h-3.5 w-3.5 text-brand-500" aria-hidden />
              Reconciling TCM + Western medicine
            </Pill>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="font-serif text-[1.6rem] font-bold leading-[1.16] tracking-tight text-ink-900 sm:text-[2.1rem] sm:leading-[1.15] lg:text-[2.6rem] lg:leading-[1.12]">
              Mrs. Chen, 73, takes warfarin from her cardiologist and a herbal formula with
              danshen from her TCM doctor. Neither knows about the other.{" "}
              <span className="text-lsev-contraindicated">
                Today, nobody catches the bleeding risk.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-5 max-w-xl text-lg font-medium text-ink-600">
              Qiáo, the missing safety bridge between Eastern and Western care.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <DemoButton size="lg" />
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-medium text-ink-600 transition-colors hover:bg-white/50 hover:text-ink-900"
              >
                How it works
                <ChevronDown className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="animate-float-slow">
            <AlertCard />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
