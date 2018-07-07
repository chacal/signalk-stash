import * as R from 'ramda'

class SignalKDeltaWriter {
  constructor(db) {
    this.db = db
  }

  writeDelta(delta) {
    const { context, updates } = delta
    const inserts = updates.map(update => {
      const { timestamp } = update
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
          console.log(`Measurement ${value.path}`)
          return Promise.resolve(undefined)
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
