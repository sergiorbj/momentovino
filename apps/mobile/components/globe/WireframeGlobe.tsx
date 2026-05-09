import { useCallback, useMemo, useRef } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl'
import * as THREE from 'three'

import {
  buildCountryOutlines,
  buildGridLines,
  layoutPinsWithoutOverlap,
} from './globe-utils'
import { DEFAULT_GLOBE_CONFIG, type GlobeConfig, type MomentPin } from './types'
import { buildWineGlassGeometry } from './wine-glass-geometry'

// Underdamped spring for the scale-in pop. Damping ratio ≈ 0.64 → ~9% overshoot.
const SPRING_STIFFNESS = 200
const SPRING_DAMPING = 18
const SPRING_DT = 1 / 60
const SPRING_EPSILON = 0.001

function createRenderer(gl: ExpoWebGLRenderingContext): THREE.WebGLRenderer {
  const glAny = gl as unknown as {
    drawingBufferWidth: number
    drawingBufferHeight: number
  }
  const canvas = {
    width: glAny.drawingBufferWidth,
    height: glAny.drawingBufferHeight,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    clientHeight: glAny.drawingBufferHeight,
  }
  return new THREE.WebGLRenderer({
    canvas: canvas as unknown as HTMLCanvasElement,
    context: gl as unknown as WebGLRenderingContext,
  })
}

interface WireframeGlobeProps {
  pins?: MomentPin[]
  onPress?: () => void
  config?: Partial<GlobeConfig>
  /** World-space height of the wine-glass pin (sphere radius is 1.0). */
  pinScale?: number
  /** Fires once after the first frame has rendered on this GL context. */
  onReady?: () => void
}

interface PinAnim {
  mesh: THREE.Mesh
  scale: number
  velocity: number
  done: boolean
}

export default function WireframeGlobe({
  pins = [],
  onPress,
  config: configOverrides,
  pinScale = 0.16,
  onReady,
}: WireframeGlobeProps) {
  const cfg = { ...DEFAULT_GLOBE_CONFIG, ...configOverrides }
  const rafRef = useRef<number>(0)
  // Pin ids that have already been animated in this component instance.
  // Persists across GLView remounts (the parent React component doesn't
  // remount, only its GLView child does via `pinsKey`), so adding a new pin
  // doesn't re-animate every other pin already on the globe.
  const seenPinIdsRef = useRef<Set<string>>(new Set())

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      const renderer = createRenderer(gl)
      const glAny = gl as unknown as {
        drawingBufferWidth?: number
        drawingBufferHeight?: number
      }
      const bufferWidth: number = glAny.drawingBufferWidth ?? cfg.size * 2
      const bufferHeight: number = glAny.drawingBufferHeight ?? cfg.size * 2
      renderer.setSize(bufferWidth, bufferHeight)
      renderer.setClearColor(0x000000, 0)

      const scene = new THREE.Scene()

      const camera = new THREE.PerspectiveCamera(
        45,
        bufferWidth / bufferHeight,
        0.1,
        100
      )
      camera.position.z = 3.2

      const globeGroup = new THREE.Group()
      scene.add(globeGroup)

      // Wireframe sphere (subtle background mesh)
      const sphereGeo = new THREE.SphereGeometry(1, 32, 32)
      const edgesGeo = new THREE.EdgesGeometry(sphereGeo)
      const edgesMat = new THREE.LineBasicMaterial({
        color: cfg.lineColor,
        transparent: true,
        opacity: cfg.lineOpacity,
      })
      globeGroup.add(new THREE.LineSegments(edgesGeo, edgesMat))

      // Grid lines (meridians + parallels)
      buildGridLines(globeGroup, cfg.lineColor, cfg.gridOpacity)

      // Country outlines (thick tube lines from real Natural Earth data)
      buildCountryOutlines(globeGroup, cfg.lineColor, cfg.countryLineRadius)

      // 3D wine-glass pins. Geometry + material are shared across every pin
      // (vertex colors carry the gradient, no lighting required). Per-pin
      // we just create a Mesh, place + orient + scale it.
      const glassGeometry = buildWineGlassGeometry()
      const glassMaterial = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      })

      const laidOut = layoutPinsWithoutOverlap(pins, pinScale)
      const Y_AXIS = new THREE.Vector3(0, 1, 0)
      const pinAnims: PinAnim[] = []

      for (const { pin, position } of laidOut) {
        const mesh = new THREE.Mesh(glassGeometry, glassMaterial)
        mesh.position.copy(position)
        mesh.quaternion.setFromUnitVectors(Y_AXIS, position.clone().normalize())

        const isNew = !seenPinIdsRef.current.has(pin.id)
        seenPinIdsRef.current.add(pin.id)

        if (isNew) {
          mesh.scale.setScalar(0)
          pinAnims.push({ mesh, scale: 0, velocity: 0, done: false })
        } else {
          mesh.scale.setScalar(pinScale)
        }

        globeGroup.add(mesh)
      }

      globeGroup.rotation.x = 0.2

      let readyFired = false
      const animate = () => {
        rafRef.current = requestAnimationFrame(animate)
        globeGroup.rotation.y += cfg.rotationSpeed

        for (const anim of pinAnims) {
          if (anim.done) continue
          const force =
            -SPRING_STIFFNESS * (anim.scale - 1) -
            SPRING_DAMPING * anim.velocity
          anim.velocity += force * SPRING_DT
          anim.scale += anim.velocity * SPRING_DT
          if (
            Math.abs(anim.scale - 1) < SPRING_EPSILON &&
            Math.abs(anim.velocity) < SPRING_EPSILON
          ) {
            anim.scale = 1
            anim.velocity = 0
            anim.done = true
          }
          anim.mesh.scale.setScalar(anim.scale * pinScale)
        }

        renderer.render(scene, camera)
        gl.endFrameEXP()
        if (!readyFired) {
          readyFired = true
          onReady?.()
        }
      }

      animate()
    },
    [pins, cfg, pinScale, onReady]
  )

  // `GLView.onContextCreate` only fires once per mount. If the `pins` prop
  // arrives later (or changes), the scene stays frozen with whatever pins
  // were passed at mount time. Forcing a re-mount via a `key` derived from
  // the pin identities keeps the scene in sync. The `seenPinIdsRef` outside
  // ensures previously-rendered pins skip the spring-in on remount.
  const pinsKey = useMemo(
    () => pins.map((p) => `${p.id}:${p.latitude}:${p.longitude}`).join('|'),
    [pins]
  )

  return (
    <View style={[styles.container, { width: cfg.size, height: cfg.size }]}>
      <Pressable onPress={onPress} style={StyleSheet.absoluteFill}>
        <GLView
          key={pinsKey}
          style={StyleSheet.absoluteFill}
          onContextCreate={onContextCreate}
        />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 9999,
    overflow: 'hidden',
  },
})
