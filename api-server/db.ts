import path from 'path'
import pgp from 'pg-promise'

import Account from './Account'
import config from './config'
import MqttACL from './MqttACL'
import Trackpoint from './Trackpoint'

// Needs to be relative from "built/api-server" directory
const TABLES_FILE = new pgp.QueryFile(
  path.join(__dirname, '../../api-server/tables.sql')
)

class DB {
  readonly db: pgp.IDatabase<any>

  constructor() {
    this.db = pgp()(config.db)
  }

  ensureTables() {
    return this.db.query(TABLES_FILE)
  }

  insertTrackpoint(trackpoint: Trackpoint): Promise<void> {
    return this.db.query(
      `
          INSERT INTO trackpoint (context, timestamp, point)
          VALUES ($[context], $[timestamp], st_point($[longitude], $[latitude]))
          ON CONFLICT (context, timestamp)
          DO UPDATE SET point = st_point($[longitude], $[latitude])
        `,
      { ...trackpoint }
    )
  }

  insertMeasurement({ context, timestamp, path, sourceId, value }) {
    return this.db.query(
      `
          INSERT INTO instrument_measurement (context, timestamp, path, sourceId, value)
          VALUES ($[context], $[timestamp], $[path], $[sourceId], $[value])
          ON CONFLICT (context, timestamp, path, sourceId)
          DO UPDATE SET value = $[value]
        `,
      { context, timestamp, path, sourceId, value: JSON.stringify(value) }
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

export default new DB()
