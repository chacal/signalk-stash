import Kefir, { Stream } from 'kefir'
import { Atom } from 'kefir.atom'
import { LatLngBounds } from 'leaflet'
import { TrackGeoJSON } from '../domain/Geo'

export default function tracksFor(
  context: Atom<string>,
  zoom: Atom<number>,
  bounds: Atom<LatLngBounds>
): Stream<TrackGeoJSON, any> {
  return Kefir.combine([context, zoom, bounds])
    .changes()
    .flatMapLatest(([ctx, z, b]) => {
      const bounds = `s=${b.getSouth()}&w=${b.getWest()}&n=${b.getNorth()}&e=${b.getEast()}`
      return Kefir.fromPromise(
        fetch(`/tracks?context=${ctx}&${bounds}&zoomLevel=${z}`).then(res =>
          res.json()
        )
      )
    })
}
