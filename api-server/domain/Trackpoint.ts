import { SKContext, SKDelta, SKPosition } from '@chacal/signalk-ts'
import { nativeJs, ZonedDateTime } from 'js-joda'
import _ from 'lodash'
import { Coords } from './Geo'

export default class Trackpoint {
  constructor(
    readonly context: string,
    readonly timestamp: ZonedDateTime,
    readonly sourceRef: string,
    readonly coords: Coords
  ) {}
}

// TODO: Move to a separate file?
export type Track = Trackpoint[]

export function trackpointsFromDelta(delta: SKDelta): Trackpoint[] {
  const { context, updates } = delta
  return _.flatten(
    updates.map(update => {
      const { timestamp, sourceRef } = update
      return update.values
        .filter(v => v.path === 'navigation.position')
        .map(value => {
          const position = value.value as SKPosition // TODO: Add type guard to SKPosition
          const ctx = stripVesselsPrefix(context)
          return new Trackpoint(
            ctx,
            ZonedDateTime.from(nativeJs(timestamp)),
            sourceRef,
            Coords.fromSKPosition(position)
          )
        })
    })
  )
}

function stripVesselsPrefix(deltaContext: SKContext) {
  return deltaContext.startsWith('vessels.')
    ? deltaContext.replace(/^vessels\./, '')
    : deltaContext
}
