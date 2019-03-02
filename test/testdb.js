import DB from '../api-server/db'

class TestDB {
  resetTables() {
    if (process.env.ENVIRONMENT !== 'test') {
      throw new Error('Can reset tables only in test environment!')
    }
    return DB.db
      .query(
        `DROP TABLE IF EXISTS trackpoint, instrument_measurement;
        DROP TABLE IF EXISTS values CASCADE;
        DROP TABLE IF EXISTS positions CASCADE;
        DROP TABLE IF EXISTS objectvalues CASCADE;
        DROP TABLE IF EXISTS paths, contexts, sources;
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
      .then(() => DB.createNormalizers())
      .then(() => DB.ensureTables())
  }

  getAllTrackPointsForVessel(context) {
    return DB.db.any(
      `SELECT context, timestamp, ST_AsGeoJSON(position) :: json AS geojson
         FROM skdata
         WHERE context = $[context]
            ORDER BY TIMESTAMP`,
      { context }
    )
  }

  getAllMeasurementsForVessel(context) {
    return DB.db.any(
      `SELECT context, timestamp, dollarsource, path, value
         FROM skdata
         WHERE context = $[context]
            ORDER BY TIMESTAMP`,
      { context }
    )
  }
}

export default new TestDB()
