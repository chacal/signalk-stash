import { LeafletEvent } from 'leaflet'
import * as React from 'react'
import {
  GeoJSON,
  LayersControl,
  Map as LeafletMap,
  TileLayer
} from 'react-leaflet'

import _ from 'lodash'
import { Observable, Subject } from 'rxjs'
import { useObservable } from 'rxjs-hooks'
import { distinctUntilChanged } from 'rxjs/operators'
import { Coords } from '../domain/Geo'
import { LoadedTrack, RenderedTrack, Viewport } from './mappanel-domain'
import { initialViewport } from './mappanel-state'

interface MapProps {
  center: Coords
  viewport: Subject<Viewport>
  tracks: Observable<RenderedTrack[]>
}

const Map = ({ center, viewport, tracks }: MapProps) => {
  const theViewport =
    useObservable(() => viewport.pipe(distinctUntilChanged(_.isEqual))) ||
    initialViewport
  const theTracks = useObservable(() => tracks) || []

  const updateBoundsFromMap = (comp: LeafletMap) => {
    if (comp !== null) {
      viewport.next({
        zoom: comp.leafletElement.getZoom(),
        bounds: comp.leafletElement.getBounds()
      })
    }
  }

  const updateBoundsFromEvent = (e: LeafletEvent) =>
    viewport.next({ zoom: e.target.getZoom(), bounds: e.target.getBounds() })

  return (
    <LeafletMap
      center={center}
      zoom={theViewport.zoom}
      onmoveend={updateBoundsFromEvent}
      ref={updateBoundsFromMap}
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
        ontileload={t => {
          t.tile.classList.add('visibility-adjusted')
        }}
      />
      <LayersControl position={'topleft'}>
        <LayersControl.Overlay name={'MML Ilmakuva'}>
          <TileLayer
            url={'/ortokuva/{z}/{x}/{y}.jpg'}
            minZoom={16}
            maxNativeZoom={18}
            maxZoom={21}
            ontileload={t => {
              t.tile.classList.add('visibility-adjusted')
            }}
          />
        </LayersControl.Overlay>
      </LayersControl>
      <TileLayer
        url={'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'}
        minZoom={16}
        maxZoom={21}
        maxNativeZoom={18}
      />
      {theTracks.map(track => (
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
