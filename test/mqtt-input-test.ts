/* eslint-env mocha */
import BPromise from 'bluebird'
import { expect } from 'chai'
import * as mqtt from 'mqtt'

import DB from '../api-server/db/StashDB'
import { MqttACL, MqttACLLevel } from '../api-server/domain/Auth'
import SignalKDeltaWriter from '../api-server/SignalKDeltaWriter'
import MqttDeltaInput from '../delta-inputs/MqttDeltaInput'
import {
  assertTrackpoint,
  positionFixtures,
  testAccount,
  vesselUuid,
  waitFor
} from './test-util'
import testdb from './TestDB'

const writer = new SignalKDeltaWriter(DB)
const mqttBrokerUrl = 'mqtt://localhost:21883'

describe('MQTT input', () => {
  before(() =>
    initializeTestDb()
      .then(getMqttClient)
      .then(mqttClient => new MqttDeltaInput(mqttClient, writer).start())
  )
  beforeEach(initializeTestDb)

  it('writes position published to signalk/delta', () => {
    return getMqttClient()
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
    .then(() => DB.upsertAccount(testAccount))
    .then(() =>
      DB.upsertAcl(
        new MqttACL(testAccount.username, 'signalk/delta', MqttACLLevel.ALL)
      )
    )
}

function getMqttClient(): BPromise<mqtt.MqttClient> {
  const client = mqtt.connect(mqttBrokerUrl, {
    username: testAccount.username,
    password: testAccount.password
  })
  return BPromise.fromCallback(cb =>
    client.once('connect', () => cb(null))
  ).then(() => client)
}
