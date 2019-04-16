import * as React from 'karet'
import * as U from 'karet.util'
import * as ReactDOM from 'react-dom'

import { Coords } from '../domain/Geo'
import App from './App'
import './main.less'
import { initializeStateManagement } from './state-management'
import { AppState, emptyBounds } from './ui-domain'

// Initial global application state wrapped into an Atom
const appState = U.atom<AppState>({
  vessels: [],
  map: {
    center: new Coords({ lat: 60, lng: 22 }),
    zoom: 8,
    bounds: emptyBounds
  }
})

// Setup state transforms
initializeStateManagement(appState)

// Render main component
ReactDOM.render(<App appState={appState} />, document.getElementById('main'))
