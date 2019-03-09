import ClickHouse, { QueryCallback, QueryStream } from '@apla/clickhouse'
import BinaryQuadkey from 'binaryquadkey'
import _ from 'lodash'
import QK from 'quadkeytools'
import { Transform, TransformCallback } from 'stream'
import config from '../Config'
import DeltaToTrackpointStream from '../DeltaToTrackpointStream'
import { BBox, Coords } from '../domain/Geo'
import Trackpoint, { Track } from '../domain/Trackpoint'

type PositionRowColumns = [Date, number, string, number, number, string]

export default class SKClickHouse {
  constructor(readonly ch = new ClickHouse(config.clickhouse)) {}

  ensureTables(): Promise<void> {
    return this.ch.querying(`
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
  }

  insertTrackpoint(trackpoint: Trackpoint): Promise<void> {
    return new Promise((resolve, reject) => {
      const chInsert = this.ch.query(
        `INSERT INTO position`,
        { format: 'TSV' },
        err => (err ? reject(err) : resolve())
      )
      chInsert.write(trackPointToColumns(trackpoint))
      chInsert.end()
    })
  }

  getTrackPointsForVessel(bbox?: BBox): Promise<Trackpoint[]> {
    let bboxWHERE = ''

    // TODO: Extract method
    if (bbox) {
      const NWQuadKey = BinaryQuadkey.fromQuadkey(
        QK.locationToQuadkey(bbox.nw, 22)
      )
      const SEQuadKey = BinaryQuadkey.fromQuadkey(
        QK.locationToQuadkey(bbox.se, 22)
      )
      bboxWHERE = `
        WHERE
          quadkey BETWEEN ${NWQuadKey} AND ${SEQuadKey} AND
          lat BETWEEN ${bbox.se.latitude} AND ${bbox.nw.latitude} AND
          lng BETWEEN ${bbox.nw.longitude} AND ${bbox.se.longitude}
      `
    }

    return this.ch
      .querying(
        `
          SELECT toUnixTimestamp(ts), millis, source, lat, lng
          FROM position
          ${bboxWHERE}
          ORDER BY ts, millis`
      )
      .then(x =>
        x.data.map(
          ([timestamp, millis, source, lat, lng]: any[]) =>
            new Trackpoint(
              source, // TODO: Replace with context
              new Date(timestamp * 1000 + millis),
              source,
              new Coords({ lat, lng })
            )
        )
      )
  }

  getVesselTracks(bbox?: BBox): Promise<Track[]> {
    return this.getTrackPointsForVessel(bbox).then(pointsData =>
      _.values(_.groupBy(pointsData, point => getDayMillis(point.timestamp)))
    )
  }

  // TODO: Could this return a typed stream that would only accept writes for SKDelta?
  deltaWriteStream(cb: QueryCallback<void>): QueryStream {
    const deltaToTrackpointsStream = new DeltaToTrackpointStream()
    const pointsToTsv = new TrackpointsToClickHouseTSV()
    const chWriteStream = this.ch.query(
      `INSERT INTO position`,
      { format: 'TSV' },
      cb
    )
    deltaToTrackpointsStream.pipe(pointsToTsv).pipe(chWriteStream)
    return deltaToTrackpointsStream
  }
}

class TrackpointsToClickHouseTSV extends Transform {
  constructor() {
    super({ objectMode: true })
  }

  _transform(trackpoint: Trackpoint, encoding: string, cb: TransformCallback) {
    this.push(trackPointToColumns(trackpoint))
    cb()
  }
}

function trackPointToColumns(trackpoint: Trackpoint): PositionRowColumns {
  const qk = QK.locationToQuadkey(trackpoint.coords, 22)
  const bqk = BinaryQuadkey.fromQuadkey(qk)
  return [
    trackpoint.timestamp,
    trackpoint.timestamp.getMilliseconds(),
    trackpoint.source,
    trackpoint.coords.latitude,
    trackpoint.coords.longitude,
    bqk.toString()
  ]
}

function getDayMillis(date: Date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return day.getTime()
}
