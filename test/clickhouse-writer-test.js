/* eslint-env mocha */
import { expect } from 'chai'
import _ from 'lodash'
import clickhouse from '../api-server/clickhouse'
import SignalKDeltaWriter from '../api-server/delta-writer'
import { measurementFixtures, positionFixtures, vesselUuid } from './test-util'

const writer = new SignalKDeltaWriter(clickhouse)

describe('ClickHouseDeltaWriter', () => {
  beforeEach(() => clickhouse.resetTables())
  it('writes positions', () => {
    return Promise.all(positionFixtures.map(delta => writer.writeDelta(delta)))
      .then(assertFixturePositionsFound)
  })

  it('returns daily tracks', () => {
    return Promise.all(positionFixtures.map(delta => writer.writeDelta(delta)))
      .then(() => clickhouse.getVesselTracks(vesselUuid))
      .then(result => {
        expect(result.coordinates).to.have.lengthOf(4)
      })
  })

  it('returns daily tracks by bbox', () => {
    return Promise.all(positionFixtures.map(delta => writer.writeDelta(delta)))
      .then(() => clickhouse.getVesselTracks({bbox: {
        nw: {
          lat: 59.901,
          lng: 21.877
        },
        se: {
          lat: 59.900,
          lng: 21.881
        }
      }}))
      .then(result => {
        // console.log(JSON.stringify(result))
        expect(result.coordinates).to.have.lengthOf(1)
      })
  })

  it('writes positions via stream', (done) => {
    const chStream = clickhouse.deltaWriteStream((err) => {
      expect(err).to.be.null
      assertFixturePositionsFound()
      done()
    })
    positionFixtures.forEach(delta => {
      chStream.write(delta)
    })
    chStream.end()
  })

//   it('writes measurements', () => {
//     return Promise.all(
//       measurementFixtures.map(delta => writer.writeDelta(delta))
//     )
//       .then(() => testdb.getAllMeasurementsForVessel(vesselUuid))
//       .then(result => {
//         const expectedMeasurementsCount = _(measurementFixtures as any[])
//           .map(delta => delta.updates)
//           .flatten()
//           .map(update => update.values)
//           .flatten()
//           .map(v => v.value)
//           .value()
//           .length
//         expect(result).to.have.lengthOf(expectedMeasurementsCount)
//         expect(result[0].timestamp.toISOString()).to.have.string(
//           measurementFixtures[0].updates[0].timestamp
//         )
//         const firstValue = measurementFixtures[0].updates[0].values[0]
//         expect(result[0].path).to.equal(firstValue.path)
//         expect(result[0].value).to.deep.equal(firstValue.value)
//       })
//   })
})

const assertFixturePositionsFound = () => clickhouse.getTrackPointsForVessel(vesselUuid, new Date(0), new Date())
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
