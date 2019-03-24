import * as React from 'karet'
import * as U from 'karet.util'
import { Atom } from 'kefir.atom'
import { LatLngBounds } from 'leaflet'
import * as ReactDOM from 'react-dom'

import { Coords, TrackGeoJSON } from '../domain/Geo'
import './main.less'
import Map from './Map'
import tracksFor from './trackprovider'
import { AppState, emptyBounds, emptyGeoJSON } from './ui-domain'

// Global application state wrapped into an Atom
const appState = U.atom<AppState>({
  context: 'self',
  map: {
    center: new Coords({ lat: 60, lng: 22 }),
    zoom: 8,
    bounds: emptyBounds,
    tracks: emptyGeoJSON
  }
})

// Main application component
const App = () => {
  const context = U.view<Atom<string>>('context', appState)
  const bounds = U.view<Atom<LatLngBounds>>(['map', 'bounds'], appState)
  const zoom = U.view<Atom<number>>(['map', 'zoom'], appState)
  const tracks = U.view<Atom<TrackGeoJSON>>(['map', 'tracks'], appState)

  // Update tracks in global state when context, zoom or bounds change
  tracksFor(context, zoom, bounds).onValue(track => tracks.set(track))

  return (
    <Map
      center={U.view(['map', 'center'], appState)}
      zoom={zoom}
      bounds={bounds}
      tracks={tracks}
    />
  )
}

ReactDOM.render(<App />, document.getElementById('main'))
