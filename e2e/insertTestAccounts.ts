import DB from '../api-server/db/StashDB'
import { insertRunnerAccount, insertVessel } from '../delta-inputs/MqttRunner'
import { runnerAccount, testVessel } from '../test/test-util'

DB.ensureTables()
  .then(() => insertVessel(testVessel))
  .then(() => insertRunnerAccount(runnerAccount))
  .then(() => {
    process.exit(0)
  })
  .catch(err => console.error(err))
