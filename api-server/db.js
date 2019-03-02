import pgp from 'pg-promise'
import config from './config'

import { dbIdLookup } from './dbutils'
import { getDollarSource } from './skutils'

// language=PostgreSQL
const createTables = `
  CREATE EXTENSION IF NOT EXISTS "postgis";
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

  CREATE TABLE IF NOT EXISTS positions (
    timestamp TIMESTAMPTZ NOT NULL,
    position geometry(POINT,4326),
    contexts_id INTEGER,
    sources_id INTEGER
  );
  SELECT
    CASE
      WHEN ishypertable > 0 THEN 2
      ELSE (SELECT count(*) FROM create_hypertable('positions', 'timestamp'))
    END
  FROM (
    SELECT count(*) AS ishypertable
    FROM _timescaledb_catalog.hypertable
    WHERE table_name = 'positions'
  ) AS data;

  CREATE TABLE IF NOT EXISTS objectvalues (
    timestamp TIMESTAMPTZ NOT NULL,
    objectvalue jsonb,
    paths_id INTEGER,
    contexts_id INTEGER,
    sources_id INTEGER
  );
  SELECT
    CASE
      WHEN ishypertable > 0 THEN 2
      ELSE (SELECT count(*) FROM create_hypertable('objectvalues', 'timestamp'))
    END
  FROM (
    SELECT count(*) AS ishypertable
    FROM _timescaledb_catalog.hypertable
    WHERE table_name = 'objectvalues'
  ) AS data;

  CREATE OR REPLACE VIEW skdata AS (
    SELECT path, value, null as position, null::jsonb as objectvalue, context, dollarSource, timestamp
    FROM
      values
    JOIN paths
      ON values.paths_id = paths.id
    JOIN contexts
      ON values.contexts_id = contexts.id
    JOIN sources
      ON values.sources_id = sources.id
  UNION ALL    
    SELECT 'navigation.position', null, position, null, context, dollarSource, timestamp
    FROM
      positions
    JOIN contexts
      ON positions.contexts_id = contexts.id
    JOIN sources
      ON positions.sources_id = sources.id
  UNION ALL
    SELECT path, null, null, objectvalue, context, dollarSource, timestamp
    FROM
      objectvalues
    JOIN paths
      ON objectvalues.paths_id = paths.id
    JOIN contexts
      ON objectvalues.contexts_id = contexts.id
    JOIN sources
      ON objectvalues.sources_id = sources.id
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
  );`

class DB {
  constructor() {
    this.db = pgp()(config.db)

    this.createNormalizers()
    this.tableColumnSets = {
      values: new pgp().helpers.ColumnSet(
        ['value', 'timestamp', 'paths_id', 'contexts_id', 'sources_id'],
        { table: 'values' }
      ),
      positions: new pgp().helpers.ColumnSet(
        [
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
          'contexts_id',
          'sources_id'
        ],
        { table: 'positions' }
      ),
      jsons: new pgp().helpers.ColumnSet(
        [
          {
            name: 'objectvalue',
            prop: 'objectvalue',
            mod: ':json'
          },
          'timestamp',
          'paths_id',
          'contexts_id',
          'sources_id'
        ],
        { table: 'objectvalues' }
      )
    }
  }

  createNormalizers() {
    this.getContextId = dbIdLookup(this.db, 'contexts', 'context')
    this.getSourceId = dbIdLookup(this.db, 'sources', 'dollarsource')
    this.getPathId = dbIdLookup(this.db, 'paths', 'path')
  }

  ensureTables() {
    return this.db.query(createTables)
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

  deltaToInsertsData(
    delta,
    inserts = { positions: [], values: [], objectvalues: [] }
  ) {
    const contextIdP = this.getContextId(delta.context || 'vessels.self')
    delta.updates &&
      delta.updates.forEach(update => {
        update.values &&
          update.values.forEach(pathValue => {
            //TODO non-numeric values
            if (typeof pathValue.value === 'number') {
              inserts.values.push([
                Promise.resolve(pathValue.value),
                Promise.resolve(new Date(update.timestamp)),
                this.getPathId(pathValue.path),
                contextIdP,
                this.getSourceId(getDollarSource(update))
              ])
            } else if (pathValue.path === 'navigation.position') {
              inserts.positions.push([
                Promise.resolve(pathValue.value),
                Promise.resolve(new Date(update.timestamp)),
                contextIdP,
                this.getSourceId(getDollarSource(update))
              ])
            } else {
              inserts.objectvalues.push([
                Promise.resolve(pathValue.value),
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

  insertDeltaData({ values, positions, objectvalues }) {
    return Promise.all([
      this.insert(values, this.tableColumnSets.values),
      this.insert(positions, this.tableColumnSets.positions),
      this.insert(objectvalues, this.tableColumnSets.jsons)
    ])
  }

  insert(dataP, colSet) {
    return dataP
      .then(insertsData => {
        if (insertsData.length > 0) {
          const inserts = pgp().helpers.insert(insertsData, colSet)
          return this.db.none(inserts)
        } else {
          return Promise.resolve(undefined)
        }
      })
      .catch(e => {
        console.log(e)
      })
  }

  writeDelta(delta) {
    return this.insertDeltaData(
      insertsDataToObjects(this.deltaToInsertsData(delta))
    )
  }
}

export default new DB()

function insertsDataToObjects({ values, positions, objectvalues }) {
  return {
    values: valuesToObjects(values),
    positions: positionsToObjects(positions),
    objectvalues: objectvaluesToObjects(objectvalues)
  }
}

function valuesToObjects(valuesData) {
  return Promise.all(valuesData.map(promisesA => Promise.all(promisesA))).then(
    data =>
      data.map(([value, timestamp, paths_id, contexts_id, sources_id]) => ({
        value,
        timestamp,
        paths_id,
        contexts_id,
        sources_id
      }))
  )
}

function positionsToObjects(valuesData) {
  return Promise.all(valuesData.map(promisesA => Promise.all(promisesA))).then(
    data =>
      data.map(([position, timestamp, contexts_id, sources_id]) => ({
        position,
        timestamp,
        contexts_id,
        sources_id
      }))
  )
}

function objectvaluesToObjects(valuesData) {
  return Promise.all(valuesData.map(promisesA => Promise.all(promisesA))).then(
    data =>
      data.map(
        ([objectvalue, timestamp, paths_id, contexts_id, sources_id]) => ({
          objectvalue,
          timestamp,
          paths_id,
          contexts_id,
          sources_id
        })
      )
  )
}
