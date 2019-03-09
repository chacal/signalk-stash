import { SKContext, SKDelta, SKPosition } from '@chartedsails/strongly-signalk'
import _ from 'lodash'
import { Coords } from './Geo'

export default class Trackpoint {
  constructor(
    readonly context: string,
    readonly timestamp: Date,
    readonly source: string,
    readonly coords: Coords
  ) {}
}

// TODO: Move to a separate file?
export type Track = Trackpoint[]

export function trackpointsFromDelta(delta: SKDelta): Trackpoint[] {
  const { context, updates } = delta
  return _.flatten(
    updates.map(update => {
      const { timestamp, source } = update
      const sourceId = source !== undefined ? source.label : 'n/a' // TODO: Fix handling empty source
      return update.values
        .filter(v => v.path === 'navigation.position')
        .map(value => {
          const position = value.value as SKPosition // TODO: Add type guard to SKPosition
          const ctx = stripVesselsPrefix(context)
          return new Trackpoint(
            ctx,
            timestamp,
            sourceId,
            Coords.fromSKPosition(position)
          )
        })
    })
  )
}

function stripVesselsPrefix(deltaContext?: SKContext) {
  if (!deltaContext) {
    return 'self'
  }
  return deltaContext.startsWith('vessels.')
    ? deltaContext.replace(/^vessels\./, '')
    : deltaContext
}