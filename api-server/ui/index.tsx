import * as React from 'react'
import * as ReactDOM from 'react-dom'

import { Auth0Provider } from '@auth0/auth0-react'
import App from './App'
import './main.less'

// Render main component
ReactDOM.render(
  <Auth0Provider
    domain="signalk-stash.eu.auth0.com"
    clientId="BPqbNlJWgvMR2ZxuvVj1dGm0pVKYxb2a"
    redirectUri={window.location.origin}
    audience="https://signalk-stash.chacal.fi"
    scope="read:signalk_stash"
  >
    <App />
  </Auth0Provider>,
  document.getElementById('main')
)
