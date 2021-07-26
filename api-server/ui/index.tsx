import * as React from 'react'
import * as ReactDOM from 'react-dom'

import { Auth0Provider } from '@auth0/auth0-react'
import App from './App'
import './main.less'

const prodAuth0Config = {
  domain: 'signalk-stash.eu.auth0.com',
  clientId: 'BPqbNlJWgvMR2ZxuvVj1dGm0pVKYxb2a',
  audience: 'https://signalk-stash.chacal.fi'
}

const devAuth0Config = {
  domain: 'signalk-stash-dev.eu.auth0.com',
  clientId: 'mKdpwEK9Mxg7mU6EuOUSg03wSKbKz1pI',
  audience: 'https://signalk-stash-dev.chacal.fi'
}

export const auth0Config =
  process.env.NODE_ENV === 'production' ? prodAuth0Config : devAuth0Config

// Render main component
ReactDOM.render(
  <Auth0Provider
    domain={auth0Config.domain}
    clientId={auth0Config.clientId}
    redirectUri={window.location.origin}
    audience={auth0Config.audience}
  >
    <App />
  </Auth0Provider>,
  document.getElementById('main')
)
