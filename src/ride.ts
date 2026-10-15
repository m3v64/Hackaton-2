// Gesimuleerde rit over de berekende route.
// Er is geen echte taximeter of GPS-koppeling: de taxi "rijdt" versneld over de route,
// en de meterprijs wordt berekend met dezelfde tarieven als de schatting vooraf.

import type { LngLat, Route } from './api/ors'
import { calculatePrice, type Range } from './pricing'

/** Hoeveel keer sneller dan echt de simulatie loopt. 20 min rijden duurt dan 40 seconden. */
export const SIMULATION_SPEED = 30

/** Echt verkeer is zelden precies zoals berekend: de rit duurt 95% tot 125% van de route-tijd. */
const TRAFFIC_FACTOR = { min: 0.95, max: 1.25 }

export type Ride = {
  route: Route
  /** Hoe lang deze rit in werkelijkheid duurt, in seconden */
  duration: number
}

export type RideStatus = {
  /** Verstreken ritduur in seconden */
  elapsed: number
  /** Gereden afstand in meters */
  driven: number
  remainingDistance: number
  /** Resterende tijd in seconden */
  remainingTime: number
  /** Voortgang tussen 0 en 1 */
  progress: number
  /** Meterprijs tot nu toe */
  price: number
  /** Verwachte eindprijs in hele euro's; de marge wordt kleiner naarmate de rit vordert */
  finalPriceEstimate: Range
  arrived: boolean
}

export function startRide(route: Route): Ride {
  const factor = TRAFFIC_FACTOR.min + Math.random() * (TRAFFIC_FACTOR.max - TRAFFIC_FACTOR.min)
  return { route, duration: route.duration * factor }
}

/** Stand van de rit na een aantal (gesimuleerde) seconden. */
export function getRideStatus(ride: Ride, elapsed: number): RideStatus {
  const time = Math.min(elapsed, ride.duration)
  const progress = time / ride.duration
  const driven = ride.route.distance * progress
  const price = calculatePrice(driven, time).total

  // Verwachte eindprijs: wat er al op de meter staat plus de rest van de route volgens planning.
  const remainingPlanned = ride.route.duration * (1 - progress)
  const projected = calculatePrice(ride.route.distance, time + remainingPlanned).total
  const margin = 0.1 * (1 - progress)

  return {
    elapsed: time,
    driven,
    remainingDistance: ride.route.distance - driven,
    remainingTime: ride.duration - time,
    progress,
    price,
    finalPriceEstimate: {
      min: Math.max(Math.floor(price), Math.floor(projected * (1 - margin))),
      max: Math.ceil(projected * (1 + margin)),
    },
    arrived: time >= ride.duration,
  }
}

const EARTH_RADIUS_M = 6_371_000

/** Afstand in meters tussen twee coördinaten (haversine). */
function distanceBetween([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

// De opgetelde afstanden langs een route veranderen niet, dus die berekenen we één keer per route.
const cumulativeCache = new WeakMap<LngLat[], number[]>()

function cumulativeDistances(coordinates: LngLat[]): number[] {
  let cumulative = cumulativeCache.get(coordinates)
  if (!cumulative) {
    cumulative = [0]
    for (let i = 1; i < coordinates.length; i++) {
      cumulative.push(cumulative[i - 1] + distanceBetween(coordinates[i - 1], coordinates[i]))
    }
    cumulativeCache.set(coordinates, cumulative)
  }
  return cumulative
}

export type RouteSplit = {
  driven: LngLat[]
  remaining: LngLat[]
  /** Huidige positie van de taxi */
  position: LngLat
}

/** Knipt de route op het punt waar de taxi bij deze voortgang (0–1) is. */
export function splitRoute(coordinates: LngLat[], progress: number): RouteSplit {
  const cumulative = cumulativeDistances(coordinates)
  const target = cumulative[cumulative.length - 1] * Math.min(Math.max(progress, 0), 1)

  // Eerste punt dat voorbij de taxi ligt
  let next = cumulative.findIndex((d) => d >= target)
  if (next <= 0) next = progress <= 0 ? 0 : coordinates.length - 1

  const prev = Math.max(next - 1, 0)
  const segment = cumulative[next] - cumulative[prev]
  const t = segment > 0 ? (target - cumulative[prev]) / segment : 0
  const position: LngLat = [
    coordinates[prev][0] + (coordinates[next][0] - coordinates[prev][0]) * t,
    coordinates[prev][1] + (coordinates[next][1] - coordinates[prev][1]) * t,
  ]

  return {
    driven: [...coordinates.slice(0, prev + 1), position],
    remaining: [position, ...coordinates.slice(next)],
    position,
  }
}
