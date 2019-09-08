import { Property } from 'baconjs'
import Color = require('color')
import { LatLngBounds } from 'leaflet'

import { Atom } from '../domain/Atom'
import { Coords, TrackGeoJSON } from '../domain/Geo'
import { VesselId } from '../domain/Vessel'

export const emptyBounds = new LatLngBounds([[0, 0], [0, 0]])
export const initialViewport = { zoom: 8, bounds: emptyBounds }
export const initialMapCenter = new Coords({ lat: 60, lng: 22 })

export interface AppState {
  viewport: Atom<Viewport>
  vessels: Atom<Vessel[]>
  selectedVessels: Atom<VesselId[]>
  loadedTracks: Property<LoadedTrack[]>
  renderedTracks: Property<RenderedTrack[]>
}

export interface Vessel {
  vesselId: VesselId
  name: string
  trackColor: Color
}

export interface Viewport {
  zoom: number
  bounds: LatLngBounds
}

export interface LoadedTrack {
  vesselId: VesselId
  track: TrackGeoJSON
  loadTime: Date
}

export interface RenderedTrack extends LoadedTrack {
  color: Color
}
