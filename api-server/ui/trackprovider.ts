import Debug from 'debug'
import * as U from 'karet.util'
import Kefir from 'kefir'
import { Atom } from 'kefir.atom'
import { LatLngBounds } from 'leaflet'
import * as L from 'partial.lenses'

import { loadTrack } from './backend-requests'
import { LoadState, Vessel } from './ui-domain'

const debug = Debug('stash:trackprovider')

const notLoaded = (vessel: Vessel) =>
  vessel.trackLoadState === LoadState.NOT_LOADED
const selected = (vessel: Vessel) => vessel.selected

export default function tracksFor(
  vesselsA: Atom<Vessel[]>,
  zoomA: Atom<number>,
  boundsA: Atom<LatLngBounds>
) {
  vesselsA
    .flatMapLatest(vessels => Kefir.sequentially(0, vessels))
    .filter(selected)
    .filter(notLoaded)
    .map(toAtom)
    .onValue(async vesselA => {
      const context = vesselA.get().context
      const loadState = U.view<Atom<LoadState>>('trackLoadState', vesselA)

      debug('Loading ', context)
      loadState.set(LoadState.LOADING)

      const geoJson = await loadTrack(
        context,
        enlarge(boundsA.get(), 0.05),
        zoomA.get()
      )

      debug('Loaded ', context)
      vesselA.modify(vessel => {
        return {
          ...vessel,
          ...{
            trackLoadState: LoadState.LOADED,
            trackLoadTime: new Date(),
            track: geoJson
          }
        }
      })
    })

  function toAtom(vessel: Vessel) {
    return U.view<Atom<Vessel>>(
      L.find((v: Vessel) => v.context === vessel.context),
      vesselsA
    )
  }
}

function enlarge(bounds: LatLngBounds, factor: number) {
  const lngDelta = factor * (bounds.getEast() - bounds.getWest())
  const latDelta = factor * (bounds.getNorth() - bounds.getSouth())
  return new LatLngBounds(
    [bounds.getSouth() - latDelta, bounds.getWest() - lngDelta],
    [bounds.getNorth() + latDelta, bounds.getEast() + lngDelta]
  )
}
