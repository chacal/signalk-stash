import { SKContext, SKDelta, SKPosition } from '@chacal/signalk-ts'
import { nativeJs, ZonedDateTime } from 'js-joda'
import { Writable } from 'stream'
import CountDownLatch from './CountDownLatch'
import { Coords } from './domain/Geo'
import PathValue from './domain/PathValue'
import Trackpoint from './domain/Trackpoint'

export default class DeltaToTrackpointStream extends Writable {
  readonly trackPointStream: Writable
  readonly pathValueStream: Writable

  constructor(trackPointStream: Writable, pathValueStream: Writable) {
    super({ objectMode: true })
    this.trackPointStream = trackPointStream
    this.pathValueStream = pathValueStream

    this.on('finish', () => {
      trackPointStream.end()
      pathValueStream.end()
    })
  }

  _write(delta: SKDelta, encoding: string, done: any) {
    const { canWriteMorePoints, canWriteMoreValues } = this.handleDelta(delta)
    // if either or both out streams is over highwatermark we need to wait
    // for it to drain before processing more input
    const blockedCount =
      (!canWriteMorePoints ? 1 : 0) + (!canWriteMoreValues ? 1 : 0)
    if (blockedCount > 0) {
      const countdown = new CountDownLatch(blockedCount, done)
      if (!canWriteMorePoints) {
        this.trackPointStream.once('drain', () => countdown.signal())
      }
      if (!canWriteMoreValues) {
        this.pathValueStream.once('drain', () => countdown.signal())
      }
    } else {
      done()
    }
  }

  handleDelta(
    delta: SKDelta
  ): { canWriteMorePoints: boolean; canWriteMoreValues: boolean } {
    let canWriteMorePoints = true
    let canWriteMoreValues = true

    const { context, updates } = delta
    updates.forEach(update => {
      const { timestamp, source } = update
      const sourceId = source !== undefined ? source.label : 'n/a' // TODO: Fix handling empty source
      return update.values.forEach(pathValue => {
        if (pathValue.path === 'navigation.position') {
          const position = pathValue.value as SKPosition // TODO: Add type guard to SKPosition
          canWriteMorePoints =
            canWriteMorePoints &&
            this.trackPointStream.write(
              new Trackpoint(
                stripVesselsPrefix(context),
                ZonedDateTime.from(nativeJs(timestamp)),
                sourceId,
                Coords.fromSKPosition(position)
              )
            )
        } else if (typeof pathValue.value === 'number') {
          canWriteMoreValues =
            canWriteMoreValues &&
            this.pathValueStream.write(
              new PathValue(
                stripVesselsPrefix(context),
                ZonedDateTime.from(nativeJs(timestamp)),
                sourceId,
                pathValue
              )
            )
        }
      })
    })
    return { canWriteMorePoints, canWriteMoreValues }
  }
}

function stripVesselsPrefix(deltaContext: SKContext) {
  return deltaContext.startsWith('vessels.')
    ? deltaContext.replace(/^vessels\./, '')
    : deltaContext
}
