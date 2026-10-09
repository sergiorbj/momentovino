 # Mobile Moments Screen — 3D Wireframe Globe

## Overview

The Moments screen is the first tab in the MomentoVino mobile app. Its centerpiece is an interactive 3D wireframe globe rendered with **expo-gl + Three.js**. The globe spins continuously, displays pins at the geographic coordinates of registered wine moments, and navigates to a moments list when tapped.

## Visual Style

The globe follows a **line-art / wireframe** aesthetic:

- Pure outline rendering — no textures, fills, or shading
- Grid composed of meridians (longitude) and parallels (latitude)
- Country outlines (Natural Earth 110m TopoJSON) drawn as thin tubes
- All lines use the brand wine color (`#722F37` — `colors.primary.500`)
- Screen background remains warm beige (`#F5EBE0`)
- Moment pins rendered as small 3D wine glasses in wine color, with a scale-in animation

## Technology Stack

| Package | Purpose |
|---------|---------|
| `expo-gl` | Provides `GLView`, a native OpenGL-ES surface exposed as a WebGL context |
| `three` | 3D rendering engine. A plain `THREE.WebGLRenderer` is created on the expo-gl context (`createRenderer` in `WireframeGlobe.tsx`) |

These run natively via OpenGL-ES (not a WebView), so performance is comparable to a native 3D view.

> **Important:** `expo-gl` does not render reliably on iOS Simulator or Android emulators. All testing must happen on a physical device.

## Architecture

```
moments.tsx (screen)
  └── <WireframeGlobe />  (components/globe/WireframeGlobe.tsx)
        ├── GLView (expo-gl)  →  THREE.WebGLRenderer
        │     └── THREE.Scene
        │           ├── Grid lines        (meridians + parallels)
        │           ├── Country outlines  (countries-110m.json)
        │           └── Moment pins       (wine-glass meshes at lat/lng)
        ├── globe-utils.ts          →  latLngToVector3(), buildGridLines(), buildCountryOutlines(), layoutPinsWithoutOverlap()
        ├── wine-glass-geometry.ts  →  pin mesh
        └── types.ts                →  MomentPin, GlobeConfig, DEFAULT_GLOBE_CONFIG
```

## File Structure

```
apps/mobile/
├── app/(tabs)/moments.tsx              # Screen — uses WireframeGlobe
└── components/globe/
    ├── WireframeGlobe.tsx              # Main 3D component
    ├── globe-utils.ts                  # Coordinate math, grid, outlines, pin layout
    ├── wine-glass-geometry.ts          # Pin mesh
    ├── countries-110m.json             # Country outlines (TopoJSON)
    ├── land-110m.json                  # Land outlines (TopoJSON)
    └── types.ts                        # TypeScript interfaces + defaults
```

## Component API

### `<WireframeGlobe />`

| Prop | Type | Description |
|------|------|-------------|
| `pins` | `MomentPin[]` | Moment pins to render |
| `onPress` | `() => void` | Called when the globe is tapped |
| `config` | `Partial<GlobeConfig>` | Overrides `DEFAULT_GLOBE_CONFIG`: `size` (280), `rotationSpeed` (0.003), `lineColor` / `pinColor` (`#722F37`), `lineOpacity` (0.12), `gridOpacity` (0.3), `countryLineRadius` (0.004) |
| `pinScale` | `number` | World-space height of the wine-glass pin (sphere radius is 1.0) |
| `onReady` | `() => void` | Fires once after the first frame renders |

### `MomentPin`

```typescript
interface MomentPin {
  id: string
  latitude: number
  longitude: number
  label?: string
}
```

## 3D Scene Setup

### Camera

`THREE.PerspectiveCamera` with FOV 45, positioned at z ≈ 3.2 to frame the globe with some padding. Looks at the origin (0, 0, 0).

### Meridians and parallels

Built by `buildGridLines()` and drawn with `gridOpacity`, slightly above the sphere surface to avoid z-fighting.

### Country outlines

`buildCountryOutlines()` converts `countries-110m.json` (TopoJSON) to 3D polylines via `latLngToVector3()` and renders them as thin tubes (`countryLineRadius`) with `lineOpacity`.

### Moment pins

Each pin is a wine-glass mesh (`wine-glass-geometry.ts`) placed at its lat/lng. `layoutPinsWithoutOverlap()` nudges pins that are too close. Pins scale in when the globe loads and rotate with the globe group.

### Animation loop

```
requestAnimationFrame → globeGroup.rotation.y += rotationSpeed → renderer.render(scene, camera) → gl.endFrameEXP()
```

The animation loop runs continuously while the component is mounted. Cleanup cancels the frame request on unmount.

## Coordinate Conversion

The key utility converts geographic (lat, lng) to Three.js world coordinates:

```
phi   = (90 - lat)  × π / 180
theta = (lng + 180) × π / 180

x = -(radius × sin(phi) × cos(theta))
y =   radius × cos(phi)
z =   radius × sin(phi) × sin(theta)
```

This places latitude 0° at the equator (y = 0), longitude 0° at the front of the globe, and follows the standard geographic convention where positive latitude is north.

## Design Token Alignment

All visual decisions align with the project design tokens (see `packages/design-tokens/tokens.json`):

| Element | Token | Value |
|---------|-------|-------|
| Globe lines | `colors.primary.500` | `#722F37` |
| Moment pins | `colors.primary.500` | `#722F37` |
| Screen background | (custom) | `#F5EBE0` |
| Title font | `fontUsage.titles` | DM Serif Display, 400 |
| Stat numbers | `fontUsage.titles` | DM Serif Display, 400 |
| Stat labels | `fontUsage.body` | DM Sans, 400 |
| CTA button text | `fontUsage.buttons` | DM Sans, 600 |
| CTA background | (custom, dark brown) | `#5C4033` |

## Screen Layout

Stats come from `useMomentStats()`. While the globe loads a loading state is shown, then content fades in. An atlas hint (`t('moments.atlasHint')`, `features/moments/hints.ts`) pulses under the globe until the user first taps it. Tapping the globe animates it out and opens `/moments/list` (see [mobile-moments.md](./mobile-moments.md)).

```
┌─────────────────────────┐
│  Moments                │  ← Header (DM Serif Display)
│                         │
│                         │
│       ╭─── 3D ───╮     │
│       │  Globe    │     │  ← WireframeGlobe (tappable)
│       │  spins    │     │
│       ╰───────────╯     │
│                         │
│   23      │  8   │  47  │  ← Stats row
│ Moments   │Countries│Wines│
│                         │
│ ┌─────────────────────┐ │
│ │ + Save a moment      │ │  ← CTA button (t('moments.saveCta'))
│ └─────────────────────┘ │
└─────────────────────────┘
```

## Performance Considerations

- Country outlines use the 110m (low detail) dataset
- All globe elements live in one `THREE.Group` for efficient rotation
- No post-processing, shadows, or lighting needed (line materials are unlit)

## Future Enhancements

- Drag-to-rotate interaction (orbit controls)
- Pin tap detection with raycasting to show moment details
- Smooth camera zoom when navigating to moments list
