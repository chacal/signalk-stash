import * as React from 'react'

import Map from './Map'
import { AppState, initialMapCenter } from './ui-domain'

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
  </React.Fragment>
)

export default App
