import * as THREE from 'three'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'

import countriesTopology from './countries-110m.json'
import type { MomentPin } from './types'

const DEG2RAD = Math.PI / 180

/**
 * Convert geographic (lat, lng) to Three.js world position on a sphere.
 */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number
): THREE.Vector3 {
  const phi = (90 - lat) * DEG2RAD
  const theta = (lng + 180) * DEG2RAD
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

// ---------------------------------------------------------------------------
// Grid lines (meridians + parallels)
// ---------------------------------------------------------------------------

function buildMeridian(
  lng: number,
  radius: number,
  material: THREE.LineBasicMaterial
): THREE.Line {
  const points: THREE.Vector3[] = []
  for (let lat = -90; lat <= 90; lat += 3) {
    points.push(latLngToVector3(lat, lng, radius))
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    material
  )
}

function buildParallel(
  lat: number,
  radius: number,
  material: THREE.LineBasicMaterial
): THREE.Line {
  const points: THREE.Vector3[] = []
  for (let lng = -180; lng <= 180; lng += 3) {
    points.push(latLngToVector3(lat, lng, radius))
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    material
  )
}

export function buildGridLines(
  group: THREE.Group,
  color: string,
  opacity: number
): void {
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  })
  const r = 1.001

  for (let lng = 0; lng < 180; lng += 30) {
    group.add(buildMeridian(lng, r, material))
    if (lng !== 0) group.add(buildMeridian(-lng, r, material))
  }

  for (const lat of [-60, -30, 0, 30, 60]) {
    group.add(buildParallel(lat, r, material))
  }
}

// ---------------------------------------------------------------------------
// Country outlines from Natural Earth 110m TopoJSON
// ---------------------------------------------------------------------------

/**
 * Extract all polygon rings from the countries-110m TopoJSON data.
 * Returns arrays of [lng, lat] coordinate rings.
 */
function extractCountryRings(): [number, number][][] {
  const topo = countriesTopology as unknown as Topology<{
    countries: GeometryCollection
  }>
  const geojson = topojson.feature(topo, topo.objects.countries) as unknown as {
    type: 'FeatureCollection'
    features: Array<{
      geometry:
        | { type: 'Polygon'; coordinates: [number, number][][] }
        | { type: 'MultiPolygon'; coordinates: [number, number][][][] }
        | { type: string; coordinates: unknown }
    }>
  }
  const rings: [number, number][][] = []

  for (const feature of geojson.features) {
    const { geometry } = feature
    if (geometry.type === 'Polygon') {
      for (const ring of (geometry as { coordinates: [number, number][][] }).coordinates) {
        rings.push(ring)
      }
    } else if (geometry.type === 'MultiPolygon') {
      for (const polygon of (geometry as { coordinates: [number, number][][][] }).coordinates) {
        for (const ring of polygon) {
          rings.push(ring)
        }
      }
    }
  }

  return rings
}

/**
 * Build a thick line (tube mesh) from an array of 3D points.
 */
function buildTubeLine(
  points: THREE.Vector3[],
  material: THREE.MeshBasicMaterial,
  tubeRadius: number
): THREE.Mesh | null {
  if (points.length < 2) return null

  const curve = new THREE.CatmullRomCurve3(points, false, 'chordal')
  const segments = Math.max(points.length * 2, 8)
  const geometry = new THREE.TubeGeometry(curve, segments, tubeRadius, 4, false)
  return new THREE.Mesh(geometry, material)
}

/**
 * Build country outlines from real Natural Earth TopoJSON data.
 * Uses TubeGeometry for thick, visible lines.
 */
export function buildCountryOutlines(
  group: THREE.Group,
  color: string,
  tubeRadius: number
): void {
  const material = new THREE.MeshBasicMaterial({ color })
  const rings = extractCountryRings()
  const r = 1.003

  for (const ring of rings) {
    if (ring.length < 3) continue

    const points = ring.map(([lng, lat]) => latLngToVector3(lat, lng, r))
    const mesh = buildTubeLine(points, material, tubeRadius)
    if (mesh) group.add(mesh)
  }
}

// ---------------------------------------------------------------------------
// Pin layout — push overlapping pins apart along the surface
// ---------------------------------------------------------------------------

export interface LaidOutPin {
  pin: MomentPin
  /** Position on the unit sphere (radius 1). */
  position: THREE.Vector3
}

// Glass conflict footprint comes from the BOWL width (the widest part of the
// silhouette in wine-glass-geometry.ts), not the glass height. The height
// pokes outward radially and doesn't overlap neighbors.
const GLASS_BOWL_HALF_WIDTH = 0.3
const GLOBAL_UP = new THREE.Vector3(0, 1, 0)

/**
 * Rotate unit vector `p` along the great circle directly away from unit
 * vector `q` by `delta` radians. Returns a new vector. If `p ≈ q`, returns
 * a clone of `p` unchanged (caller is expected to dedupe before this).
 */
function rotateAwayFromOther(
  p: THREE.Vector3,
  q: THREE.Vector3,
  delta: number
): THREE.Vector3 {
  // Axis = q × p. Right-hand rotation around this axis moves p away from q
  // along the great-circle that connects them.
  const axis = new THREE.Vector3().crossVectors(q, p)
  if (axis.lengthSq() < 1e-12) return p.clone()
  axis.normalize()
  return p.clone().applyAxisAngle(axis, delta)
}

/**
 * Lay out pins so glasses don't visually overlap.
 *
 * Each glass occupies an angular footprint of `α = bowlHalfWidth * pinScale`
 * on the unit sphere. Any pair closer than `2α + gap` is "conflicting".
 *
 * Resolution is **pairwise iterative repulsion**: each conflicting pair is
 * pushed apart along the great-circle that connects them, just enough that
 * they no longer overlap. There is no transitive grouping or arc layout —
 * pin A and pin C never end up shoulder-to-shoulder unless they actually
 * conflict directly. This avoids the "queue" artifact where chains of
 * loosely-related pins line up in a single file.
 *
 * Pre-pass: pins at identical lat/lng are scattered on a tiny tangent ring
 * so the repulsion step has well-defined push directions for them.
 */
export function layoutPinsWithoutOverlap(
  pins: MomentPin[],
  pinScale: number
): LaidOutPin[] {
  if (pins.length === 0) return []

  const alpha = GLASS_BOWL_HALF_WIDTH * pinScale
  const gap = alpha * 0.1
  const minSpacing = 2 * alpha + gap
  const cosThreshold = Math.cos(minSpacing)

  const positions = pins.map((p) =>
    latLngToVector3(p.latitude, p.longitude, 1)
  )

  // 1. Scatter exact-coordinate duplicates onto a tangent ring so repulsion
  //    has a real direction to push along.
  const dupBuckets = new Map<string, number[]>()
  for (let i = 0; i < pins.length; i++) {
    const key = `${pins[i].latitude.toFixed(6)},${pins[i].longitude.toFixed(6)}`
    const bucket = dupBuckets.get(key)
    if (bucket) bucket.push(i)
    else dupBuckets.set(key, [i])
  }
  for (const indices of dupBuckets.values()) {
    if (indices.length < 2) continue
    indices.sort((a, b) => pins[a].id.localeCompare(pins[b].id))
    const center = positions[indices[0]].clone()
    let right = new THREE.Vector3().crossVectors(GLOBAL_UP, center)
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0)
    else right.normalize()
    const jitter = alpha * 0.5
    const n = indices.length
    for (let k = 0; k < n; k++) {
      const angle = (k / n) * Math.PI * 2
      const tangentDir = right.clone().applyAxisAngle(center, angle)
      const axis = new THREE.Vector3()
        .crossVectors(center, tangentDir)
        .normalize()
      positions[indices[k]] = center.clone().applyAxisAngle(axis, jitter)
    }
  }

  // 2. Iterative pairwise repulsion. Each conflicting pair is nudged apart;
  //    non-conflicting pins never move.
  const MAX_ITERS = 8
  for (let iter = 0; iter < MAX_ITERS; iter++) {
    let moved = false
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        const dot = positions[i].dot(positions[j])
        if (dot <= cosThreshold) continue
        const angDist = Math.acos(Math.min(1, dot))
        const halfPush = (minSpacing - angDist) / 2 + 1e-5
        const newI = rotateAwayFromOther(positions[i], positions[j], halfPush)
        const newJ = rotateAwayFromOther(positions[j], positions[i], halfPush)
        positions[i] = newI
        positions[j] = newJ
        moved = true
      }
    }
    if (!moved) break
  }

  return pins.map((p, i) => ({ pin: p, position: positions[i] }))
}
