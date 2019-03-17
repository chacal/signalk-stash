import ClickHouse, { QueryCallback, QueryStream } from '@apla/clickhouse'
import { SKContext } from '@chacal/signalk-ts'
import { ChronoUnit, ZonedDateTime } from 'js-joda'
import _ from 'lodash'
import config from '../Config'
import CountDownLatch from '../CountDownLatch'
import DeltaSplittingStream from '../DeltaSplittingStream'
import { BBox } from '../domain/Geo'
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
    bbox?: BBox
  ): Promise<Trackpoint[]> {
    return getTrackPointsForVessel(this.ch, context, bbox)
  }

  getVesselTracks(context: SKContext, bbox?: BBox): Promise<Track[]> {
    return this.getTrackPointsForVessel(context, bbox).then(pointsData =>
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

    const streamDone = done !== undefined ? createLatchedCb(done) : undefined
    pointsToTsv.pipe(insertTrackpointStream(this.ch, streamDone))
    pathValuesToTsv.pipe(insertPathValueStream(this.ch, streamDone))
    return deltaSplittingStream

    function createLatchedCb(done: (err?: Error) => void) {
      const streamsEndedLatch = new CountDownLatch(2, done)
      return streamsEndedLatch.signal.bind(streamsEndedLatch)
    }
  }

  getValues(
    context: any,
    path: string,
    from: ZonedDateTime,
    to: ZonedDateTime,
    timeresolution: number
  ): any {
    return getValues(this.ch, context, path, from, to, timeresolution)
  }
}
