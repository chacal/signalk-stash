import { expect } from 'chai'
import {
  assertCoords,
  assertValidationErrors,
  getAuthorizedJson,
  getJson,
  startTestApp,
  testVesselUuids,
  writeDeltasFromPositionFixture
} from './test-util'
import TestDB from './TestDB'

describe('Track API', () => {
  const app = startTestApp()

  beforeEach(() => TestDB.resetTables().then(writeDeltasFromPositionFixture))

  it('requires authentication', () => {
    return getJson(app, '/tracks', 401)
  })

  it('returns tracks for self vessel', () => {
    return getAuthorizedJson(app, '/tracks')
      .query({ context: testVesselUuids[2] })
      .expect(res => {
        expect(res.body.type).to.equal('MultiLineString')
        expect(res.body.coordinates).to.have.lengthOf(1)
        expect(res.body.coordinates[0]).to.have.lengthOf(3)
      })
  })

  it('returns track for timespan', () => {
    return getAuthorizedJson(app, '/tracks')
      .query({
        context: testVesselUuids[0],
        from: '2014-08-15T19:00:22',
        to: '2014-08-15T19:01:25'
      })
      .expect(res => {
        expect(res.body.type).to.equal('MultiLineString')
        expect(res.body.coordinates).to.have.lengthOf(1)
        expect(res.body.coordinates[0]).to.have.lengthOf(21)
      })
  })

  it('returns multiple tracks for a timespan', () => {
    return getAuthorizedJson(app, '/tracks')
      .query({
        context: testVesselUuids[0],
        from: '2014-08-15T19:00:22',
        to: '2015-08-15T19:01:25'
      })
      .expect(res => {
        expect(res.body.type).to.equal('MultiLineString')
        expect(res.body.coordinates).to.have.lengthOf(4)
      })
  })

  it('returns no tracks for a timespan', () => {
    return getAuthorizedJson(app, '/tracks')
      .query({
        context: testVesselUuids[0],
        from: '2012-08-15T19:00:22',
        to: '2013-08-15T19:01:25'
      })
      .expect(res => {
        expect(res.body.type).to.equal('MultiLineString')
        expect(res.body.coordinates).to.have.lengthOf(0)
      })
  })

  it('invalid timespan returns error', () => {
    return getAuthorizedJson(app, '/tracks', 400).query({
      context: testVesselUuids[0],
      from: '12-99-77T19:00:22',
      to: '2013-08-15T19:01:25'
    })
  })

  it('returns tracks with bounding box', () => {
    return getAuthorizedJson(app, '/tracks')
      .query({
        context: testVesselUuids[2],
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
    return getAuthorizedJson(app, '/tracks')
      .query({
        context: testVesselUuids[2],
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
    return getAuthorizedJson(app, '/tracks', 400).expect(res =>
      assertValidationErrors(res, '"context" is required')
    )
  })
  it('returns error if bounding box is invalid', () => {
    return getAuthorizedJson(app, '/tracks', 400)
      .query({ context: testVesselUuids[2], n: 59.5, s: 'abcdefg', e: 1500 })
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
    return getAuthorizedJson(app, '/tracks')
      .query({
        context: testVesselUuids[2],
        zoomLevel: 20 // Use 2s time interval -> will return all 3 points
      })
      .expect(res => {
        expect(res.body.coordinates).to.have.lengthOf(1)
        expect(res.body.coordinates[0]).to.have.lengthOf(3)
      })
  })
  it('returns track with zoom level 11', () => {
    return getAuthorizedJson(app, '/tracks')
      .query({
        context: testVesselUuids[2],
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
    return getAuthorizedJson(app, '/tracks', 400)
      .query({ context: testVesselUuids[2], zoomLevel: 'test' })
      .expect(res =>
        assertValidationErrors(res, '"zoomLevel" must be a number')
      )
  })
  it('returns error with too small zoom level', () => {
    return getAuthorizedJson(app, '/tracks', 400)
      .query({ context: testVesselUuids[2], zoomLevel: 0 })
      .expect(res =>
        assertValidationErrors(res, '"zoomLevel" must be greater than 0')
      )
  })
})
