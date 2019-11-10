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

  const leafletCss = `
  .leaflet-container {
    height: 100%;
    width: 100%;
    margin: 0 auto;
    }
  `
  return (
    <span>
      <style>{leafletCss}</style>
      <LeafletMap
        center={center}
        zoom={viewport.zoom}
        onmoveend={updateBoundsFromEvent}
        ref={updateBoundsFromMap}
        dragging={true}
        touchZoom={true}
      >
        <TileLayer
          url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
          minZoom={0}
          maxZoom={20}
        />
        <TileLayer
          url={'https://signalk-stash.chacal.fi/map/v1/{z}/{x}/{y}.png'}
          minZoom={5}
          maxZoom={15}
        />
        <TileLayer
          url={'http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'}
          minZoom={16}
          maxNativeZoom={20}
          maxZoom={21}
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
        />
        <TileLayer
          url={'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'}
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
    </span>
  )
}

function keyFor(track: LoadedTrack) {
  return (
    track.vesselId +
    (track.loadTime !== undefined ? track.loadTime.getTime() : '')
  )
}

export default Map
