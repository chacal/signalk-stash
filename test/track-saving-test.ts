/* eslint-env mocha */
import { SKDelta } from '@chacal/signalk-ts'
import { expect } from 'chai'
import DB from '../api-server/db/StashDB'
import { BBox, Coords } from '../api-server/domain/Geo'
import SignalKDeltaWriter from '../api-server/SignalKDeltaWriter'
import {
  assertFixturePositionsFound,
  positionFixtures,
  vesselUuid
} from './test-util'
import TestDB from './TestDB'

const writer = new SignalKDeltaWriter(DB)

describe('StashDB', () => {
  beforeEach(() => TestDB.resetTables())
  it('writes positions', () => {
    return writeDeltasFromPositionFixture()
      .then(() => DB.getTrackPointsForVessel(vesselUuid))
      .then(() => assertFixturePositionsFound(DB))
  })

  it('returns daily tracks', () => {
    return writeDeltasFromPositionFixture()
      .then(() => DB.getVesselTracks(vesselUuid))
      .then(result => {
        expect(result).to.have.lengthOf(3)
      })
  })

  it('returns daily tracks by bbox', () => {
    return writeDeltasFromPositionFixture()
      .then(() =>
        DB.getVesselTracks(
          'self',
          new BBox({
            nw: new Coords({ lng: 21.877, lat: 59.901 }),
            se: new Coords({ lng: 21.881, lat: 59.9 })
          })
        )
      )
      .then(tracks => {
        expect(tracks).to.have.lengthOf(1)
        expect(tracks[0]).to.have.lengthOf(3)
      })
  })

  it('writes positions via stream', done => {
    const chStream = DB.deltaWriteStream(err => {
      expect(err).to.be.null
      assertFixturePositionsFound(DB)
        .then(() => done())
        .catch(err => done(err))
    })
    positionFixtures.forEach(delta => chStream.write(SKDelta.fromJSON(delta)))
    chStream.end()
  })
})

function writeDeltasFromPositionFixture(): Promise<void[][]> {
  return Promise.all(
    positionFixtures.map(delta => writer.writeDelta(SKDelta.fromJSON(delta)))
  )
}
