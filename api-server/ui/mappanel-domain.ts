import { Year } from '@js-joda/core'
import Color = require('color')
import { LatLngBounds } from 'leaflet'

import { TrackGeoJSON } from '../domain/Geo'
import { VesselId } from '../domain/Vessel'

export interface Viewport {
  zoom: number
  bounds: LatLngBounds
}

export interface LoadedTrack {
  vesselId: VesselId
  year: Year
  track: TrackGeoJSON
  loadTime: Date
}

export interface RenderedTrack extends LoadedTrack {
  color: Color
}
