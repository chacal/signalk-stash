import DB from '../api-server/db'

class TestDB {
  resetTables() {
    if (process.env.ENVIRONMENT !== 'test') {
      throw new Error('Can reset tables only in test environment!')
    }
    return DB.db
      .query(
        `DROP TABLE IF EXISTS trackpoint, instrument_measurement;
          DO $$
          BEGIN
            DELETE FROM account;
            DELETE FROM mqtt_acl;
            EXCEPTION
            WHEN OTHERS
              THEN
                RETURN;
          END $$;
        `
      )
      .then(() => DB.ensureTables())
  }

  getAllTrackPointsForVessel(context) {
    return DB.db.any(
      `SELECT context, timestamp, ST_AsGeoJSON(point) :: json AS geojson
         FROM trackpoint
         WHERE context = $[context]
            ORDER BY TIMESTAMP`,
      { context }
    )
  }
}

export default new TestDB()
