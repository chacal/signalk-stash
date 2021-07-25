import { combineLatest, from, merge, Observable, of, Subject } from 'rxjs'
import { catchError, map, share, switchMap } from 'rxjs/operators'
import { VesselData, VesselId } from '../../domain/Vessel'
import { fetchTrackLengths, TrackLengthsFetcher } from '../backend-requests'
import { Vessel, VesselSelectionState } from '../vesselselection-state'

export class TrackLengthsPanelState {
  vesselSelectionState: VesselSelectionState
  isLoading: Observable<boolean>
  isError: Observable<boolean>
  tracks: Observable<TrackLengthWithName[][]>
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
    this.isLoading = merge(
      vesselSelectionState.selectedVessels.pipe(map(() => true)),
      this.tracks.pipe(
        map(
          () => false,
          catchError(() => of(false))
        )
      )
    )

    this.isError = this.tracks.pipe(
      map(
        () => false,
        catchError(err => {
          console.log(err)
          return of(true)
        })
      )
    )
  }
}

function startTrackLengthLoading(
  vessels: Subject<Vessel[]>,
  selectedVesselIds: Subject<VesselId[]>,
  fetchTrackLengths: TrackLengthsFetcher
): Observable<TrackLengthWithName[][]> {
  return combineLatest([vessels, selectedVesselIds]).pipe(
    switchMap(([vessels, selectedVesselIds]) => {
      const lenghtsPromise = fetchTrackLengthsWithNames(
        vessels.filter(v => selectedVesselIds.includes(v.vesselId)),
        fetchTrackLengths
      )
      lenghtsPromise.catch(e => console.log(e))
      return from(lenghtsPromise)
    }),
    share()
  )
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
