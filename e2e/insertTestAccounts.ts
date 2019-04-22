import DB from '../api-server/db/StashDB'
import { insertRunnerAccount } from '../delta-inputs/MqttRunner'
import { runnerAccount, testVessel } from '../test/test-util'

DB.ensureTables()
  .then(() => DB.upsertVessel(testVessel))
  .then(() => insertRunnerAccount(runnerAccount))
  .then(() => {
    process.exit(0)
  })
  .catch(err => console.error(err))
