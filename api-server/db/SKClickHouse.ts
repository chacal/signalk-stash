import ClickHouse, {
  QueryCallback,
  QueryOptions,
  QueryStream
} from '@apla/clickhouse'
import { SKContext } from '@chacal/signalk-ts'
import { ChronoUnit, LocalDate, ZonedDateTime } from '@js-joda/core'
import Debug from 'debug'
import _ from 'lodash'
import BufferingWritableStream from '../BufferingWritableStream'
import config from '../Config'
import CountDownLatch from '../CountDownLatch'
import DeltaSplittingStream from '../DeltaSplittingStream'
import { ZoomLevel } from '../domain/Geo'
import {
  createValuesTable,
  getValues,
  insertPathValueStream,
  PathValuesToClickHouseTSV
} from '../domain/PathValue'
import Trackpoint, {
  createTrackpointTable,
  getTrackPointsForVessel,
  insertTrackpoint,
  insertTrackpointStream,
  Track,
  TrackpointsToClickHouseTSV
} from '../domain/Trackpoint'
import TrackStatistics, {
  getDailyTrackStatistics,
  getTrackStatisticsForVesselTimespan
} from '../domain/TrackStatistics'
import { TrackParams } from './StashDB'

const debug = Debug('stash:skclickhouse')

export default class SKClickHouse {
  constructor(readonly ch = new ClickHouse(config.clickhouse)) {}

  ensureTables(): Promise<[void, void]> {
    return Promise.all([
      createTrackpointTable(this.ch),
      createValuesTable(this.ch)
    ])
  }

  insertTrackpoint(trackpoint: Trackpoint): Promise<void> {
    return insertTrackpoint(this, trackpoint)
  }

  getTrackPointsForVessel(trackParams: TrackParams): Promise<Trackpoint[]> {
    return getTrackPointsForVessel(this.ch, trackParams)
  }

  getTrackStatisticsForVesselTimespan(
    context: SKContext,
    start: ZonedDateTime,
    end: ZonedDateTime
  ): Promise<TrackStatistics> {
    return getTrackStatisticsForVesselTimespan(this.ch, context, start, end)
  }

  getDailyTrackStatistics(
    context: SKContext,
    firstDate: LocalDate,
    lastDate: LocalDate
  ): Promise<TrackStatistics[]> {
    return getDailyTrackStatistics(this.ch, context, firstDate, lastDate)
  }

  getVesselTracks(trackParams: TrackParams): Promise<Track[]> {
    return this.getTrackPointsForVessel(trackParams).then(pointsData =>
      _.values(
        _.groupBy(pointsData, point =>
          point.timestamp.truncatedTo(ChronoUnit.DAYS).toEpochSecond()
        )
      )
    )
  }

  // TODO: Could this return a typed stream that would only accept writes for SKDelta?
  deltaWriteStream(done?: QueryCallback<void>): QueryStream {
    const pointsToTsv = new TrackpointsToClickHouseTSV()
    const pathValuesToTsv = new PathValuesToClickHouseTSV()
    const deltaSplittingStream = new DeltaSplittingStream(
      pointsToTsv,
      pathValuesToTsv
    )

    const outputsDoneLatch = new CountDownLatch(
      2,
      // tslint:disable-next-line: no-empty
      done !== undefined ? done : () => {}
    )

    const trackpointDbStream = insertTrackpointStream(
      this,
      outputsDoneLatch.signal.bind(outputsDoneLatch)
    )
    pointsToTsv.pipe(trackpointDbStream)

    const pathValueDbStream = insertPathValueStream(
      this,
      outputsDoneLatch.signal.bind(outputsDoneLatch)
    )
    pathValuesToTsv.pipe(pathValueDbStream)

    return deltaSplittingStream
  }

  // TODO: Fix return type
  getValues(
    context: SKContext,
    path: string,
    from: ZonedDateTime,
    to: ZonedDateTime,
    timeresolution: number
  ): any {
    return getValues(this.ch, context, path, from, to, timeresolution)
  }

  bufferingQuery<T = any>(
    query: string,
    options: QueryOptions,
    cb?: QueryCallback<T>
  ): QueryStream {
    const s = new BufferingWritableStream(
      done => this.ch.query(query, options, done),
      config.deltaWriteStreamBufferSize,
      config.deltaWriteStreamFlushPeriod,
      config.deltaWriteStreamFlushRetryPeriod
    )
    if (cb) {
      s.on('finish', cb)
      s.on('error', cb)
    }
    return s
  }
}

export function timeResolutionForZoom(zoom: ZoomLevel) {
  if (zoom >= 20) {
    return 2
  } else if (zoom >= 16) {
    return 5
  } else if (zoom >= 14) {
    return 10
  } else if (zoom >= 11) {
    return 30
  } else if (zoom >= 9) {
    return 4 * 60
  } else if (zoom >= 7) {
    return 10 * 60
  } else {
    return 30 * 60
  }
}

export function coordinateDecimalsForZoom(zoom: ZoomLevel) {
  if (zoom >= 18) {
    return 6
  } else if (zoom >= 14) {
    return 5
  } else if (zoom >= 11) {
    return 4
  } else if (zoom >= 9) {
    return 3
  } else {
    return 3
  }
}

export function simplifyThresholdForZoom(zoom?: ZoomLevel) {
  const maxThreshold = 0.003
  if (zoom !== undefined) {
    return maxThreshold / Math.pow(zoom, 3)
  } else {
    return 0.00001
  }
}

export function chQuery(ch: ClickHouse, query: string) {
  debug(query)
  return ch.querying(query).then(x => {
    debug(JSON.stringify(x.statistics) + ' ' + x.data.length)
    return x
  })
}
