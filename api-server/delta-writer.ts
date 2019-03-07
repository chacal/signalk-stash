import { SKContext, SKDelta, SKPosition } from '@chartedsails/strongly-signalk'
import _ from 'lodash'
import { ITrackDB } from './StashDB'
import Trackpoint from './Trackpoint'

export default class SignalKDeltaWriter {
  constructor(private readonly db: ITrackDB) {}

  writeDelta(delta: SKDelta) {
    const { context, updates } = delta
    const inserts = updates.map(update => {
      const { timestamp, source } = update
      const sourceId = source !== undefined ? source.label : 'n/a' // TODO: Fix handling empty source
      return update.values.map(value => {
        if (value.path === 'navigation.position') {
          const position = value.value as SKPosition // TODO: Add type guard to SKPosition
          const ctx = stripVesselsPrefix(context)
          return this.db.insertTrackpoint(
            new Trackpoint(
              ctx,
              timestamp,
              sourceId,
              position.longitude,
              position.latitude
            )
          )
        } else {
          return Promise.resolve()
        }
      })
    })
    return Promise.all(_.flatten(inserts))
  }
}

function stripVesselsPrefix(deltaContext?: SKContext) {
  if (!deltaContext) {
    return 'self'
  }
  return deltaContext.startsWith('vessels.')
    ? deltaContext.replace(/^vessels\./, '')
    : deltaContext
}
