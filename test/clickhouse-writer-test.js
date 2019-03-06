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
      .then(() => clickhouse.getTracksForVessel(vesselUuid, new Date(0), new Date()))
      .then(result => {
        console.log(result)
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
