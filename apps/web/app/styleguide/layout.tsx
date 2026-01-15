'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navigation } from './navigation'

export default function StyleguideLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - Fixed */}
      <aside className="w-64 border-r bg-card p-6 flex flex-col gap-6 fixed top-0 left-0 h-screen overflow-y-auto">
        <div>
          <Link href="/styleguide" className="text-xl font-bold text-primary">
            MomentoVino
          </Link>
          <p className="text-sm text-muted-foreground">Design System</p>
        </div>

        <nav className="flex flex-col gap-6">
          {navigation.map(section => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">{section.title}</h3>
              <ul className="flex flex-col gap-1">
                {section.items.map(item => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'block px-3 py-2 rounded-md text-sm transition-colors',
                        pathname === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to App
          </Link>
        </div>
      </aside>

      {/* Main content - offset by sidebar width */}
      <main className="flex-1 ml-64 overflow-auto">{children}</main>
    </div>
  )
}
