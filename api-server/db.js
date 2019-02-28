import pgp from 'pg-promise'
import config from './config'

import { dbIdLookup } from './dbutils'
import { getDollarSource } from './skutils'

// language=PostgreSQL
const createTables = `
  CREATE EXTENSION IF NOT EXISTS "postgis";
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

  CREATE TABLE IF NOT EXISTS paths (
    id SERIAL PRIMARY KEY,
    path TEXT NOT NULL,
    UNIQUE(path)
  );
  CREATE TABLE IF NOT EXISTS contexts (
    id SERIAL PRIMARY KEY,
    context TEXT NOT NULL,
    UNIQUE(context)
  );
  CREATE TABLE IF NOT EXISTS sources (
    id SERIAL PRIMARY KEY,
    dollarSource TEXT NOT NULL,
    UNIQUE(dollarSource)
  );
  CREATE TABLE IF NOT EXISTS values (
    timestamp TIMESTAMPTZ NOT NULL,
    value FLOAT8,
    position geometry(POINT,4326),
    paths_id INTEGER,
    contexts_id INTEGER,
    sources_id INTEGER
  );
  CREATE INDEX IF NOT EXISTS
    signalk_values_paths_timestamp
  ON
    values
  USING
    BTREE (paths_id, timestamp);

  SELECT
    CASE
      WHEN ishypertable > 0 THEN 2
      ELSE (SELECT count(*) FROM create_hypertable('values', 'timestamp'))
    END
  FROM (
    SELECT count(*) AS ishypertable
    FROM _timescaledb_catalog.hypertable
    WHERE table_name = 'values'
  ) AS data;

  CREATE OR REPLACE VIEW skdata AS
    SELECT path, value, position, context, dollarSource, timestamp
    FROM
      values
    JOIN paths
      ON values.paths_id = paths.id
    JOIN contexts
      ON values.contexts_id = contexts.id
    JOIN sources
      ON values.sources_id = sources.id;



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
  );`

class DB {
  constructor() {
    this.db = pgp()(config.db)

    this.createNormalizers()
    this.valuesCS = new pgp().helpers.ColumnSet(
      [
        'value',
        {
          name: 'position',
          mod: ':raw',
          init: col => {
            const p = col.value
            return p
              ? pgp.as.format(
                  'ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)',
                  p
                )
              : 'NULL'
          }
        },
        'timestamp',
        'paths_id',
        'contexts_id',
        'sources_id'
      ],
      { table: 'values' }
    )
  }

  createNormalizers() {
    this.getContextId = dbIdLookup(this.db, 'contexts', 'context')
    this.getSourceId = dbIdLookup(this.db, 'sources', 'dollarsource')
    this.getPathId = dbIdLookup(this.db, 'paths', 'path')
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

  deltaToInsertsData(delta, inserts = []) {
    const contextIdP = this.getContextId(delta.context || 'vessels.self')
    delta.updates &&
      delta.updates.forEach(update => {
        update.values &&
          update.values.forEach(pathValue => {
            //TODO non-numeric values
            if (
              typeof pathValue.value === 'number' ||
              pathValue.path === 'navigation.position'
            ) {
              inserts.push([
                Promise.resolve(
                  typeof pathValue.value === 'number' ? pathValue.value : null
                ),
                Promise.resolve(
                  pathValue.path === 'navigation.position'
                    ? pathValue.value
                    : null
                ),
                Promise.resolve(new Date(update.timestamp)),
                this.getPathId(pathValue.path),
                contextIdP,
                this.getSourceId(getDollarSource(update))
              ])
            }
          })
      })
    return inserts
  }

  insertDeltaData(insertsDataP) {
    return insertsDataP.then(insertsData => {
      if (insertsData.length > 0) {
        const inserts = pgp().helpers.insert(insertsData, this.valuesCS)
        return this.db.none(inserts)
      } else {
        return Promise.resolve(undefined)
      }
    })
  }

  writeDelta(delta) {
    return this.insertDeltaData(
      insertsDataToObjects(this.deltaToInsertsData(delta))
    )
  }
}

export default new DB()

function insertsDataToObjects(insertsData) {
  return Promise.all(insertsData.map(promisesA => Promise.all(promisesA))).then(
    data =>
      // 'value', 'position', 'timestamp', 'paths_id', 'contexts_id', 'sources_id'
      data.map(
        ([value, position, timestamp, paths_id, contexts_id, sources_id]) => ({
          value,
          position,
          timestamp,
          paths_id,
          contexts_id,
          sources_id
        })
      )
  )
}
