import _ from 'lodash'

import { LatLngBounds } from 'leaflet'
import { combineLatest, from, Observable, ReplaySubject, Subject } from 'rxjs'
import { distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators'
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
  viewport: Subject<Viewport> = new ReplaySubject(1)
  loadedTracks: Observable<LoadedTrack[]>
  tracksToRender: Observable<RenderedTrack[]>
  initialMapCenter: Coords = centerFromLocalStorageOrDefault()

  constructor(vesselSelectionState: VesselSelectionState) {
    this.viewport.next(initialViewport)
    this.vesselSelectionState = vesselSelectionState
    this.viewport.subscribe(saveViewportToLocalStorage)
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

function startTrackLoading(
  selectedVessels: Observable<VesselId[]>,
  viewport: Observable<Viewport>
): Observable<LoadedTrack[]> {
  let loadedTracks: LoadedTrack[] = []
  let previousViewport: Viewport
  return combineLatest([selectedVessels, viewport]).pipe(
    filter(([, viewport]) => viewport.bounds !== emptyBounds),
    distinctUntilChanged(_.isEqual),
    switchMap(([selectedVessels, viewport]) => {
      if (!_.isEqual(viewport, previousViewport)) {
        loadedTracks = []
      }
      previousViewport = viewport
      return from(
        loadMissingTracks(loadedTracks, selectedVessels, viewport).then(
          tracks => {
            loadedTracks = tracks
            return tracks
          }
        )
      ) as Observable<LoadedTrack[]>
    })
  )
}

function toTracksToRender(
  allVessels: Observable<Vessel[]>,
  selectedVessels: Observable<VesselId[]>,
  loadedTracks: Observable<LoadedTrack[]>
): Observable<RenderedTrack[]> {
  return combineLatest([allVessels, selectedVessels, loadedTracks]).pipe(
    map(([allVessels, selectedVessels, loadedTracks]) => {
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
  )
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
