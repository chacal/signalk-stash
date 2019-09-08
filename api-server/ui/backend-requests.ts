import { fromPromise, Observable } from 'baconjs'
import Color = require('color')
import Debug from 'debug'
import palette from 'google-palette'

import { toQueryString } from '../domain/Geo'
import { VesselData, VesselId } from '../domain/Vessel'
import { LoadedTrack, Vessel, Viewport } from './ui-domain'

const debug = Debug('stash:backend-requests')

export function loadVessels(): Observable<Vessel[]> {
  debug('Loading vessels..')
  return fromPromise(
    fetch(`/contexts`)
      .then(res => res.json())
      .then((vessels: VesselData[]) => {
        const colors = palette('mpn65', vessels.length)
        return vessels.map((v, idx) => ({
          vesselId: v.vesselId,
          name: v.name,
          trackColor: Color(`#${colors[idx % colors.length]}`)
            .desaturate(0.5)
            .lighten(0.06)
        }))
      })
  )
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

export function loadTracks(
  vesselIds: VesselId[],
  viewport: Viewport
): Observable<LoadedTrack[]> {
  return fromPromise(
    Promise.all(vesselIds.map(vesselId => loadTrack(vesselId, viewport)))
  )
}
