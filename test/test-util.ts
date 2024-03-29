import { SKDelta, SKDeltaJSON } from '@chacal/signalk-ts'
import { ZonedDateTime } from '@js-joda/core'
import { expect } from 'chai'
import Debug from 'debug'
import express from 'express'
import _ from 'lodash'
import request, { Response } from 'supertest'

import API from '../api-server/API'
import config from '../api-server/Config'
import DB from '../api-server/db/StashDB'
import { StashDB } from '../api-server/db/StashDB'
import Trackpoint from '../api-server/domain/Trackpoint'
import Vessel from '../api-server/domain/Vessel'
import untypedMeasurementFixtures from './data/measurement-fixtures.json'
import untypedPositionFixtures from './data/position-fixtures.json'
import { encryptSessionCookie, makeTestIdToken } from './test-auth-util'

const debug = Debug('stash:test-util')
const measurementFixtures: SKDeltaJSON[] = untypedMeasurementFixtures as SKDeltaJSON[]
const positionFixtures: SKDeltaJSON[] = untypedPositionFixtures
export { measurementFixtures, positionFixtures }

export const vesselMqttPassword = 'vesselpassword'
export const vesselUuid =
  'urn:mrn:signalk:uuid:2204ae24-c944-4ffe-8d1d-4d411c9cea2e'
export const vesselOwnerEmail = 'unittest@signalk-stash-dev.chacal.fi'

export const testVessel = new Vessel(
  vesselUuid,
  'S/Y TestVessel',
  vesselMqttPassword,
  vesselOwnerEmail
)

export const testVesselUuids = [
  vesselUuid,
  'urn:mrn:signalk:uuid:7434c104-feae-48c8-ab3a-fd3bf4ad552f',
  'urn:mrn:signalk:uuid:7434c104-feae-48c8-ab3a-deadbeefdead'
]

export function writeDeltasFromPositionFixture(): Promise<void> {
  debug('Inserting positionFixtures..')
  return writeDeltasFromJSONArray(positionFixtures)
}

export function writeDeltasFromJSONArray(deltas: SKDeltaJSON[]): Promise<void> {
  debug(`Inserting ${deltas.length} deltas..`)
  return new Promise((resolve, reject) => {
    const insert = DB.deltaWriteStream(err => {
      if (err) {
        return reject(err)
      }
      debug('Deltas inserted')
      resolve()
    })
    deltas.forEach(delta => insert.write(SKDelta.fromJSON(delta)))
    insert.end()
  })
}

export function getJson(
  app: express.Express,
  path: string,
  statusCode: number = 200
): request.Test {
  return request(app)
    .get(path)
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/)
    .expect(statusCode)
}

export function getAuthorizedJson(
  app: express.Express,
  path: string,
  statusCode: number = 200
): request.Test {
  return addAuthCookie(getJson(app, path, statusCode))
}

export function addAuthCookie(
  req: request.Test,
  email: string = vesselOwnerEmail,
  emailVerified: boolean = true
): request.Test {
  return req.set('Cookie', [
    'appSession=' + createTestSessionCookie(email, emailVerified)
  ])
}

export function createTestSessionCookie(email: string, emailVerified: boolean) {
  const sessionData = { id_token: makeTestIdToken(email, emailVerified) }
  return encryptSessionCookie(sessionData, config.auth.secret)
}

export function startTestApp(): express.Express {
  const testApp = express()
  // @ts-ignore: Unused expression
  // tslint:disable-next-line:no-unused-expression-chai
  new API(config, _.noop, testApp)
  return testApp
}

// TODO: Better type for fixturePoint
export function assertTrackpoint(point: Trackpoint, fixturePoint: any): void {
  expect(point.timestamp).to.exist
  // expect(point.source).to.equal(fixturePoint.source) // TODO: Add assertion back once source handling works correctly
  expect(point.timestamp.toString()).to.have.string(
    fixturePoint.updates[0].timestamp
  )
  expect(point.coords.longitude).to.equal(
    fixturePoint.updates[0].values[0].value.longitude
  )
}

export function assertFixturePositionsInDB(DB: StashDB): Promise<void[]> {
  return Promise.all(
    testVesselUuids.map(id => DB.getTrackPointsForVessel({ context: id }))
  ).then(positionsLists =>
    positionsLists.map((positions, i) => {
      const vesselFixturePositions = positionFixtures.filter(
        delta =>
          delta.context === 'vessels.' + testVesselUuids[i] ||
          (!delta.context && testVesselUuids[i] === 'self')
      )
      expect(positions.length).to.equal(vesselFixturePositions.length)
      assertTrackpoint(positions[0], vesselFixturePositions[0])
    })
  )
}

export function assertFixtureValuesInDB(DB: StashDB): Promise<void[]> {
  return DB.getValues(
    testVesselUuids[0],
    'navigation.speedOverGround',
    ZonedDateTime.parse('2014-08-15T19:00:16.000Z'),
    ZonedDateTime.parse('2014-08-15T19:00:23.000Z'),
    3
  ).then((result: any) => {
    expect(result.data.length).to.equal(3)
    expect(result.data[0][1]).to.be.closeTo(3.58, 0.001)
    expect(result.data[0][0]).to.equal('2014-08-15 19:00:15')
  })
}

export function assertValidationErrors(res: Response, ...messages: string[]) {
  messages.forEach((msg, i) => {
    const key = `error.details[${i}].message`
    expect(res.body).to.nested.include({ [key]: msg })
  })
}

export function assertCoords(
  coords: [number, number],
  lat: number,
  lng: number,
  delta: number = 0.0001
): void {
  expect(coords[0]).to.be.closeTo(lng, delta)
  expect(coords[1]).to.be.closeTo(lat, delta)
}
