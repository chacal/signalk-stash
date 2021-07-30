import path from 'path'
import pgp from 'pg-promise'

import config from '../Config'
import { MqttAccount, MqttACL } from '../domain/Auth'
import Vessel, { VesselData } from '../domain/Vessel'

// Needs to be relative from "built/api-server/db" directory
const TABLES_FILE = new pgp.QueryFile(
  path.join(__dirname, '../../../api-server/db/postgis-tables.sql')
)

export default class SKPostgis {
  readonly db: pgp.IDatabase<any>

  constructor() {
    this.db = pgp()(config.db)
  }

  ensureTables(): Promise<void> {
    return this.db.query(TABLES_FILE)
  }

  upsertVessel(vessel: Vessel): Promise<void> {
    return this.db.query(
      `
      INSERT INTO vessel(vesselId, name, owner_email)
      VALUES ($[vesselId], $[name], $[ownerEmail])
      ON CONFLICT (vesselId)
      DO UPDATE SET name = $[name], owner_email = $[ownerEmail]`,
      vessel
    )
  }

  getContexts(): Promise<VesselData[]> {
    return this.db
      .query(
        `
      SELECT vesselId as "vesselId", name
      FROM vessel`
      )
      .then(res => res as VesselData[])
  }

  upsertAccount(account: MqttAccount): Promise<void> {
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
