import * as React from 'react'
import { loadVessels } from './backend-requests'
import MapPanel from './MapPanel'

const App = () => <MapPanel loadVessels={loadVessels} />

export default App
