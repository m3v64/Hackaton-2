import { useMemo } from 'react'
import type { Place } from '../api/ors'
import { CheckIcon, OriginIcon, PinIcon } from '../components/icons'
import MapView from '../components/MapView'
import { estimatePriceRange, formatDistance, formatEuro, formatMinutes } from '../pricing'
import { splitRoute, type Ride, type RideStatus } from '../ride'
import './SummaryScreen.css'

type Props = {
  from: Place
  to: Place
  ride: Ride
  status: RideStatus
  onClose: () => void
}

function SummaryScreen({ from, to, ride, status, onClose }: Props) {
  const estimate = estimatePriceRange(ride.route.distance, ride.route.duration)
  const estimateMiddle = (estimate.min + estimate.max) / 2
  const difference = status.price - estimateMiddle
  // Vaste referentie, zodat de kaart niet bij elke render opnieuw inzoomt
  const drivenRoute = useMemo(
    () => splitRoute(ride.route.coordinates, status.progress).driven,
    [ride, status.progress],
  )

  const verdict =
    status.price < estimate.min
      ? 'Onder schatting'
      : status.price > estimate.max
        ? 'Boven schatting'
        : 'Binnen schatting'

  return (
    <>
      <main className="app-content">
        <div className="summary-price-row">
          <div>
            <p className="price-label">Eindprijs</p>
            <p className="price-big">{formatEuro(status.price)}</p>
          </div>
          <p className="summary-badge">
            {verdict === 'Binnen schatting' && <CheckIcon />}
            {verdict}
          </p>
        </div>

        <MapView
          className="summary-map"
          from={from}
          to={to}
          route={drivenRoute}
          progress={1}
          label="Gereden route"
          showLegend={false}
        />

        <div className="card summary-addresses">
          <p>
            <OriginIcon /> {from.label}
          </p>
          <p>
            <PinIcon /> {to.label}
          </p>
          {!status.arrived && <p className="summary-early">Rit eerder beëindigd, vóór de bestemming.</p>}
        </div>

        <div className="stat-grid">
          <div className="stat-tile">
            <p className="stat-label">Totale tijd</p>
            <p className="stat-value">{formatMinutes(status.elapsed)}</p>
          </div>
          <div className="stat-tile">
            <p className="stat-label">Gereden afstand</p>
            <p className="stat-value">{formatDistance(status.driven)}</p>
          </div>
        </div>

        <p className="section-label">Vergelijking met vooraf</p>
        <div className="card">
          <dl className="summary-comparison">
            <dt>Eerdere schatting</dt>
            <dd>
              € {estimate.min}–{estimate.max}
            </dd>
            <dt>Werkelijke eindprijs</dt>
            <dd className="summary-comparison-strong">{formatEuro(status.price)}</dd>
            <dt>Verschil t.o.v. midden</dt>
            <dd>
              {difference >= 0 ? '+ ' : '− '}
              {formatEuro(Math.abs(difference))}
            </dd>
          </dl>
        </div>
      </main>
      <footer className="app-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Sluit ritoverzicht
        </button>
      </footer>
    </>
  )
}

export default SummaryScreen
