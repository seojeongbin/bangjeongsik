import Navbar from "@/components/layout/Navbar"
import HeroSection from "@/components/layout/HeroSection"
import SimulatorSection from "@/components/simulator/SimulatorSection"

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <SimulatorSection />
      </main>
    </>
  )
}
