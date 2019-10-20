import { AppBar, Tab, Tabs } from '@material-ui/core'
import * as React from 'react'
import { useEffect } from 'react'
import {
  HashRouter as Router,
  Redirect,
  Route,
  Switch,
  withRouter
} from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary'
import MapPanel from './MapPanel'
import TrackLengthsPanel from './tracklengths/TrackLengthsPanel'
import { VesselSelectionState } from './vesselselection-state'

const navigation = [
  { label: 'Map', path: '/map' },
  { label: 'Track lengths', path: '/tracklengths' }
]

const Navi = withRouter(({ location, history }) => {
  const [value, setValue] = React.useState(
    navigation.findIndex(e => e.path === location.pathname)
  )
  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    history.push(navigation[newValue].path)
    setValue(newValue)
  }
  return (
    <AppBar position="static">
      <Tabs value={value} onChange={handleChange}>
        {navigation.map(({ label }) => (
          <Tab label={label} />
        ))}
      </Tabs>
    </AppBar>
  )
})

const vesselSelectionState = new VesselSelectionState()

const App = () => {
  useEffect(() => {
    vesselSelectionState.initVessels()
  })

  return (
    <Router>
      <Navi />
      <Switch>
        <Route path="/map">
          <ErrorBoundary>
            {
              // https://github.com/PaulLeCam/react-leaflet/issues/625
            }
            <MapPanel vesselSelection={vesselSelectionState} />
          </ErrorBoundary>
        </Route>
        <Route path="/tracklengths">
          <TrackLengthsPanel vesselSelection={vesselSelectionState} />
        </Route>
        <Redirect from="/" to="/map" />
      </Switch>
    </Router>
  )
}

export default App
