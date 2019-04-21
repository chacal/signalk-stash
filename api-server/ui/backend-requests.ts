import { SKContext } from '@chacal/signalk-ts'
import Color from 'color'
import Debug from 'debug'
import palette from 'google-palette'
import Kefir, { Observable } from 'kefir'
import { LatLngBounds } from 'leaflet'
import { toQueryString, TrackGeoJSON } from '../domain/Geo'
import { selectedStateFromLocalStorageOrDefault } from './state-management'
import { LoadState, Vessel } from './ui-domain'

const debug = Debug('stash:backend-requests')

export async function loadTrack(
  context: SKContext,
  bounds: LatLngBounds,
  zoom: number
): Promise<TrackGeoJSON> {
  const bStr = toQueryString(bounds)
  const res = await fetch(
    `/tracks?context=${context}&${bStr}&zoomLevel=${zoom}`
  )
  return res.json()
}

export function loadVessels(): Observable<Vessel[], any> {
  debug('Loading vessels..')
  return Kefir.fromPromise(fetch(`/contexts`).then(res => res.json())).map(
    (contexts: SKContext[]) => {
      debug(`${contexts.length} vessels loaded`)

      const colors = palette('mpn65', contexts.length)

      return contexts.map((ctx, idx) => ({
        context: ctx,
        selected: selectedStateFromLocalStorageOrDefault(ctx),
        trackLoadState: LoadState.NOT_LOADED,
        trackColor: Color(`#${colors[idx]}`)
          .desaturate(0.5)
          .lighten(0.06),
        trackLoadTime: new Date()
      }))
    }
  )
}
