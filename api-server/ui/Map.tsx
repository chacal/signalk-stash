import * as React from 'karet'
import * as U from 'karet.util'
import { Observable } from 'kefir'
import { Atom } from 'kefir.atom'
import { LatLngBounds, LeafletEvent } from 'leaflet'
import { GeoJSON, Map as LeafletMap, TileLayer } from 'react-leaflet'
import { Coords, TrackGeoJSON } from '../domain/Geo'
import * as K from './karet-components'
import { mapArrayInObs, Vessel } from './ui-domain'

export interface MapProps {
  center: Observable<Coords, any>
  zoom: Atom<number>
  bounds: Atom<LatLngBounds>
  shownVessels: Observable<Vessel[], any>
}

const Map = ({ center, zoom, bounds, shownVessels }: MapProps) => {
  const updateBoundsFromMap = (comp: LeafletMap) =>
    bounds.set(comp.leafletElement.getBounds())
  const updateBoundsFromEvent = (e: LeafletEvent) => {
    U.holding(() => {
      bounds.set(e.target.getBounds())
      zoom.set(e.target.getZoom())
    })
  }

  return (
    <K.Map
      center={center}
      zoom={zoom}
      onmoveend={updateBoundsFromEvent}
      ref={updateBoundsFromMap}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <TileLayer url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" />
      {mapArrayInObs(shownVessels, vessel => (
        // GeoJSON can't re-render itself when its props change ->
        // use context + track load time as key to force re-render when new track
        // for a vessel is loaded
        <GeoJSON key={keyFor(vessel)} data={vessel.track as TrackGeoJSON} />
      ))}
    </K.Map>
  )
}

function keyFor(v: Vessel) {
  return (
    v.context + (v.trackLoadTime !== undefined ? v.trackLoadTime.getTime() : '')
  )
}

export default Map
