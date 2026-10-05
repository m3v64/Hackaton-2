import type { LngLat, Place } from '../api/ors'
import { CheckboxIcon, InfoIcon, WarningIcon } from '../components/icons'
import MapView from '../components/MapView'
import { formatEuro } from '../pricing'
import type { RideStatus } from '../ride'
import './EndRideScreen.css'

type Props = {
  from: Place
  to: Place
  route: LngLat[]
  status: RideStatus
  onCancel: () => void
  onConfirm: () => void
}

function EndRideScreen({ from, to, route, status, onCancel, onConfirm }: Props) {
  return (
    <>
      <MapView
        className="map-banner end-ride-map"
        from={from}
        to={to}
        route={route}
        progress={status.progress}
        label="Rit gepauzeerd"
      />
      <main className="app-content end-ride">
        <div className="end-ride-icon">
          <WarningIcon size={24} />
        </div>
        <h2 className="end-ride-heading">Rit nu beëindigen?</h2>
        <p className="end-ride-intro">
          De chauffeur krijgt direct een melding. Stap alleen uit op een veilige plek.
        </p>

        <div className="card end-ride-price">
          <p className="price-label">Huidige meterprijs</p>
          <p className="price-big">{formatEuro(status.price)}</p>
          <p className="end-ride-price-note">Dit wordt je voorlopige eindprijs.</p>
        </div>

        <p className="card end-ride-warning">
          <InfoIcon /> Na bevestigen stopt de prijsregistratie. Je kunt deze stap niet ongedaan maken.
        </p>
      </main>
      <footer className="app-footer end-ride-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Ga terug naar de rit
        </button>
        <button type="button" className="btn btn-primary" onClick={onConfirm}>
          <CheckboxIcon /> Ja, beëindig de rit
        </button>
      </footer>
    </>
  )
}

export default EndRideScreen
