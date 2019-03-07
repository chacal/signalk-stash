import ClickHouse from '@apla/clickhouse'
import config from './config'

const DAY_AS_MILLISECONDS = 24 * 60 * 60 * 1000

class SKClickHouse {
  ch
  constructor() {
    this.ch = new ClickHouse(config.clickhouse)
  }
  resetTables() {
    return this.ch
      .querying('CREATE DATABASE IF NOT EXISTS signalk')
      .then(() => this.ch.querying(`DROP table IF EXISTS position`))
      .then(() =>
        this.ch.querying(`
          CREATE TABLE IF NOT EXISTS position (
            ts     DateTime,
            millis UInt16,
            source String,
            lat Float64,
            lng Float64,
            quadkey UInt64
          ) ENGINE = MergeTree()
          PARTITION BY toYYYYMMDD(ts)
          ORDER BY (source, quadkey, ts)
        `)
      )
  }
  insertTrackpoint({ context, timestamp, latitude, longitude }) {
    return new Promise((resolve, reject) => {
      const chInsert = this.ch.query(
        `INSERT INTO position`,
        { format: 'TSV' },
        err => {
          if (err) {
            return reject(err)
          }
          resolve()
        }
      )
      const ts = new Date(timestamp)
      chInsert.write([ts, ts.getMilliseconds(), '', latitude, longitude, ''])
      chInsert.end()
    })
  }
  getTrackPointsForVessel() {
    return this.ch
      .querying(`
      SELECT toUnixTimestamp(ts), millis, source, lat, lng
      FROM position
      ORDER BY (ts, millis)`
      )
      .then(x =>
        x.data.map(([timestamp, millis, source, lat, lng]) => ({
          timestamp: new Date(timestamp * 1000 + millis),
          geojson: {
            type: 'Point',
            coordinates: [lng, lat]
          }
        }))
      )
  }
  getVesselTracks() {
    return this.ch
      .querying(`
      SELECT toUnixTimestamp(ts), millis, lat, lng
      FROM position
      ORDER BY (ts, millis)`
      )
      .then(x =>
        x.data.map(([timestamp, millis, lat, lng]) => ({
          millis: timestamp * 1000 + millis,
          coordinate: [lng, lat]
        }))
      ).then(pointsData => {
        let previousTrackDayMillis = 0
        let currentTrackPoints = []
        const tracks = []
        pointsData.forEach(pointData => {
          if (pointData.millis - previousTrackDayMillis > DAY_AS_MILLISECONDS) {
           currentTrackPoints = []
           previousTrackDayMillis = getDayMillis(pointData.millis)
           tracks.push(currentTrackPoints)
          }
          currentTrackPoints.push(pointData.coordinate)
        })
        return tracks
      }).then(tracksData => ({
        type: 'MultiLineString',
        coordinates: tracksData
     }))
  }
}

function getDayMillis(timestamp) {
  const date = new Date(timestamp)
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return (day).getTime()
}

export default new SKClickHouse()
