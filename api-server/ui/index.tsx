import * as React from 'karet'
import * as U from 'karet.util'
import { Atom } from 'kefir.atom'
import { LatLngBounds } from 'leaflet'
import * as ReactDOM from 'react-dom'

import { Coords, TrackGeoJSON } from '../domain/Geo'
import './main.less'
import Map, { Track } from './Map'
import tracksFor from './trackprovider'
import {
  allVesselProps,
  AppState,
  emptyBounds,
  LoadState,
  Vessel,
  vesselProp
} from './ui-domain'

// Global application state wrapped into an Atom
const appState = U.atom<AppState>({
  vessels: [
    {
      context: 'self',
      selected: false,
      trackLoadState: LoadState.NOT_LOADED
    }
  ],
  map: {
    center: new Coords({ lat: 60, lng: 22 }),
    zoom: 8,
    bounds: emptyBounds
  }
})

// Main application component
const App = () => {
  const vessels = U.view<Atom<Vessel[]>>('vessels', appState)
  const bounds = U.view<Atom<LatLngBounds>>(['map', 'bounds'], appState)
  const zoom = U.view<Atom<number>>(['map', 'zoom'], appState)
  const vesselsWithTracks = vessels.map(vessels =>
    vessels.filter(vesselHasTracks)
  )

  // Update tracks in global state when vessels change
  tracksFor(vessels, zoom, bounds).onValue(updateTrackInGlobalState)

  // Reload tracks when bounds or zoom changes
  bounds.merge(zoom).onValue(forceTrackReload)

  return (
    <Map
      center={appState.map(as => as.map.center)}
      zoom={zoom}
      bounds={bounds}
      vessels={vesselsWithTracks}
    />
  )
}

ReactDOM.render(<App />, document.getElementById('main'))

function forceTrackReload() {
  allVesselProps<LoadState>('trackLoadState', appState).set(
    LoadState.NOT_LOADED
  )
}

function updateTrackInGlobalState(t: Track) {
  vesselProp<TrackGeoJSON>(t.context, 'track', appState).set(t.geoJson)
}

function vesselHasTracks(v: Vessel) {
  return v.track && v.track.coordinates.length > 0
}
