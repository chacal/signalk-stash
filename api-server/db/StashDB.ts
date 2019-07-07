import { QueryCallback, QueryStream } from '@apla/clickhouse'
import { SKContext } from '@chacal/signalk-ts'
import { LocalDate, ZonedDateTime } from 'js-joda'
import { vesselTopic } from '../../delta-inputs/MqttDeltaInput'
import { MqttAccount, MqttACL, MqttACLLevel } from '../domain/Auth'
import { BBox, ZoomLevel } from '../domain/Geo'
import Trackpoint, { Track } from '../domain/Trackpoint'
import TrackStatistics from '../domain/TrackStatistics'
import Vessel, { VesselData } from '../domain/Vessel'
import SKClickHouse from './SKClickHouse'
import SKPostgis from './SKPostgis'

export class StashDB {
  readonly postgis: SKPostgis = new SKPostgis()
  readonly ch: SKClickHouse = new SKClickHouse()

  /*
    Common DB functionality
   */
  ensureTables(): Promise<void> {
    return Promise.all([
      this.postgis.ensureTables(),
      this.ch.ensureTables()
    ]).then(() => undefined)
  }

  /*
    Track DB functionality
   */
  insertTrackpoint(trackpoint: Trackpoint): Promise<void> {
    return this.ch.insertTrackpoint(trackpoint)
  }

  getTrackPointsForVessel(
    context: SKContext,
    bbox?: BBox,
    zoomLevel?: ZoomLevel
  ): Promise<Trackpoint[]> {
    return this.ch.getTrackPointsForVessel(context, bbox, zoomLevel)
  }

  getVesselTracks(
    context: SKContext,
    bbox?: BBox,
    zoomLevel?: ZoomLevel
  ): Promise<Track[]> {
    return this.ch.getVesselTracks(context, bbox, zoomLevel)
  }

  getTrackStatisticsForVesselTimespan(
    context: SKContext,
    start: ZonedDateTime,
    end: ZonedDateTime
  ): Promise<TrackStatistics> {
    return this.ch.getTrackStatisticsForVesselTimespan(context, start, end)
  }

  getDailyTrackStatistics(
    context: SKContext,
    firstDate: LocalDate,
    lastDate: LocalDate
  ): Promise<TrackStatistics[]> {
    return this.ch.getDailyTrackStatistics(context, firstDate, lastDate)
  }

  deltaWriteStream(cb?: QueryCallback<void>): QueryStream {
    return this.ch.deltaWriteStream(cb)
  }

  getValues(
    context: SKContext,
    path: string,
    from: ZonedDateTime,
    to: ZonedDateTime,
    timeresolution: number
  ): any {
    return this.ch.getValues(context, path, from, to, timeresolution)
  }

  getContexts(): Promise<VesselData[]> {
    return this.postgis.getContexts()
  }

  /*
    Vessel level functionality
  */

  upsertVessel(vessel: Vessel): Promise<void> {
    return this.upsertAccount(vessel.mqttAccount)
      .then(() =>
        this.upsertAcl(
          new MqttACL(
            vessel.mqttAccount.username,
            vesselTopic(vessel.vesselId),
            MqttACLLevel.ALL
          )
        )
      )
      .then(() =>
        this.upsertAcl(
          new MqttACL(
            vessel.mqttAccount.username,
            vesselTopic(vessel.vesselId) + '/stats',
            MqttACLLevel.SUBSCRIBE + MqttACLLevel.READ
          )
        )
      )
      .then(() => this.postgis.upsertVessel(vessel))
  }

  /*
    Auth DB functionality
  */
  upsertAccount(account: MqttAccount): Promise<void> {
    return this.postgis.upsertAccount(account)
  }

  upsertAcl(acl: MqttACL): Promise<void> {
    return this.postgis.upsertAcl(acl)
  }
}

export default new StashDB()
