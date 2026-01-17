'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowDown } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/hooks/use-translations'

function Logo() {
  return (
    <div className="flex items-center">
      {/* MomentoVino official logo */}
      <Image
        src="/logo.svg"
        alt="MomentoVino"
        width={70}
        height={70}
        className="h-14 w-14"
      />
      {/* Brand name with two colors - serif font */}
      <span className="font-serif text-[22px] tracking-tight">
        <span className="text-wine-plum">Momento</span>
        <span className="text-chocolate">Vino</span>
      </span>
    </div>
  )
}

export function NavHeader() {
  const translations = useTranslations()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: translations.nav.resources, href: '#recursos' },
    { label: translations.nav.howItWorks, href: '#como-funciona' },
    { label: translations.nav.families, href: '#familias' },
  ]

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 bg-linen backdrop-blur-xl transition-all duration-300',
        isScrolled
          ? 'border-b border-linen/50 shadow-[0_4px_20px_-4px_rgba(114,47,55,0.08)]'
          : 'border-b border-transparent shadow-none'
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[15px] font-medium text-mauve-bark transition-all duration-300 hover:text-mauve-bark"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <motion.div
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Button className="rounded-full bg-wine-plum px-7 py-2.5 text-[15px] font-medium shadow-lg shadow-wine-plum/25 transition-shadow duration-300 hover:shadow-2xl hover:shadow-wine-plum/35">
            {translations.nav.downloadFree}
            <motion.span
              className="ml-2 inline-flex"
              animate={{ y: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            >
              <ArrowDown className="h-5 w-5" />
            </motion.span>
          </Button>
        </motion.div>
      </div>
    </header>
  )
}

export default NavHeader
