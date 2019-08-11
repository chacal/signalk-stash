import Debug from 'debug'
import Config from '../api-server/Config'
import StashDB from '../api-server/db/StashDB'
import { waitFor } from './test-util'

const debug = Debug('stash:TestDB')

class TestDB {
  private readonly ch = StashDB.ch.ch
  private readonly pg = StashDB.postgis.db

  resetTables() {
    if (!Config.isTesting) {
      throw new Error('Can reset tables only in test environments!')
    }
    return this.pg
      .query(
        `
          DO $$
          BEGIN
            DROP TABLE vessel CASCADE;
            DELETE FROM account;
            DELETE FROM mqtt_acl;
            EXCEPTION
            WHEN OTHERS
              THEN
                RETURN;
          END $$;
        `
      )
      .then(() => this.ch.querying('DROP TABLE IF EXISTS trackpoint'))
      .then(() => this.ch.querying('DROP TABLE IF EXISTS value'))
      .then(() => StashDB.ensureTables())
      .then(() => this.waitForClickHouseTables())
  }

  getRowCountForTable(tableName: string): Promise<number> {
    return this.ch
      .querying(`SELECT count() FROM ${tableName}`)
      .then(res => parseInt(res.data[0][0], 10))
  }

  private waitForClickHouseTables() {
    return Promise.all([
      this.waitTableExists('trackpoint'),
      this.waitTableExists('value')
    ])
  }

  private waitTableExists(table: string) {
    return waitFor(() => this.queryTableExists(table), () => true)
  }

  private queryTableExists(table: string) {
    debug(`Checking for ClickHouse table ${table}..`)
    return this.ch.querying(`SELECT 1 FROM ${table}`)
  }
}

export default new TestDB()
