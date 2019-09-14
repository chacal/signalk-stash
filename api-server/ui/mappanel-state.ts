import _ from 'lodash'

import { combineTemplate, fromPromise, Observable, Property } from 'baconjs'
import Color from 'color'
import palette from 'google-palette'
import { LatLngBounds } from 'leaflet'
import { Atom } from '../domain/Atom'
import { Coords } from '../domain/Geo'
import { VesselData, VesselId } from '../domain/Vessel'
import { loadMissingTracks } from './backend-requests'
import { LoadedTrack, RenderedTrack, Vessel, Viewport } from './mappanel-domain'

const emptyBounds = new LatLngBounds([[0, 0], [0, 0]])
const defaultCenter = new Coords({ lat: 60, lng: 22 })
export const initialViewport = {
  zoom: zoomFromLocalStorageOrDefault(),
  bounds: emptyBounds
}

export class MapPanelState {
  vessels: Atom<Vessel[]> = Atom([])
  selectedVessels: Atom<VesselId[]> = Atom([])
  viewport: Atom<Viewport> = Atom(initialViewport)
  loadedTracks: Property<LoadedTrack[]> = startTrackLoading(
    this.selectedVessels,
    this.viewport
  )
  tracksToRender: Property<RenderedTrack[]> = toTracksToRender(
    this.vessels,
    this.selectedVessels,
    this.loadedTracks
  )
  initialMapCenter: Coords = centerFromLocalStorageOrDefault()

  constructor() {
    this.viewport.onValue(saveViewportToLocalStorage)
  }

  initVessels(loadVessels: () => Promise<VesselData[]>) {
    const initialSelectedVessels = selectedVesselsFromLocalStorageOrDefault()
    this.selectedVessels.onValue(sv => saveSelectedVesselsToLocalStorage(sv))

    loadVessels()
      .then(assignColors)
      .then(vessels => {
        this.vessels.set(vessels)
        this.selectedVessels.set(
          _.intersection(initialSelectedVessels, vessels.map(v => v.vesselId))
        )
      })
      .catch((e: Error) => console.error('Error loading vessels!', e))
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
    .changes()
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

function saveSelectedVesselsToLocalStorage(selectedVessels: VesselId[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('selectedVessels', JSON.stringify(selectedVessels))
  }
}

function selectedVesselsFromLocalStorageOrDefault() {
  try {
    const state = localStorage.getItem('selectedVessels')
    return !!state ? (JSON.parse(state) as VesselId[]) : []
  } catch {
    return []
  }
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

function assignColors(vessels: VesselData[]): Vessel[] {
  const colors = palette('mpn65', vessels.length)
  return vessels.map((v, idx) => ({
    vesselId: v.vesselId,
    name: v.name,
    trackColor: Color(`#${colors[idx % colors.length]}`)
      .desaturate(0.5)
      .lighten(0.06)
  }))
}
