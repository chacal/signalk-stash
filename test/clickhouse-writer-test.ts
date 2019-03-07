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
        expect(result).to.have.lengthOf(4)
      })
  })

  it('returns daily tracks by bbox', () => {
    return writeDeltasFromPositionFixture()
      .then(() =>
        DB.getVesselTracks({
          nw: {
            longitude: 21.877,
            latitude: 59.901
          },
          se: {
            longitude: 21.881,
            latitude: 59.9
          }
        })
      )
      .then(tracks => {
        expect(tracks).to.have.lengthOf(1)
        expect(tracks[0]).to.have.lengthOf(3)
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
