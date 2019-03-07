import ClickHouse from '@apla/clickhouse'
import _ from 'lodash'
import config from './config'
import { ITrackDB } from './StashDB'
import Trackpoint, { Track } from './Trackpoint'

class SKClickHouse implements ITrackDB {
  constructor(private readonly ch = new ClickHouse(config.clickhouse)) {}

  ensureTables(): Promise<void> {
    // TODO: Remove DROP TABLE
    return this.ch.querying(`DROP TABLE IF EXISTS position`).then(() =>
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

  insertTrackpoint(trackpoint: Trackpoint): Promise<void> {
    return new Promise((resolve, reject) => {
      const chInsert = this.ch.query(
        `INSERT INTO position`,
        { format: 'TSV' },
        err => (err ? reject(err) : resolve())
      )
      chInsert.write([
        trackpoint.timestamp,
        trackpoint.timestamp.getMilliseconds(),
        trackpoint.source,
        trackpoint.latitude,
        trackpoint.longitude,
        ''
      ])
      chInsert.end()
    })
  }

  getTrackPointsForVessel(): Promise<Trackpoint[]> {
    return this.ch
      .querying(
        `
          SELECT toUnixTimestamp(ts), millis, source, lat, lng
          FROM position
          ORDER BY ts, millis`
      )
      .then(x =>
        x.data.map(
          ([timestamp, millis, source, lat, lng]: any[]) =>
            new Trackpoint(
              source,
              new Date(timestamp * 1000 + millis),
              source,
              lng,
              lat
            )
        )
      )
  }

  getVesselTracks(): Promise<Track[]> {
    return this.getTrackPointsForVessel().then(pointsData =>
      _.values(_.groupBy(pointsData, point => getDayMillis(point.timestamp)))
    )
  }
}

function getDayMillis(date: Date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return day.getTime()
}

export default new SKClickHouse()
