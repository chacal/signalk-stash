import { expect } from 'chai'
import {
  assertCoords,
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
        s: 59,
        n: 60,
        w: 21,
        e: 21.85
      })
      .expect(res => {
        expect(res.body.type).to.equal('MultiLineString')
        expect(res.body.coordinates).to.have.lengthOf(1)
        expect(res.body.coordinates[0]).to.have.lengthOf(2)
        assertCoords(res.body.coordinates[0][0], 59.7, 21.7)
        assertCoords(res.body.coordinates[0][1], 59.8, 21.8)
      })
  })
  it('returns empty track with bounding box', () => {
    return getJson(app, '/tracks')
      .query({
        context: 'self',
        s: 40,
        n: 50,
        w: 21,
        e: 22
      })
      .expect(res => {
        expect(res.body.type).to.equal('MultiLineString')
        expect(res.body.coordinates).to.have.lengthOf(0)
      })
  })
  it('returns error if context is missing', () => {
    return getJson(app, '/tracks', 500).expect(res =>
      assertValidationErrors(res, '"context" is required')
    )
  })
  it('returns error if bounding box is invalid', () => {
    return getJson(app, '/tracks', 500)
      .query({ context: 'self', n: 59.5, s: 'abcdefg', e: 1500 })
      .expect(res =>
        assertValidationErrors(
          res,
          '"w" is required',
          '"s" must be a number',
          '"e" must be less than 180'
        )
      )
  })
  it('returns track with zoom level 20', () => {
    return getJson(app, '/tracks')
      .query({
        context: 'self',
        zoomLevel: 20 // Use 2s time interval -> will return all 3 points
      })
      .expect(res => {
        expect(res.body.coordinates).to.have.lengthOf(1)
        expect(res.body.coordinates[0]).to.have.lengthOf(3)
      })
  })
  it('returns track with zoom level 11', () => {
    return getJson(app, '/tracks')
      .query({
        context: 'self',
        zoomLevel: 11 // Use 30s time interval -> will return only 2 points (two first are averaged)
      })
      .expect(res => {
        expect(res.body.coordinates).to.have.lengthOf(1)
        expect(res.body.coordinates[0]).to.have.lengthOf(2)
        assertCoords(res.body.coordinates[0][0], 59.75, 21.75)
        assertCoords(res.body.coordinates[0][1], 59.9, 21.9)
      })
  })
  it('returns error with invalid zoom level', () => {
    return getJson(app, '/tracks', 500)
      .query({ context: 'self', zoomLevel: 'test' })
      .expect(res =>
        assertValidationErrors(res, '"zoomLevel" must be a number')
      )
  })
  it('returns error with too small zoom level', () => {
    return getJson(app, '/tracks', 500)
      .query({ context: 'self', zoomLevel: 0 })
      .expect(res =>
        assertValidationErrors(res, '"zoomLevel" must be greater than 0')
      )
  })
})
