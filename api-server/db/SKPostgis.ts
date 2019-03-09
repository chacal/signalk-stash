import path from 'path'
import pgp from 'pg-promise'

import Account from '../Account'
import config from '../config'
import MqttACL from '../MqttACL'
import Trackpoint from '../Trackpoint'
import IStashDB from './StashDB'

// Needs to be relative from "built/api-server/db" directory
const TABLES_FILE = new pgp.QueryFile(
  path.join(__dirname, '../../../api-server/db/postgis-tables.sql')
)

class SKPostgis implements IStashDB {
  readonly db: pgp.IDatabase<any>

  constructor() {
    this.db = pgp()(config.db)
  }

  ensureTables(): Promise<void> {
    return this.db.query(TABLES_FILE)
  }

  insertTrackpoint(trackpoint: Trackpoint): Promise<void> {
    return this.db.query(
      `
          INSERT INTO trackpoint (context, timestamp, source, point)
          VALUES ($[context], $[timestamp], $[source], st_point($[longitude], $[latitude]))
          ON CONFLICT (context, timestamp)
          DO UPDATE SET source = $[source], point = st_point($[longitude], $[latitude])
        `,
      { ...trackpoint }
    )
  }

  upsertAccount(account: Account): Promise<void> {
    return this.db.query(
      `
          INSERT INTO account (username, password, mosquitto_super)
          VALUES ($[username], $[passwordHash], $[isMqttSuperUser])
          ON CONFLICT (username)
          DO UPDATE SET password = $[passwordHash], mosquitto_super = $[isMqttSuperUser]
      `,
      { ...account }
    )
  }

  upsertAcl(acl: MqttACL): Promise<void> {
    return this.db.query(
      `
          INSERT INTO mqtt_acl (account_id, topic, rw)
          VALUES ((SELECT id FROM account WHERE username = $[username]), $[topic], $[level])
          ON CONFLICT (account_id, topic)
          DO UPDATE SET rw = $[level]
      `,
      { ...acl }
    )
  }
}

export default new SKPostgis()
