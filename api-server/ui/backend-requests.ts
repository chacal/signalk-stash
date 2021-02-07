import Debug from 'debug'
import { ChronoUnit, LocalTime, Year } from 'js-joda'
import _ from 'lodash'

import { toQueryString } from '../domain/Geo'
import { VesselData, VesselId } from '../domain/Vessel'
import { LoadedTrack, Viewport } from './mappanel-domain'
import { TrackLength } from './tracklengths/tracklengthspanel-state'

const debug = Debug('stash:backend-requests')

const toTimeQueryString = (y: Year) => {
  const startJan1st = y
    .atMonth(1)
    .atDay(1)
    .atTime(LocalTime.of(0))
  const endJan1st = y
    .plus(1, ChronoUnit.YEARS)
    .atMonth(1)
    .atDay(1)
    .atTime(LocalTime.of(0))
  return `from=${startJan1st}&to=${endJan1st}`
}

export function loadVessels(): Promise<VesselData[]> {
  debug('Loading vessels..')
  return fetch(`/contexts`).then(res => res.json())
}

export async function loadTrack(
  vesselId: VesselId,
  year: Year,
  viewport: Viewport
): Promise<LoadedTrack> {
  debug('Loading track', vesselId)
  const bStr = toQueryString(viewport.bounds)
  const timespan = toTimeQueryString(year)
  const res = await fetch(
    `/tracks?context=${vesselId}&${bStr}&zoomLevel=${viewport.zoom}&${timespan}`
  )
  const track = await res.json()
  return {
    vesselId,
    year,
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
