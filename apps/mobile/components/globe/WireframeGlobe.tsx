import React, { useCallback, useRef } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl'
import { Renderer } from 'expo-three'
import * as THREE from 'three'

import {
  buildCountryOutlines,
  buildGridLines,
  latLngToVector3,
} from './globe-utils'
import { DEFAULT_GLOBE_CONFIG, type GlobeConfig, type MomentPin } from './types'

interface WireframeGlobeProps {
  pins?: MomentPin[]
  onPress?: () => void
  config?: Partial<GlobeConfig>
}

export default function WireframeGlobe({
  pins = [],
  onPress,
  config: configOverrides,
}: WireframeGlobeProps) {
  const cfg = { ...DEFAULT_GLOBE_CONFIG, ...configOverrides }
  const rafRef = useRef<number>(0)

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      const renderer = new Renderer({ gl })
      const glAny = gl as any
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

      // Moment pins
      const pinMat = new THREE.MeshBasicMaterial({ color: cfg.pinColor })
      for (const pin of pins) {
        const pos = latLngToVector3(pin.latitude, pin.longitude, 1.04)
        const pinGeo = new THREE.SphereGeometry(0.03, 8, 8)
        const mesh = new THREE.Mesh(pinGeo, pinMat)
        mesh.position.copy(pos)
        globeGroup.add(mesh)
      }

      globeGroup.rotation.x = 0.2

      const animate = () => {
        rafRef.current = requestAnimationFrame(animate)
        globeGroup.rotation.y += cfg.rotationSpeed
        renderer.render(scene, camera)
        gl.endFrameEXP()
      }

      animate()
    },
    [pins, cfg]
  )

  return (
    <View style={[styles.container, { width: cfg.size, height: cfg.size }]}>
      <Pressable onPress={onPress} style={StyleSheet.absoluteFill}>
        <GLView
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
