import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import type { LngLat, Place } from '../api/ors'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

const AMSTERDAM: LatLngTuple = [52.3676, 4.9041]
const DEFAULT_ZOOM = 13

/** ORS werkt met [lng, lat], Leaflet met [lat, lng]. */
const toLatLng = ([lng, lat]: LngLat): LatLngTuple => [lat, lng]

type Props = {
  from: Place | null
  to: Place | null
  onMapClick?: (coordinates: LngLat) => void
}

function FitToPlaces({ from, to }: Pick<Props, 'from' | 'to'>) {
  const map = useMap()

  useEffect(() => {
    const points = [from, to].filter((p): p is Place => p !== null).map((p) => toLatLng(p.coordinates))
    if (points.length === 1) map.setView(points[0], 15)
    if (points.length === 2) map.fitBounds(points, { padding: [32, 32] })
  }, [map, from, to])

  return null
}

function ClickHandler({ onMapClick }: { onMapClick: (coordinates: LngLat) => void }) {
  useMapEvents({
    click: (e) => onMapClick([e.latlng.lng, e.latlng.lat]),
  })
  return null
}

function MapView({ from, to, onMapClick }: Props) {
  return (
    <MapContainer className="map-view" center={AMSTERDAM} zoom={DEFAULT_ZOOM} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {from && (
        <CircleMarker
          center={toLatLng(from.coordinates)}
          radius={8}
          pathOptions={{ color: '#1a1a1a', weight: 3, fillColor: '#ffffff', fillOpacity: 1 }}
        />
      )}
      {to && (
        <CircleMarker
          center={toLatLng(to.coordinates)}
          radius={8}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#1a1a1a', fillOpacity: 1 }}
        />
      )}
      <FitToPlaces from={from} to={to} />
      {onMapClick && <ClickHandler onMapClick={onMapClick} />}
    </MapContainer>
  )
}

export default MapView
