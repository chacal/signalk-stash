/* eslint-env mocha */
import { expect } from 'chai'

import config from '../api-server/Config'
import DB from '../api-server/db/StashDB'
import { MqttACL, MqttACLLevel } from '../api-server/domain/Auth'
import MqttRunner, { startMqttClient } from '../delta-inputs/MqttRunner'
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
        mqttClient.publish('signalk/delta', JSON.stringify(positionFixtures[0]))
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
    .then(() => DB.upsertAccount(vesselAccount))
    .then(() =>
      DB.upsertAcl(
        new MqttACL(vesselAccount.username, 'signalk/delta', MqttACLLevel.ALL)
      )
    )
    .then(() => DB.upsertAccount(runnerAccount))
    .then(() =>
      DB.upsertAcl(
        new MqttACL(runnerAccount.username, 'signalk/delta', MqttACLLevel.ALL)
      )
    )
}
