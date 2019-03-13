import ClickHouse, {
  QueryCallback,
  QueryStream,
  TsvRowCallback
} from '@apla/clickhouse'
import { ChronoUnit } from 'js-joda'
import _ from 'lodash'
import config from '../Config'
import CountDownLatch from '../CountDownLatch'
import DeltaToTrackpointStream from '../DeltaToTrackpointStream'
import { BBox } from '../domain/Geo'
import {
  createValuesTable,
  PathValuesToClickHouseTSV
} from '../domain/PathValue'
import Trackpoint, {
  createPositionsTable,
  getTrackPointsForVessel,
  Track,
  TrackpointsToClickHouseTSV,
  trackPointToColumns
} from '../domain/Trackpoint'

export default class SKClickHouse {
  constructor(readonly ch = new ClickHouse(config.clickhouse)) {}

  ensureTables(): Promise<[void, void]> {
    return Promise.all([
      createPositionsTable(this.ch),
      createValuesTable(this.ch)
    ])
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
    return getTrackPointsForVessel(this.ch, vesselId, bbox)
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
    done?: QueryCallback<void>,
    tsvRowCb?: TsvRowCallback
  ): QueryStream {
    const pointsToTsv = new TrackpointsToClickHouseTSV(tsvRowCb)
    const pathValuesToTsv = new PathValuesToClickHouseTSV()
    const deltaToTrackpointsStream = new DeltaToTrackpointStream(
      pointsToTsv,
      pathValuesToTsv
    )
    const streamsEndedLatch = new CountDownLatch(2, done as () => {})
    const streamDone = streamsEndedLatch.signal.bind(streamsEndedLatch)
    pointsToTsv.pipe(
      this.ch.query(`INSERT INTO position`, { format: 'TSV' }, streamDone)
    )
    pathValuesToTsv.pipe(
      this.ch.query(`INSERT INTO value`, { format: 'TSV' }, streamDone)
    )
    return deltaToTrackpointsStream
  }
}
