import { decode, JwtPayload } from 'jsonwebtoken'
import { Auth } from '../../api-server/ui/auth'
import { TEST_AUTH0_POST_DATA } from '../../test/auth0-test-user'

Cypress.Commands.add('login', (overrides = {}) => {
  Cypress.log({ name: 'loginViaAuth0' })

  const options = {
    method: 'POST',
    url: 'https://signalk-stash-dev.eu.auth0.com/oauth/token',
    body: TEST_AUTH0_POST_DATA
  }

  cy.request(options)
    .then(resp => resp.body)
    .then(body => {
      const claims = decode(body.id_token)
      const { email, email_verified } = claims as JwtPayload

      const cypressAuthState: Auth = {
        accessToken: body.access_token,
        user: { email, email_verified }
      }

      window.localStorage.setItem(
        'auth0Cypress',
        JSON.stringify(cypressAuthState)
      )
      cy.log('Logged in', cypressAuthState.user)
    })
})
