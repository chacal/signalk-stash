/* eslint-env mocha */
import * as R from 'ramda'
import { expect } from 'chai'
import DB from '../api-server/db'
import SignalKDeltaWriter from '../api-server/delta-writer'

const positionFixtures = require('./data/position-fixtures.json')
const measurementFixtures = require('./data/measurement-fixtures.json')

const db = new DB()
const writer = new SignalKDeltaWriter(db)

const vesselUuid = 'urn:mrn:signalk:uuid:2204ae24-c944-5ffe-8d1d-4d411c9cea2e'

describe('SignalKDeltaWriter', () => {
  beforeEach(() => db._resetTables())
  it('writes positions', () => {
    return Promise.all(positionFixtures.map(delta => writer.writeDelta(delta)))
      .then(() => getAllTrackPointsForVessel(vesselUuid))
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

  it('writes measurements', () => {
    return Promise.all(
      measurementFixtures.map(delta => writer.writeDelta(delta))
    )
      .then(() => getAllMeasurementsForVessel(vesselUuid))
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

function getAllTrackPointsForVessel(context) {
  return db.db.any(
    `SELECT context, timestamp, ST_AsGeoJSON(point)::json as geojson
    FROM trackpoint WHERE context = $[context]
    ORDER BY timestamp`,
    { context }
  )
}

function getAllMeasurementsForVessel(context) {
  return db.db.any(
    `SELECT context, timestamp, sourceId, path, value::json
    FROM instrument_measurement
    WHERE context = $[context]
    ORDER BY timestamp`,
    { context }
  )
}