const pgp = require('pg-promise')()

//language=PostgreSQL
const createTables = `
  CREATE TABLE IF NOT EXISTS trackpoint (
    context TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    point GEOGRAPHY(Point,4326) NOT NULL,
    PRIMARY KEY (context, timestamp)
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
