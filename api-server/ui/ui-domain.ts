import { Atom } from 'kefir.atom'
import { LatLngBounds } from 'leaflet'
import { TrackGeoJSON } from '../domain/Geo'
import { MapProps } from './Map'

export type Atomized<T> = { [P in keyof T]: Atom<T[P]> }

export interface AppState {
  context: string
  map: MapProps
}

export const emptyBounds = new LatLngBounds([[0, 0], [0, 0]])
export const emptyGeoJSON: TrackGeoJSON = {
  type: 'MultiLineString',
  coordinates: []
}
