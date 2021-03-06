import Clickhouse from '@apla/clickhouse'
import BinaryQuadkey from 'binaryquadkey'
import Debug from 'debug'
import {
  ChronoField,
  ChronoUnit,
  DateTimeFormatter,
  Duration,
  Instant,
  ZonedDateTime,
  ZoneId
} from 'js-joda'
import QK from 'quadkeytools'
import simplify from 'simplify-js'
import { Transform, TransformCallback } from 'stream'

import Config from '../Config'
import SKClickHouse, {
  coordinateDecimalsForZoom,
  simplifyThresholdForZoom,
  timeResolutionForZoom
} from '../db/SKClickHouse'
import { TrackParams } from '../db/StashDB'
import { Coords, TrackGeoJSON } from './Geo'
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

export function tracksToGeoJSON(
  tracks: Track[],
  zoomLevel?: number
): TrackGeoJSON {
  const startTime = new Date()

  const splitTracks = splitTracksByTime(tracks)

  // Simplification works with Points not [x, y] coords. Thus we need to convert
  // tracks temporarily to Point[] and then back to number[].
  const pointTracks = splitTracks.map(track =>
    track.map(coords => ({ x: coords[0], y: coords[1] }))
  )
  const threshold = simplifyThresholdForZoom(zoomLevel)
  const simplifiedPointTracks = pointTracks.map(t => simplify(t, threshold))
  const simplifiedNumberTracks = simplifiedPointTracks.map(track =>
    track.map(p => [p.x, p.y])
  )

  debug(
    `Simplified GeoJSON from ${countElems(tracks)} to ${countElems(
      simplifiedNumberTracks
    )} points with threshold ${threshold} in ${msDiff(startTime)}ms.`
  )

  return {
    type: 'MultiLineString',
    coordinates: !Config.isTesting ? simplifiedNumberTracks : splitTracks // Use simplified tracks only when not testing
  }

  function splitTracksByTime(tracks: Track[]) {
    let lastTrackpointTimestamp = ZonedDateTime.ofInstant(
      Instant.ofEpochSecond(0),
      ZoneId.UTC
    )
    let currentTrack: number[][]

    return tracks.reduce((acc: number[][][], track) => {
      track.forEach(trackpoint => {
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

  function countElems(input: any[][]) {
    return input.reduce((count, a) => count + a.length, 0)
  }

  function msDiff(d: Date) {
    return new Date().getTime() - d.getTime()
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
    ts         DateTime                 CODEC(DoubleDelta, LZ4),
    millis     UInt16                   CODEC(LZ4),
    context    LowCardinality(String)   CODEC(LZ4),
    sourceRef  LowCardinality(String)   CODEC(LZ4),
    lat        Float64                  CODEC(Gorilla, LZ4),
    lng        Float64                  CODEC(Gorilla, LZ4),
    quadkey    UInt64                   CODEC(T64, LZ4)
  ) ENGINE = MergeTree()
  PARTITION BY (context, toYearWeek(ts))
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
  trackParams: TrackParams
): Promise<Trackpoint[]> {
  const { context, bbox, zoomLevel, timespan } = trackParams
  let selectFields = 'toUnixTimestamp(ts) as t, millis, lat, lng'
  let bboxClause = ''
  let timespanClause = ''
  let groupByClause = ''
  let orderBy = 't, millis'

  if (zoomLevel) {
    const timeResolutionSeconds = timeResolutionForZoom(zoomLevel)
    const coordinateDecimals = coordinateDecimalsForZoom(zoomLevel)
    selectFields = `
        (intDiv(toUnixTimestamp(ts), ${timeResolutionSeconds}) * ${timeResolutionSeconds}) as t,
        0,
        round(avg(lat),${coordinateDecimals}),
        round(avg(lng),${coordinateDecimals})`
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

  if (timespan) {
    timespanClause = `
      AND
        ts >= toDateTime('${timespan.from.format(
          DateTimeFormatter.ISO_LOCAL_DATE_TIME
        )}', 'UTC')
        AND
        ts < toDateTime('${timespan.to.format(
          DateTimeFormatter.ISO_LOCAL_DATE_TIME
        )}', 'UTC')
    `
  }

  const query = `
    SELECT ${selectFields}
    FROM trackpoint
    WHERE context = '${context}' ${bboxClause} ${timespanClause}
    ${groupByClause}
    ORDER BY ${orderBy}`

  debug(query)

  return ch
    .querying(query)
    .then(x => {
      debug(JSON.stringify(x.statistics) + ' ' + x.data.length)
      return x
    })
    .then(x =>
      x.data.map(([unixTime, millis, lat, lng]: number[]) =>
        columnsToTrackpoint([unixTime, millis, context, '', lat, lng, ''])
      )
    )
}
