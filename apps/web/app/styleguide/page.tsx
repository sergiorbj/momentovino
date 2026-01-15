'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Color swatch component
function ColorSwatch({
  name,
  variable,
  className,
}: {
  name: string
  variable: string
  className: string
}) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(variable)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copyToClipboard}
      className="flex flex-col items-center gap-2 group cursor-pointer"
    >
      <div
        className={`w-16 h-16 rounded-lg border shadow-sm transition-transform group-hover:scale-105 ${className}`}
      />
      <span className="text-xs font-medium">{name}</span>
      <span className="text-xs text-muted-foreground">{copied ? 'Copied!' : variable}</span>
    </button>
  )
}

// Color palette row
function ColorPaletteRow({
  name,
  shades,
}: {
  name: string
  shades: { shade: string; className: string; variable: string }[]
}) {
  return (
    <div className="space-y-2">
      <h4 className="font-medium capitalize">{name}</h4>
      <div className="flex flex-wrap gap-4">
        {shades.map(({ shade, className, variable }) => (
          <ColorSwatch key={shade} name={shade} variable={variable} className={className} />
        ))}
      </div>
    </div>
  )
}

export default function StyleguidePage() {
  const [isDark, setIsDark] = useState(false)

  const toggleDarkMode = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-4xl font-serif mb-2">Design Tokens</h1>
          <p className="text-lg text-muted-foreground font-medium">
            MomentoVino design system foundation - colors, typography, spacing, and more.
          </p>
        </div>
        <Button onClick={toggleDarkMode} variant="outline">
          {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </Button>
      </div>

      {/* Color Palette */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Color Palette</h2>

        {/* Primary Colors */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Primary (Wine Red)</CardTitle>
            <CardDescription>
              The main brand color used for primary actions, links, and focus states.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ColorPaletteRow
              name="wine"
              shades={[
                { shade: '50', className: 'bg-wine-50', variable: '--wine-50' },
                { shade: '100', className: 'bg-wine-100', variable: '--wine-100' },
                { shade: '200', className: 'bg-wine-200', variable: '--wine-200' },
                { shade: '300', className: 'bg-wine-300', variable: '--wine-300' },
                { shade: '400', className: 'bg-wine-400', variable: '--wine-400' },
                { shade: '500', className: 'bg-wine-500', variable: '--wine-500' },
                { shade: '600', className: 'bg-wine-600', variable: '--wine-600' },
                { shade: '700', className: 'bg-wine-700', variable: '--wine-700' },
                { shade: '800', className: 'bg-wine-800', variable: '--wine-800' },
                { shade: '900', className: 'bg-wine-900', variable: '--wine-900' },
                { shade: '950', className: 'bg-wine-950', variable: '--wine-950' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Accent Colors */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Accent (Gold)</CardTitle>
            <CardDescription>Secondary brand color for highlights and accents.</CardDescription>
          </CardHeader>
          <CardContent>
            <ColorPaletteRow
              name="gold"
              shades={[
                { shade: '50', className: 'bg-gold-50', variable: '--gold-50' },
                { shade: '100', className: 'bg-gold-100', variable: '--gold-100' },
                { shade: '200', className: 'bg-gold-200', variable: '--gold-200' },
                { shade: '300', className: 'bg-gold-300', variable: '--gold-300' },
                { shade: '400', className: 'bg-gold-400', variable: '--gold-400' },
                { shade: '500', className: 'bg-gold-500', variable: '--gold-500' },
                { shade: '600', className: 'bg-gold-600', variable: '--gold-600' },
                { shade: '700', className: 'bg-gold-700', variable: '--gold-700' },
                { shade: '800', className: 'bg-gold-800', variable: '--gold-800' },
                { shade: '900', className: 'bg-gold-900', variable: '--gold-900' },
                { shade: '950', className: 'bg-gold-950', variable: '--gold-950' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Semantic Colors */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Semantic Colors</CardTitle>
            <CardDescription>Colors for status, feedback, and states.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <ColorSwatch name="Success" variable="--success" className="bg-success" />
              <ColorSwatch name="Warning" variable="--warning" className="bg-warning" />
              <ColorSwatch name="Destructive" variable="--destructive" className="bg-destructive" />
              <ColorSwatch name="Info" variable="--info" className="bg-info" />
            </div>
          </CardContent>
        </Card>

        {/* UI Colors */}
        <Card>
          <CardHeader>
            <CardTitle>UI Colors</CardTitle>
            <CardDescription>Background, foreground, and interface colors.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <ColorSwatch name="Background" variable="--background" className="bg-background" />
              <ColorSwatch name="Foreground" variable="--foreground" className="bg-foreground" />
              <ColorSwatch name="Card" variable="--card" className="bg-card" />
              <ColorSwatch name="Muted" variable="--muted" className="bg-muted" />
              <ColorSwatch name="Border" variable="--border" className="bg-border" />
              <ColorSwatch name="Primary" variable="--primary" className="bg-primary" />
              <ColorSwatch name="Secondary" variable="--secondary" className="bg-secondary" />
              <ColorSwatch name="Accent" variable="--accent" className="bg-accent" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Typography */}
      <section className="mb-16">
        <h2 className="text-2xl font-serif mb-6">Typography</h2>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Font Families</CardTitle>
            <CardDescription>DM Serif Display for titles, DM Sans for body</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* DM Serif Display */}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">DM Serif Display (Titles & Logo)</h4>
              <p className="text-4xl font-serif">
                MomentoVino - Wine Tracking
              </p>
              <p className="text-xs text-muted-foreground mt-1">Regular 400 - Used for titles, logos, and headings</p>
            </div>

            {/* DM Sans */}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">DM Sans (Body & UI)</h4>
              <p className="text-lg">
                Regular 400: The quick brown fox jumps over the lazy dog.
              </p>
              <p className="text-lg font-medium mt-2">
                Medium 500: The quick brown fox jumps over the lazy dog.
              </p>
              <p className="text-lg font-semibold mt-2">
                Semi-Bold 600: The quick brown fox jumps over the lazy dog.
              </p>
              <p className="text-lg font-bold mt-2">
                Bold 700: The quick brown fox jumps over the lazy dog.
              </p>
            </div>

            {/* Usage Guide */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Usage Guide</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Titles/Logo</Badge>
                  <span className="font-serif">DM Serif Display (400)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Subtitles</Badge>
                  <span className="font-medium">DM Sans Medium (500)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Body Text</Badge>
                  <span>DM Sans Regular (400)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Buttons/CTAs</Badge>
                  <span className="font-semibold">DM Sans Semi-Bold (600)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Font Sizes</CardTitle>
            <CardDescription>Typography scale from xs to 4xl</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-4">
              <span className="text-xs text-muted-foreground w-12">xs</span>
              <span className="text-xs">The quick brown fox (12px)</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-xs text-muted-foreground w-12">sm</span>
              <span className="text-sm">The quick brown fox (14px)</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-xs text-muted-foreground w-12">base</span>
              <span className="text-base">The quick brown fox (16px)</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-xs text-muted-foreground w-12">lg</span>
              <span className="text-lg">The quick brown fox (18px)</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-xs text-muted-foreground w-12">xl</span>
              <span className="text-xl">The quick brown fox (20px)</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-xs text-muted-foreground w-12">2xl</span>
              <span className="text-2xl">The quick brown fox (24px)</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-xs text-muted-foreground w-12">3xl</span>
              <span className="text-3xl font-serif">The quick brown fox (30px)</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-xs text-muted-foreground w-12">4xl</span>
              <span className="text-4xl font-serif">The quick brown fox (36px)</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Spacing */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Spacing</h2>

        <Card>
          <CardHeader>
            <CardTitle>Spacing Scale</CardTitle>
            <CardDescription>Based on 4px grid system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: '1', size: '4px', className: 'w-1' },
                { name: '2', size: '8px', className: 'w-2' },
                { name: '3', size: '12px', className: 'w-3' },
                { name: '4', size: '16px', className: 'w-4' },
                { name: '6', size: '24px', className: 'w-6' },
                { name: '8', size: '32px', className: 'w-8' },
                { name: '12', size: '48px', className: 'w-12' },
                { name: '16', size: '64px', className: 'w-16' },
                { name: '24', size: '96px', className: 'w-24' },
              ].map(item => (
                <div key={item.name} className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-8">{item.name}</span>
                  <div className={`h-4 bg-primary rounded ${item.className}`} />
                  <span className="text-sm text-muted-foreground">{item.size}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Border Radius */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Border Radius</h2>

        <Card>
          <CardHeader>
            <CardTitle>Radius Scale</CardTitle>
            <CardDescription>Rounding options for corners</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              {[
                { name: 'none', className: 'rounded-none' },
                { name: 'sm', className: 'rounded-sm' },
                { name: 'DEFAULT', className: 'rounded' },
                { name: 'md', className: 'rounded-md' },
                { name: 'lg', className: 'rounded-lg' },
                { name: 'xl', className: 'rounded-xl' },
                { name: '2xl', className: 'rounded-2xl' },
                { name: 'full', className: 'rounded-full' },
              ].map(item => (
                <div key={item.name} className="flex flex-col items-center gap-2">
                  <div className={`w-16 h-16 bg-primary ${item.className}`} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Component Preview */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Component Preview</h2>

        {/* Buttons */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Various button styles and states</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Status indicators and labels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Informational messages and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTitle>Default Alert</AlertTitle>
              <AlertDescription>
                This is a default alert message for general information.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTitle>Destructive Alert</AlertTitle>
              <AlertDescription>
                This is a destructive alert for errors or warnings.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Cards</CardTitle>
            <CardDescription>Content containers with various layouts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Card Title</CardTitle>
                  <CardDescription>Card description here</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Card content goes here.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Another Card</CardTitle>
                  <CardDescription>With more content</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">More card content.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Third Card</CardTitle>
                  <CardDescription>For grid layout</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Additional content.</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
