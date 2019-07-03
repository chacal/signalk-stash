import DB from '../api-server/db/StashDB'
import { insertRunnerAccountFromConfig } from '../delta-inputs/MqttRunner'
import { testVessel } from '../test/test-util'

DB.ensureTables()
  .then(() => DB.upsertVessel(testVessel))
  .then(() => insertRunnerAccountFromConfig())
  .then(() => {
    process.exit(0)
  })
  .catch(err => console.error(err))
