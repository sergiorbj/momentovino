import { useCallback, useMemo, useRef } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl'
import { Asset } from 'expo-asset'
import * as THREE from 'three'

import {
  buildCountryOutlines,
  buildGridLines,
  latLngToVector3,
} from './globe-utils'
import { DEFAULT_GLOBE_CONFIG, type GlobeConfig, type MomentPin } from './types'

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

function loadAssetTexture(moduleId: number): THREE.Texture {
  const texture = new THREE.Texture()
  const asset = Asset.fromModule(moduleId)
  const apply = (a: Asset) => {
    texture.image = {
      data: a,
      width: a.width ?? 1,
      height: a.height ?? 1,
    } as unknown as HTMLImageElement
    ;(texture as unknown as { isDataTexture: boolean }).isDataTexture = true
    texture.needsUpdate = true
  }
  if (asset.localUri && asset.width && asset.height) {
    apply(asset)
  } else {
    asset.downloadAsync().then(apply).catch(() => {})
  }
  return texture
}

interface WireframeGlobeProps {
  pins?: MomentPin[]
  onPress?: () => void
  config?: Partial<GlobeConfig>
  /**
   * Optional icon (from `require('...png')`) to render at each pin as a
   * camera-facing sprite, tinted with `config.pinColor`. When omitted, pins
   * fall back to the original small spheres.
   */
  pinIcon?: number
  /** Sprite scale in world units when `pinIcon` is provided. Defaults to 0.1. */
  pinIconScale?: number
  /** Fires once after the first frame has rendered on this GL context. */
  onReady?: () => void
}

export default function WireframeGlobe({
  pins = [],
  onPress,
  config: configOverrides,
  pinIcon,
  pinIconScale = 0.1,
  onReady,
}: WireframeGlobeProps) {
  const cfg = { ...DEFAULT_GLOBE_CONFIG, ...configOverrides }
  const rafRef = useRef<number>(0)

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

      // Moment pins — wine-glass icons stuck radially into the globe like
      // darts. The PNG already has colour + alpha baked in, so we just
      // upload it as the material's map. Each plane stands perpendicular
      // to the globe surface with its base touching the surface and the
      // cup pointing outward into space.
      if (pinIcon != null) {
        const pinTexture = loadAssetTexture(pinIcon)
        const pinGeo = new THREE.PlaneGeometry(pinIconScale, pinIconScale)
        const GLOBAL_UP = new THREE.Vector3(0, 1, 0)
        for (const pin of pins) {
          const surfacePos = latLngToVector3(pin.latitude, pin.longitude, 1.0)
          const outward = surfacePos.clone().normalize()

          // Pick a tangent "right" direction; fall back near the poles where
          // outward is parallel to the global up axis.
          let tangentRight = new THREE.Vector3().crossVectors(GLOBAL_UP, outward)
          if (tangentRight.lengthSq() < 1e-6) {
            tangentRight.set(1, 0, 0)
          } else {
            tangentRight.normalize()
          }

          const material = new THREE.MeshBasicMaterial({
            map: pinTexture,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            alphaTest: 0.5,
          })

          const mesh = new THREE.Mesh(pinGeo, material)
          // The PNG has ~25% transparent padding around the silhouette; we
          // offset by that amount so the visible glass base lands on the
          // surface, then add a small 5% lift so it hovers just above
          // instead of touching.
          mesh.position.copy(surfacePos).addScaledVector(outward, pinIconScale * 0.3)
          // Orient: local +Y (image top = wine glass cup) aligned with
          // outward (radial), local +Z (plane normal) aligned with a tangent
          // direction so the glass is viewed face-on from the side.
          mesh.up.copy(outward)
          mesh.lookAt(mesh.position.clone().sub(tangentRight))
          globeGroup.add(mesh)
        }
      } else {
        const pinMat = new THREE.MeshBasicMaterial({ color: cfg.pinColor })
        for (const pin of pins) {
          const pos = latLngToVector3(pin.latitude, pin.longitude, 1.04)
          const pinGeo = new THREE.SphereGeometry(0.03, 8, 8)
          const mesh = new THREE.Mesh(pinGeo, pinMat)
          mesh.position.copy(pos)
          globeGroup.add(mesh)
        }
      }

      globeGroup.rotation.x = 0.2

      let readyFired = false
      const animate = () => {
        rafRef.current = requestAnimationFrame(animate)
        globeGroup.rotation.y += cfg.rotationSpeed
        renderer.render(scene, camera)
        gl.endFrameEXP()
        if (!readyFired) {
          readyFired = true
          onReady?.()
        }
      }

      animate()
    },
    [pins, cfg, pinIcon, pinIconScale, onReady]
  )

  // `GLView.onContextCreate` only fires once per mount (when the WebGL
  // context is created). If the `pins` prop arrives later (e.g. fetched
  // async after first render), the scene stays frozen with whatever pins
  // were passed on mount. Forcing a re-mount via a `key` derived from the
  // pin identities keeps the scene in sync with the current `pins` list.
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
