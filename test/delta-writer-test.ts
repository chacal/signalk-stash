/* eslint-env mocha */
import { expect } from 'chai'
import DB from '../api-server/db'
import SignalKDeltaWriter from '../api-server/delta-writer'
import { positionFixtures, vesselUuid } from './test-util'
import testdb from './testdb'

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
})
