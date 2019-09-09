import { combineTemplate, Observable, Property } from 'baconjs'
import Color = require('color')
import palette from 'google-palette'
import _ from 'lodash'

import { VesselData, VesselId } from '../domain/Vessel'
import { loadMissingTracks } from './backend-requests'
import {
  initialViewport,
  LoadedTrack,
  RenderedTrack,
  Vessel,
  Viewport
} from './ui-domain'

interface TracksWithViewport {
  viewport: Viewport
  tracks: LoadedTrack[]
}

export function startTrackLoading(
  selectedVessels: Observable<VesselId[]>,
  viewport: Observable<Viewport>
): Property<LoadedTrack[]> {
  return combineTemplate({
    selectedVessels,
    viewport
  })
    .changes()
    .flatScan<TracksWithViewport>(
      { viewport: initialViewport, tracks: [] },
      (acc, { selectedVessels, viewport }) => {
        const loadedTracks = !_.isEqual(acc.viewport, viewport)
          ? loadMissingTracks([], selectedVessels, viewport) // Load tracks for all selected vessels
          : loadMissingTracks(acc.tracks, selectedVessels, viewport) // Load missing tracks
        return loadedTracks.map(tracks => ({
          tracks,
          viewport
        }))
      }
    )
    .skipDuplicates(_.isEqual)
    .map(acc => acc.tracks)
}

export function toTracksToRender(
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

export function saveSelectedVesselsToLocalStorage(selectedVessels: VesselId[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('selectedVessels', JSON.stringify(selectedVessels))
  }
}

export function selectedVesselsFromLocalStorageOrDefault() {
  try {
    const state = localStorage.getItem('selectedVessels')
    return !!state ? (JSON.parse(state) as VesselId[]) : []
  } catch {
    return []
  }
}

export function assignColors(vessels: VesselData[]): Vessel[] {
  const colors = palette('mpn65', vessels.length)
  return vessels.map((v, idx) => ({
    vesselId: v.vesselId,
    name: v.name,
    trackColor: Color(`#${colors[idx % colors.length]}`)
      .desaturate(0.5)
      .lighten(0.06)
  }))
}
