import { useEffect, useState } from 'react'
import { getRoute, type Place, type Route } from '../api/ors'
import { NavigateIcon, OriginIcon, PinIcon } from '../components/icons'
import {
  calculatePrice,
  estimateDurationRange,
  estimatePriceRange,
  formatDistance,
  formatEuro,
} from '../pricing'
import './EstimateScreen.css'

type Props = {
  from: Place
  to: Place
  route: Route | null
  onRouteLoaded: (route: Route) => void
  onStart: () => void
}

function EstimateScreen({ from, to, route, onRouteLoaded, onStart }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (route) return

    const controller = new AbortController()
    getRoute(from.coordinates, to.coordinates, controller.signal)
      .then(onRouteLoaded)
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message)
      })

    return () => controller.abort()
  }, [from, to, route, onRouteLoaded, attempt])

  function retry() {
    setError(null)
    setAttempt((a) => a + 1)
  }

  return (
    <>
      <main className="app-content">
        <div className="card trip-addresses">
          <div className="trip-address">
            <OriginIcon />
            <div>
              <p className="stat-label">Vertrek</p>
              <p className="trip-address-label">{from.label}</p>
            </div>
          </div>
          <div className="trip-address">
            <PinIcon />
            <div>
              <p className="stat-label">Bestemming</p>
              <p className="trip-address-label">{to.label}</p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="card estimate-status">
            <p className="screen-error">{error}</p>
            <button type="button" className="btn btn-secondary" onClick={retry}>
              Opnieuw proberen
            </button>
          </div>
        ) : !route ? (
          <p className="card estimate-status">Route en prijs berekenen…</p>
        ) : (
          <EstimateDetails route={route} />
        )}
      </main>
      <footer className="app-footer">
        <button type="button" className="btn btn-primary" disabled={!route} onClick={onStart}>
          <NavigateIcon /> Start en volg deze rit
        </button>
      </footer>
    </>
  )
}

function EstimateDetails({ route }: { route: Route }) {
  const duration = estimateDurationRange(route.duration)
  const price = estimatePriceRange(route.distance, route.duration)
  const breakdown = calculatePrice(route.distance, route.duration)

  return (
    <>
      <div className="stat-grid">
        <div className="stat-tile">
          <p className="stat-label">Geschatte tijd</p>
          <p className="stat-value">
            {duration.min}–{duration.max} min
          </p>
        </div>
        <div className="stat-tile">
          <p className="stat-label">Afstand</p>
          <p className="stat-value">{formatDistance(route.distance)}</p>
        </div>
      </div>

      <div className="price-range">
        <p className="price-range-label">Geschatte prijsvork</p>
        <p className="price-range-value">
          € {price.min}–{price.max}
        </p>
        <p className="price-range-note">Op basis van normaal verkeer · geen vaste prijs</p>
      </div>

      <p className="section-label">Zo is de schatting opgebouwd</p>
      <div className="card">
        <dl className="breakdown">
          <dt>Starttarief</dt>
          <dd>{formatEuro(breakdown.start)}</dd>
          <dt>Kilometertarief · {formatDistance(route.distance)}</dt>
          <dd>± {formatEuro(breakdown.distance)}</dd>
          <dt>
            Tijdtarief · {duration.min}–{duration.max} min
          </dt>
          <dd>± {formatEuro(breakdown.time)}</dd>
        </dl>
        <p className="breakdown-note">
          De meter loopt op tijd én afstand. Drukte of omrijden kan de eindprijs veranderen.
        </p>
      </div>
    </>
  )
}

export default EstimateScreen
