import { SKContext } from '@chacal/signalk-ts'
import { Observable } from 'kefir'
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
  track?: TrackGeoJSON
}

export enum LoadState {
  NOT_LOADED,
  LOADING,
  LOADED
}
export const emptyBounds = new LatLngBounds([[0, 0], [0, 0]])
