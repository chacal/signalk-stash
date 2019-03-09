import BPromise from 'bluebird'

import TestAccount from './TestAccount'

export const vesselUuid =
  'urn:mrn:signalk:uuid:2204ae24-c944-5ffe-8d1d-4d411c9cea2e'

export const testAccount = new TestAccount(
  'signalk',
  'signalk',
  'PBKDF2$sha256$901$SsBHerbO7k6HXr3V$FK1Dcra1YV+kvqeV/LYaFZN4DslbgL6y' // "signalk"
)

import { expect } from 'chai'
import { StashDB } from '../api-server/db/StashDB'
import Trackpoint from '../api-server/domain/Trackpoint'
import measurementFixtures from './data/measurement-fixtures.json'
import positionFixtures from './data/position-fixtures.json'

export { measurementFixtures, positionFixtures }

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

// TODO: Better type for fixturePoint
export function assertTrackpoint(point: Trackpoint, fixturePoint: any): void {
  expect(point.timestamp).to.exist
  expect(point.source).to.equal(fixturePoint.source)
  expect(point.timestamp.toString()).to.have.string(
    fixturePoint.updates[0].timestamp
  )
  expect(point.coords.longitude).to.equal(
    fixturePoint.updates[0].values[0].value.longitude
  )
}

const vesselIds = [vesselUuid, 'self']
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
