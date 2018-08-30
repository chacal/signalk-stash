import DB from '../api-server/db'

class TestDB {
  resetTables() {
    if (process.env.ENVIRONMENT !== 'test') {
      throw new Error('Can reset tables only in test environment!')
    }
    return DB.db
      .query('DROP TABLE IF EXISTS trackpoint, instrument_measurement; DELETE FROM account; DELETE FROM mqtt_acl;')
      .then(() => DB.ensureTables())
  }

  getAllTrackPointsForVessel(context) {
    return DB.db.any(
      `SELECT context, timestamp, ST_AsGeoJSON(point)::json as geojson
    FROM trackpoint WHERE context = $[context]
    ORDER BY timestamp`,
      { context }
    )
  }

  getAllMeasurementsForVessel(context) {
    return DB.db.any(
      `SELECT context, timestamp, sourceId, path, value::json
    FROM instrument_measurement
    WHERE context = $[context]
    ORDER BY timestamp`,
      { context }
    )
  }
}

export default new TestDB()
