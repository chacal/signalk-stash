import DB from '../api-server/db/StashDB'
import { testAccount } from '../test/test-util'
import { MqttACL, MqttACLLevel } from '../api-server/domain/Auth'

console.log(testAccount)

DB.ensureTables()
  .then(() => DB.upsertAccount(testAccount))
  .then(() =>
    DB.upsertAcl(
      new MqttACL(testAccount.username, 'signalk/delta', MqttACLLevel.ALL)
    )
  )
  .then(() => {
    process.exit(0)
  })
  .catch(err => console.error(err))
