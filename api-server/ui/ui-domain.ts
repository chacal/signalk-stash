import { SKContext } from '@chacal/signalk-ts'
import { Observable } from 'kefir'
import { Atom } from 'kefir.atom'
import { LatLngBounds } from 'leaflet'
import { Coords, TrackGeoJSON } from '../domain/Geo'

export interface AppState {
  vessels: Vessel[]
  map: {
    center: Coords
    zoom: number
    bounds: LatLngBounds
  }
}

export function mapArrayInObs<T, S>(
  arrayObs: Observable<T[], any>,
  mapper: (item: T, index?: number) => S
) {
  return arrayObs.map(items => items.map(mapper))
}

export interface Vessel {
  context: SKContext
  selected: boolean
  trackLoadState: LoadState
  trackLoadTime?: Date
  track?: TrackGeoJSON
}

export enum LoadState {
  NOT_LOADED,
  LOADING,
  LOADED
}
export const emptyBounds = new LatLngBounds([[0, 0], [0, 0]])

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
