import Navbar from "@/components/layout/Navbar"
import HeroSection from "@/components/layout/HeroSection"
import BuildingCheckSection from "@/components/building/BuildingCheckSection"
import CompetitionSection from "@/components/competition/CompetitionSection"
import SimulatorSection from "@/components/simulator/SimulatorSection"
import ComingSoonSection from "@/components/layout/ComingSoonSection"

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <BuildingCheckSection />
        <CompetitionSection />
        <SimulatorSection />
        <ComingSoonSection />
      </main>
    </>
  )
}
