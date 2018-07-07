import * as R from 'ramda'

class SignalKDeltaWriter {
  constructor(db) {
    this.db = db
  }

  writeDelta(delta) {
    const { context, updates } = delta
    const inserts = updates.map(update => {
      const { timestamp, $source } = update
      return update.values.map(value => {
        if (value.path === 'navigation.position') {
          const {
            value: { latitude, longitude }
          } = value
          return this.db.insertTrackpoint({
            context: stripVesselsPrefix(context),
            timestamp,
            latitude,
            longitude
          })
        } else {
          const { path, value: valueData } = value
          return this.db.insertMeasurement({
            context: stripVesselsPrefix(context),
            timestamp,
            path,
            sourceId: $source,
            value: valueData
          })
        }
      })
    })
    return Promise.all(R.flatten(inserts))
  }
}

function stripVesselsPrefix(deltaContext) {
  return deltaContext.startsWith('vessels.')
    ? deltaContext.replace(/^vessels\./, '')
    : deltaContext
}

export default SignalKDeltaWriter