import { combineTemplate, fromPromise, Property } from 'baconjs'
import { VesselData, VesselId } from '../../domain/Vessel'
import { fetchTrackLengths, TrackLengthsFetcher } from '../backend-requests'
import { Vessel, VesselSelectionState } from '../vesselselection-state'

export class TrackLengthsPanelState {
  vesselSelectionState: VesselSelectionState
  isLoading: Property<boolean>
  isError: Property<boolean>
  tracks: Property<TrackLengthWithName[][]>
  constructor(
    vesselSelectionState: VesselSelectionState,
    fetchTrackLenghtsParam: TrackLengthsFetcher = fetchTrackLengths
  ) {
    this.vesselSelectionState = vesselSelectionState
    this.tracks = startTrackLengthLoading(
      vesselSelectionState.vessels,
      vesselSelectionState.selectedVessels,
      fetchTrackLenghtsParam
    )
    this.isLoading = vesselSelectionState.selectedVessels
      .changes()
      .map(true)
      .merge(
        this.tracks
          .changes()
          .skip(1) // first output is the initial value []
          .map(false)
      )
      .toProperty(false)
    this.isError = this.tracks
      .errors()
      .changes()
      .map(true)
      .toProperty(false)
  }
}

function startTrackLengthLoading(
  vessels: Property<Vessel[]>,
  selectedVesselIds: Property<VesselId[]>,
  fetchTrackLengths: TrackLengthsFetcher
): Property<TrackLengthWithName[][]> {
  return combineTemplate({ vessels, selectedVesselIds })
    .toEventStream()
    .flatMap(({ vessels, selectedVesselIds }) => {
      const lenghtsPromise = fetchTrackLengthsWithNames(
        vessels.filter(v => selectedVesselIds.includes(v.vesselId)),
        fetchTrackLengths
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
  vessels: VesselData[],
  fetchTrackLengths: TrackLengthsFetcher
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
