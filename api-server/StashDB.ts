import Account from './Account'
import MqttACL from './MqttACL'
import Trackpoint from './Trackpoint'

interface IDB {
  ensureTables(): Promise<void>
}

interface IAuthDB extends IDB {
  upsertAccount(account: Account): Promise<void>
  upsertAcl(acl: MqttACL): Promise<void>
}

export interface ITrackDB extends IDB {
  insertTrackpoint(trackpoint: Trackpoint): Promise<void>
}

export default interface IStashDB extends ITrackDB, IAuthDB {}
