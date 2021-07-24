import { AppBar, Box, Button, Grid, Tab, Tabs } from '@material-ui/core'
import * as React from 'react'
import { useEffect } from 'react'
import { withRouter } from 'react-router-dom'

const navigation = [
  { label: 'Map', path: '/map' },
  { label: 'Track lengths', path: '/tracklengths' }
]

export const NavBar = withRouter(({ location, history }) => {
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
      <Grid container alignItems={'center'}>
        <Grid item xs={8}>
          <Tabs value={tabIndex} onChange={handleChange}>
            {navigation.map(({ label }) => (
              <Tab key={label} label={label} />
            ))}
          </Tabs>
        </Grid>
        <Grid item xs={4}>
          <AccountToolbar />
        </Grid>
      </Grid>
    </AppBar>
  )
})

const AccountToolbar = () => {
  const onLogout = () => (location.href = '/logout')

  return (
    <Grid
      container
      justifyContent={'flex-end'}
      alignItems={'center'}
      spacing={5}
    >
      <Grid item>
        <Box marginRight={2}>
          <Button color="inherit" onClick={onLogout}>
            Logout
          </Button>
        </Box>
      </Grid>
    </Grid>
  )
}
