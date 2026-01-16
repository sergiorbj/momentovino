'use client'

import { ArrowRight, ArrowDown, Star, Smartphone, Users, Search, Camera, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

function SocialProof() {
  const stats = [
    { icon: Star, value: '4.9', label: 'na App Store', highlight: true },
    { icon: Smartphone, value: '+10.000', label: 'momentos' },
    { icon: Users, value: 'Feito', label: 'para famílias' },
  ]

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="flex items-center gap-2.5 rounded-full bg-white/60 px-5 py-2.5 shadow-sm shadow-black/5 backdrop-blur-sm"
        >
          <stat.icon className={`h-5 w-5 ${stat.highlight ? 'fill-gold-500 text-gold-500' : 'text-wine-400'}`} />
          <span className="font-semibold text-wine-800">{stat.value}</span>
          <span className="text-wine-500">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#F8F4EF] via-[#F5F0EB] to-[#F2EDE7]">
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-[0.015]">
        <svg className="h-full w-full">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)"/>
        </svg>
      </div>

      {/* Decorative gradient orbs */}
      <div className="absolute left-1/4 top-1/4 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-radial from-wine-200/20 via-transparent to-transparent blur-3xl" />
      <div className="absolute right-1/4 top-1/3 h-[500px] w-[500px] translate-x-1/2 rounded-full bg-gradient-radial from-gold-200/15 via-transparent to-transparent blur-3xl" />

      {/* Main content */}
      <div className="relative mx-auto max-w-7xl px-6 pt-36 lg:px-8">

        {/* Headline */}
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-7 font-serif text-[3.25rem] leading-[1.1] tracking-tight text-wine-900 md:text-[4rem] lg:text-[4.5rem]">
            Cada taça conta uma história.{' '}
            <span className="bg-gradient-to-r from-wine-600 to-wine-500 bg-clip-text text-transparent">
              Guarde a sua.
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-[18px] leading-relaxed text-wine-600/80">
            Você não precisa ser sommelier para criar memórias com vinho.
            Escaneie, registre e compartilhe momentos especiais com sua família.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
            <Button
              size="lg"
              className="h-[56px] rounded-full bg-gradient-to-r from-wine-700 to-wine-800 px-9 text-[16px] font-semibold shadow-xl shadow-wine-700/25 transition-all duration-300 hover:shadow-2xl hover:shadow-wine-700/30"
            >
              Baixar Grátis
              <ArrowRight className="ml-2.5 h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="lg"
              className="h-[56px] px-8 text-[16px] font-medium text-wine-600 transition-all duration-300 hover:bg-wine-100/50 hover:text-wine-700"
            >
              Ver como funciona
              <ArrowDown className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Social Proof */}
        <div className="pb-16 pt-20">
          <SocialProof />
        </div>
      </div>
    </section>
  )
}

export default Hero
