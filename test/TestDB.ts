import StashDB from '../api-server/db/StashDB'

class TestDB {
  private readonly ch = StashDB.ch.ch
  private readonly pg = StashDB.postgis.db

  resetTables() {
    if (process.env.ENVIRONMENT !== 'test') {
      throw new Error('Can reset tables only in test environment!')
    }
    return this.pg
      .query(
        `
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
      .then(() => this.ch.querying('DROP TABLE IF EXISTS position'))
      .then(() => this.ch.querying('DROP TABLE IF EXISTS value'))
      .then(() => StashDB.ensureTables())
  }
}

export default new TestDB()
