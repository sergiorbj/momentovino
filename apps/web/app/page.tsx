import { NavHeader } from '@/components/ui/landing-page/nav-header'
import { Hero } from '@/components/ui/landing-page/hero'
import { Footer } from '@/components/ui/landing-page/footer'

export default function HomePage() {
  return (
    <>
      <NavHeader />
      <main>
        <Hero />
      </main>
      <Footer />
    </>
  )
}
