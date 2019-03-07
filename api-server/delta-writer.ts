import _ from 'lodash'
import IStashDB from './StashDB'
import Trackpoint from './Trackpoint'

export default class SignalKDeltaWriter {
  constructor(private readonly db: IStashDB) {}

  writeDelta(delta) {
    const { context, updates } = delta
    const inserts = updates.map(update => {
      const { timestamp, $source } = update
      const sourceId = $source || 'n/a'
      return update.values.map(value => {
        if (value.path === 'navigation.position') {
          const {
            value: { latitude, longitude }
          } = value
          return this.db.insertTrackpoint(
            new Trackpoint(
              stripVesselsPrefix(context),
              timestamp,
              sourceId,
              longitude,
              latitude
            )
          )
        }
      })
    })
    return Promise.all(_.flatten(inserts))
  }
}

function stripVesselsPrefix(deltaContext) {
  return deltaContext.startsWith('vessels.')
    ? deltaContext.replace(/^vessels\./, '')
    : deltaContext
}
