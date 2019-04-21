import { SKContext } from '@chacal/signalk-ts'
import Color = require('color')
import * as U from 'karet.util'
import { Observable } from 'kefir'
import { Atom } from 'kefir.atom'
import { LatLngBounds } from 'leaflet'
import * as L from 'partial.lenses'
import { Coords, TrackGeoJSON } from '../domain/Geo'

export interface AppState {
  vessels: Vessel[]
  map: {
    center: Coords
    zoom: number
    bounds: LatLngBounds
  }
}

export const bounds = (appState: Atom<AppState>) =>
  U.view<Atom<LatLngBounds>>(['map', 'bounds'], appState)
export const zoom = (appState: Atom<AppState>) =>
  U.view<Atom<number>>(['map', 'zoom'], appState)
export const vessels = (appState: Atom<AppState>) =>
  U.view<Atom<Vessel[]>>('vessels', appState)
export const trackLoadStates = (appState: Atom<AppState>) =>
  U.view<Atom<LoadState>>([L.elems, 'trackLoadState'], vessels(appState))
export const selectedVesselsWithTracks = (appState: Atom<AppState>) =>
  vessels(appState).map(vessels =>
    vessels.filter(vesselHasTracks).filter(vesselSelected)
  )

export interface Vessel {
  context: SKContext
  selected: boolean
  trackLoadState: LoadState
  trackColor: Color
  trackLoadTime?: Date
  track?: TrackGeoJSON
}

export enum LoadState {
  NOT_LOADED,
  LOADING,
  LOADED
}
export const emptyBounds = new LatLngBounds([[0, 0], [0, 0]])

export function mapArrayInObs<T, S>(
  arrayObs: Observable<T[], any>,
  mapper: (item: T, index?: number) => S
) {
  return arrayObs.map(items => items.map(mapper))
}

function vesselHasTracks(v: Vessel) {
  return v.track && v.track.coordinates.length > 0
}

function vesselSelected(v: Vessel) {
  return v.selected
}
