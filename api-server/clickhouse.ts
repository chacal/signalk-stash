import ClickHouse from '@apla/clickhouse'
import config from './config'

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
      chInsert.write([new Date(timestamp), 0, '', latitude, longitude, ''])
      chInsert.end()
    })
  }
  getTracksForVessel() {
    return this.ch
      .querying(
        `
      SELECT *
      FROM position`
      )
      .then(x =>
        x.data.map(([timestamp, ts, millis, source, lat, lng]) => ({
          timestamp: new Date(timestamp),
          position: { lat, lng }
        }))
      )
  }
}

export default new SKClickHouse()
