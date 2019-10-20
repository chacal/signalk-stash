import { combineTemplate, fromPromise, Property } from 'baconjs'
import { Atom } from '../domain/Atom'
import { VesselData, VesselId } from '../domain/Vessel'
import { fetchTrackLengths } from './backend-requests'
import { Vessel, VesselSelectionState } from './vesselselection-state'

export class TrackLengthsPanelState {
  vesselSelectionState: VesselSelectionState
  isLoading: Atom<boolean> = Atom(true)
  isError: Atom<boolean> = Atom(false)
  tracks: Property<TrackLengthWithName[][]>
  constructor(vesselSelectionState: VesselSelectionState) {
    this.vesselSelectionState = vesselSelectionState
    this.tracks = startTrackLengthLoading(
      vesselSelectionState.vessels,
      vesselSelectionState.selectedVessels
    )
  }
}

function startTrackLengthLoading(
  vessels: Property<Vessel[]>,
  selectedVesselIds: Property<VesselId[]>
): Property<TrackLengthWithName[][]> {
  return combineTemplate({ vessels, selectedVesselIds })
    .changes()
    .flatMap(({ vessels, selectedVesselIds }) => {
      const lenghtsPromise = fetchTrackLengthsWithNames(
        vessels.filter(v => selectedVesselIds.includes(v.vesselId))
      )
      return fromPromise(lenghtsPromise)
    })
    .toProperty([])
}

export interface TrackLength {
  context: string
  start: string
  end: string
  length: number
}

export interface TrackLengthWithName extends TrackLength {
  name: string
}

const fetchTrackLengthsWithNames = (
  vessels: VesselData[]
): Promise<TrackLengthWithName[][]> => {
  return Promise.all(
    vessels.map(({ vesselId, name }: VesselData) =>
      fetchTrackLengths(vesselId).then((trackLengthsA: TrackLength[]) =>
        trackLengthsA.map(
          trackLength => ({ name, ...trackLength } as TrackLengthWithName)
        )
      )
    )
  )
}
