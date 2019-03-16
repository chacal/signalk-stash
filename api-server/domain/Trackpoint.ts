import Clickhouse from '@apla/clickhouse'
import BinaryQuadkey from 'binaryquadkey'
import { ChronoField, Instant, ZonedDateTime, ZoneId } from 'js-joda'
import QK from 'quadkeytools'
import { Transform, TransformCallback } from 'stream'
import { BBox, Coords } from './Geo'

export default class Trackpoint {
  constructor(
    readonly context: string,
    readonly timestamp: ZonedDateTime,
    readonly sourceRef: string,
    readonly coords: Coords
  ) {}
}

// TODO: Move to a separate file?
export type Track = Trackpoint[]

type TrackpointRowColumns = [
  number,
  number,
  string,
  string,
  number,
  number,
  string
]

export function createTrackpointTable(ch: Clickhouse) {
  return ch.querying(
    `
  CREATE TABLE IF NOT EXISTS trackpoint (
    ts     DateTime,
    millis UInt16,
    context String,
    sourceRef String,
    lat Float64,
    lng Float64,
    quadkey UInt64
  ) ENGINE = MergeTree()
  PARTITION BY (context, toYYYYMMDD(ts))
  ORDER BY (context, quadkey, sourceRef, ts)
`
  )
}

export function insertTrackpointStream(
  ch: Clickhouse,
  cb?: (err?: Error) => void
) {
  return ch.query(`INSERT INTO trackpoint`, { format: 'TSV' }, cb)
}

export function insertTrackpoint(
  ch: Clickhouse,
  trackpoint: Trackpoint
): Promise<void> {
  return new Promise((resolve, reject) => {
    const chInsert = insertTrackpointStream(ch, err =>
      err ? reject(err) : resolve()
    )
    chInsert.write(trackPointToColumns(trackpoint))
    chInsert.end()
  })
}

export class TrackpointsToClickHouseTSV extends Transform {
  constructor() {
    super({ objectMode: true })
  }

  _transform(trackpoint: Trackpoint, encoding: string, cb: TransformCallback) {
    this.push(trackPointToColumns(trackpoint))
    cb()
  }
}

function trackPointToColumns(trackpoint: Trackpoint): TrackpointRowColumns {
  const qk = QK.locationToQuadkey(trackpoint.coords, 22)
  const bqk = BinaryQuadkey.fromQuadkey(qk)
  return [
    trackpoint.timestamp.toEpochSecond(),
    trackpoint.timestamp.get(ChronoField.MILLI_OF_SECOND),
    trackpoint.context,
    trackpoint.sourceRef,
    trackpoint.coords.latitude,
    trackpoint.coords.longitude,
    bqk.toString()
  ]
}

function columnsToTrackpoint([
  unixTime,
  millis,
  context,
  sourceRef,
  lat,
  lng
]: TrackpointRowColumns): Trackpoint {
  return new Trackpoint(
    context,
    ZonedDateTime.ofInstant(
      Instant.ofEpochMilli(unixTime * 1000 + millis),
      ZoneId.UTC
    ),
    sourceRef,
    new Coords({ lat, lng })
  )
}

export function getTrackPointsForVessel(
  ch: Clickhouse,
  vesselId: string,
  bbox?: BBox
) {
  let bboxClause = ''

  if (bbox) {
    const { nwKey, seKey } = bbox.toQuadKeys()
    bboxClause = `
      AND
        quadkey BETWEEN ${nwKey} AND ${seKey} AND
        lat BETWEEN ${bbox.se.latitude} AND ${bbox.nw.latitude} AND
        lng BETWEEN ${bbox.nw.longitude} AND ${bbox.se.longitude}
    `
  }

  return ch
    .querying(
      `
        SELECT toUnixTimestamp(ts), millis, context, sourceRef, lat, lng
        FROM trackpoint
        WHERE context = '${vesselId}' ${bboxClause}
        ORDER BY ts, millis`
    )
    .then(x => x.data.map(columnsToTrackpoint))
}
