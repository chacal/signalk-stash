import ClickHouse, { QueryCallback, QueryStream } from '@apla/clickhouse'
import { SKContext } from '@chacal/signalk-ts'
import Debug from 'debug'
import { ChronoUnit, ZonedDateTime } from 'js-joda'
import _ from 'lodash'
import config from '../Config'
import CountDownLatch from '../CountDownLatch'
import DeltaSplittingStream from '../DeltaSplittingStream'
import { BBox, ZoomLevel } from '../domain/Geo'
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

const debug = Debug('stash:SKClickHouse')

export default class SKClickHouse {
  constructor(readonly ch = new ClickHouse(config.clickhouse)) {}

  ensureTables(): Promise<[void, void]> {
    return Promise.all([
      createTrackpointTable(this.ch),
      createValuesTable(this.ch)
    ])
  }

  insertTrackpoint(trackpoint: Trackpoint): Promise<void> {
    return insertTrackpoint(this.ch, trackpoint)
  }

  getTrackPointsForVessel(
    context: SKContext,
    bbox?: BBox,
    zoomLevel?: ZoomLevel
  ): Promise<Trackpoint[]> {
    return getTrackPointsForVessel(this.ch, context, bbox, zoomLevel)
  }

  getVesselTracks(
    context: SKContext,
    bbox?: BBox,
    zoomLevel?: ZoomLevel
  ): Promise<Track[]> {
    return this.getTrackPointsForVessel(context, bbox, zoomLevel).then(
      pointsData =>
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

    let trackpointDbStream = insertTrackpointStream(
      this.ch,
      outputsDoneLatch.signal.bind(outputsDoneLatch)
    )
    pointsToTsv.pipe(trackpointDbStream)

    let pathValueDbStream = insertPathValueStream(
      this.ch,
      outputsDoneLatch.signal.bind(outputsDoneLatch)
    )
    pathValuesToTsv.pipe(pathValueDbStream)

    debug('Setting interval')
    const interval = setInterval(() => {
      debug('Flushing streams')
      outputsDoneLatch.addCapacity(2)
      pointsToTsv.unpipe(trackpointDbStream)
      trackpointDbStream.end()
      trackpointDbStream = insertTrackpointStream(
        this.ch,
        outputsDoneLatch.signal.bind(outputsDoneLatch)
      )
      pointsToTsv.pipe(trackpointDbStream)

      pathValuesToTsv.unpipe(pathValueDbStream)
      pathValueDbStream.end()
      pathValueDbStream = insertPathValueStream(
        this.ch,
        outputsDoneLatch.signal.bind(outputsDoneLatch)
      )
      pathValuesToTsv.pipe(pathValueDbStream)
    }, config.deltaWriteStreamFlushPeriod.toMillis())
    deltaSplittingStream.on('finish', () => {
      debug('Clearing interval')
      clearInterval(interval)
    })
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
    return 2 * 60
  } else if (zoom >= 7) {
    return 4 * 60
  } else {
    return 10 * 60
  }
}
