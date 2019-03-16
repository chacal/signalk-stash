import { SKContext, SKDelta, SKPosition } from '@chacal/signalk-ts'
import { nativeJs, ZonedDateTime } from 'js-joda'
import { Writable } from 'stream'
import AbstractDoubleOutputStream, {
  OutputStates
} from './AbstractDoubleOutputStream'
import { Coords } from './domain/Geo'
import PathValue from './domain/PathValue'
import Trackpoint from './domain/Trackpoint'

export default class DeltaSplittingStream extends AbstractDoubleOutputStream<
  SKDelta
> {
  constructor(
    private readonly trackPointStream: Writable,
    private readonly pathValueStream: Writable
  ) {
    super(trackPointStream, pathValueStream, { objectMode: true })
  }

  protected writeToOutputs(delta: SKDelta): OutputStates {
    let canWritePoints = true
    let canWriteValues = true

    const { context, updates } = delta
    updates.forEach(update => {
      const { timestamp, sourceRef } = update
      return update.values.forEach(pathValue => {
        if (pathValue.path === 'navigation.position') {
          const position = pathValue.value as SKPosition // TODO: Add type guard to SKPosition
          const point = new Trackpoint(
            stripVesselsPrefix(context),
            ZonedDateTime.from(nativeJs(timestamp)),
            sourceRef,
            Coords.fromSKPosition(position)
          )
          canWritePoints = canWritePoints && this.trackPointStream.write(point)
        } else if (typeof pathValue.value === 'number') {
          const value = new PathValue(
            stripVesselsPrefix(context),
            ZonedDateTime.from(nativeJs(timestamp)),
            sourceRef,
            pathValue
          )
          canWriteValues = canWriteValues && this.pathValueStream.write(value)
        }
      })
    })
    this.emit('deltaProcessed', delta)
    return [canWritePoints, canWriteValues]
  }
}

function stripVesselsPrefix(deltaContext: SKContext) {
  return deltaContext.startsWith('vessels.')
    ? deltaContext.replace(/^vessels\./, '')
    : deltaContext
}
