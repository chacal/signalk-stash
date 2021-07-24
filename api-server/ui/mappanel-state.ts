import _ from 'lodash'

import { Year } from '@js-joda/core'
import { LatLngBounds } from 'leaflet'
import { BehaviorSubject, combineLatest, from, Observable, Subject } from 'rxjs'
import { distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators'
import { Coords } from '../domain/Geo'
import { VesselId } from '../domain/Vessel'
import { loadTrack } from './backend-requests'
import { LoadedTrack, RenderedTrack, Viewport } from './mappanel-domain'
import TimeSelectionState, {
  fromLocalStorage,
  SelectedYears
} from './timeselection-state'
import { Vessel, VesselSelectionState } from './vesselselection-state'

const emptyBounds = new LatLngBounds([
  [0, 0],
  [0, 0]
])
const defaultCenter = new Coords({ lat: 60, lng: 22 })
export const initialViewport = {
  zoom: zoomFromLocalStorageOrDefault(),
  bounds: emptyBounds
}

export class MapPanelState {
  vesselSelectionState: VesselSelectionState
  timeSelectionState: TimeSelectionState = fromLocalStorage()
  viewport: Subject<Viewport> = new BehaviorSubject(initialViewport)
  loadedTracks: Observable<LoadedTrack[]>
  tracksToRender: Observable<RenderedTrack[]>
  initialMapCenter: Coords = centerFromLocalStorageOrDefault()

  constructor(vesselSelectionState: VesselSelectionState) {
    this.viewport.next(initialViewport)
    this.vesselSelectionState = vesselSelectionState
    this.viewport.subscribe(saveViewportToLocalStorage)
    this.loadedTracks = startTrackLoading(
      this.vesselSelectionState.selectedVessels,
      this.timeSelectionState.selectedYears,
      this.viewport
    )
    this.tracksToRender = toTracksToRender(
      this.vesselSelectionState.vessels,
      this.vesselSelectionState.selectedVessels,
      this.timeSelectionState.selectedYears,
      this.loadedTracks
    )
  }
}

interface TrackToLoad {
  vesselId: VesselId
  year: Year
}

type LoadedTracks = Map<VesselId, Map<Year, Promise<LoadedTrack>>>

const allVesselYearTracks = (vesselIds: VesselId[], years: SelectedYears) =>
  vesselIds.flatMap(vesselId =>
    years.toArray().map(year => ({ vesselId, year }))
  )

const isTrackMissing = (loadedTracks: LoadedTracks) => (
  trackToLoad: TrackToLoad
) => {
  const loadedVesselTracks = loadedTracks.get(trackToLoad.vesselId)
  return !loadedVesselTracks || !loadedVesselTracks.get(trackToLoad.year)
}

function startTrackLoading(
  selectedVessels: Observable<VesselId[]>,
  selectedYears: Observable<SelectedYears>,
  viewport: Observable<Viewport>
): Observable<LoadedTrack[]> {
  let loadedTracks: LoadedTracks = new Map<
    VesselId,
    Map<Year, Promise<LoadedTrack>>
  >()
  let previousViewport: Viewport
  return combineLatest([selectedVessels, selectedYears, viewport]).pipe(
    filter(([, , viewport]) => viewport.bounds !== emptyBounds),
    distinctUntilChanged(_.isEqual),
    switchMap(([selectedVessels, selectedYears, viewport]) => {
      if (!_.isEqual(viewport, previousViewport)) {
        loadedTracks = new Map<VesselId, Map<Year, Promise<LoadedTrack>>>()
      }
      previousViewport = viewport

      allVesselYearTracks(selectedVessels, selectedYears)
        .filter(isTrackMissing(loadedTracks))
        .forEach(({ vesselId, year }) => {
          const tracksForVessel =
            loadedTracks.get(vesselId) || new Map<Year, Promise<LoadedTrack>>()
          loadedTracks.set(vesselId, tracksForVessel)
          tracksForVessel.set(year, loadTrack(vesselId, year, viewport))
        })

      return from(
        Promise.all(
          [...loadedTracks.values()].flatMap(vesselTracks => [
            ...vesselTracks.values()
          ])
        )
      ) as Observable<LoadedTrack[]>
    })
  )
}

function toTracksToRender(
  allVessels: Observable<Vessel[]>,
  selectedVessels: Observable<VesselId[]>,
  selectedYears: Observable<SelectedYears>,
  loadedTracks: Observable<LoadedTrack[]>
): Observable<RenderedTrack[]> {
  return combineLatest([
    allVessels,
    selectedVessels,
    selectedYears,
    loadedTracks
  ]).pipe(
    map(([allVessels, selectedVessels, selectedYears, loadedTracks]) => {
      const selectedTracks = loadedTracks.filter(
        t =>
          selectedVessels.includes(t.vesselId) &&
          selectedYears.isSelected(t.year)
      )
      return selectedTracks.map(t => {
        const vessel = allVessels.find(v => v.vesselId === t.vesselId)
        if (vessel === undefined) {
          throw new Error('Vessel not found for track' + t)
        }
        return {
          ...t,
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
