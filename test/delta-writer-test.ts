/* eslint-env mocha */
import { SKDelta } from '@chartedsails/strongly-signalk'
import { expect } from 'chai'
import DB from '../api-server/db'
import SignalKDeltaWriter from '../api-server/delta-writer'
import { assertTrackpoint, positionFixtures, vesselUuid } from './test-util'
import testdb from './testdb'

const writer = new SignalKDeltaWriter(DB)

describe('SignalKDeltaWriter', () => {
  beforeEach(() => testdb.resetTables())
  it('writes positions', () => {
    return Promise.all(
      positionFixtures.map(
        delta => writer.writeDelta(SKDelta.fromJSON(JSON.stringify(delta))) // TODO: Fix SKDelta parsing
      )
    )
      .then(() => testdb.getAllTrackPointsForVessel(vesselUuid))
      .then(result => {
        // 3 have self context
        expect(result).to.have.lengthOf(positionFixtures.length - 3)
        assertTrackpoint(result[0], positionFixtures[0])
      })
  })
})
