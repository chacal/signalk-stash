import { SKContext } from '@chacal/signalk-ts'
import * as U from 'karet.util'
import { Atom } from 'kefir.atom'
import { LatLngBounds } from 'leaflet'
import * as L from 'partial.lenses'
import { Coords, TrackGeoJSON } from '../domain/Geo'

export type Atomized<T> = { [P in keyof T]: Atom<T[P]> }

export interface AppState {
  vessels: Vessel[]
  map: {
    center: Coords
    zoom: number
    bounds: LatLngBounds
  }
}

export function vesselProp<T>(
  context: SKContext,
  propName: string,
  state: Atom<AppState>
): Atom<T> {
  return U.view<Atom<T>>(
    ['vessels', L.find((c: Vessel) => c.context === context), propName],
    state
  )
}

export function allVesselProps<T>(
  propName: string,
  state: Atom<AppState>
): Atom<T> {
  return U.view<Atom<T>>(['vessels', L.elems, propName, L.defaults([])], state)
}

export interface Vessel {
  context: SKContext
  selected: boolean
  trackLoadState: LoadState
  track?: TrackGeoJSON
}

export enum LoadState {
  NOT_LOADED,
  LOADING,
  LOADED
}
export const emptyBounds = new LatLngBounds([[0, 0], [0, 0]])
