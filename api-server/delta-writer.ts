import _ from 'lodash'
import Trackpoint from './Trackpoint'

class SignalKDeltaWriter {
  private readonly db

  constructor(db) {
    this.db = db
  }

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
          return this.db.insertTrackpoint(new Trackpoint(
            stripVesselsPrefix(context),
            timestamp,
            longitude,
            latitude
          ))
        } else {
          const { path, value: valueData } = value
          return this.db.insertMeasurement({
            context: stripVesselsPrefix(context),
            timestamp,
            path,
            sourceId,
            value: valueData
          })
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

export default SignalKDeltaWriter
