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

const POPULAR_CITIES: LocationResult[] = [
  { id: 'pop-1', displayName: 'Mendoza, Argentina', city: 'Mendoza', country: 'Argentina', latitude: -32.8895, longitude: -68.8458 },
  { id: 'pop-2', displayName: 'Bordeaux, France', city: 'Bordeaux', country: 'France', latitude: 44.8378, longitude: -0.5792 },
  { id: 'pop-3', displayName: 'Toscana, Italy', city: 'Toscana', country: 'Italy', latitude: 43.3506, longitude: 11.0169 },
  { id: 'pop-4', displayName: 'Napa Valley, United States', city: 'Napa', country: 'United States', latitude: 38.2975, longitude: -122.2869 },
  { id: 'pop-5', displayName: 'Porto, Portugal', city: 'Porto', country: 'Portugal', latitude: 41.1579, longitude: -8.6291 },
  { id: 'pop-6', displayName: 'Barossa Valley, Australia', city: 'Barossa Valley', country: 'Australia', latitude: -34.5609, longitude: 138.9520 },
  { id: 'pop-7', displayName: 'Stellenbosch, South Africa', city: 'Stellenbosch', country: 'South Africa', latitude: -33.9322, longitude: 18.8602 },
  { id: 'pop-8', displayName: 'Rioja, Spain', city: 'Rioja', country: 'Spain', latitude: 42.2871, longitude: -2.5396 },
  { id: 'pop-9', displayName: 'Santiago, Chile', city: 'Santiago', country: 'Chile', latitude: -33.4489, longitude: -70.6693 },
  { id: 'pop-10', displayName: 'Tokyo, Japan', city: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 },
  { id: 'pop-11', displayName: 'Paris, France', city: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522 },
  { id: 'pop-12', displayName: 'Rome, Italy', city: 'Rome', country: 'Italy', latitude: 41.9028, longitude: 12.4964 },
]

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
  if (trimmed.length === 0) return POPULAR_CITIES

  const filtered = POPULAR_CITIES.filter((c) =>
    c.displayName.toLowerCase().includes(trimmed.toLowerCase())
  )

  try {
    const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(trimmed)}&format=json&limit=8&addressdetails=1&accept-language=en`
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
    const url = `${NOMINATIM_REVERSE}?lat=${latitude}&lon=${longitude}&format=jsonv2&zoom=10&addressdetails=1&accept-language=en`
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
