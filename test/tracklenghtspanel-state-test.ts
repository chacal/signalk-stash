import { expect } from 'chai'
import Color = require('color')
import sinon from 'sinon'
import { asVesselId } from '../api-server/domain/Vessel'
import TimeSelectionState from '../api-server/ui/timeselection-state'
import {
  TrackLength,
  TrackLengthsPanelState,
  TrackLengthWithName
} from '../api-server/ui/tracklengths/tracklengthspanel-state'
import {
  Vessel,
  VesselSelectionState
} from '../api-server/ui/vesselselection-state'

describe('TrackLengthsPanelState', () => {
  it('calls fetch for initially selected vessels and produces track lengths with names', () => {
    const vesselSelectionState = new VesselSelectionState()
    const threeVessels = [...Array(3)].map(nextVessel) as Vessel[]
    vesselSelectionState.vessels.next(threeVessels)
    vesselSelectionState.selectedVessels.next([
      asVesselId(threeVessels[1].vesselId)
    ])

    const timeSelectionState = new TimeSelectionState()

    const trackFetcher = sinon.stub()
    const selectedVesselId = threeVessels[1].vesselId.toString()
    const trackLengthsResult = [
      {
        context: selectedVesselId,
        start: '',
        end: '',
        length: 1
      },
      {
        context: selectedVesselId,
        start: '',
        end: '',
        length: 2
      }
    ]
    trackFetcher.returns(
      new Promise<TrackLength[]>(resolve =>
        process.nextTick(() => resolve(trackLengthsResult))
      )
    )

    const tlpState = new TrackLengthsPanelState(
      vesselSelectionState,
      timeSelectionState,
      trackFetcher
    )
    return new Promise<void>((resolve, reject) => {
      tlpState.tracks.subscribe((trackLengths: TrackLengthWithName[][]) => {
        try {
          expect(trackFetcher.callCount).to.equal(3)
          expect(trackLengths).to.have.lengthOf(3)
          expect(trackLengths[0]).to.have.lengthOf(2)
          expect(trackLengths[0][0]).to.deep.equal({
            name: 'vessel2',
            ...trackLengthsResult[0]
          })
        } catch (e) {
          reject(e)
        }
      })
      setTimeout(() => {
        try {
          expect(trackFetcher.callCount).to.equal(3)
        } catch (e) {
          reject(e)
        }
        resolve()
      }, 500)
    })
  })
})

let id = 0
const nextVessel = () =>
  ({
    vesselId: `urn:mrn:signalk:uuid:2204ae24-c944-4ffe-8d1d-4d411c9cea2${id++}`,
    name: `vessel${id}`,
    trackColor: Color('#000')
  } as Vessel)

afterEach(() => {
  sinon.restore()
})
