import { Property } from 'baconjs'
import { LeafletEvent } from 'leaflet'
import * as React from 'react'
import { GeoJSON, Map as LeafletMap, TileLayer } from 'react-leaflet'

import { Atom } from '../domain/Atom'
import { Coords } from '../domain/Geo'
import { useObservable } from './bacon-react'
import { LoadedTrack, RenderedTrack, Viewport } from './mappanel-domain'

interface MapProps {
  center: Coords
  viewportA: Atom<Viewport>
  tracksO: Property<RenderedTrack[]>
}

const Map = ({ center, viewportA, tracksO }: MapProps) => {
  const viewport = useObservable(viewportA)
  const tracks = useObservable(tracksO)

  const updateBoundsFromMap = (comp: LeafletMap) => {
    if (comp !== null) {
      viewportA.set({
        zoom: comp.leafletElement.getZoom(),
        bounds: comp.leafletElement.getBounds()
      })
    }
  }

  const updateBoundsFromEvent = (e: LeafletEvent) =>
    viewportA.set({ zoom: e.target.getZoom(), bounds: e.target.getBounds() })

  return (
    <LeafletMap
      center={center}
      zoom={viewport.zoom}
      onmoveend={updateBoundsFromEvent}
      ref={updateBoundsFromMap}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        minZoom={0}
        maxZoom={20}
      />
      <TileLayer
        url="https://signalk-stash.chacal.fi/map/v1/{z}/{x}/{y}.png"
        minZoom={5}
        maxZoom={15}
      />
      <TileLayer
        url="http://tiles.kartat.kapsi.fi/ortokuva/{z}/{x}/{y}.jpg"
        minZoom={16}
        maxZoom={21}
        maxNativeZoom={19}
      />
      <TileLayer
        url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
        minZoom={16}
        maxZoom={21}
        maxNativeZoom={18}
      />
      {tracks.map(track => (
        // GeoJSON can't re-render itself when its props change ->
        // use context + track load time as key to force re-render when new track
        // for a vessel is loaded
        <GeoJSON
          key={keyFor(track)}
          data={track.track}
          color={track.color.hex()}
        />
      ))}
    </LeafletMap>
  )
}

function keyFor(track: LoadedTrack) {
  return (
    track.vesselId +
    (track.loadTime !== undefined ? track.loadTime.getTime() : '')
  )
}

export default Map
