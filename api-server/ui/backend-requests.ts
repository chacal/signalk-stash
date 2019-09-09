import { fromPromise, Observable } from 'baconjs'
import Debug from 'debug'
import _ from 'lodash'

import { toQueryString } from '../domain/Geo'
import { VesselData, VesselId } from '../domain/Vessel'
import { LoadedTrack, Viewport } from './ui-domain'

const debug = Debug('stash:backend-requests')

export function loadVessels(): Observable<VesselData[]> {
  debug('Loading vessels..')
  return fromPromise(fetch(`/contexts`).then(res => res.json()))
}

async function loadTrack(
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

export function loadMissingTracks(
  alreadyLoadedTracks: LoadedTrack[],
  selectedVessels: VesselId[],
  viewport: Viewport
): Observable<LoadedTrack[]> {
  const vesselIdsWithTrack = alreadyLoadedTracks.map(t => t.vesselId)
  const vesselsIdsMissingTracks = _.without(
    selectedVessels,
    ...vesselIdsWithTrack
  )
  return fromPromise(
    Promise.all(
      vesselsIdsMissingTracks.map(vesselId => loadTrack(vesselId, viewport))
    )
  )
}
