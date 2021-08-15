import pgp from 'pg-promise'

import config from '../Config'
import { MqttAccount, MqttACL } from '../domain/Auth'
import Vessel, { VesselData } from '../domain/Vessel'

const CREATE_TABLES = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS account (
  id              UUID DEFAULT uuid_generate_v4() NOT NULL,
  username        TEXT UNIQUE                     NOT NULL,
  password        TEXT                            NOT NULL,
  mosquitto_super BOOLEAN                         NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS mqtt_acl (
  account_id UUID NOT NULL REFERENCES account (id) ON DELETE CASCADE,
  topic      TEXT NOT NULL,
  rw         INT  NOT NULL,
  PRIMARY KEY (account_id, topic)
);

CREATE TABLE IF NOT EXISTS vessel (
  vesselId    TEXT PRIMARY KEY REFERENCES account(username) ON DELETE RESTRICT,
  name        TEXT,
  owner_email TEXT UNIQUE
);`

export default class SKPostgis {
  readonly db: pgp.IDatabase<any>

  constructor() {
    this.db = pgp()(config.db)
  }

  ensureTables(): Promise<void> {
    return this.db.query(CREATE_TABLES)
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

  getVesselByOwnerEmail(ownerEmail: string): Promise<VesselData> {
    return this.db
      .one(
        `
      SELECT vesselId as "vesselId", name
      FROM vessel
      WHERE owner_email = $1`,
        ownerEmail
      )
      .then(res => res as VesselData)
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
