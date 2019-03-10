import ClickHouse, { QueryCallback, QueryStream } from '@apla/clickhouse'
import BinaryQuadkey from 'binaryquadkey'
import Debug from 'debug'
const debug = Debug('stash:skclickhouse')
import {
  ChronoField,
  ChronoUnit,
  Instant,
  ZonedDateTime,
  ZoneId
} from 'js-joda'
import _ from 'lodash'
import QK from 'quadkeytools'
import { Transform, TransformCallback } from 'stream'
import config from '../Config'
import DeltaToTrackpointStream from '../DeltaToTrackpointStream'
import { BBox, Coords, ZoomLevel } from '../domain/Geo'
import Trackpoint, { Track } from '../domain/Trackpoint'

type PositionRowColumns = [
  number,
  number,
  string,
  string,
  number,
  number,
  string
]

export default class SKClickHouse {
  constructor(readonly ch = new ClickHouse(config.clickhouse)) {}

  ensureTables(): Promise<void> {
    return this.ch.querying(`
      CREATE TABLE IF NOT EXISTS position (
        ts     DateTime,
        millis UInt16,
        context String,
        source String,
        lat Float64,
        lng Float64,
        quadkey UInt64
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMMDD(ts)
      ORDER BY (context, quadkey, ts)
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

  getTrackPointsForVessel(
    vesselId: string,
    bbox?: BBox,
    zoomLevel?: ZoomLevel
  ): Promise<Trackpoint[]> {
    let selectFields = 'toUnixTimestamp(ts), millis, context, source, lat, lng'
    let groupBy = ''
    if (zoomLevel) {
      const timeResolutionSeconds = timeResolutionForZoom(zoomLevel)
      selectFields = `
        (intDiv(toUInt32(ts), ${timeResolutionSeconds}) * ${timeResolutionSeconds}) * 1000 as t,
        0,
        '${vesselId}',
        '',
        avg(lat),
        avg(lng)`
      groupBy = 'ts'
    }

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

    const query = `
    SELECT ${selectFields}
    FROM position
    WHERE context = '${vesselId}' ${bboxClause}
    GROUP BY ${groupBy}
    ORDER BY ts`
    debug(query)

    return this.ch.querying(query).then(x => {
      debug(JSON.stringify(x.statistics) + ' ' + x.data.length)
      return x
    }).then(x => x.data.map(columnsToTrackpoint))
  }

  getVesselTracks(
    vesselId: string,
    bbox?: BBox,
    zoomLevel?: ZoomLevel
  ): Promise<Track[]> {
    return this.getTrackPointsForVessel(vesselId, bbox, zoomLevel).then(
      pointsData =>
        _.values(
          _.groupBy(pointsData, point =>
            point.timestamp.truncatedTo(ChronoUnit.DAYS).toEpochSecond()
          )
        )
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
  context,
  source,
  lat,
  lng
]: PositionRowColumns): Trackpoint {
  return new Trackpoint(
    context,
    ZonedDateTime.ofInstant(
      Instant.ofEpochMilli(unixTime * 1000 + millis),
      ZoneId.UTC
    ),
    source,
    new Coords({ lat, lng })
  )
}

function trackPointToColumns(trackpoint: Trackpoint): PositionRowColumns {
  const qk = QK.locationToQuadkey(trackpoint.coords, 22)
  const bqk = BinaryQuadkey.fromQuadkey(qk)
  return [
    trackpoint.timestamp.toEpochSecond(),
    trackpoint.timestamp.get(ChronoField.MILLI_OF_SECOND),
    trackpoint.context,
    trackpoint.source,
    trackpoint.coords.latitude,
    trackpoint.coords.longitude,
    bqk.toString()
  ]
}

function timeResolutionForZoom(zoom: ZoomLevel) {
  if (zoom >= 20) {
    return 2
  } else if (zoom >= 16) {
    return 5
  } else if (zoom >= 14) {
    return 10
  } else if (zoom >= 11) {
    return 30
  } else if (zoom >= 9) {
    return 2 * 60
  } else if (zoom >= 7) {
    return 4 * 60
  } else {
    return 10 * 60
  }
}
