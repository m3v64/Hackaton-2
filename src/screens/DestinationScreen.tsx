import { useState } from 'react'
import { reverseGeocode, type LngLat, type Place } from '../api/ors'
import AddressInput from '../components/AddressInput'
import { ArrowRightIcon, InfoIcon, LocateIcon, OriginIcon, PinIcon } from '../components/icons'
import MapView from '../components/MapView'

type Props = {
  from: Place | null
  to: Place | null
  onFromChange: (place: Place | null) => void
  onToChange: (place: Place | null) => void
  onNext: () => void
}

function DestinationScreen({ from, to, onFromChange, onToChange, onNext }: Props) {
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  /** Zet het vertrekpunt op een exact punt en zoekt het bijbehorende adres op. */
  async function setFromCoordinates(coordinates: LngLat) {
    setLocating(true)
    setLocationError(null)
    try {
      const place = await reverseGeocode(coordinates)
      onFromChange({ label: place?.label ?? 'Gekozen locatie', coordinates })
    } catch (err) {
      setLocationError((err as Error).message)
    } finally {
      setLocating(false)
    }
  }

  function locateUser() {
    if (!navigator.geolocation) {
      setLocationError('Je browser ondersteunt geen locatiebepaling.')
      return
    }

    setLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setFromCoordinates([coords.longitude, coords.latitude]),
      () => {
        setLocationError('Locatie ophalen mislukt. Geef toestemming of typ een adres.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <>
      <main className="app-content">
        <h2 className="screen-heading">Waar ga je naartoe?</h2>
        <p className="screen-intro">
          Voer je bestemming in om vooraf tijd, afstand en een transparante prijsindicatie te zien.
        </p>

        <AddressInput
          label="Vertrekpunt"
          icon={<OriginIcon />}
          placeholder="Huidige locatie of adres"
          value={from}
          onChange={onFromChange}
          action={
            <button
              type="button"
              className="icon-button"
              onClick={locateUser}
              disabled={locating}
              aria-label="Gebruik huidige locatie"
              title="Gebruik huidige locatie"
            >
              <LocateIcon />
            </button>
          }
        />
        {locating && <p className="screen-hint">Locatie ophalen…</p>}
        {locationError && <p className="screen-error">{locationError}</p>}

        <AddressInput
          label="Bestemming"
          icon={<PinIcon />}
          placeholder="Bijv. Centraal Station, Amsterdam"
          value={to}
          onChange={onToChange}
        />

        <p className="section-label">Locatie op kaart</p>
        <MapView from={from} to={to} onMapClick={setFromCoordinates} />
        <p className="screen-note">
          <InfoIcon /> Tik op de kaart om het ophaalpunt te verplaatsen.
        </p>
      </main>
      <footer className="app-footer">
        <button type="button" className="btn btn-primary" disabled={!from || !to} onClick={onNext}>
          <ArrowRightIcon /> Bekijk prijsschatting
        </button>
      </footer>
    </>
  )
}

export default DestinationScreen
