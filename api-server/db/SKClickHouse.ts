import ClickHouse, {
  QueryCallback,
  QueryStream,
  TsvRowCallback
} from '@apla/clickhouse'
import BinaryQuadkey from 'binaryquadkey'
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
import { BBox, Coords } from '../domain/Geo'
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
        sourceRef String,
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
    bbox?: BBox
  ): Promise<Trackpoint[]> {
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

    return this.ch
      .querying(
        `
          SELECT toUnixTimestamp(ts), millis, context, sourceRef, lat, lng
          FROM position
          WHERE context = '${vesselId}' ${bboxClause}
          ORDER BY ts, millis`
      )
      .then(x => x.data.map(columnsToTrackpoint))
  }

  getVesselTracks(vesselId: string, bbox?: BBox): Promise<Track[]> {
    return this.getTrackPointsForVessel(vesselId, bbox).then(pointsData =>
      _.values(
        _.groupBy(pointsData, point =>
          point.timestamp.truncatedTo(ChronoUnit.DAYS).toEpochSecond()
        )
      )
    )
  }

  // TODO: Could this return a typed stream that would only accept writes for SKDelta?
  deltaWriteStream(
    cb?: QueryCallback<void>,
    tsvRowCb?: TsvRowCallback
  ): QueryStream {
    const deltaToTrackpointsStream = new DeltaToTrackpointStream()
    const pointsToTsv = new TrackpointsToClickHouseTSV(tsvRowCb)
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
  constructor(readonly tsvRowCb: TsvRowCallback = () => undefined) {
    super({ objectMode: true })
  }

  _transform(trackpoint: Trackpoint, encoding: string, cb: TransformCallback) {
    this.tsvRowCb()
    this.push(trackPointToColumns(trackpoint))
    cb()
  }
}

function columnsToTrackpoint([
  unixTime,
  millis,
  context,
  sourceRef,
  lat,
  lng
]: PositionRowColumns): Trackpoint {
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

function trackPointToColumns(trackpoint: Trackpoint): PositionRowColumns {
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
