import BPromise from 'bluebird'

import TestAccount from './TestAccount'

export const vesselUuid = 'urn:mrn:signalk:uuid:2204ae24-c944-5ffe-8d1d-4d411c9cea2e'
export const testAccount = new TestAccount(
  'signalk',
  'signalk',
  'PBKDF2$sha256$901$SsBHerbO7k6HXr3V$FK1Dcra1YV+kvqeV/LYaFZN4DslbgL6y' // "signalk"
)

import {expect} from 'chai'
import Trackpoint from '../api-server/Trackpoint'
import measurementFixtures from './data/measurement-fixtures.json'
import positionFixtures from './data/position-fixtures.json'

export { measurementFixtures, positionFixtures }

export function waitFor(action, predicate) {
  return action().then(res => {
    if (predicate(res)) {
      return BPromise.resolve(res)
    } else {
      return BPromise.delay(100).then(() => waitFor(action, predicate))
    }
  })
}

export function assertTrackpoint(point: Trackpoint, fixturePoint: any): void {
  expect(point.timestamp).to.exist
  expect(point.source).to.equal('aava.160')
  expect(point.timestamp.toISOString()).to.have.string(
    fixturePoint.updates[0].timestamp
  )
  expect(point.longitude).to.equal(
    fixturePoint.updates[0].values[0].value.longitude
  )
}
