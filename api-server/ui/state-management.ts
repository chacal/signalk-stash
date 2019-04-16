import { SKContext } from '@chacal/signalk-ts'
import { Atom } from 'kefir.atom'

import { loadVessels } from './backend-requests'
import updateTracksFor from './trackprovider'
import {
  AppState,
  bounds,
  LoadState,
  trackLoadStates,
  vessels,
  zoom
} from './ui-domain'

export function initializeStateManagement(appState: Atom<AppState>) {
  const zoomA = zoom(appState)
  const boundsA = bounds(appState)
  const vesselsA = vessels(appState)

  // Load vessel list from backend and set to global state
  loadVessels().onValue(loadedVessels => vesselsA.set(loadedVessels))

  // Reload tracks when vessels (or their selection) change
  updateTracksFor(vesselsA, zoomA, boundsA)

  // Reload tracks when map is panned or zoomed
  boundsA
    .merge(zoomA)
    .onValue(() => trackLoadStates(appState).set(LoadState.NOT_LOADED))

  // Persist track visibility selections to localStorage
  saveVesselSelectionsToLocalStorage(appState)
}

export function saveVesselSelectionsToLocalStorage(appState: Atom<AppState>) {
  if (typeof localStorage !== 'undefined') {
    appState.onValue(as =>
      as.vessels.forEach(v =>
        localStorage.setItem(
          v.context,
          JSON.stringify({ selected: v.selected })
        )
      )
    )
  }
}

export function selectedStateFromLocalStorageOrDefault(context: SKContext) {
  try {
    const state = localStorage.getItem(context)
    if (state !== null) {
      return JSON.parse(state).selected
    }
  } catch {
    return false
  }
}
