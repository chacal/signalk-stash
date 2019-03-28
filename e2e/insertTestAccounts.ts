import DB from '../api-server/db/StashDB'
import { insertRunnerAccount } from '../delta-inputs/MqttRunner'
import { insertVesselAccount } from '../test/mqtt-input-test'
import { runnerAccount } from '../test/test-util'

DB.ensureTables()
  .then(insertVesselAccount)
  .then(() =>
    insertRunnerAccount(runnerAccount.username, runnerAccount.passwordHash)
  )
  .then(() => {
    process.exit(0)
  })
  .catch(err => console.error(err))
