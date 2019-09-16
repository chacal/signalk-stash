import Color = require('color')
import { LatLngBounds } from 'leaflet'

import { TrackGeoJSON } from '../domain/Geo'
import { VesselId } from '../domain/Vessel'

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
