import BPromise from 'bluebird'

export const vesselUuid =
  'urn:mrn:signalk:uuid:2204ae24-c944-5ffe-8d1d-4d411c9cea2e'
export const testAccount = {
  username: 'signalk',
  password: 'signalk',
  passwordHash: 'PBKDF2$sha256$901$SsBHerbO7k6HXr3V$FK1Dcra1YV+kvqeV/LYaFZN4DslbgL6y',  // "signalk"
  isMosquittoSuper: false
}

export const positionFixtures = require('./data/position-fixtures.json')
export const measurementFixtures = require('./data/measurement-fixtures.json')

export function waitFor(action, predicate) {
  return action().then(res => {
    if (predicate(res)) {
      return BPromise.resolve(res)
    } else {
      return BPromise.delay(100).then(() => waitFor(action, predicate))
    }
  })
}
