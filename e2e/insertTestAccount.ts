import DB from '../api-server/db/StashDB'
import { testAccount } from '../test/test-util'

console.log(testAccount)

DB.ensureTables()
  .then(() => DB.upsertAccount(testAccount))
  .then(() => {
    process.exit(0)
  })
  .catch(err => console.error(err))
