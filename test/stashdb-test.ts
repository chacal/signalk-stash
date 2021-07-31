/* eslint-env mocha */
import { SKDelta, SKDeltaJSON } from '@chacal/signalk-ts'
import { LocalDate } from '@js-joda/core'
import { fail } from 'assert'
import { expect } from 'chai'
import _ from 'lodash'
import * as L from 'partial.lenses'
import pgPromise from 'pg-promise'
import DB from '../api-server/db/StashDB'
import { BBox, Coords } from '../api-server/domain/Geo'
import {
  assertFixturePositionsInDB,
  assertFixtureValuesInDB,
  measurementFixtures,
  positionFixtures,
  testVessel,
  testVesselUuids,
  vesselUuid,
  writeDeltasFromPositionFixture
} from './test-util'
import TestDB from './TestDB'
import { waitFor } from './waiting'
import queryResultErrorCode = pgPromise.errors.queryResultErrorCode

describe('StashDBB', () => {
  beforeEach(() => TestDB.resetTables().then(() => DB.upsertVessel(testVessel)))
  it('writes positions', async () => {
    await writeDeltasFromPositionFixture()
    await assertFixturePositionsInDB(DB)
  })

  it('returns tracks by zoomLevel', async () => {
    await writeDeltasFromPositionFixture()
    const points = await DB.getTrackPointsForVessel({
      context: testVesselUuids[0],
      zoomLevel: 10
    })
    expect(points).to.have.lengthOf(5)
    expect(points[0].timestamp.toString()).to.equal('2014-08-15T19:00Z')
  })

  it('returns daily tracks', async () => {
    await writeDeltasFromPositionFixture()
    const result = await DB.getVesselTracks({ context: testVesselUuids[0] })
    expect(result).to.have.lengthOf(4)
  })

  it('returns track lengths', async () => {
    await writeDeltasFromPositionFixture()
    const result = await DB.getDailyTrackStatistics(
      vesselUuid,
      LocalDate.parse('2014-08-15'),
      LocalDate.parse('2014-08-18')
    )
    expect(result).to.have.lengthOf(2)

    expect(result[0].length).to.be.closeTo(585.299, 0.001)
    expect(result[0].start.toString()).to.equal('2014-08-15T00:00Z')
    expect(result[1].length).to.be.closeTo(35.308, 0.001)
    expect(result[1].start.toString()).to.equal('2014-08-16T00:00Z')
  })

  it('returns daily tracks by bbox', async () => {
    await writeDeltasFromPositionFixture()
    const tracks = await DB.getVesselTracks({
      context: testVesselUuids[2],
      bbox: new BBox({
        nw: new Coords({ lng: 21.75, lat: 60 }),
        se: new Coords({ lng: 22, lat: 59 })
      })
    })
    expect(tracks).to.have.lengthOf(1)
    expect(tracks[0]).to.have.lengthOf(2)
  })

  it('writes deltas via stream', done => {
    const chStream = DB.deltaWriteStream(async err => {
      expect(err).to.be.undefined
      try {
        await waitForTrackpointsInserted()
        await waitForValuesInserted()
        await assertFixturePositionsInDB(DB)
        await assertFixtureValuesInDB(DB)
        done()
      } catch (err) {
        done(err)
      }
    })

    // include a position with null latitude and longitude and a normal
    // pathvalue with null value
    const fixtures = [getPositionWithNulls(), getMeasurementWithNull()].concat(
      _.shuffle(positionFixtures.concat(measurementFixtures))
    )
    fixtures.forEach(delta => chStream.write(SKDelta.fromJSON(delta)))
    chStream.end()
  })

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

  it('returns Vessel by owners email', () => {
    return DB.getVesselByOwnerEmail(testVessel.ownerEmail)
      .then(v => {
        expect(v.vesselId).to.equal(testVessel.vesselId)
        expect(v.name).to.equal(testVessel.name)
      })
      .catch(e => fail(e))
  })

  it('rejects if Vessel by owners email is not found', () => {
    return DB.getVesselByOwnerEmail('not_existing@test.com')
      .then(() => fail('Promise should have been rejected!'))
      .catch(e => expect(e.code).to.equal(queryResultErrorCode.noData))
  })
})

function getPositionWithNulls(): SKDeltaJSON {
  const positionDeltaString = JSON.stringify(positionFixtures[0])
  return JSON.parse(
    positionDeltaString.replace(
      JSON.stringify(positionFixtures[0].updates[0].values[0]),
      '{"path":"navigation.position","value":{"longitude": null, "latitude": null}}'
    )
  )
}

function getMeasurementWithNull(): SKDeltaJSON {
  const measurementDeltaString = JSON.stringify(measurementFixtures[0])
  const nullMeasurementDeltaString = measurementDeltaString.replace(
    JSON.stringify(measurementFixtures[0].updates[0].values[0].value),
    'null'
  )
  return JSON.parse(nullMeasurementDeltaString)
}
