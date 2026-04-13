import * as THREE from 'three'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'

import countriesTopology from './countries-110m.json'

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
