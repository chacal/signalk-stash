import { QueryCallback, QueryStream } from '@apla/clickhouse'
import { ZonedDateTime } from 'js-joda'
import { Account, MqttACL } from '../domain/Auth'
import { BBox } from '../domain/Geo'
import Trackpoint, { Track } from '../domain/Trackpoint'
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
    vesselId: string,
    bbox?: BBox
  ): Promise<Trackpoint[]> {
    return this.ch.getTrackPointsForVessel(vesselId, bbox)
  }

  getVesselTracks(vesselId: string, bbox?: BBox): Promise<Track[]> {
    return this.ch.getVesselTracks(vesselId, bbox)
  }

  deltaWriteStream(cb?: QueryCallback<void>): QueryStream {
    return this.ch.deltaWriteStream(cb)
  }

  getValues(
    context: any,
    path: string,
    from: ZonedDateTime,
    to: ZonedDateTime,
    timeresolution: number
  ): any {
    return this.ch.getValues(context, path, from, to, timeresolution)
  }

  /*
    Auth DB functionality
  */
  upsertAccount(account: Account): Promise<void> {
    return this.postgis.upsertAccount(account)
  }

  upsertAcl(acl: MqttACL): Promise<void> {
    return this.postgis.upsertAcl(acl)
  }
}

export default new StashDB()
