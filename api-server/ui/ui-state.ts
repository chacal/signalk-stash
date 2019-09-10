import _ from 'lodash'

import { Atom } from '../domain/Atom'
import { loadVessels } from './backend-requests'
import { AppState, initialViewport } from './ui-domain'
import {
  assignColors,
  saveSelectedVesselsToLocalStorage,
  selectedVesselsFromLocalStorageOrDefault,
  startTrackLoading,
  toTracksToRender
} from './ui-state-helpers'

function createAppState(): AppState {
  const vessels = Atom([])
  const selectedVessels = Atom([])
  const viewport = Atom(initialViewport)
  const loadedTracks = startTrackLoading(selectedVessels, viewport)
  const tracksToRender = toTracksToRender(
    vessels,
    selectedVessels,
    loadedTracks
  )

  return {
    viewport,
    vessels,
    selectedVessels,
    loadedTracks,
    tracksToRender
  }
}

export function initializeUiState() {
  const initialSelectedVessels = selectedVesselsFromLocalStorageOrDefault()
  const appState = createAppState()

  // Save vessel selections to local storage
  appState.selectedVessels.onValue(sv => saveSelectedVesselsToLocalStorage(sv))

  // Load vessels and initialize selected vessels list
  loadVessels()
    .then(assignColors)
    .then(vessels => {
      appState.vessels.set(vessels)
      appState.selectedVessels.set(
        _.intersection(initialSelectedVessels, vessels.map(v => v.vesselId))
      )
    })
    .catch(e => console.error('Error loading vessels!', e))

  return appState
}
