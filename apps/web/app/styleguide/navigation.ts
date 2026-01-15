export interface NavItem {
  name: string
  href: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navigation: NavSection[] = [
  {
    title: 'Foundation',
    items: [{ name: 'Design Tokens', href: '/styleguide' }],
  },
  {
    title: 'Components',
    items: [
      { name: 'Button', href: '/styleguide/components/button' },
      { name: 'Card', href: '/styleguide/components/card' },
      { name: 'Badge', href: '/styleguide/components/badge' },
      { name: 'Alert', href: '/styleguide/components/alert' },
    ],
  },
]
