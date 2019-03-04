import * as pgp from 'pg-promise'
import config from './config'
import * as path from 'path'

const TABLES_FILE = new pgp.QueryFile(path.join(__dirname, '../../api-server/tables.sql'))  // Needs to be relative from "built/api-server" directory

class DB {
  readonly db

  constructor() {
    this.db = pgp()(config.db)
  }

  ensureTables() {
    return this.db.query(TABLES_FILE)
  }

  insertTrackpoint({ context, timestamp, longitude, latitude }) {
    return this.db.query(
      `
          INSERT INTO trackpoint (context, timestamp, point)
          VALUES ($[context], $[timestamp], st_point($[longitude], $[latitude]))
          ON CONFLICT (context, timestamp)
          DO UPDATE SET point = st_point($[longitude], $[latitude])
        `,
      { context, timestamp, longitude, latitude }
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

  upsertAccount({ username, passwordHash, isMosquittoSuper }) {
    return this.db.query(
      `
          INSERT INTO account (username, password, mosquitto_super)
          VALUES ($[username], $[passwordHash], $[isMosquittoSuper])
          ON CONFLICT (username)
          DO UPDATE SET password = $[passwordHash], mosquitto_super = $[isMosquittoSuper]
      `,
      { username, passwordHash, isMosquittoSuper }
    )
  }

  upsertAcl(username, topic, rw) {
    return this.db.query(
      `
          INSERT INTO mqtt_acl (account_id, topic, rw)
          VALUES ((SELECT id FROM account WHERE username = $[username]), $[topic], $[rw])
          ON CONFLICT (account_id, topic)
          DO UPDATE SET rw = $[rw]
      `,
      { username, topic, rw }
    )
  }
}

export default new DB()
