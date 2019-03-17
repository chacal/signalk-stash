import { expect } from 'chai'
import {
  assertValidationErrors,
  getJson,
  startTestApp,
  writeDeltasFromPositionFixture
} from './test-util'
import TestDB from './TestDB'

describe('Track API', () => {
  const app = startTestApp()

  beforeEach(() => TestDB.resetTables().then(writeDeltasFromPositionFixture))

  it('returns tracks for self vessel', () => {
    return getJson(app, '/tracks')
      .query({ context: 'self' })
      .expect(200)
      .expect(res => {
        expect(res.body.type).to.equal('MultiLineString')
        expect(res.body.coordinates).to.have.lengthOf(1)
        expect(res.body.coordinates[0]).to.have.lengthOf(3)
      })
  })

  it('returns tracks with bounding box', () => {
    return getJson(app, '/tracks')
      .query({
        context: 'self',
        nwLat: 59.901,
        nwLng: 21.879,
        seLat: 59.9,
        seLng: 21.881
      })
      .expect(200)
      .expect(res => {
        expect(res.body.type).to.equal('MultiLineString')
        expect(res.body.coordinates).to.have.lengthOf(1)
        expect(res.body.coordinates[0]).to.have.lengthOf(2)
        const point0 = res.body.coordinates[0][0]
        const point1 = res.body.coordinates[0][1]
        expect(point0[0]).to.be.closeTo(21.8792518, 0.0001)
        expect(point0[1]).to.be.closeTo(59.9002565, 0.0001)
        expect(point1[0]).to.be.closeTo(21.8798941, 0.0001)
        expect(point1[1]).to.be.closeTo(59.900247, 0.0001)
      })
  })
  it('returns error if context is missing', () => {
    return getJson(app, '/tracks')
      .expect(500)
      .expect(res => assertValidationErrors(res, '"context" is required'))
  })
  it('returns error if bounding box is invalid', () => {
    return getJson(app, '/tracks')
      .query({ context: 'self', nwLat: 59.5, seLat: 'abcdefg', seLng: 1500 })
      .expect(500)
      .expect(res =>
        assertValidationErrors(
          res,
          '"nwLng" is required',
          '"seLat" must be a number',
          '"seLng" must be less than 180'
        )
      )
  })
})
