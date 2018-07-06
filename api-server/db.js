const pgp = require('pg-promise')()

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
  constructor(dbConfig) {
    this.db = pgp(dbConfig)
  }

  ensureTables() {
    return this.db.query(createTables)
  }
}


module.exports = DB
