import DB from '../api-server/db/StashDB'
import {
  insertRunnerAccount,
  insertVesselAccount
} from '../delta-inputs/MqttRunner'
import { runnerAccount, vesselAccount, vesselUuid } from '../test/test-util'

DB.ensureTables()
  .then(() => insertVesselAccount(vesselAccount, vesselUuid))
  .then(() => insertRunnerAccount(runnerAccount))
  .then(() => {
    process.exit(0)
  })
  .catch(err => console.error(err))
