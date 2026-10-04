// Client voor de openrouteservice API van HeiGIT.
// Docs: https://openrouteservice.org/dev/#/api-docs

const BASE_URL = 'https://api.openrouteservice.org'
const API_KEY = import.meta.env.VITE_ORS_API_KEY

/** [lengtegraad, breedtegraad], zoals GeoJSON en ORS dat gebruiken. */
export type LngLat = [number, number]

export type Place = {
  label: string
  coordinates: LngLat
}

export type Route = {
  /** Afstand in meters */
  distance: number
  /** Duur in seconden */
  duration: number
  /** Punten van de route, van vertrek naar bestemming */
  coordinates: LngLat[]
}

type GeocodeResponse = {
  features: { properties: { label: string }; geometry: { coordinates: LngLat } }[]
}

type DirectionsResponse = {
  features: {
    properties: { summary: { distance: number; duration: number } }
    geometry: { coordinates: LngLat[] }
  }[]
}

function assertApiKey() {
  if (!API_KEY) {
    throw new Error('VITE_ORS_API_KEY ontbreekt. Zet je key in .env.local.')
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  assertApiKey()
  const response = await fetch(`${BASE_URL}${path}`, init)
  if (!response.ok) {
    throw new Error(`Routeservice gaf een fout (${response.status}).`)
  }
  return response.json() as Promise<T>
}

function toPlaces(data: GeocodeResponse): Place[] {
  return data.features.map((f) => ({
    label: f.properties.label,
    coordinates: f.geometry.coordinates,
  }))
}

/** Adressuggesties terwijl de gebruiker typt, beperkt tot Nederland. */
export async function searchPlaces(text: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({
    api_key: API_KEY,
    text,
    'boundary.country': 'NL',
    size: '5',
  })
  const data = await request<GeocodeResponse>(`/geocode/autocomplete?${params}`, { signal })
  return toPlaces(data)
}

/** Zoekt het adres dat bij een coördinaat hoort, bijvoorbeeld de huidige locatie. */
export async function reverseGeocode([lng, lat]: LngLat): Promise<Place | null> {
  const params = new URLSearchParams({
    api_key: API_KEY,
    'point.lon': String(lng),
    'point.lat': String(lat),
    size: '1',
  })
  const data = await request<GeocodeResponse>(`/geocode/reverse?${params}`)
  return toPlaces(data)[0] ?? null
}

/** Berekent de autoroute tussen vertrek en bestemming. */
export async function getRoute(from: LngLat, to: LngLat): Promise<Route> {
  const data = await request<DirectionsResponse>('/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      Authorization: API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ coordinates: [from, to] }),
  })

  const feature = data.features[0]
  if (!feature) {
    throw new Error('Geen route gevonden tussen deze adressen.')
  }

  return {
    distance: feature.properties.summary.distance,
    duration: feature.properties.summary.duration,
    coordinates: feature.geometry.coordinates,
  }
}
