import Debug from 'debug'
import * as U from 'karet.util'
import Kefir from 'kefir'
import { Atom } from 'kefir.atom'
import { LatLngBounds } from 'leaflet'
import * as L from 'partial.lenses'

import { TrackGeoJSON } from '../domain/Geo'
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
    .onValue(async vessel => {
      const loadState = loadStateFor(vessel)

      debug('Loading ', vessel.context)
      loadState.set(LoadState.LOADING)

      const geoJson = await loadTrack(
        vessel.context,
        boundsA.get(),
        zoomA.get()
      )

      debug('Loaded ', vessel.context)
      // Use U.holding to "squash" all Atom mutations to produce only one change event to subscribers
      U.holding(() => {
        loadState.set(LoadState.LOADED)
        loadTimeFor(vessel).set(new Date())
        trackFor(vessel).set(geoJson)
      })
    })

  function loadStateFor(vessel: Vessel) {
    return propOfVessel<LoadState>(vessel, 'trackLoadState')
  }

  function loadTimeFor(vessel: Vessel) {
    return propOfVessel<Date>(vessel, 'trackLoadTime')
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
