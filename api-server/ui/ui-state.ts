import _ from 'lodash'

import { Atom } from '../domain/Atom'
import { loadVessels } from './backend-requests'
import { AppState, initialViewport } from './ui-domain'
import {
  getLoadedTracks,
  getRenderedTracks,
  saveSelectedVesselsToLocalStorage,
  selectedStateFromLocalStorageOrDefault
} from './ui-state-helpers'

function createAppState(): AppState {
  const vessels = Atom([])
  const selectedVessels = Atom([])
  const viewport = Atom(initialViewport)
  const loadedTracks = getLoadedTracks(selectedVessels, viewport)
  const renderedTracks = getRenderedTracks(
    vessels,
    selectedVessels,
    loadedTracks
  )

  return {
    viewport,
    vessels,
    selectedVessels,
    loadedTracks,
    renderedTracks
  }
}

export function initializeUiState() {
  const previouslySavedVesselSelection = selectedStateFromLocalStorageOrDefault()
  const appState = createAppState()

  appState.renderedTracks.log('RenderedTracks')
  appState.loadedTracks.log('LoadedTracks')

  // Save vessel selections to local storage
  appState.selectedVessels.onValue(sv => saveSelectedVesselsToLocalStorage(sv))

  // Load vessels and initialize selected vessels list
  loadVessels().onValue(vessels => {
    appState.vessels.set(vessels)
    appState.selectedVessels.set(
      _.intersection(
        previouslySavedVesselSelection,
        vessels.map(v => v.vesselId)
      )
    )
  })

  return appState
}
