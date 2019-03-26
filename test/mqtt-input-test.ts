/* eslint-env mocha */
import { expect } from 'chai'

import config from '../api-server/Config'
import DB from '../api-server/db/StashDB'
import { MqttACL, MqttACLLevel } from '../api-server/domain/Auth'
import { DELTABASETOPIC } from '../delta-inputs/MqttDeltaInput'
import MqttRunner, {
  insertRunnerAccount,
  startMqttClient
} from '../delta-inputs/MqttRunner'
import {
  assertTrackpoint,
  positionFixtures,
  runnerAccount,
  vesselAccount,
  vesselUuid,
  waitFor
} from './test-util'
import testdb from './TestDB'

describe('MQTT input', () => {
  let mqttRunner: MqttRunner
  beforeEach(() =>
    initializeTestDb()
      .then(() => {
        mqttRunner = new MqttRunner()
        return mqttRunner.start()
      })
      .catch(err => {
        throw err
      })
  )

  afterEach(() => mqttRunner && mqttRunner.stop())

  it('writes position published to signalk/delta', () => {
    return startMqttClient({
      broker: config.mqtt.broker,
      username: vesselAccount.username,
      password: vesselAccount.password
    })
      .then(mqttClient =>
        mqttClient.publish(DELTABASETOPIC, JSON.stringify(positionFixtures[0]))
      )
      .then(() =>
        waitFor(
          () => DB.getTrackPointsForVessel(vesselUuid),
          res => res.length === 1
        )
      )
      .then(trackpoints => {
        expect(trackpoints).to.have.lengthOf(1)
        assertTrackpoint(trackpoints[0], positionFixtures[0])
      })
  })
})

function initializeTestDb() {
  return testdb
    .resetTables()
    .then(insertVesselAccount)
    .then(() => {
      return insertRunnerAccount(
        runnerAccount.username,
        runnerAccount.passwordHash
      )
    })
}

export function insertVesselAccount() {
  return DB.upsertAccount(vesselAccount).then(() =>
    DB.upsertAcl(
      new MqttACL(vesselAccount.username, DELTABASETOPIC, MqttACLLevel.ALL)
    )
  )
}
