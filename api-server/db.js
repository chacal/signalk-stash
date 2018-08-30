import pgp from 'pg-promise'
import config from './config'

//language=PostgreSQL
const createTables = `
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE TABLE IF NOT EXISTS trackpoint (
    context TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    point GEOGRAPHY(Point,4326) NOT NULL,
    PRIMARY KEY (context, timestamp)
  );
  CREATE TABLE IF NOT EXISTS instrument_measurement (
    context TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    path TEXT NOT NULL,
    sourceId TEXT NOT NULL,
    value jsonb NOT NULL,
    PRIMARY KEY (context, timestamp, path, sourceId)
  );
  CREATE TABLE IF NOT EXISTS account (
    id UUID DEFAULT uuid_generate_v4() NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    mosquitto_super BOOLEAN NOT NULL,
    PRIMARY KEY (id)
  );
  CREATE TABLE IF NOT EXISTS mqtt_acl (
    account_id UUID NOT NULL REFERENCES account (id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    rw INT NOT NULL,
    PRIMARY KEY (account_id, topic)
  )`

class DB {
  constructor() {
    this.db = pgp()(config.db)
  }

  ensureTables() {
    return this.db.query(createTables)
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

  upsertAccount({username, passwordHash, isMosquittoSuper}) {
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
