/* eslint-env mocha */
import { SKDelta } from '@chacal/signalk-ts'
import { expect } from 'chai'
import DB from '../api-server/db/StashDB'
import { BBox, Coords } from '../api-server/domain/Geo'
import SignalKDeltaWriter from '../api-server/SignalKDeltaWriter'
import {
  assertFixturePositionsFound,
  assertFixtureValuesFound,
  measurementFixtures,
  positionFixtures,
  vesselUuid
} from './test-util'
import TestDB from './TestDB'

const writer = new SignalKDeltaWriter(DB)

describe('StashDBB', () => {
  beforeEach(() => TestDB.resetTables())
  it('writes positions', () => {
    return writeDeltasFromPositionFixture()
      .then(() => DB.getTrackPointsForVessel(vesselUuid))
      .then(() => assertFixturePositionsFound(DB))
  })

  it('returns daily tracks', () => {
    return writeDeltasFromPositionFixture()
      .then(() => DB.getVesselTracks(vesselUuid))
      .then(result => {
        expect(result).to.have.lengthOf(3)
      })
  })

  it('returns daily tracks by bbox', () => {
    return writeDeltasFromPositionFixture()
      .then(() =>
        DB.getVesselTracks(
          'self',
          new BBox({
            nw: new Coords({ lng: 21.877, lat: 59.901 }),
            se: new Coords({ lng: 21.881, lat: 59.9 })
          })
        )
      )
      .then(tracks => {
        expect(tracks).to.have.lengthOf(1)
        expect(tracks[0]).to.have.lengthOf(3)
      })
  })

  it('writes deltas via stream', done => {
    const chStream = DB.deltaWriteStream(err => {
      expect(err).to.be.undefined
      assertFixturePositionsFound(DB)
        .then(() => assertFixtureValuesFound(DB))
        .then(() => {
          done()
        })
        .catch(err => done(err))
    })
    const fixtures: any[] = positionFixtures.concat(measurementFixtures as any)
    shuffle(fixtures)
    fixtures.forEach(delta => chStream.write(SKDelta.fromJSON(delta)))
    chStream.end()
  })
})

function writeDeltasFromPositionFixture(): Promise<void[][]> {
  return Promise.all(
    positionFixtures.map(delta => writer.writeDelta(SKDelta.fromJSON(delta)))
  )
}

function shuffle(array: any) {
  let currentIndex = array.length
  let temporaryValue
  let randomIndex

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1

    // And swap it with the current element.
    temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temporaryValue
  }

  return array
}
