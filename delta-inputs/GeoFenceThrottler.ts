import { SKDelta, SKPosition, SKUpdate, SKValue } from '@chacal/signalk-ts'
import { isPointWithinRadius } from 'geolib'

export default class GeoFenceThrottler {
  private latestPositionTs = new Date(0)

  constructor(
    readonly fenceCenterLat: number,
    readonly fenceCenterLon: number,
    readonly fenceRadiusMeters: number,
    readonly insideFenceThrottleMs: number,
    readonly outsideFenceThrottleMs: number
  ) {}

  throttlePositions(delta: SKDelta): SKDelta | undefined {
    const throttledUpdates = this.throttleValuesInUpdates(delta.updates)
    if (throttledUpdates.length > 0) {
      return new SKDelta(delta.context, throttledUpdates)
    } else {
      return undefined
    }
  }

  private throttleValuesInUpdates(updates: SKUpdate[]) {
    const ret: SKUpdate[] = []
    updates.forEach(upd => {
      const values = upd.values.filter(v =>
        this.shouldKeepValue(v, upd.timestamp)
      )
      if (values.length > 0) {
        ret.push(new SKUpdate(upd.$source, upd.timestamp, values, upd.source))
      }
    })
    return ret
  }

  private shouldKeepValue(v: SKValue, updateTs: Date) {
    if (v.path === 'navigation.position') {
      const throttleTime = this.isInFence(v.value as SKPosition)
        ? this.insideFenceThrottleMs
        : this.outsideFenceThrottleMs
      const shouldKeep = this.shouldKeepByTime(updateTs, throttleTime)
      if (shouldKeep) {
        this.latestPositionTs = updateTs
      }
      return shouldKeep
    } else {
      return true
    }
  }

  private isInFence(pos: SKPosition) {
    return isPointWithinRadius(
      { lat: pos.latitude, lng: pos.longitude },
      { lat: this.fenceCenterLat, lng: this.fenceCenterLon },
      this.fenceRadiusMeters
    )
  }

  private shouldKeepByTime(ts: Date, amountMs: number) {
    return ts.getTime() - this.latestPositionTs.getTime() > amountMs
  }
}
