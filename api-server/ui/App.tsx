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
import TimeSelectionState from './timeselection-state'
import TrackLengthsPanel from './tracklengths/TrackLengthsPanel'
import { VesselSelectionState } from './vesselselection-state'

const navigation = [
  { label: 'Map', path: '/map' },
  { label: 'Track lengths', path: '/tracklengths' }
]

const Navi = withRouter(({ location, history }) => {
  const tabIndexFromPath = () => {
    const index = navigation.findIndex(e => e.path === location.pathname)
    return index > 0 ? index : 0
  }

  const [tabIndex, setTabIndex] = React.useState(tabIndexFromPath())
  useEffect(() => setTabIndex(tabIndexFromPath()))

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    history.push(navigation[newValue].path)
    setTabIndex(newValue)
  }
  return (
    <AppBar position="static">
      <Tabs value={tabIndex} onChange={handleChange}>
        {navigation.map(({ label }) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>
    </AppBar>
  )
})

const vesselSelectionState = new VesselSelectionState()
const timeSelectionState = TimeSelectionState.fromLocalStorage()

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

export default App
