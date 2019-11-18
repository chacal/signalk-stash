import Debug from 'debug'
import _ from 'lodash'

import { toQueryString } from '../domain/Geo'
import { VesselData, VesselId } from '../domain/Vessel'
import { LoadedTrack, Viewport } from './mappanel-domain'
import { TrackLength } from './tracklengths/tracklengthspanel-state'

const debug = Debug('stash:backend-requests')

export function loadVessels(): Promise<VesselData[]> {
  debug('Loading vessels..')
  return fetch(`/contexts`).then(res => res.json())
}

export async function loadTrack(
  vesselId: VesselId,
  viewport: Viewport
): Promise<LoadedTrack> {
  debug('Loading track', vesselId)
  const bStr = toQueryString(viewport.bounds)
  const res = await fetch(
    `/tracks?context=${vesselId}&${bStr}&zoomLevel=${viewport.zoom}`
  )
  const track = await res.json()
  return {
    vesselId,
    track,
    loadTime: new Date()
  }
}

export type TrackLengthsFetcher = (vesselId: VesselId) => Promise<TrackLength[]>

export function fetchTrackLengths(vesselId: VesselId): Promise<TrackLength[]> {
  const params = new URLSearchParams({
    context: vesselId,
    firstDay: '2019-06-01',
    lastDay: '2019-09-01'
  })
  return fetch(`/tracks/daily/stats?${params.toString()}`).then(res =>
    res.json()
  )
}
