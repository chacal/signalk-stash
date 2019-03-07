/* eslint-env mocha */
import { SKDelta } from '@chartedsails/strongly-signalk'
import { expect } from 'chai'
import DB from '../api-server/clickhouse'
import SignalKDeltaWriter from '../api-server/delta-writer'
import { assertTrackpoint, positionFixtures } from './test-util'

const writer = new SignalKDeltaWriter(DB)

describe('ClickHouseDeltaWriter', () => {
  beforeEach(() => DB.ensureTables())
  it('writes positions', () => {
    return writeDeltasFromPositionFixture()
      .then(() => DB.getTrackPointsForVessel())
      .then(result => {
        expect(result).to.have.lengthOf(positionFixtures.length)
        assertTrackpoint(result[0], positionFixtures[0])
      })
  })

  it('returns daily tracks', () => {
    return writeDeltasFromPositionFixture()
      .then(() => DB.getVesselTracks())
      .then(result => {
        expect(result).to.have.lengthOf(3)
      })
  })
})

function writeDeltasFromPositionFixture(): Promise<void[][]> {
  return Promise.all(
    positionFixtures.map(
      delta => writer.writeDelta(SKDelta.fromJSON(JSON.stringify(delta))) // TODO: Fix SKDelta parsing
    )
  )
}
