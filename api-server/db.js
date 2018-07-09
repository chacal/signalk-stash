import pgp from 'pg-promise'
import config from './config'

//language=PostgreSQL
const createTables = `
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
}

export default new DB()
