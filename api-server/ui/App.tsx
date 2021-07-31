import { withAuthenticationRequired } from '@auth0/auth0-react'
import * as React from 'react'
import { useEffect } from 'react'
import { HashRouter as Router, Redirect, Route, Switch } from 'react-router-dom'
import { useAuthToken } from './auth'
import ErrorBoundary from './ErrorBoundary'
import MapPanel from './MapPanel'
import { NavBar } from './NavBar'
import TimeSelectionState from './timeselection-state'
import TrackLengthsPanel from './tracklengths/TrackLengthsPanel'
import { VesselSelectionState } from './vesselselection-state'

const vesselSelectionState = new VesselSelectionState()
const timeSelectionState = TimeSelectionState.fromLocalStorage()

const App = () => {
  const getToken = useAuthToken()

  useEffect(() => {
    getToken()
      .then(accessToken => vesselSelectionState.initVessels(accessToken))
      .catch(e => console.log('Failed to acquire access token!', e))
  })

  return (
    <Router>
      <NavBar />
      <Switch>
        <Route path="/map">
          <ErrorBoundary>
            {
              // https://github.com/PaulLeCam/react-leaflet/issues/625
            }
            <MapPanel
              vesselSelection={vesselSelectionState}
              timeSelection={timeSelectionState}
            />
          </ErrorBoundary>
        </Route>
        <Route path="/tracklengths">
          <TrackLengthsPanel
            vesselSelection={vesselSelectionState}
            timeSelection={timeSelectionState}
          />
        </Route>
        <Redirect from="/" to="/map" />
      </Switch>
    </Router>
  )
}

// Redirect unauthenticated users to auth0 if not running Cypress tests
export default window.Cypress ? App : withAuthenticationRequired(App)
