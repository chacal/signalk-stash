import * as React from 'react'
import { loadVessels } from './backend-requests'
import MapPanel from './MapPanel'
import TrackLengthsPanel from './TrackLengthsPanel'

const App = () => {
  if (document.location.hash === '#tl') {
    return <TrackLengthsPanel />
  } else {
    return <MapPanel loadVessels={loadVessels} />
  }
}
export default App
