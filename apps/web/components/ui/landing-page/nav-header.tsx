'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
        <span className="text-wine-700">Momento</span>
        <span className="text-gold-600">Vino</span>
      </span>
    </div>
  )
}

export function NavHeader() {
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
    { label: 'Recursos', href: '#recursos' },
    { label: 'Como Funciona', href: '#como-funciona' },
    { label: 'Famílias', href: '#familias' },
  ]

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 bg-[#F8F4EF]/90 backdrop-blur-xl transition-all duration-300',
        isScrolled
          ? 'border-b border-wine-100/50 shadow-[0_4px_20px_-4px_rgba(114,47,55,0.08)]'
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
              className="text-[15px] font-medium text-wine-700/70 transition-all duration-300 hover:text-wine-800"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <Button className="rounded-full bg-wine-700 px-7 py-2.5 text-[15px] font-medium shadow-lg shadow-wine-700/20 transition-all duration-300 hover:bg-wine-800 hover:shadow-xl hover:shadow-wine-700/30">
          Baixar Grátis
        </Button>
      </div>
    </header>
  )
}

export default NavHeader
