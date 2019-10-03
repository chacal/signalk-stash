import { AppBar, Tab, Tabs } from '@material-ui/core'
import * as React from 'react'
import {
  HashRouter as Router,
  Redirect,
  Route,
  Switch,
  withRouter
} from 'react-router-dom'
import { loadVessels } from './backend-requests'
import ErrorBoundary from './ErrorBoundary'
import MapPanel from './MapPanel'
import TrackLengthsPanel from './TrackLengthsPanel'

const navigation = [
  { label: 'Map', path: '/map' },
  { label: 'Track lengths', path: '/tracklengths' }
]

const Navi = withRouter(props => {
  const [value, setValue] = React.useState(0)
  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    props.history.push(navigation[newValue].path)
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

const App = () => {
  return (
    <Router>
      <Navi />
      <Redirect exact from="/" to="map" />
      <Switch>
        <Route path="/map">
          <ErrorBoundary>
            {
              // https://github.com/PaulLeCam/react-leaflet/issues/625
            }
            <MapPanel loadVessels={loadVessels} />
          </ErrorBoundary>
        </Route>
        <Route path="/tracklengths">
          <TrackLengthsPanel />
        </Route>
      </Switch>
    </Router>
  )
}

export default App
