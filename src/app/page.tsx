import Navbar from "@/components/layout/Navbar"
import LandingHero from "@/components/landing/LandingHero"
import ProblemSection from "@/components/landing/ProblemSection"
import FeatureSection from "@/components/landing/FeatureSection"
import BuildingCheckSection from "@/components/building/BuildingCheckSection"
import SimulatorSection from "@/components/simulator/SimulatorSection"
import ReviewSection from "@/components/landing/ReviewSection"
import ClosingCtaSection from "@/components/landing/ClosingCtaSection"

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <LandingHero />
        <ProblemSection />
        <FeatureSection />
        <BuildingCheckSection />
        <SimulatorSection />
        <ReviewSection />
        <ClosingCtaSection />
      </main>
    </>
  )
}
