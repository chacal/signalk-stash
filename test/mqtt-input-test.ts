/* eslint-env mocha */
import * as BPromise from 'bluebird'
import * as mqtt from 'mqtt'
import { expect } from 'chai'

import db from '../api-server/db'
import testdb from './testdb'
import {
  waitFor,
  positionFixtures,
  measurementFixtures,
  vesselUuid,
  testAccount
} from './test-util'
import { AclLevel } from '../api-server/acl'
import SignalKDeltaWriter from '../api-server/delta-writer'
import MqttDeltaInput from '../delta-inputs/mqtt'

const writer = new SignalKDeltaWriter(db)
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
          () => testdb.getAllTrackPointsForVessel(vesselUuid),
          res => res.length === 1
        )
      )
      .then(trackpoints => {
        expect(trackpoints).to.have.lengthOf(1)
        expect(trackpoints[0].timestamp.toISOString()).to.have.string(
          positionFixtures[0].updates[0].timestamp
        )
      })
  })

  it('writes measurements published to signalk/delta', () => {
    return getMqttClient()
      .then(mqttClient =>
        mqttClient.publish(
          'signalk/delta',
          JSON.stringify(measurementFixtures[0])
        )
      )
      .then(() =>
        waitFor(
          () => testdb.getAllMeasurementsForVessel(vesselUuid),
          res => res.length === 1
        )
      )
      .then(measurements => {
        expect(measurements).to.have.lengthOf(1)
        expect(measurements[0].timestamp.toISOString()).to.have.string(
          measurementFixtures[0].updates[0].timestamp
        )
      })
  })
})

function initializeTestDb() {
  return testdb
    .resetTables()
    .then(() => db.upsertAccount(testAccount))
    .then(() =>
      db.upsertAcl(testAccount.username, 'signalk/delta', AclLevel.ALL)
    )
}

function getMqttClient() {
  const client = mqtt.connect(
    mqttBrokerUrl,
    { username: testAccount.username, password: testAccount.password }
  )
  return BPromise.fromCallback(cb => client.once('connect', () => cb(null))).then(
    () => client
  )
}
