// This test user has been manually added to auth0 development tenant's
// "Username-Password-Authentication" Database
import config from '../api-server/Config'

export const TEST_AUTH0_POST_DATA = {
  grant_type: 'password',
  username: 'unittest@signalk-stash-dev.chacal.fi',
  password: 'ARADbOv6fAE',
  client_id: 'YsmnlsLeFP0OhkmvHgrm3vqdEGWg3gvh', // SignalK Stash unit test app
  audience: config.auth0.audience,
  scope: 'openid profile email'
}
