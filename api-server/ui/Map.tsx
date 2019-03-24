import * as React from 'karet'
import * as U from 'karet.util'
import { LatLngBounds, LeafletEvent } from 'leaflet'
import { GeoJSON, Map as LeafletMap, TileLayer } from 'react-leaflet'
import { Coords, TrackGeoJSON } from '../domain/Geo'
import { Atomized } from './ui-domain'

// Lift LeafletMap to Karet to support Atoms as props
const KaretMap = U.toKaret(LeafletMap)

export interface MapProps {
  center: Coords
  zoom: number
  bounds: LatLngBounds
  tracks: TrackGeoJSON
}

const Map = ({ center, zoom, bounds, tracks }: Atomized<MapProps>) => {
  const updateBoundsFromMap = (comp: LeafletMap) =>
    bounds.set(comp.leafletElement.getBounds())
  const updateBoundsFromEvent = (e: LeafletEvent) => {
    bounds.set(e.target.getBounds())
    zoom.set(e.target.getZoom())
  }

  return (
    <KaretMap
      center={center}
      zoom={zoom}
      onmoveend={updateBoundsFromEvent}
      ref={updateBoundsFromMap}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <TileLayer url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" />
      {tracks.map(t => (
        <GeoJSON key={new Date().getTime()} data={t} /> // Use timestamp as key to force rendering of tracks
      ))}
    </KaretMap>
  )
}

export default Map
