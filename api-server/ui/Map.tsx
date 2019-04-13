import { SKContext } from '@chacal/signalk-ts'
import * as React from 'karet'
import * as U from 'karet.util'
import { Observable } from 'kefir'
import { Atom } from 'kefir.atom'
import { LatLngBounds, LeafletEvent } from 'leaflet'
import { GeoJSON, Map as LeafletMap, TileLayer } from 'react-leaflet'
import { Coords, TrackGeoJSON } from '../domain/Geo'
import { Vessel } from './ui-domain'

// Lift LeafletMap to Karet to support Atoms as props
const KaretMap = U.toKaret(LeafletMap)

export interface Track {
  context: SKContext
  geoJson: TrackGeoJSON
}

export interface MapProps {
  center: Observable<Coords, any>
  zoom: Atom<number>
  bounds: Atom<LatLngBounds>
  vessels: Observable<Vessel[], any>
}

const Map = ({ center, zoom, bounds, vessels }: MapProps) => {
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
      {vessels.map(vessels =>
        vessels.map(vessel => (
          // Use random number as key to force rendering of tracks
          // (GeoJSON can't re-render itself when its props change)
          <GeoJSON key={Math.random()} data={vessel.track as TrackGeoJSON} />
        ))
      )}
    </KaretMap>
  )
}

export default Map
