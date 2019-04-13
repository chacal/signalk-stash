import { SKContext } from '@chacal/signalk-ts'
import Debug from 'debug'
import * as U from 'karet.util'
import Kefir, { Stream } from 'kefir'
import { Atom } from 'kefir.atom'
import { LatLngBounds } from 'leaflet'
import * as L from 'partial.lenses'

import { toQueryString, TrackGeoJSON } from '../domain/Geo'
import { Track } from './Map'
import { LoadState, Vessel } from './ui-domain'

const debug = Debug('stash:trackprovider')

const notLoaded = (vessel: Vessel) =>
  vessel.trackLoadState === LoadState.NOT_LOADED

export default function tracksFor(
  vesselsA: Atom<Vessel[]>,
  zoomA: Atom<number>,
  boundsA: Atom<LatLngBounds>
): Stream<Track, any> {
  return vesselsA
    .flatMapLatest(vessels => Kefir.sequentially(0, vessels))
    .filter(notLoaded)
    .flatMap(vessel => {
      const loadState = loadStateFor(vessel)

      debug('Loading ', vessel.context)
      loadState.set(LoadState.LOADING)

      return loadTrack(vessel.context, boundsA.get(), zoomA.get()).map(
        geoJson => {
          debug('Loaded ', vessel.context)
          loadState.set(LoadState.LOADED)
          return {
            context: vessel.context,
            geoJson
          }
        }
      )
    })

  function loadStateFor(ctx: Vessel) {
    return U.view<Atom<LoadState>>(
      [L.find((c: Vessel) => c.context === ctx.context), 'trackLoadState'],
      vesselsA
    )
  }
}

function loadTrack(
  context: SKContext,
  bounds: LatLngBounds,
  zoom: number
): Stream<TrackGeoJSON, any> {
  const bStr = toQueryString(bounds)

  return Kefir.fromPromise(
    fetch(`/tracks?context=${context}&${bStr}&zoomLevel=${zoom}`).then(res =>
      res.json()
    )
  )
}
