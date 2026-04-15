 # Mobile Moments Screen — 3D Wireframe Globe

## Overview

The Moments screen is the first tab in the MomentoVino mobile app. Its centerpiece is an interactive 3D wireframe globe rendered with **expo-gl + expo-three + Three.js**. The globe spins continuously, displays pins at the geographic coordinates of registered wine moments, and navigates to a moments list when tapped.

## Visual Style

The globe follows a **line-art / wireframe** aesthetic:

- Pure outline rendering — no textures, fills, or shading
- Grid composed of meridians (longitude) and parallels (latitude)
- Simplified continent outlines drawn as polylines
- All lines use the brand wine color (`#722F37` — `colors.primary.500`)
- Screen background remains warm beige (`#F5EBE0`)
- Moment pins rendered as small elevated spheres in wine color

## Technology Stack

| Package | Purpose |
|---------|---------|
| `expo-gl` | Provides `GLView`, a native OpenGL-ES surface exposed as a WebGL context |
| `expo-three` | Bridges Three.js to the Expo GL context (`Renderer`) |
| `three` | 3D rendering engine — geometry, materials, camera, animation loop |

These run natively via OpenGL-ES (not a WebView), so performance is comparable to a native 3D view.

> **Important:** `expo-gl` does not render reliably on iOS Simulator or Android emulators. All testing must happen on a physical device.

## Architecture

```
moments.tsx (screen)
  └── <WireframeGlobe />  (components/globe/WireframeGlobe.tsx)
        ├── GLView (expo-gl)  →  Renderer (expo-three)
        │     └── THREE.Scene
        │           ├── Globe wireframe   (SphereGeometry + EdgesGeometry → LineSegments)
        │           ├── Grid lines        (meridians + parallels as THREE.Line)
        │           ├── Continent outlines (simplified polylines as THREE.Line)
        │           └── Moment pins       (small SphereGeometry meshes at lat/lng)
        ├── globe-utils.ts   →  latLngToVector3(), continent data, grid builders
        └── types.ts         →  MomentPin, GlobeConfig interfaces
```

## File Structure

```
apps/mobile/
├── app/(tabs)/moments.tsx              # Screen — uses WireframeGlobe
└── components/globe/
    ├── WireframeGlobe.tsx              # Main 3D component
    ├── globe-utils.ts                  # Coordinate math + continent data
    └── types.ts                        # TypeScript interfaces
```

## Component API

### `<WireframeGlobe />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pins` | `MomentPin[]` | `[]` | Array of moment pins to render on the globe |
| `size` | `number` | `280` | Width and height of the GL canvas (square) |
| `rotationSpeed` | `number` | `0.003` | Radians added to `rotation.y` per frame |
| `lineColor` | `string` | `'#722F37'` | Color for all wireframe lines |
| `pinColor` | `string` | `'#722F37'` | Color for moment pin markers |
| `onPress` | `() => void` | — | Called when the globe is tapped |

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

### Globe wireframe

1. Create `THREE.SphereGeometry(1, 32, 32)`
2. Derive `THREE.EdgesGeometry` from it to extract edge lines
3. Render as `THREE.LineSegments` with `LineBasicMaterial({ color, transparent: true, opacity: 0.15 })` — this gives a subtle sphere mesh grid

### Meridians and parallels

Drawn as separate `THREE.Line` objects with higher opacity (0.4) to form the prominent grid:

- **6 meridians** at 30° intervals (0°, 30°, 60°, 90°, 120°, 150°)
- **5 parallels** at 30° intervals (-60°, -30°, 0°, 30°, 60°)

Each line is a circle (or arc) computed from trigonometry at a radius of 1.001 (slightly above the sphere surface to avoid z-fighting).

### Continent outlines

Simplified polyline data (~500 coordinate pairs total) covering the recognizable shapes of:

- North America
- South America
- Europe
- Africa
- Asia
- Oceania / Australia

Each continent is an array of `[lat, lng]` pairs converted to 3D positions via `latLngToVector3()` and rendered as `THREE.Line` with full opacity.

### Moment pins

For each pin in the `pins` prop:

1. Compute 3D position with `latLngToVector3(lat, lng, 1.02)` (slightly above surface)
2. Create a small `THREE.SphereGeometry(0.025, 8, 8)` mesh with `MeshBasicMaterial({ color: pinColor })`
3. Position the mesh at the computed coordinates
4. Add to the globe group so it rotates together

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

All visual decisions align with the project design tokens (see `packages/design-tokens/tokens.json` and `docs/design-system-setup.md`):

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

The moments screen layout remains unchanged around the globe:

```
┌─────────────────────────┐
│  Moments          [🔍]  │  ← Header (DM Serif Display)
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
│ │ + Register New Moment│ │  ← CTA button
│ └─────────────────────┘ │
└─────────────────────────┘
```

## Performance Considerations

- Sphere subdivision: 32 segments (good visual quality, low poly count)
- Continent outlines: ~500 total points across all continents (not full GeoJSON detail)
- Pin geometry: 8 segments per pin sphere (they are tiny)
- Single draw call group: all globe elements in one `THREE.Group` for efficient rotation
- No post-processing, shadows, or lighting needed (line materials are unlit)

## Future Enhancements

- Drag-to-rotate interaction (orbit controls)
- Pin tap detection with raycasting to show moment details
- Animated pin entrance (scale-in when globe loads)
- Dynamic continent highlighting based on moment density
- Smooth camera zoom when navigating to moments list
