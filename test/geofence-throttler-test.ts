import { SKDelta, SKPosition } from '@chacal/signalk-ts'
import { expect } from 'chai'
import _ from 'lodash'
import GeoFenceThrottler from '../delta-inputs/GeoFenceThrottler'
import { measurementFixtures, positionFixtures } from './test-util'

const testPositions = positionFixtures.slice(0, 5)
const firstPosition = testPositions[0].updates[0].values[0].value as SKPosition
let throttler: GeoFenceThrottler

describe('GeoFenceThrottler', () => {
  beforeEach(() => {
    throttler = new GeoFenceThrottler(
      firstPosition.latitude,
      firstPosition.longitude,
      100,
      120000,
      0
    )
  })

  it('throttles positions inside geofence', () => {
    expectOnlyFirstTestPositionToPass()
  })
  it('throttles multiple position updates inside one delta', () => {
    const testPosition = _.cloneDeep(testPositions[0])
    testPosition.updates = testPositions.map(tp => tp.updates).flat()
    const testDelta = SKDelta.fromJSON(testPosition)

    expectOnePosition(throttler.throttlePositions(testDelta))
  })
  it('throttles multiple position values inside one update', () => {
    const testPosition = _.cloneDeep(testPositions[0])
    testPosition.updates[0].values = testPositions
      .map(tp => tp.updates[0].values[0])
      .flat()
    const testDelta = SKDelta.fromJSON(testPosition)

    expectOnePosition(throttler.throttlePositions(testDelta))
  })
  it('does not throttle position values outside fence', () => {
    throttler = new GeoFenceThrottler(
      firstPosition.latitude + 10,
      firstPosition.longitude + 10,
      100,
      120000,
      0
    )
    testPositions.forEach(p => {
      const delta = SKDelta.fromJSON(p)
      expect(throttler.throttlePositions(delta)).to.eql(delta)
    })
  })
  it('throttles position values outside fence with separate timespan', () => {
    throttler = new GeoFenceThrottler(
      firstPosition.latitude + 10,
      firstPosition.longitude + 10,
      100,
      120000,
      120000
    )
    expectOnlyFirstTestPositionToPass()
  })
  it('does not throttle non-position values', () => {
    measurementFixtures.forEach(meas => {
      const delta = SKDelta.fromJSON(meas)
      expect(throttler.throttlePositions(delta)).to.eql(delta)
    })
  })
})

function expectOnlyFirstTestPositionToPass() {
  const delta1 = SKDelta.fromJSON(testPositions[0])
  // First delta should pass as is
  expect(throttler.throttlePositions(delta1)).to.eql(delta1)
  // Rest are within 120s and should be throttled
  testPositions.forEach(
    p =>
      expect(throttler.throttlePositions(SKDelta.fromJSON(p))).to.be.undefined
  )
  const laterDeltaJSON = _.cloneDeep(testPositions[0])
  laterDeltaJSON.updates[0].timestamp = new Date().toISOString()
  const laterDelta = SKDelta.fromJSON(laterDeltaJSON)
  expect(throttler.throttlePositions(laterDelta)).to.eql(laterDelta)
}

function expectOnePosition(delta: SKDelta | undefined) {
  expect(delta).to.not.be.undefined
  if (delta !== undefined && delta.updates !== undefined) {
    expect(delta.updates).to.have.length(1)
  } else {
    throw new Error('throttledDelta.updates should not be undefined')
  }
}
