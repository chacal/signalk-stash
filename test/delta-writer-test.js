/* eslint-env mocha */
import { expect } from 'chai'
import DB from '../api-server/db'
import SignalKDeltaWriter from '../api-server/delta-writer'

const positionFixtures = require('./data/position-fixtures.json')

const db = new DB()
const writer = new SignalKDeltaWriter(db)

describe('SignalKDeltaWriter', () => {
  beforeEach(() => db._resetTables())
  it('writes positions', () => {
    return Promise.all(positionFixtures.map(delta => writer.writeDelta(delta)))
      .then(() =>
        getAllTrackPointsForVessel(
          'urn:mrn:signalk:uuid:2204ae24-c944-5ffe-8d1d-4d411c9cea2e'
        )
      )
      .then(result => expect(result).to.have.lengthOf(positionFixtures.length))
  })
})

function getAllTrackPointsForVessel(context) {
  return db.db.any(
    'SELECT context, timestamp, ST_AsGeoJSON(point)::json as geojson FROM trackpoint WHERE context = $[context]',
    { context }
  )
}
