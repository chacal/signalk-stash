import * as React from 'karet'
import { Atom } from 'kefir.atom'
import Map from './Map'
import {
  AppState,
  bounds,
  selectedVesselsWithTracks,
  vessels,
  zoom
} from './ui-domain'
import VesselSelectionPanel from './VesselSelectionPanel'

interface AppProps {
  appState: Atom<AppState>
}

const App = ({ appState }: AppProps) => (
  <React.Fragment>
    <Map
      center={appState.map(as => as.map.center)}
      zoom={zoom(appState)}
      bounds={bounds(appState)}
      shownVessels={selectedVesselsWithTracks(appState)}
    />
    <VesselSelectionPanel vessels={vessels(appState)} />
  </React.Fragment>
)

export default App
