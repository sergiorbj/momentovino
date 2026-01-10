import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MomentoVino',
  description: 'Wine tracking and event management app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
