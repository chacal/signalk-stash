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

  _resetTables() {
    if (process.env.ENVIRONMENT !== 'test') {
      throw new Error('Can reset tables only in test environment!')
    }
    return this.db
      .query('DROP TABLE IF EXISTS trackpoint, instrument_measurement')
      .then(() => this.ensureTables())
  }

  insertTrackpoint({ context, timestamp, longitude, latitude }) {
    return this.db.query(
      `
          INSERT INTO trackpoint (context, timestamp, point)
          VALUES ($1, $2, st_point($3, $4))
          ON CONFLICT (context, timestamp)
          DO UPDATE SET point = st_point($3, $4)
        `,
      [context, timestamp, longitude, latitude]
    )
  }
}

export default DB
