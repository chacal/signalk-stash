/* eslint-env mocha */
import * as R from 'ramda'
import { expect } from 'chai'
import DB from '../api-server/db'
import testdb from './testdb'
import SignalKDeltaWriter from '../api-server/delta-writer'
import { positionFixtures, measurementFixtures, vesselUuid } from './test-util'

const writer = new SignalKDeltaWriter(DB)

describe('SignalKDeltaWriter', () => {
  beforeEach(() => testdb.resetTables())
  it('writes positions', () => {
    return Promise.all(positionFixtures.map(delta => writer.writeDelta(delta)))
      .then(() => testdb.getAllTrackPointsForVessel(vesselUuid))
      .then(result => {
        expect(result).to.have.lengthOf(positionFixtures.length)
        expect(result[0].timestamp).to.exist
        expect(result[0].timestamp.toISOString()).to.have.string(
          positionFixtures[0].updates[0].timestamp
        )
        expect(result[0].geojson.coordinates[0]).to.equal(
          positionFixtures[0].updates[0].values[0].value.longitude
        )
      })
  })

  it('writes measurementss', () => {
    return Promise.all(
      measurementFixtures.map(delta => writer.writeDelta(delta))
    )
      .then(() => testdb.getAllMeasurementsForVessel(vesselUuid))
      .then(result => {
        const expectedMeasurementsCount = R.compose(
          R.length,
          R.flatten,
          R.map(R.prop('values')),
          R.flatten,
          R.map(R.prop('updates'))
        )(measurementFixtures)
        expect(result).to.have.lengthOf(expectedMeasurementsCount)
        expect(result[0].timestamp.toISOString()).to.have.string(
          measurementFixtures[0].updates[0].timestamp
        )
        const firstValue = measurementFixtures[0].updates[0].values[0]
        expect(result[0].path).to.equal(firstValue.path)
        expect(result[0].value).to.deep.equal(firstValue.value)
      })
  })
})
