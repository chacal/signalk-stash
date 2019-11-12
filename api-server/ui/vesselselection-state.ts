import Color from 'color'
import palette from 'google-palette'
import _ from 'lodash'
import { ReplaySubject, Subject } from 'rxjs'
import { VesselData, VesselId } from '../domain/Vessel'
import { loadVessels } from './backend-requests'

export interface Vessel {
  vesselId: VesselId
  name: string
  trackColor: Color
}

export class VesselSelectionState {
  vessels: Subject<Vessel[]> = new ReplaySubject<Vessel[]>(1)
  selectedVessels: Subject<VesselId[]> = new ReplaySubject<VesselId[]>(1)

  initVessels() {
    const initialSelectedVessels = selectedVesselsFromLocalStorageOrDefault()
    this.selectedVessels.subscribe(sv => saveSelectedVesselsToLocalStorage(sv))

    loadVessels()
      .then(assignColors)
      .then(vessels => {
        this.vessels.next(vessels)
        this.selectedVessels.next(
          _.intersection(initialSelectedVessels, vessels.map(v => v.vesselId))
        )
      })
      .catch((e: Error) => console.error('Error loading vessels!', e))
  }
  setVessels(vessels: VesselData[]) {
    this.vessels.next(assignColors(vessels))
  }
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
