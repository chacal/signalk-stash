import { SKDelta, SKDeltaJSON } from '@chacal/signalk-ts'
import BPromise from 'bluebird'
import { expect } from 'chai'
import Debug from 'debug'
import express from 'express'
import { ZonedDateTime } from 'js-joda'
import request, { Response } from 'supertest'

import API from '../api-server/API'
import config from '../api-server/Config'
import DB from '../api-server/db/StashDB'
import { StashDB } from '../api-server/db/StashDB'
import Trackpoint from '../api-server/domain/Trackpoint'
import untypedMeasurementFixtures from './data/measurement-fixtures.json'
import untypedPositionFixtures from './data/position-fixtures.json'
import TestAccount from './TestAccount'

const debug = Debug('stash:test-util')
const measurementFixtures: SKDeltaJSON[] = untypedMeasurementFixtures
const positionFixtures: SKDeltaJSON[] = untypedPositionFixtures
export { measurementFixtures, positionFixtures }

export const vesselUuid =
  'urn:mrn:signalk:uuid:2204ae24-c944-5ffe-8d1d-4d411c9cea2e'

export const vesselAccount = new TestAccount(
  'signalk',
  'signalk',
  'PBKDF2$sha256$901$SsBHerbO7k6HXr3V$FK1Dcra1YV+kvqeV/LYaFZN4DslbgL6y' // "signalk"
)

export const runnerAccount = new TestAccount(
  'runner',
  'signalk',
  'PBKDF2$sha256$901$SsBHerbO7k6HXr3V$FK1Dcra1YV+kvqeV/LYaFZN4DslbgL6y' // "signalk"
)


export function waitFor<T>(
  action: () => Promise<T>,
  predicate: (t: T) => boolean
): Promise<T> {
  return action().then(res => {
    if (predicate(res)) {
      return BPromise.resolve(res)
    } else {
      return BPromise.delay(100).then(() => waitFor(action, predicate))
    }
  })
}

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

export function startTestApp(): express.Express {
  const testApp = express()
  // @ts-ignore: Unused expression
  // tslint:disable-next-line:no-unused-expression-chai
  new API(config, testApp)
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

const vesselIds = [
  vesselUuid,
  'self',
  'urn:mrn:signalk:uuid:7434c104-feae-48c8-ab3a-fd3bf4ad552f'
]
export function assertFixturePositionsInDB(DB: StashDB): Promise<void[]> {
  return Promise.all(vesselIds.map(id => DB.getTrackPointsForVessel(id))).then(
    positionsLists =>
      positionsLists.map((positions, i) => {
        const vesselFixturePositions = positionFixtures.filter(
          delta =>
            delta.context === 'vessels.' + vesselIds[i] ||
            (!delta.context && vesselIds[i] === 'self')
        )
        expect(positions.length).to.equal(vesselFixturePositions.length)
        assertTrackpoint(positions[0], vesselFixturePositions[0])
      })
  )
}

export function assertFixtureValuesInDB(DB: StashDB): Promise<void[]> {
  return DB.getValues(
    vesselUuid,
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
