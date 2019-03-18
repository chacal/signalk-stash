const DB = require('../built/api-server/db/StashDB')
const testUtil = require('../built/test/test-util')

console.log(testUtil.testAccount)
DB.default.postgis
  .upsertAccount(testUtil.testAccount)
  .then(() => {
    process.exit(0)
  })
  .catch(err => console.error(err))
