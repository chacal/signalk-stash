/* eslint-env mocha */
import { SKDelta, SKDeltaJSON } from '@chacal/signalk-ts'
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
  testVesselUuids,
  writeDeltasFromPositionFixture
} from './test-util'
import TestDB from './TestDB'
import { waitFor } from './waiting'

describe('StashDBB', () => {
  beforeEach(() => TestDB.resetTables())
  it('writes positions', async () => {
    await writeDeltasFromPositionFixture()
    await assertFixturePositionsInDB(DB)
  })

  it('returns tracks by zoomLevel', async () => {
    await writeDeltasFromPositionFixture()
    const points = await DB.getTrackPointsForVessel(
      testVesselUuids[0],
      undefined,
      10
    )
    expect(points).to.have.lengthOf(4)
    expect(points[0].timestamp.toString()).to.equal('2014-08-15T19:00Z')
  })

  it('returns daily tracks', async () => {
    await writeDeltasFromPositionFixture()
    const result = await DB.getVesselTracks(testVesselUuids[0])
    expect(result).to.have.lengthOf(3)
  })

  it('returns daily tracks by bbox', async () => {
    await writeDeltasFromPositionFixture()
    const tracks = await DB.getVesselTracks(
      testVesselUuids[2],
      new BBox({
        nw: new Coords({ lng: 21.75, lat: 60 }),
        se: new Coords({ lng: 22, lat: 59 })
      })
    )
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
