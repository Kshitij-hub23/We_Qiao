import { Nav } from "@/components/landing/sections/Nav";
import { Hero } from "@/components/landing/sections/Hero";
import { Problem } from "@/components/landing/sections/Problem";
import { HowItWorks } from "@/components/landing/sections/HowItWorks";
import { Evidence } from "@/components/landing/sections/Evidence";
import { MedicalValidation } from "@/components/landing/sections/MedicalValidation";
import { WhoPays } from "@/components/landing/sections/WhoPays";
import { HKFit } from "@/components/landing/sections/HKFit";
import { Roadmap } from "@/components/landing/sections/Roadmap";
import { Team } from "@/components/landing/sections/Team";

/** Marketing landing page, mounted at /landing inside the main app. */
export default function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Evidence />
        <MedicalValidation />
        <WhoPays />
        <HKFit />
        <Roadmap />
        <Team />
      </main>
    </>
  );
}
