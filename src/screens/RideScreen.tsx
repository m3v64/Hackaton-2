import type { LngLat, Place } from '../api/ors'
import { AlertIcon, ArrowRightIcon } from '../components/icons'
import MapView from '../components/MapView'
import { formatDistance, formatEuro } from '../pricing'
import { SIMULATION_SPEED, type RideStatus } from '../ride'
import './RideScreen.css'

type Props = {
  from: Place
  to: Place
  route: LngLat[]
  status: RideStatus
  onEndRide: () => void
  onArrived: () => void
}

function RideScreen({ from, to, route, status, onEndRide, onArrived }: Props) {
  const percentage = Math.round(status.progress * 100)
  const remainingMinutes = Math.ceil(status.remainingTime / 60)

  return (
    <>
      <MapView className="map-banner" from={from} to={to} route={route} progress={status.progress} />
      <main className="app-content">
        <p className="ride-simulation-note">Gesimuleerde rit · {SIMULATION_SPEED}× versneld</p>

        <div className="ride-price-row">
          <div>
            <p className="price-label">{status.arrived ? 'Eindprijs' : 'Huidige prijs'}</p>
            <p className="price-big" aria-live="off">
              {formatEuro(status.price)}
            </p>
          </div>
          {!status.arrived && (
            <div className="stat-tile">
              <p className="stat-label">Geschatte eindprijs</p>
              <p className="stat-value">
                € {status.finalPriceEstimate.min}–{status.finalPriceEstimate.max}
              </p>
            </div>
          )}
        </div>

        <div className="stat-grid">
          <div className="stat-tile">
            <p className="stat-label">Resterende tijd</p>
            <p className="stat-value">{remainingMinutes} min</p>
          </div>
          <div className="stat-tile">
            <p className="stat-label">Nog te rijden</p>
            <p className="stat-value">{formatDistance(status.remainingDistance)}</p>
          </div>
        </div>

        <div className="ride-progress">
          <div className="ride-progress-labels">
            <span>Voortgang rit</span>
            <span>{percentage}%</span>
          </div>
          <div
            className="ride-progress-track"
            role="progressbar"
            aria-label="Voortgang rit"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage}
          >
            <div className="ride-progress-bar" style={{ width: `${percentage}%` }} />
          </div>
        </div>

        {status.arrived && <p className="ride-arrived">Je bent aangekomen op je bestemming.</p>}
      </main>
      <footer className="app-footer">
        {status.arrived ? (
          <button type="button" className="btn btn-primary" onClick={onArrived}>
            <ArrowRightIcon /> Bekijk ritoverzicht
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={onEndRide}>
              <AlertIcon /> Probleem melden of rit beëindigen
            </button>
            <p className="ride-footer-note">Opent opties; beëindigen vraagt altijd om bevestiging.</p>
          </>
        )}
      </footer>
    </>
  )
}

export default RideScreen
