import Debug from 'debug'
import _ from 'lodash'

import { toQueryString } from '../domain/Geo'
import { VesselData, VesselId } from '../domain/Vessel'
import { LoadedTrack, Viewport } from './mappanel-domain'

const debug = Debug('stash:backend-requests')

export function loadVessels(): Promise<VesselData[]> {
  debug('Loading vessels..')
  return fetch(`/contexts`).then(res => res.json())
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
): Promise<LoadedTrack[]> {
  const vesselIdsWithTrack = alreadyLoadedTracks.map(t => t.vesselId)
  const vesselIdsMissingTracks = _.without(
    selectedVessels,
    ...vesselIdsWithTrack
  )

  if (_.isEmpty(vesselIdsMissingTracks)) {
    return Promise.resolve(alreadyLoadedTracks)
  } else {
    return Promise.all(
      vesselIdsMissingTracks.map(vesselId => loadTrack(vesselId, viewport))
    ).then(loadedTracks => _.concat(alreadyLoadedTracks, loadedTracks))
  }
}
