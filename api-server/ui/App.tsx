import * as React from 'react'

import Map from './Map'
import { AppState, initialMapCenter } from './ui-domain'
import VesselSelectionPanel from './VesselSelectionPanel'

interface AppProps {
  appState: AppState
}

const App = ({ appState }: AppProps) => (
  <React.Fragment>
    <Map
      center={initialMapCenter}
      viewportA={appState.viewport}
      tracksO={appState.renderedTracks}
    />
    <VesselSelectionPanel
      vesselsP={appState.vessels}
      selectedVesselsA={appState.selectedVessels}
    />
  </React.Fragment>
)

export default App
