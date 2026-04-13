export interface MomentPin {
  id: string
  latitude: number
  longitude: number
  label?: string
}

export interface GlobeConfig {
  size: number
  rotationSpeed: number
  lineColor: string
  pinColor: string
  lineOpacity: number
  gridOpacity: number
  /** Tube radius for country outline lines (thicker = more visible) */
  countryLineRadius: number
}

export const DEFAULT_GLOBE_CONFIG: GlobeConfig = {
  size: 280,
  rotationSpeed: 0.003,
  lineColor: '#722F37',
  pinColor: '#722F37',
  lineOpacity: 0.12,
  gridOpacity: 0.3,
  countryLineRadius: 0.004,
}
