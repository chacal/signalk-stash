import { useAuth0, withAuthenticationRequired } from '@auth0/auth0-react'
import {
  AppBar,
  Button,
  Grid,
  Hidden,
  Tab,
  Tabs,
  Typography
} from '@material-ui/core'
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

  const { logout, user } = useAuth0()

  return (
    <AppBar position="static">
      <Grid container spacing={0} alignItems={'center'}>
        <Grid item xs={8}>
          <Tabs value={tabIndex} onChange={handleChange}>
            {navigation.map(({ label }) => (
              <Tab key={label} label={label} />
            ))}
          </Tabs>
        </Grid>
        <Grid
          container
          item
          xs={4}
          justify={'flex-end'}
          alignItems={'center'}
          spacing={3}
        >
          <Hidden smDown>
            <Grid item>
              <Typography variant={'overline'}>
                {user !== undefined ? user.email : ''}
              </Typography>
            </Grid>
          </Hidden>
          <Grid item>
            <Button
              color="inherit"
              onClick={() => logout({ returnTo: window.location.origin })}
            >
              Logout
            </Button>
          </Grid>
        </Grid>
      </Grid>
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

export default withAuthenticationRequired(App)
