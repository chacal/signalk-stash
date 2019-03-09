import { QueryCallback, QueryStream, TsvRowCallback } from '@apla/clickhouse'
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
  ensureTables(): Promise<[void, void]> {
    return Promise.all([this.postgis.ensureTables(), this.ch.ensureTables()])
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

  deltaWriteStream(
    cb: QueryCallback<void>,
    tsvRowCb?: TsvRowCallback
  ): QueryStream {
    return this.ch.deltaWriteStream(cb, tsvRowCb)
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
