import { SKContext } from '@chacal/signalk-ts'
import Debug from 'debug'
import * as U from 'karet.util'
import Kefir, { Stream } from 'kefir'
import { Atom } from 'kefir.atom'
import { LatLngBounds } from 'leaflet'
import * as L from 'partial.lenses'

import { toQueryString, TrackGeoJSON } from '../domain/Geo'
import { LoadState, Vessel } from './ui-domain'

const debug = Debug('stash:trackprovider')

const notLoaded = (vessel: Vessel) =>
  vessel.trackLoadState === LoadState.NOT_LOADED

export default function tracksFor(
  vesselsA: Atom<Vessel[]>,
  zoomA: Atom<number>,
  boundsA: Atom<LatLngBounds>
) {
  vesselsA
    .flatMapLatest(vessels => Kefir.sequentially(0, vessels))
    .filter(notLoaded)
    .onValue(vessel => {
      const loadState = loadStateFor(vessel)

      debug('Loading ', vessel.context)
      loadState.set(LoadState.LOADING)

      loadTrack(vessel.context, boundsA.get(), zoomA.get()).onValue(geoJson => {
        debug('Loaded ', vessel.context)
        loadState.set(LoadState.LOADED)
        trackFor(vessel).set(geoJson)
      })
    })

  function loadStateFor(vessel: Vessel) {
    return propOfVessel<LoadState>(vessel, 'trackLoadState')
  }

  function trackFor(vessel: Vessel) {
    return propOfVessel<TrackGeoJSON>(vessel, 'track')
  }

  function propOfVessel<T>(vessel: Vessel, propName: string) {
    return U.view<Atom<T>>(
      [L.find((v: Vessel) => v.context === vessel.context), propName],
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
