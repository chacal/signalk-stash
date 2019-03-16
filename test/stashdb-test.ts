/* eslint-env mocha */
import { SKDelta } from '@chacal/signalk-ts'
import { expect } from 'chai'
import _ from 'lodash'
import DB from '../api-server/db/StashDB'
import { BBox, Coords } from '../api-server/domain/Geo'
import {
  assertFixturePositionsFound,
  assertFixtureValuesFound,
  measurementFixtures,
  positionFixtures,
  vesselUuid,
  writeDeltasFromPositionFixture
} from './test-util'
import TestDB from './TestDB'

describe('StashDBB', () => {
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

  it('writes deltas via stream', done => {
    const chStream = DB.deltaWriteStream(err => {
      expect(err).to.be.undefined
      assertFixturePositionsFound(DB)
        .then(() => assertFixtureValuesFound(DB))
        .then(() => {
          done()
        })
        .catch(err => done(err))
    })
    const fixtures = _.shuffle(positionFixtures.concat(measurementFixtures))
    fixtures.forEach(delta => chStream.write(SKDelta.fromJSON(delta)))
    chStream.end()
  })
})
