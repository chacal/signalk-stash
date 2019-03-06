import DB from '../api-server/db'
import Trackpoint from '../api-server/Trackpoint'

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

  getAllTrackPointsForVessel(context): Promise<Trackpoint[]> {
    return DB.db
      .any(
        `SELECT context, timestamp, source, ST_AsGeoJSON(point) :: json AS geojson
         FROM trackpoint
         WHERE context = $[context]
            ORDER BY TIMESTAMP`,
        { context }
      )
      .then(rows => rows.map(({ context, timestamp, source, geojson }) =>
        new Trackpoint(context, new Date(timestamp), source, geojson.coordinates[0], geojson.coordinates[1]))
      )
  }
}

export default new TestDB()
