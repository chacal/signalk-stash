import { useAuth0, User } from '@auth0/auth0-react'
import { auth0Config } from './index'

declare global {
  interface Window {
    Cypress: any
  }
}

export interface Auth {
  accessToken: string
  user: User
}

export function useAuthToken() {
  const { getAccessTokenSilently } = useAuth0()

  return () => {
    if (!window.Cypress) {
      return getAccessTokenSilently({
        audience: auth0Config.audience
      })
    } else {
      return Promise.resolve(authFromLocalStore().accessToken)
    }
  }
}

export const useAuthUser = () => {
  const { user } = useAuth0()

  if (!window.Cypress) {
    return user
  } else {
    return authFromLocalStore().user
  }
}

function authFromLocalStore(): Auth {
  return JSON.parse(localStorage.getItem('auth0Cypress')!)
}
