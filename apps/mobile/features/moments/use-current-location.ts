import { useCallback, useEffect, useState } from 'react'
import * as Location from 'expo-location'

import { reverseGeocode, type LocationResult } from './location-api'

export type CurrentLocationStatus =
  | 'idle'
  | 'requesting'
  | 'fetching'
  | 'ready'
  | 'denied'
  | 'error'

interface CachedState {
  status: CurrentLocationStatus
  result: LocationResult | null
}

let cached: CachedState | null = null
let inFlight: Promise<CachedState> | null = null

const GPS_TIMEOUT_MS = 10_000
const TOTAL_TIMEOUT_MS = 15_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

async function resolveCurrentLocation(): Promise<CachedState> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      return { status: 'denied', result: null }
    }

    const pos = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      GPS_TIMEOUT_MS,
    )
    const result = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
    if (!result) return { status: 'error', result: null }
    return { status: 'ready', result }
  } catch (err) {
    console.warn('[use-current-location] resolve failed', err)
    return { status: 'error', result: null }
  }
}

export function useCurrentLocation() {
  const [state, setState] = useState<CachedState>(
    cached ?? { status: 'idle', result: null },
  )

  const run = useCallback(async () => {
    if (cached && (cached.status === 'ready' || cached.status === 'denied')) {
      setState(cached)
      return
    }
    if (inFlight) {
      const resolved = await inFlight
      setState(resolved)
      return
    }
    setState({ status: 'requesting', result: null })
    inFlight = (async () => {
      setState({ status: 'fetching', result: null })
      try {
        return await withTimeout(resolveCurrentLocation(), TOTAL_TIMEOUT_MS)
      } catch {
        return { status: 'error', result: null } as CachedState
      }
    })()
    try {
      const resolved = await inFlight
      cached = resolved
      setState(resolved)
    } finally {
      inFlight = null
    }
  }, [])

  useEffect(() => {
    void run()
  }, [run])

  const refresh = useCallback(async () => {
    cached = null
    inFlight = null
    await run()
  }, [run])

  return { status: state.status, result: state.result, refresh } as const
}
