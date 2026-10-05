// Tarieven en prijsberekening van de taximeter.
// De meter rekent op afstand én tijd: starttarief + prijs per km + prijs per minuut.

export const TARIFF = {
  /** Vast bedrag bij instappen, in euro */
  start: 4.15,
  /** Euro per gereden kilometer */
  perKm: 2.25,
  /** Euro per minuut ritduur */
  perMinute: 0.28,
}

/**
 * Marges rond de berekende route voor de schatting vooraf.
 * Drukte of omrijden maakt een rit vaker langer dan korter, daarom is de bovengrens ruimer.
 */
const DURATION_MARGIN = { min: 0.9, max: 1.2 }
const PRICE_MARGIN = { min: 0.9, max: 1.12 }

export type PriceBreakdown = {
  start: number
  distance: number
  time: number
  total: number
}

export type Range = { min: number; max: number }

/** Meterprijs voor een afgelegde afstand (meters) en verstreken tijd (seconden). */
export function calculatePrice(distanceMeters: number, durationSeconds: number): PriceBreakdown {
  const distance = (distanceMeters / 1000) * TARIFF.perKm
  const time = (durationSeconds / 60) * TARIFF.perMinute
  return {
    start: TARIFF.start,
    distance,
    time,
    total: TARIFF.start + distance + time,
  }
}

/** Geschatte reistijd in hele minuten. */
export function estimateDurationRange(durationSeconds: number): Range {
  const minutes = durationSeconds / 60
  return {
    min: Math.max(1, Math.floor(minutes * DURATION_MARGIN.min)),
    max: Math.ceil(minutes * DURATION_MARGIN.max),
  }
}

/** Geschatte prijsvork in hele euro's. */
export function estimatePriceRange(distanceMeters: number, durationSeconds: number): Range {
  const { total } = calculatePrice(distanceMeters, durationSeconds)
  return {
    min: Math.floor(total * PRICE_MARGIN.min),
    max: Math.ceil(total * PRICE_MARGIN.max),
  }
}

const euroFormatter = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })

/** Bijv. "€ 18,60" */
export function formatEuro(amount: number): string {
  return euroFormatter.format(amount)
}

/** Bijv. "7,8 km" */
export function formatDistance(meters: number): string {
  return `${(meters / 1000).toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
}

/** Bijv. "22 min" */
export function formatMinutes(seconds: number): string {
  return `${Math.round(seconds / 60)} min`
}
