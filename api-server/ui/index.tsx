import * as React from 'karet'
import * as U from 'karet.util'
import { Atom } from 'kefir.atom'
import { LatLngBounds } from 'leaflet'
import * as ReactDOM from 'react-dom'

import { Coords } from '../domain/Geo'
import './main.less'
import Map from './Map'
import { AppState, emptyBounds, LoadState, Vessel } from './ui-domain'
import VesselSelectionPanel from './VesselSelectionPanel'

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

  return (
    <React.Fragment>
      <Map
        center={appState.map(as => as.map.center)}
        zoom={zoom}
        bounds={bounds}
        vessels={vessels}
      />
      <VesselSelectionPanel vessels={vessels} />
    </React.Fragment>
  )
}

ReactDOM.render(<App />, document.getElementById('main'))
