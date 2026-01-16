'use client'

import { ArrowRight, ArrowDown, Star, Smartphone, Users } from 'lucide-react'
import { motion } from 'motion/react'
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
          <stat.icon className={`h-5 w-5 ${stat.highlight ? 'fill-sandy-clay text-sandy-clay' : 'text-wine-plum'}`} />
          <span className="font-semibold text-mauve-bark">{stat.value}</span>
          <span className="text-wine-plum">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-linen">
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
      <div className="absolute left-1/4 top-1/4 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-radial from-wine-plum/20 via-transparent to-transparent blur-3xl" />
      <div className="absolute right-1/4 top-1/3 h-[500px] w-[500px] translate-x-1/2 rounded-full bg-gradient-radial from-sandy-clay/15 via-transparent to-transparent blur-3xl" />

      {/* Main content */}
      <div className="relative mx-auto max-w-7xl px-6 pt-36 lg:px-8">

        {/* Headline */}
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-7 font-serif text-[3.25rem] leading-[1.1] tracking-tight text-mauve-bark md:text-[4rem] lg:text-[4.5rem]">
            Cada garrafa conta uma história.{' '}
            <span className="text-wine-plum">
              Guarde a sua.
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-[18px] leading-relaxed text-mauve-bark">
            Você não precisa ser sommelier para criar memórias com vinho.
            Escaneie, registre e compartilhe momentos especiais com sua família.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Button
                size="lg"
                className="h-[56px] rounded-full bg-wine-plum px-9 text-[16px] font-semibold shadow-xl shadow-wine-plum/25 transition-shadow duration-300 hover:shadow-2xl hover:shadow-wine-plum/35"
              >
                Baixar Grátis
                <motion.span
                  className="ml-2 inline-flex"
                  animate={{ y: [0, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                >
                  <ArrowDown className="h-5 w-5" />
                </motion.span>
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Button
                variant="ghost"
                size="lg"
                className="h-[56px] px-8 text-[16px] font-medium text-wine-plum transition-colors duration-300 hover:bg-transparent hover:text-wine-plum"
              >
                Ver como funciona
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
