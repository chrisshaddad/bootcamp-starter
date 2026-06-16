import { MarketingNav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { AiTeaser } from "@/components/marketing/ai-teaser";
import { CtaBand } from "@/components/marketing/cta-band";
import { Footer } from "@/components/marketing/footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <Hero />
        <TrustStrip />
        <Features />
        <HowItWorks />
        <AiTeaser />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}
