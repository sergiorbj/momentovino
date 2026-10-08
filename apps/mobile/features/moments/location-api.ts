import { i18n } from '../i18n/config'

export interface LocationResult {
  id: string
  displayName: string
  city: string
  country: string
  latitude: number
  longitude: number
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse'
const USER_AGENT = 'MomentoVino/1.0'

type PopularCity = {
  id: string
  city: string
  cityKey?: 'tuscany' | 'rome' | 'tokyo'
  country: 'AR' | 'FR' | 'IT' | 'US' | 'PT' | 'AU' | 'ZA' | 'ES' | 'CL' | 'JP'
  latitude: number
  longitude: number
}

const POPULAR_CITIES: PopularCity[] = [
  { id: 'pop-1', city: 'Mendoza', country: 'AR', latitude: -32.8895, longitude: -68.8458 },
  { id: 'pop-2', city: 'Bordeaux', country: 'FR', latitude: 44.8378, longitude: -0.5792 },
  { id: 'pop-3', city: 'Toscana', cityKey: 'tuscany', country: 'IT', latitude: 43.3506, longitude: 11.0169 },
  { id: 'pop-4', city: 'Napa Valley', country: 'US', latitude: 38.2975, longitude: -122.2869 },
  { id: 'pop-5', city: 'Porto', country: 'PT', latitude: 41.1579, longitude: -8.6291 },
  { id: 'pop-6', city: 'Barossa Valley', country: 'AU', latitude: -34.5609, longitude: 138.952 },
  { id: 'pop-7', city: 'Stellenbosch', country: 'ZA', latitude: -33.9322, longitude: 18.8602 },
  { id: 'pop-8', city: 'Rioja', country: 'ES', latitude: 42.2871, longitude: -2.5396 },
  { id: 'pop-9', city: 'Santiago', country: 'CL', latitude: -33.4489, longitude: -70.6693 },
  { id: 'pop-10', city: 'Tokyo', cityKey: 'tokyo', country: 'JP', latitude: 35.6762, longitude: 139.6503 },
  { id: 'pop-11', city: 'Paris', country: 'FR', latitude: 48.8566, longitude: 2.3522 },
  { id: 'pop-12', city: 'Rome', cityKey: 'rome', country: 'IT', latitude: 41.9028, longitude: 12.4964 },
]

function popularCities(): LocationResult[] {
  return POPULAR_CITIES.map((c) => {
    const city = c.cityKey ? i18n.t(`location.cities.${c.cityKey}`) : c.city
    const country = i18n.t(`location.countries.${c.country}`)
    return { id: c.id, displayName: `${city}, ${country}`, city, country, latitude: c.latitude, longitude: c.longitude }
  })
}

/** Nominatim returns place names in this language, falling back to English. */
function acceptLanguage(): string {
  return encodeURIComponent(`${i18n.language},en`)
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    state?: string
    country?: string
  }
}

function extractCity(addr: NominatimResult['address']): string {
  if (!addr) return ''
  return addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.state ?? ''
}

export async function searchLocations(query: string): Promise<LocationResult[]> {
  const trimmed = query.trim()
  const popular = popularCities()
  if (trimmed.length === 0) return popular

  const filtered = popular.filter((c) =>
    c.displayName.toLowerCase().includes(trimmed.toLowerCase())
  )

  try {
    const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(trimmed)}&format=json&limit=8&addressdetails=1&accept-language=${acceptLanguage()}`
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!res.ok) return filtered

    const data: NominatimResult[] = await res.json()

    const apiResults: LocationResult[] = data.map((item) => ({
      id: `nom-${item.place_id}`,
      displayName: item.display_name.split(',').slice(0, 3).join(',').trim(),
      city: extractCity(item.address),
      country: item.address?.country ?? '',
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }))

    const seen = new Set(apiResults.map((r) => r.id))
    const merged = [...apiResults]
    for (const pop of filtered) {
      if (!seen.has(pop.id)) merged.push(pop)
    }

    return merged.slice(0, 10)
  } catch {
    return filtered
  }
}

interface NominatimReverseResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: NominatimResult['address']
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<LocationResult | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8_000)
  try {
    const url = `${NOMINATIM_REVERSE}?lat=${latitude}&lon=${longitude}&format=jsonv2&zoom=10&addressdetails=1&accept-language=${acceptLanguage()}`
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    })
    if (!res.ok) return null

    const data: NominatimReverseResult = await res.json()
    if (!data || !data.lat || !data.lon) return null

    const city = extractCity(data.address)
    const country = data.address?.country ?? ''
    const displayName =
      city && country
        ? `${city}, ${country}`
        : data.display_name.split(',').slice(0, 3).join(',').trim()

    return {
      id: `nom-rev-${data.place_id}`,
      displayName,
      city,
      country,
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
