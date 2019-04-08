/* eslint-env mocha */
import { SKDelta } from '@chacal/signalk-ts'
import { expect } from 'chai'
import _ from 'lodash'
import * as L from 'partial.lenses'
import DB from '../api-server/db/StashDB'
import { BBox, Coords } from '../api-server/domain/Geo'
import {
  assertFixturePositionsInDB,
  assertFixtureValuesInDB,
  measurementFixtures,
  positionFixtures,
  vesselUuid,
  waitFor,
  writeDeltasFromPositionFixture
} from './test-util'
import TestDB from './TestDB'

describe('StashDBB', () => {
  beforeEach(() => TestDB.resetTables())
  it('writes positions', () => {
    return writeDeltasFromPositionFixture().then(() =>
      assertFixturePositionsInDB(DB)
    )
  })

  it('returns tracks by zoomLevel', () => {
    return writeDeltasFromPositionFixture()
      .then(() => DB.getTrackPointsForVessel(vesselUuid, undefined, 10))
      .then(points => {
        expect(points).to.have.lengthOf(5)
        expect(points[0].timestamp.toString()).to.equal('2014-08-15T19:00Z')
      })
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
            nw: new Coords({ lng: 21.75, lat: 60 }),
            se: new Coords({ lng: 22, lat: 59 })
          })
        )
      )
      .then(tracks => {
        expect(tracks).to.have.lengthOf(1)
        expect(tracks[0]).to.have.lengthOf(2)
      })
  })

  it('writes deltas via stream', done => {
    const chStream = DB.deltaWriteStream(err => {
      expect(err).to.be.undefined
      waitForTrackpointsInserted()
        .then(() => waitForValuesInserted())
        .then(() => assertFixturePositionsInDB(DB))
        .then(() => assertFixtureValuesInDB(DB))
        .then(() => {
          done()
        })
        .catch(err => done(err))
    })
    const fixtures = _.shuffle(positionFixtures.concat(measurementFixtures))
    fixtures.forEach(delta => chStream.write(SKDelta.fromJSON(delta)))
    chStream.end()
  }).timeout(10000)

  const waitForTrackpointsInserted = () =>
    waitFor(
      () => TestDB.getRowCountForTable('trackpoint'),
      rowCount => rowCount === positionFixtures.length
    )

  const numericValuesLens = L.flat(
    'updates',
    'values',
    'value',
    L.when((v: any) => typeof v === 'number')
  )
  const waitForValuesInserted = () =>
    waitFor(
      () => TestDB.getRowCountForTable('value'),
      rowCount => {
        const countOfNumericValues = L.count(
          numericValuesLens,
          measurementFixtures
        )
        return rowCount === countOfNumericValues
      }
    )
})
