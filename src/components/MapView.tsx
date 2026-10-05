import { useEffect } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import type { LngLat, Place } from '../api/ors'
import { splitRoute } from '../ride'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

const AMSTERDAM: LatLngTuple = [52.3676, 4.9041]
const DEFAULT_ZOOM = 13
const BLACK = '#1a1a1a'
const GREY = '#8a8a8a'

/** ORS werkt met [lng, lat], Leaflet met [lat, lng]. */
const toLatLng = ([lng, lat]: LngLat): LatLngTuple => [lat, lng]

type Props = {
  from: Place | null
  to: Place | null
  /** Routepunten; als die er zijn wordt de route getekend */
  route?: LngLat[]
  /** Voortgang over de route (0–1); tekent het gereden deel en de taxi */
  progress?: number
  className?: string
  /** Klein label linksboven op de kaart, bijv. "Rit gepauzeerd" */
  label?: string
  onMapClick?: (coordinates: LngLat) => void
}

function FitToPlaces({ from, to, route }: Pick<Props, 'from' | 'to' | 'route'>) {
  const map = useMap()

  useEffect(() => {
    if (route && route.length > 1) {
      map.fitBounds(route.map(toLatLng), { padding: [32, 32] })
      return
    }
    const points = [from, to].filter((p): p is Place => p !== null).map((p) => toLatLng(p.coordinates))
    if (points.length === 1) map.setView(points[0], 15)
    if (points.length === 2) map.fitBounds(points, { padding: [32, 32] })
  }, [map, from, to, route])

  return null
}

function ClickHandler({ onMapClick }: { onMapClick: (coordinates: LngLat) => void }) {
  useMapEvents({
    click: (e) => onMapClick([e.latlng.lng, e.latlng.lat]),
  })
  return null
}

function RouteLayer({ route, progress }: { route: LngLat[]; progress: number }) {
  const { driven, remaining, position } = splitRoute(route, progress)

  return (
    <>
      <Polyline
        positions={remaining.map(toLatLng)}
        pathOptions={{ color: GREY, weight: 4, dashArray: '6 8' }}
      />
      <Polyline positions={driven.map(toLatLng)} pathOptions={{ color: BLACK, weight: 5 }} />
      <CircleMarker
        center={toLatLng(position)}
        radius={10}
        pathOptions={{ color: '#ffffff', weight: 3, fillColor: BLACK, fillOpacity: 1 }}
      />
    </>
  )
}

function MapView({ from, to, route, progress = 0, className, label, onMapClick }: Props) {
  const hasRoute = route && route.length > 1

  return (
    <div className={`map-view ${className ?? ''}`}>
      <MapContainer className="map-view-map" center={AMSTERDAM} zoom={DEFAULT_ZOOM} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {from && (
          <CircleMarker
            center={toLatLng(from.coordinates)}
            radius={6}
            pathOptions={{ color: BLACK, weight: 3, fillColor: '#ffffff', fillOpacity: 1 }}
          />
        )}
        {to && (
          <CircleMarker
            center={toLatLng(to.coordinates)}
            radius={7}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: BLACK, fillOpacity: 1 }}
          />
        )}
        {hasRoute && <RouteLayer route={route} progress={progress} />}
        <FitToPlaces from={from} to={to} route={route} />
        {onMapClick && <ClickHandler onMapClick={onMapClick} />}
      </MapContainer>
      {label && <p className="map-view-label">{label}</p>}
      {hasRoute && (
        <div className="map-view-legend" aria-hidden="true">
          <span className="map-view-legend-driven">gereden</span>
          <span className="map-view-legend-remaining">resterend</span>
        </div>
      )}
    </div>
  )
}

export default MapView
