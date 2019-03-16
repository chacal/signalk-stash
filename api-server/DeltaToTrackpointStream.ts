import { SKContext, SKDelta, SKPosition } from '@chacal/signalk-ts'
import { nativeJs, ZonedDateTime } from 'js-joda'
import { Writable } from 'stream'
import AbstractDoubleOutputStream, {
  OutputStates
} from './AbstractDoubleOutputStream'
import { Coords } from './domain/Geo'
import PathValue from './domain/PathValue'
import Trackpoint from './domain/Trackpoint'

export default class DeltaToTrackpointStream extends AbstractDoubleOutputStream<
  SKDelta
> {
  constructor(
    private readonly trackPointStream: Writable,
    private readonly pathValueStream: Writable
  ) {
    super(trackPointStream, pathValueStream, { objectMode: true })
  }

  protected writeToOutputs(delta: SKDelta): OutputStates {
    let canWriteMorePoints = true
    let canWriteMoreValues = true

    const { context, updates } = delta
    updates.forEach(update => {
      const { timestamp, sourceRef } = update
      return update.values.forEach(pathValue => {
        if (pathValue.path === 'navigation.position') {
          const position = pathValue.value as SKPosition // TODO: Add type guard to SKPosition
          canWriteMorePoints =
            canWriteMorePoints &&
            this.trackPointStream.write(
              new Trackpoint(
                stripVesselsPrefix(context),
                ZonedDateTime.from(nativeJs(timestamp)),
                sourceRef,
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
                sourceRef,
                pathValue
              )
            )
        }
      })
    })
    return {
      output1CanWrite: canWriteMorePoints,
      output2CanWrite: canWriteMoreValues
    }
  }
}

function stripVesselsPrefix(deltaContext: SKContext) {
  return deltaContext.startsWith('vessels.')
    ? deltaContext.replace(/^vessels\./, '')
    : deltaContext
}
