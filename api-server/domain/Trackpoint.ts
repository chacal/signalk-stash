import Clickhouse from '@apla/clickhouse'
import { SKContext } from '@chacal/signalk-ts'
import BinaryQuadkey from 'binaryquadkey'
import Debug from 'debug'
import {
  ChronoField,
  ChronoUnit,
  Duration,
  Instant,
  ZonedDateTime,
  ZoneId
} from 'js-joda'
import QK from 'quadkeytools'
import { Transform, TransformCallback } from 'stream'
import SKClickHouse, { timeResolutionForZoom } from '../db/SKClickHouse'
import { BBox, Coords, TrackGeoJSON, ZoomLevel } from './Geo'
const debug = Debug('stash:skclickhouse')

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

// Class B AIS transmits every 3 minutes when going < 2 knots
const trackPauseThreshold = (zoomLevel?: number) => {
  const defaultThreshold = 3 * 60
  const thresholdSeconds =
    zoomLevel !== undefined
      ? Math.max(timeResolutionForZoom(zoomLevel), defaultThreshold)
      : defaultThreshold
  return Duration.of(thresholdSeconds, ChronoUnit.SECONDS)
}

export function tracksToGeoJSON(tracks: Track[]): TrackGeoJSON {
  let lastTrackpointTimestamp = ZonedDateTime.ofInstant(
    Instant.ofEpochSecond(0),
    ZoneId.UTC
  )
  let currentTrack: number[][]
  return {
    type: 'MultiLineString',
    coordinates: tracks.reduce((acc: number[][][], track) => {
      track.forEach((trackpoint: Trackpoint) => {
        if (
          Duration.between(
            lastTrackpointTimestamp,
            trackpoint.timestamp
          ).compareTo(trackPauseThreshold(zoomLevel)) > 0
        ) {
          currentTrack = []
          acc.push(currentTrack)
        }
        lastTrackpointTimestamp = trackpoint.timestamp
        currentTrack.push([trackpoint.coords.lng, trackpoint.coords.lat])
      })
      return acc
    }, [])
  }
}

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
  ch: SKClickHouse,
  cb?: (err?: Error) => void
) {
  return ch.bufferingQuery(`INSERT INTO trackpoint`, { format: 'TSV' }, cb)
}

export function insertTrackpoint(
  ch: SKClickHouse,
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
    super({ objectMode: true, highWaterMark: 1024 })
  }

  _transform(trackpoint: Trackpoint, encoding: string, cb: TransformCallback) {
    if (
      trackpoint.coords.latitude != null &&
      trackpoint.coords.longitude != null
    ) {
      this.push(trackPointToColumns(trackpoint))
    }
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
  context: SKContext,
  bbox?: BBox,
  zoomLevel?: ZoomLevel
): Promise<Trackpoint[]> {
  let selectFields =
    'toUnixTimestamp(ts) as t, millis, context, sourceRef, lat, lng'
  let bboxClause = ''
  let groupByClause = ''
  let orderBy = 't, millis'

  if (zoomLevel) {
    const timeResolutionSeconds = timeResolutionForZoom(zoomLevel)
    selectFields = `
        (intDiv(toUnixTimestamp(ts), ${timeResolutionSeconds}) * ${timeResolutionSeconds}) as t,
        0,
        '${context}',
        '',
        avg(lat),
        avg(lng)`
    groupByClause = 'GROUP BY t'
    orderBy = 't'
  }

  if (bbox) {
    const { nwKey, seKey } = bbox.toQuadKeys()
    bboxClause = `
      AND
        quadkey BETWEEN ${nwKey} AND ${seKey} AND
        lat BETWEEN ${bbox.se.latitude} AND ${bbox.nw.latitude} AND
        lng BETWEEN ${bbox.nw.longitude} AND ${bbox.se.longitude}
    `
  }

  const query = `
    SELECT ${selectFields}
    FROM trackpoint
    WHERE context = '${context}' ${bboxClause}
    ${groupByClause}
    ORDER BY ${orderBy}`

  debug(query)

  return ch
    .querying(query)
    .then(x => {
      debug(JSON.stringify(x.statistics) + ' ' + x.data.length)
      return x
    })
    .then(x => x.data.map(columnsToTrackpoint))
}
