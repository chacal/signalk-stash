import { ChronoUnit, LocalTime, Year } from '@js-joda/core'
import Debug from 'debug'

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

export function loadVessels(accessToken: string): Promise<VesselData[]> {
  debug('Loading vessels..')
  return getJSON(`/contexts`, accessToken)
}

export async function loadTrack(
  vesselId: VesselId,
  year: Year,
  viewport: Viewport,
  accessToken: string
): Promise<LoadedTrack> {
  debug('Loading track', vesselId)
  const bStr = toQueryString(viewport.bounds)
  const timespan = toTimeQueryString(year)
  const track = await getJSON(
    `/tracks?context=${vesselId}&${bStr}&zoomLevel=${viewport.zoom}&${timespan}`,
    accessToken
  )
  return {
    vesselId,
    year,
    track,
    loadTime: new Date()
  }
}

export type TrackLengthsFetcher = (
  vesselId: VesselId,
  year: Year
) => Promise<TrackLength[]>

export function fetchTrackLengths(
  vesselId: VesselId,
  year: Year,
  accessToken: string
): Promise<TrackLength[]> {
  const params = new URLSearchParams({
    context: vesselId,
    firstDay: `${year.toString()}-04-01`,
    lastDay: `${year.toString()}-11-01`
  })
  return getJSON(`/tracks/daily/stats?${params.toString()}`, accessToken)
}

function getJSON(url: string, accessToken: string) {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }).then(res => res.json())
}
