import * as THREE from 'three'

// Wine-glass silhouette in normalized local space: x = radius, y = height.
// y=0 is the base (sits on the globe surface), y=1 is the rim. The shape is
// revolved around the Y axis to form a 3D mesh.
const PROFILE: Array<[number, number]> = [
  [0.0, 0.0],
  [0.3, 0.0],
  [0.3, 0.025],
  [0.05, 0.06],
  [0.04, 0.42],
  [0.06, 0.5],
  [0.22, 0.6],
  [0.3, 0.7],
  [0.28, 0.85],
  [0.24, 1.0],
]

const RADIAL_SEGMENTS = 24

// Three-stop gradient — base darker, mid is brand WINE, rim slightly lifted.
// Painted into vertex colors so we read volume without needing a light rig.
const COLOR_BASE = new THREE.Color('#3F1A20')
const COLOR_MID = new THREE.Color('#722F37')
const COLOR_RIM = new THREE.Color('#A85560')

function sampleGradient(t: number, out: THREE.Color): void {
  if (t < 0.5) {
    out.copy(COLOR_BASE).lerp(COLOR_MID, t * 2)
  } else {
    out.copy(COLOR_MID).lerp(COLOR_RIM, (t - 0.5) * 2)
  }
}

export function buildWineGlassGeometry(): THREE.BufferGeometry {
  const points = PROFILE.map(([r, y]) => new THREE.Vector2(r, y))
  const geometry = new THREE.LatheGeometry(points, RADIAL_SEGMENTS)

  const positionAttr = geometry.attributes.position
  const count = positionAttr.count
  const colors = new Float32Array(count * 3)
  const tmp = new THREE.Color()

  let minY = Infinity
  let maxY = -Infinity
  for (let i = 0; i < count; i++) {
    const y = positionAttr.getY(i)
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const span = maxY - minY || 1

  for (let i = 0; i < count; i++) {
    const t = (positionAttr.getY(i) - minY) / span
    sampleGradient(t, tmp)
    colors[i * 3] = tmp.r
    colors[i * 3 + 1] = tmp.g
    colors[i * 3 + 2] = tmp.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}
