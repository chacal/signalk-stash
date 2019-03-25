import DB from '../api-server/db/StashDB'
import { MqttACL, MqttACLLevel } from '../api-server/domain/Auth'
import { vesselAccount } from '../test/test-util'

console.log(vesselAccount)

DB.ensureTables()
  .then(() => DB.upsertAccount(vesselAccount))
  .then(() =>
    DB.upsertAcl(
      new MqttACL(vesselAccount.username, 'signalk/delta', MqttACLLevel.ALL)
    )
  )
  .then(() => {
    process.exit(0)
  })
  .catch(err => console.error(err))
