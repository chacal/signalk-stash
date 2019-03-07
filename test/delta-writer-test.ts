/* eslint-env mocha */
import { expect } from 'chai'
import DB from '../api-server/db'
import SignalKDeltaWriter from '../api-server/delta-writer'
import { assertTrackpoint, positionFixtures, vesselUuid } from './test-util'
import testdb from './testdb'

const writer = new SignalKDeltaWriter(DB)

describe('SignalKDeltaWriter', () => {
  beforeEach(() => testdb.resetTables())
  it('writes positions', () => {
    return Promise.all(positionFixtures.map(delta => writer.writeDelta(delta)))
      .then(() => testdb.getAllTrackPointsForVessel(vesselUuid))
      .then(result => {
        expect(result).to.have.lengthOf(positionFixtures.length)
        assertTrackpoint(result[0], positionFixtures[0])
      })
  })
})
