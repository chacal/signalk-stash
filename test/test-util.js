import BPromise from 'bluebird'

export const vesselUuid =
  'urn:mrn:signalk:uuid:2204ae24-c944-5ffe-8d1d-4d411c9cea2e'

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
