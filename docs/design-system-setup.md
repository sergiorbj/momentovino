# MomentoVino Design System Setup

## Overview

This document describes the design system architecture for MomentoVino, which supports both web (Next.js + shadcn/ui) and mobile (React Native + NativeWind) applications with shared design tokens.

## Architecture: Hybrid Approach

### Strategy: Shared Tokens + Separate Components

We use a **hybrid approach** that provides:
- ✅ **Visual consistency** across web and mobile
- ✅ **Platform-appropriate** components (HTML for web, native views for mobile)
- ✅ **Single source of truth** for design tokens
- ✅ **Independent evolution** of each platform

**Why this approach?**
- shadcn/ui (web) and React Native components are fundamentally different technologies
- But design tokens (colors, spacing, fonts, radii) can be synchronized
- This allows visual consistency without forcing incompatible component sharing

## Directory Structure

```
momentovino/
├── packages/
│   └── design-tokens/              # 🎨 Shared design tokens (NEW)
│       ├── package.json
│       ├── tokens.json             # Single source of truth
│       ├── web.css                 # CSS variables for web
│       ├── mobile.ts               # TypeScript constants for mobile
│       └── README.md
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── globals.css         # Imports @momentovino/design-tokens
│   │   │   └── styleguide/         # Design system documentation
│   │   │       ├── layout.tsx      # Styleguide layout with sidebar
│   │   │       ├── navigation.ts   # Sidebar navigation config
│   │   │       └── page.tsx        # Design tokens showcase
│   │   ├── components/
│   │   │   └── ui/                 # shadcn/ui components (web-only)
│   │   └── components.json         # shadcn configuration
│   │
│   └── mobile/
│       ├── global.css              # Imports @momentovino/design-tokens
│       ├── components/
│       │   └── ui/                 # React Native components (mobile-only)
│       └── lib/
│           └── utils.ts            # cn() utility for className merging
```

## What We Share

### ✅ Shared Design Tokens

All design tokens are defined once in `/packages/design-tokens/tokens.json` and consumed by both apps:

- **Colors**: Primary, secondary, neutrals, semantic (success, error, warning, info)
- **Typography**: Font families, sizes, weights, line heights
- **Spacing**: Consistent spacing scale (0, 1, 2, 4, 8, 12, 16, 24, 32, etc.)
- **Border Radius**: Rounding values (none, sm, md, lg, xl, full)
- **Shadows**: Elevation system
- **Semantic Naming**: Consistent naming (primary, muted, accent, destructive, etc.)

### ❌ What We DON'T Share

- **Components**: Web uses React DOM elements, mobile uses React Native primitives
- **Component Libraries**: shadcn (web) vs custom RN components (mobile)
- **Implementation Details**: Different rendering engines and interaction patterns

## Design Token Format

### tokens.json Structure

```json
{
  "colors": {
    "primary": {
      "50": "#f0f9ff",
      "100": "#e0f2fe",
      "200": "#bae6fd",
      "300": "#7dd3fc",
      "400": "#38bdf8",
      "500": "#0ea5e9",    // DEFAULT
      "600": "#0284c7",
      "700": "#0369a1",
      "800": "#075985",
      "900": "#0c4a6e"
    },
    "neutral": {
      "50": "#fafafa",
      "100": "#f5f5f5",
      // ... up to 900
    },
    "semantic": {
      "success": "#10b981",
      "error": "#ef4444",
      "warning": "#f59e0b",
      "info": "#3b82f6"
    }
  },
  "spacing": {
    "0": "0",
    "1": "0.25rem",   // 4px
    "2": "0.5rem",    // 8px
    "3": "0.75rem",   // 12px
    "4": "1rem",      // 16px
    "6": "1.5rem",    // 24px
    "8": "2rem",      // 32px
    "12": "3rem",     // 48px
    "16": "4rem"      // 64px
  },
  "borderRadius": {
    "none": "0",
    "sm": "0.125rem",  // 2px
    "DEFAULT": "0.25rem", // 4px
    "md": "0.375rem",  // 6px
    "lg": "0.5rem",    // 8px
    "xl": "0.75rem",   // 12px
    "2xl": "1rem",     // 16px
    "full": "9999px"
  },
  "typography": {
    "fontFamily": {
      "sans": ["DM Sans", "system-ui", "sans-serif"],
      "serif": ["DM Serif Display", "Georgia", "serif"],
      "mono": ["JetBrains Mono", "Courier New", "monospace"]
    },
    "fontUsage": {
      "titles": { "family": "serif", "weight": "400" },
      "logo": { "family": "serif", "weight": "400" },
      "subtitles": { "family": "sans", "weight": "500" },
      "body": { "family": "sans", "weight": "400" },
      "buttons": { "family": "sans", "weight": "600" }
    },
    "fontSize": {
      "xs": "0.75rem",   // 12px
      "sm": "0.875rem",  // 14px
      "base": "1rem",    // 16px
      "lg": "1.125rem",  // 18px
      "xl": "1.25rem",   // 20px
      "2xl": "1.5rem",   // 24px
      "3xl": "1.875rem", // 30px
      "4xl": "2.25rem"   // 36px
    }
  }
}
```

## How Tokens Flow to Apps

### Web App Flow

```
tokens.json
    ↓
web.css (CSS custom properties)
    ↓
apps/web/app/globals.css (@import)
    ↓
shadcn components use CSS variables
    ↓
Rendered in browser
```

**Example** - `web.css`:
```css
:root {
  --color-primary-50: #f0f9ff;
  --color-primary-500: #0ea5e9;
  --color-primary-900: #0c4a6e;

  --spacing-1: 0.25rem;
  --spacing-4: 1rem;

  --radius-lg: 0.5rem;
}
```

### Mobile App Flow

```
tokens.json
    ↓
mobile.ts (TypeScript constants)
    ↓
NativeWind imports CSS variables
    ↓
React Native components
    ↓
Rendered natively (iOS/Android)
```

**Example** - `mobile.ts`:
```typescript
export const colors = {
  primary: {
    50: '#f0f9ff',
    500: '#0ea5e9',
    900: '#0c4a6e',
  },
} as const

export const spacing = {
  1: 4,   // px
  4: 16,  // px
} as const
```

## Usage Examples

### Web (shadcn/ui)

```tsx
// apps/web/components/ui/button.tsx
import { cn } from '@/lib/utils'

export function Button({ className, ...props }) {
  return (
    <button
      className={cn(
        "bg-primary text-primary-foreground",  // Uses CSS variables
        "rounded-lg px-4 py-2",                 // Uses spacing tokens
        className
      )}
      {...props}
    />
  )
}
```

### Mobile (React Native + NativeWind)

```tsx
// apps/mobile/components/ui/button.tsx
import { Pressable, Text } from 'react-native'
import { cn } from '@/lib/utils'

export function Button({ className, ...props }) {
  return (
    <Pressable
      className={cn(
        "bg-primary",              // Uses same CSS variable names
        "rounded-lg px-4 py-2",    // Uses same spacing scale
        className
      )}
      {...props}
    >
      <Text className="text-primary-foreground">...</Text>
    </Pressable>
  )
}
```

## Adding New Design Tokens

### Step 1: Update tokens.json

```json
{
  "colors": {
    "brand": {
      "wine": "#722F37",  // New wine color
      "gold": "#D4AF37"   // New gold accent
    }
  }
}
```

### Step 2: Regenerate Output Files

Run the token generator script (to be created):
```bash
cd packages/design-tokens
npm run generate
```

This will update:
- `web.css` with new CSS variables
- `mobile.ts` with new TypeScript constants

### Step 3: Use in Apps

**Web**:
```tsx
<div className="bg-brand-wine text-brand-gold">Wine Gold</div>
```

**Mobile**:
```tsx
<View className="bg-brand-wine">
  <Text className="text-brand-gold">Wine Gold</Text>
</View>
```

## Component Development Guidelines

### Web Components (shadcn/ui)

1. **Install** via CLI: `npx shadcn@latest add button`
2. **Components go in**: `/apps/web/components/ui/`
3. **Use CSS variables**: All colors reference `--color-*` variables
4. **Tailwind utilities**: Use spacing, radius from theme
5. **Customize freely**: shadcn components are yours to modify

### Mobile Components (React Native)

1. **Create manually** in `/apps/mobile/components/ui/`
2. **Use Pressable** instead of Button
3. **Use View** instead of div
4. **Use Text** for all text content
5. **Apply NativeWind classes**: Same names as web (bg-primary, text-lg, etc.)
6. **Match web behavior**: Same props, same visual appearance

### Component Parity Checklist

| Component | Web (shadcn) | Mobile (RN) | Notes |
|-----------|--------------|-------------|-------|
| Button    | ✅           | ✅          | Same variants (primary, secondary, outline) |
| Card      | ✅           | ✅          | Same padding and shadow |
| Badge     | ✅           | ✅          | Same size variants |
| Alert     | ✅           | ⏳          | Coming soon |
| Input     | ✅           | ⏳          | Uses TextInput on mobile |

## Styleguide Access

### Web Styleguide

Navigate to `/styleguide` in your web app:
```
http://localhost:3000/styleguide
```

**Features**:
- 📊 All design tokens (colors, typography, spacing)
- 🎨 Color palette with copy-to-clipboard
- 🔤 Typography scale preview
- 📏 Spacing and radius examples
- 🧩 All installed components
- 🌓 Dark mode toggle

### Mobile Styleguide

*(Not included in this phase - coming later if needed)*

## Benefits of This Architecture

### 1. Visual Consistency
Both apps look identical because they share:
- Exact same color hex codes
- Same spacing values
- Same typography scale
- Same border radius values

### 2. Maintainability
Change a color once in `tokens.json` → both apps update automatically

### 3. Platform Optimization
- Web uses HTML buttons, inputs, forms
- Mobile uses native touchables, text inputs
- Each feels natural on its platform

### 4. Type Safety
TypeScript types are generated for all tokens:
```typescript
import { colors, spacing } from '@momentovino/design-tokens'

// TypeScript knows all available tokens
colors.primary[500]  // ✅ Valid
colors.primary[1000] // ❌ Type error
```

### 5. Independent Evolution
- Add web-only components (e.g., complex data tables)
- Add mobile-only components (e.g., gesture-based cards)
- Neither platform blocks the other

## Design Token Categories

### Colors

#### Primary Colors
Brand colors used for primary actions, links, focus states

#### Neutral/Gray Colors
Used for text, borders, backgrounds, disabled states

#### Semantic Colors
- **Success**: Green - confirmations, success messages
- **Error**: Red - errors, destructive actions
- **Warning**: Yellow/Orange - warnings, caution
- **Info**: Blue - informational messages

#### Surface Colors
- **Background**: Main page background
- **Card**: Elevated surfaces
- **Popover**: Floating elements (tooltips, dropdowns)

### Typography

#### Font Families
- **Serif**: DM Serif Display - Used for titles, logos, and headings
- **Sans**: DM Sans - Primary UI font for body text, buttons, and subtitles
- **Mono**: JetBrains Mono - Code and monospace content

#### Font Usage Guide
| Element | Font | Weight |
|---------|------|--------|
| Titles/Logo | DM Serif Display | Regular (400) |
| Subtitles | DM Sans | Medium (500) |
| Body Text | DM Sans | Regular (400) |
| Buttons/CTAs | DM Sans | Semi-Bold (600) |

#### Font Sizes
xs, sm, base, lg, xl, 2xl, 3xl, 4xl (12px to 36px)

#### Font Weights
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

### Spacing

Based on 4px grid:
- 1 = 4px
- 2 = 8px
- 4 = 16px
- 8 = 32px
- 12 = 48px

### Border Radius

- **none**: 0 - sharp corners
- **sm**: 2px - subtle rounding
- **DEFAULT**: 4px - standard
- **lg**: 8px - pronounced
- **xl**: 12px - very round
- **full**: 9999px - pills/circles

## Implementation Workflow

### Phase 1: Extract Tokens from Design
1. Analyze design screenshot/Figma
2. Extract color palette
3. Identify typography scale
4. Determine spacing rhythm
5. Note border radius style

### Phase 2: Create Token Package
1. Create `/packages/design-tokens/`
2. Write `tokens.json` with extracted values
3. Generate `web.css`
4. Generate `mobile.ts`
5. Create package.json with exports

### Phase 3: Setup Web
1. Run `npx shadcn@latest init`
2. Update `globals.css` to import tokens
3. Install shadcn components
4. Create styleguide pages

### Phase 4: Setup Mobile
1. Update `global.css` to import tokens
2. Configure `tailwind.config.js`
3. Create matching UI components
4. Update utils with cn() helper

### Phase 5: Validate
1. Compare apps visually
2. Test dark mode (if applicable)
3. Verify spacing consistency
4. Document any platform differences

## File Organization

### Design Tokens Package

```
packages/design-tokens/
├── package.json           # Exports web.css and mobile.ts
├── tokens.json            # Source of truth
├── web.css                # Generated CSS variables
├── mobile.ts              # Generated TypeScript constants
├── scripts/
│   └── generate.ts        # Token generator script
└── README.md              # Usage documentation
```

### Web App

```
apps/web/
├── app/
│   ├── globals.css        # @import '@momentovino/design-tokens/web.css'
│   ├── layout.tsx         # Font configuration
│   └── styleguide/
│       ├── layout.tsx     # Sidebar navigation
│       ├── navigation.ts  # Navigation config
│       └── page.tsx       # Token showcase
├── components/
│   └── ui/                # shadcn components
├── lib/
│   └── utils.ts           # cn() helper
└── components.json        # shadcn config
```

### Mobile App

```
apps/mobile/
├── global.css             # @import '@momentovino/design-tokens/web.css'
├── app/
│   └── _layout.tsx        # Font configuration
├── components/
│   └── ui/                # React Native components
├── lib/
│   └── utils.ts           # cn() helper
└── tailwind.config.js     # Extends with CSS variables
```

## Troubleshooting

### Colors not appearing correctly

**Problem**: Colors show as gray or default values

**Solution**:
1. Check that `@import '@momentovino/design-tokens/web.css'` is in globals.css
2. Verify package.json has `"@momentovino/design-tokens": "workspace:*"`
3. Run `pnpm install` from root to link workspace package

### Mobile fonts don't match web

**Problem**: Font families differ between platforms

**Solution**:
1. Check expo-font is installed: `expo install expo-font`
2. Load custom fonts in `_layout.tsx`
3. Configure font in `tailwind.config.js` fontFamily

### Spacing feels off

**Problem**: Components have inconsistent padding/margins

**Solution**:
1. Use Tailwind spacing utilities (p-4, m-2, gap-6)
2. Don't use arbitrary values like `p-[13px]`
3. Stick to spacing scale (0, 1, 2, 3, 4, 6, 8, 12, 16)

## Next Steps

After initial setup:

1. **Add more components** as needed (forms, modals, navigation)
2. **Create mobile styleguide** if desired
3. **Setup dark mode** with color scheme variants
4. **Add animation tokens** (durations, easings)
5. **Document component usage** with examples
6. **Create Storybook/Docusaurus** for comprehensive docs (optional)

## References

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Design Tokens Community Group](https://www.w3.org/community/design-tokens/)
