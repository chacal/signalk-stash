import { expect } from 'chai'
import DB from '../api-server/db/StashDB'
import {
  assertCoords,
  assertValidationErrors,
  authIt,
  getAuthorizedJson,
  getJson,
  startTestApp,
  testVessel,
  testVesselUuids,
  writeDeltasFromPositionFixture
} from './test-util'
import TestDB from './TestDB'

describe('Track API', () => {
  const app = startTestApp()

  beforeEach(() =>
    TestDB.resetTables()
      .then(writeDeltasFromPositionFixture)
      .then(() => DB.upsertVessel(testVessel))
  )

  authIt('returns tracks for self vessel', token => {
    return getAuthorizedJson(app, token, '/tracks')
      .query({ context: testVesselUuids[2] })
      .expect(res => {
        expect(res.body.type).to.equal('MultiLineString')
        expect(res.body.coordinates).to.have.lengthOf(1)
        expect(res.body.coordinates[0]).to.have.lengthOf(3)
      })
  })

  authIt('returns track for timespan', token => {
    return getAuthorizedJson(app, token, '/tracks')
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

  authIt('returns multiple tracks for a timespan', token => {
    return getAuthorizedJson(app, token, '/tracks')
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

  authIt('returns no tracks for a timespan', token => {
    return getAuthorizedJson(app, token, '/tracks')
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

  authIt('invalid timespan returns error', token => {
    return getAuthorizedJson(app, token, '/tracks', 400).query({
      context: testVesselUuids[0],
      from: '12-99-77T19:00:22',
      to: '2013-08-15T19:01:25'
    })
  })

  authIt('returns tracks with bounding box', token => {
    return getAuthorizedJson(app, token, '/tracks')
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
  authIt('returns empty track with bounding box', token => {
    return getAuthorizedJson(app, token, '/tracks')
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
  authIt('returns error if context is missing', token => {
    return getAuthorizedJson(app, token, '/tracks', 400).expect(res =>
      assertValidationErrors(res, '"context" is required')
    )
  })
  authIt('returns error if bounding box is invalid', token => {
    return getAuthorizedJson(app, token, '/tracks', 400)
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
  authIt('returns track with zoom level 20', token => {
    return getAuthorizedJson(app, token, '/tracks')
      .query({
        context: testVesselUuids[2],
        zoomLevel: 20 // Use 2s time interval -> will return all 3 points
      })
      .expect(res => {
        expect(res.body.coordinates).to.have.lengthOf(1)
        expect(res.body.coordinates[0]).to.have.lengthOf(3)
      })
  })
  authIt('returns track with zoom level 11', token => {
    return getAuthorizedJson(app, token, '/tracks')
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
  authIt('returns error with invalid zoom level', token => {
    return getAuthorizedJson(app, token, '/tracks', 400)
      .query({ context: testVesselUuids[2], zoomLevel: 'test' })
      .expect(res =>
        assertValidationErrors(res, '"zoomLevel" must be a number')
      )
  })
  authIt('returns error with too small zoom level', token => {
    return getAuthorizedJson(app, token, '/tracks', 400)
      .query({ context: testVesselUuids[2], zoomLevel: 0 })
      .expect(res =>
        assertValidationErrors(res, '"zoomLevel" must be greater than 0')
      )
  })
  it('requires authorization', async () => {
    return getJson(app, '/tracks', 401)
  })
})
