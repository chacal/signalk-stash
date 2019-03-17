import { SKDelta, SKDeltaJSON } from '@chacal/signalk-ts'
import BPromise from 'bluebird'
import { expect } from 'chai'
import express from 'express'
import { ZonedDateTime } from 'js-joda'
import request, { Response } from 'supertest'

import API from '../api-server/API'
import config from '../api-server/Config'
import DB from '../api-server/db/StashDB'
import { StashDB } from '../api-server/db/StashDB'
import Trackpoint from '../api-server/domain/Trackpoint'
import SignalKDeltaWriter from '../api-server/SignalKDeltaWriter'
import untypedMeasurementFixtures from './data/measurement-fixtures.json'
import untypedPositionFixtures from './data/position-fixtures.json'
import TestAccount from './TestAccount'

const measurementFixtures: SKDeltaJSON[] = untypedMeasurementFixtures
const positionFixtures: SKDeltaJSON[] = untypedPositionFixtures
export { measurementFixtures, positionFixtures }

export const vesselUuid =
  'urn:mrn:signalk:uuid:2204ae24-c944-5ffe-8d1d-4d411c9cea2e'

export const testAccount = new TestAccount(
  'signalk',
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

export function writeDeltasFromPositionFixture(): Promise<void[][]> {
  return Promise.all(
    positionFixtures.map(delta =>
      new SignalKDeltaWriter(DB).writeDelta(SKDelta.fromJSON(delta))
    )
  )
}

export function getJson(app: express.Express, path: string): request.Test {
  return request(app)
    .get(path)
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/)
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
export function assertFixturePositionsFound(DB: StashDB): Promise<void[]> {
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

export function assertFixtureValuesFound(DB: StashDB): Promise<void[]> {
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
