import Navbar from "@/components/layout/Navbar"
import HeroSection from "@/components/layout/HeroSection"

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
      </main>
    </>
  )
}
