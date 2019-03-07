import ClickHouse from '@apla/clickhouse'
import BinaryQuadkey from 'binaryquadkey'
import QK from 'quadkeytools'
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
      const qk = QK.locationToQuadkey({ lat: Number.parseFloat(latitude), lng: Number.parseFloat(longitude) }, 22)
      const bqk = BinaryQuadkey.fromQuadkey(qk)
      chInsert.write([ts, ts.getMilliseconds(), '', latitude, longitude, bqk.toString()])
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
  getVesselTracks({bbox}) {
    let query = `
    SELECT toUnixTimestamp(ts), millis, lat, lng
    FROM position
    ORDER BY (ts, millis)`
    if (bbox && bbox.nw && bbox.se) {
      const NWQuadKey = BinaryQuadkey.fromQuadkey(QK.locationToQuadkey(bbox.nw, 22))
      const SEQuadKey = BinaryQuadkey.fromQuadkey(QK.locationToQuadkey(bbox.se, 22))
      const timeResolutionSeconds = 2
      query = `
        SELECT
          (intDiv(toUInt32(ts), ${timeResolutionSeconds}) * ${timeResolutionSeconds}) * 1000 as t,
          0,
            avg(lat),
            avg(lng)
        FROM position
        WHERE
          quadkey BETWEEN ${NWQuadKey} AND ${SEQuadKey} AND
          lat BETWEEN ${bbox.se.lat} AND ${bbox.nw.lat} AND
          lng BETWEEN ${bbox.nw.lng} AND ${bbox.se.lng}
        GROUP BY t
        ORDER BY t`
    }
    return this.ch
      .querying(query)
      // .then(x => {
      //   console.log(x.data)
      //   return x
      // })
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
