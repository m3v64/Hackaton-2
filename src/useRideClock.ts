import { useEffect, useState } from 'react'
import { SIMULATION_SPEED, type Ride } from './ride'

const TICK_MS = 200

/**
 * Houdt bij hoeveel (gesimuleerde) seconden een rit al bezig is.
 * De klok loopt alleen als `running` waar is, zodat de rit pauzeert tijdens de bevestiging.
 */
export function useRideClock(ride: Ride | null, running: boolean): number {
  const [elapsed, setElapsed] = useState(0)

  // Nieuwe rit: begin weer bij nul.
  const [currentRide, setCurrentRide] = useState(ride)
  if (ride !== currentRide) {
    setCurrentRide(ride)
    setElapsed(0)
  }

  useEffect(() => {
    if (!ride || !running) return

    const timer = setInterval(() => {
      setElapsed((e) => Math.min(ride.duration, e + (TICK_MS / 1000) * SIMULATION_SPEED))
    }, TICK_MS)

    return () => clearInterval(timer)
  }, [ride, running])

  return elapsed
}
