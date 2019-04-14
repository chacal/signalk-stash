import { SKContext } from '@chacal/signalk-ts'
import * as React from 'karet'
import * as U from 'karet.util'
import { Observable } from 'kefir'
import { Atom } from 'kefir.atom'
import { LatLngBounds, LeafletEvent } from 'leaflet'
import * as L from 'partial.lenses'
import { GeoJSON, Map as LeafletMap, TileLayer } from 'react-leaflet'
import { Coords, TrackGeoJSON } from '../domain/Geo'
import updateTracksFor from './trackprovider'
import { LoadState, mapArrayInObs, Vessel } from './ui-domain'

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
  vessels: Atom<Vessel[]>
}

const Map = ({ center, zoom, bounds, vessels }: MapProps) => {
  const updateBoundsFromMap = (comp: LeafletMap) =>
    bounds.set(comp.leafletElement.getBounds())
  const updateBoundsFromEvent = (e: LeafletEvent) => {
    bounds.set(e.target.getBounds())
    zoom.set(e.target.getZoom())
  }
  const selectedVesselsWithTracks = vessels.map(vessels =>
    vessels.filter(vesselHasTracks).filter(vesselSelected)
  )

  // Update tracks in global state when vessels change
  updateTracksFor(vessels, zoom, bounds)

  return (
    <KaretMap
      center={center}
      zoom={zoom}
      onmoveend={updateBoundsFromEvent}
      ref={updateBoundsFromMap}
    >
      /* Reload tracks when bounds or zoom changes using U.consume See:
      https://github.com/chacal/signalk-stash/pull/35#pullrequestreview-226390324
      */
      {U.consume(() => forceTrackReload(vessels), bounds.merge(zoom))}
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <TileLayer url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" />
      {mapArrayInObs(selectedVesselsWithTracks, vessel => (
        // GeoJSON can't re-render itself when its props change ->
        // use context + track load time as key to force re-render when new track
        // for a vessel is loaded
        <GeoJSON key={keyFor(vessel)} data={vessel.track as TrackGeoJSON} />
      ))}
    </KaretMap>
  )
}

function forceTrackReload(vesselsA: Atom<Vessel[]>) {
  U.view<Atom<LoadState>>([L.elems, 'trackLoadState'], vesselsA).set(
    LoadState.NOT_LOADED
  )
}

function vesselHasTracks(v: Vessel) {
  return v.track && v.track.coordinates.length > 0
}

function vesselSelected(v: Vessel) {
  return v.selected
}

function keyFor(v: Vessel) {
  return (
    v.context + (v.trackLoadTime !== undefined ? v.trackLoadTime.getTime() : '')
  )
}

export default Map
