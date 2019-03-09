import ClickHouse, { QueryCallback, QueryStream } from '@apla/clickhouse'
import BinaryQuadkey from 'binaryquadkey'
import _ from 'lodash'
import QK from 'quadkeytools'
import { Transform, TransformCallback } from 'stream'
import config from '../Config'
import DeltaToTrackpointStream from '../DeltaToTrackpointStream'
import { BBox, Coords } from '../domain/Geo'
import Trackpoint, { Track } from '../domain/Trackpoint'

type PositionRowColumns = [number, number, string, number, number, string]

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

    if (bbox) {
      const { nwKey, seKey } = bbox.toQuadKeys()
      bboxWHERE = `
        WHERE
          quadkey BETWEEN ${nwKey} AND ${seKey} AND
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
      .then(x => x.data.map(columnsToTrackpoint))
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

function columnsToTrackpoint([
  unixTime,
  millis,
  source,
  lat,
  lng
]: PositionRowColumns): Trackpoint {
  return new Trackpoint(
    source, // TODO: Replace with context
    new Date(unixTime * 1000 + millis),
    source,
    new Coords({ lat, lng })
  )
}

function trackPointToColumns(trackpoint: Trackpoint): PositionRowColumns {
  const qk = QK.locationToQuadkey(trackpoint.coords, 22)
  const bqk = BinaryQuadkey.fromQuadkey(qk)
  return [
    toUnixTime(trackpoint.timestamp),
    trackpoint.timestamp.getMilliseconds(),
    trackpoint.source,
    trackpoint.coords.latitude,
    trackpoint.coords.longitude,
    bqk.toString()
  ]
}

function toUnixTime(date: Date): number {
  return parseInt((date.getTime() / 1000).toFixed(0), 10)
}

function getDayMillis(date: Date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return day.getTime()
}
