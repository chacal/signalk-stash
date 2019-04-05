/* eslint-env mocha */
import { expect } from 'chai'

import config from '../api-server/Config'
import DB from '../api-server/db/StashDB'
import { vesselTopic } from '../delta-inputs/MqttDeltaInput'
import MqttRunner, {
  insertRunnerAccount,
  insertVesselAccount,
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
  const mqttRunner = new MqttRunner()
  beforeEach(() =>
    initializeTestDb()
      .then(() => mqttRunner.start())
      .catch(err => {
        throw err
      })
  )

  afterEach(() => mqttRunner.stop())

  it('writes position published only to signalk/delta/vesselUuid', () => {
    return startMqttClient({
      broker: config.mqtt.broker,
      username: vesselAccount.username,
      password: vesselAccount.password
    })
      .then(mqttClient =>
        mqttClient.publish(
          vesselTopic(vesselUuid),
          JSON.stringify(positionFixtures[0])
        )
      )
      .then(mqttClient =>
        mqttClient.publish(
          vesselTopic(vesselUuid),
          JSON.stringify(positionFixtures[0]).replace(vesselUuid, 'self')
        )
      )
      .then(mqttClient =>
        mqttClient.publish(
          vesselTopic(vesselUuid),
          JSON.stringify(positionFixtures[0]).replace('f', 'a')
        )
      )
      .then(mqttClient =>
        mqttClient.publish(
          vesselTopic(vesselUuid.replace('f', 'a')),
          JSON.stringify(positionFixtures[0])
        )
      )
      .then(() =>
        waitFor(
          () => DB.getTrackPointsForVessel(vesselUuid),
          res => res.length > 0
        )
      )
      .then(trackpoints => {
        expect(trackpoints).to.have.lengthOf(2)
        assertTrackpoint(trackpoints[0], positionFixtures[0])
      })
      .then(() =>
        waitFor(
          () => DB.getTrackPointsForVessel(vesselUuid.replace('f', 'a')),
          res => res.length >= 0
        )
      )
      .then(trackpoints => {
        expect(trackpoints).to.have.lengthOf(0)
      })
  })
})

function initializeTestDb() {
  return testdb
    .resetTables()
    .then(() => insertVesselAccount(vesselAccount, vesselUuid))
    .then(() => insertRunnerAccount(runnerAccount))
}
