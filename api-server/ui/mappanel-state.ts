import _ from 'lodash'

import { combineTemplate, fromPromise, Observable, Property } from 'baconjs'
import { LatLngBounds } from 'leaflet'
import { Atom } from '../domain/Atom'
import { Coords } from '../domain/Geo'
import { VesselId } from '../domain/Vessel'
import { loadMissingTracks } from './backend-requests'
import { LoadedTrack, RenderedTrack, Viewport } from './mappanel-domain'
import { Vessel, VesselSelectionState } from './vesselselection-state'

const emptyBounds = new LatLngBounds([[0, 0], [0, 0]])
const defaultCenter = new Coords({ lat: 60, lng: 22 })
export const initialViewport = {
  zoom: zoomFromLocalStorageOrDefault(),
  bounds: emptyBounds
}

export class MapPanelState {
  vesselSelectionState: VesselSelectionState
  viewport: Atom<Viewport> = Atom(initialViewport)
  loadedTracks: Property<LoadedTrack[]>
  tracksToRender: Property<RenderedTrack[]>
  initialMapCenter: Coords = centerFromLocalStorageOrDefault()

  constructor(vesselSelectionState: VesselSelectionState) {
    this.vesselSelectionState = vesselSelectionState
    this.viewport.onValue(saveViewportToLocalStorage)
    this.loadedTracks = startTrackLoading(
      this.vesselSelectionState.selectedVessels,
      this.viewport
    )
    this.tracksToRender = toTracksToRender(
      this.vesselSelectionState.vessels,
      this.vesselSelectionState.selectedVessels,
      this.loadedTracks
    )
  }
}

interface TracksWithViewport {
  viewport: Viewport
  tracks: LoadedTrack[]
}

function startTrackLoading(
  selectedVessels: Observable<VesselId[]>,
  viewport: Atom<Viewport>
): Property<LoadedTrack[]> {
  return combineTemplate({
    selectedVessels,
    viewport
  })
    .toEventStream()
    .flatScan<TracksWithViewport>(
      { viewport: viewport.get(), tracks: [] },
      (acc, { selectedVessels, viewport }) => {
        const loadedTracks = !_.isEqual(acc.viewport, viewport)
          ? loadMissingTracks([], selectedVessels, viewport) // Load tracks for all selected vessels
          : loadMissingTracks(acc.tracks, selectedVessels, viewport) // Load missing tracks
        return fromPromise(loadedTracks).map(tracks => ({
          tracks,
          viewport
        }))
      }
    )
    .skipDuplicates(_.isEqual)
    .map(acc => acc.tracks)
}

function toTracksToRender(
  allVessels: Observable<Vessel[]>,
  selectedVessels: Observable<VesselId[]>,
  loadedTracks: Observable<LoadedTrack[]>
): Property<RenderedTrack[]> {
  return combineTemplate({
    allVessels,
    selectedVessels,
    loadedTracks
  })
    .changes()
    .map(({ allVessels, selectedVessels, loadedTracks }) => {
      const selectedTracks = loadedTracks.filter(t =>
        selectedVessels.includes(t.vesselId)
      )
      return selectedTracks.map(t => {
        const vessel = allVessels.find(v => v.vesselId === t.vesselId)
        if (vessel === undefined) {
          throw new Error('Vessel not found for track' + t)
        }
        return {
          vesselId: t.vesselId,
          track: t.track,
          loadTime: t.loadTime,
          color: vessel.trackColor
        }
      })
    })
    .toProperty([])
    .skipDuplicates(_.isEqual)
}

function saveViewportToLocalStorage({ zoom, bounds }: Viewport) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(
      'tracksmapzoomandcenter',
      JSON.stringify({
        zoom,
        center: bounds.getCenter()
      })
    )
  }
}

function centerFromLocalStorageOrDefault(): Coords {
  try {
    const zoomAndCenter = localStorage.getItem('tracksmapzoomandcenter')
    return !!zoomAndCenter
      ? new Coords(JSON.parse(zoomAndCenter).center)
      : defaultCenter
  } catch {
    return defaultCenter
  }
}

function zoomFromLocalStorageOrDefault(): number {
  try {
    const zoomAndCenter = localStorage.getItem('tracksmapzoomandcenter')
    return !!zoomAndCenter ? JSON.parse(zoomAndCenter).zoom : 8
  } catch {
    return 8
  }
}
