/* eslint-env mocha */
import { expect } from 'chai'
import _ from 'lodash'
import { MqttClient } from 'mqtt'

import { SKDelta } from '@chacal/signalk-ts'
import config from '../api-server/Config'
import DB from '../api-server/db/StashDB'
import {
  latestDeltaTopic,
  MqttTopic,
  vesselTopic
} from '../delta-inputs/MqttDeltaInput'
import MqttRunner, {
  insertLatestDeltaReaderAccount,
  insertRunnerAccount,
  startMqttClient
} from '../delta-inputs/MqttRunner'
import {
  assertTrackpoint,
  latestDeltaReaderAccount,
  latestDeltaReaderPassword,
  positionFixtures,
  runnerAccount,
  runnerPassword,
  testVessel,
  testVesselUuids,
  vesselMqttPassword,
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

  it('writes position published only to signalk/delta/vesselUuid', async () => {
    const mqttClient = await startTestVesselMqttClient()

    mqttClient.publish(
      vesselTopic(testVesselUuids[0]),
      JSON.stringify(positionFixtures[0])
    )
    mqttClient.publish(
      vesselTopic(testVesselUuids[0]),
      JSON.stringify(positionFixtures[0]).replace(testVesselUuids[0], 'self')
    )
    mqttClient.publish(
      vesselTopic(testVesselUuids[0]),
      JSON.stringify(positionFixtures[0]).replace('f', 'a')
    )
    mqttClient.publish(
      vesselTopic(testVesselUuids[0].replace('f', 'a')),
      JSON.stringify(positionFixtures[0])
    )

    const vesselTrackpoints = await waitFor(
      () => DB.getTrackPointsForVessel(testVesselUuids[0]),
      res => res.length > 0
    )
    expect(vesselTrackpoints).to.have.lengthOf(2)
    assertTrackpoint(vesselTrackpoints[0], positionFixtures[0])

    const otherVesselTrackpoints = await waitFor(
      () => DB.getTrackPointsForVessel(testVesselUuids[0].replace('f', 'a')),
      res => res.length >= 0
    )
    expect(otherVesselTrackpoints).to.have.lengthOf(0)
  }).timeout(10000)

  it('publishes latest positions to mqtt', async () => {
    const vesselClient = await startTestVesselMqttClient()
    const deltaReaderClient = await startLatestDeltaReaderMqttClient()
    const runnerClient = await startRunnerMqttClient()
    const latestPositionTopic =
      latestDeltaTopic(testVesselUuids[0]) + '/navigation/position'

    // Make sure old retained messages don't affect the test
    // Use runner account here as only it has write ACL to the latest topic
    clearRetainedMessage(runnerClient, latestPositionTopic)

    const receivedLatestPositions: SKDelta[] = []
    deltaReaderClient.subscribe(latestPositionTopic)
    deltaReaderClient.on('message', (topic, payload) => {
      receivedLatestPositions.push(SKDelta.fromJSON(payload.toString()))
    })

    // Create a test delta that has two position updates in reverse order
    const testPositionDelta = _.cloneDeep(positionFixtures[0])
    testPositionDelta.updates.unshift(...positionFixtures[1].updates) // Prepend updates from [1] to updates of [0]

    vesselClient.publish(
      vesselTopic(testVesselUuids[0]),
      JSON.stringify(testPositionDelta)
    )

    await waitFor(
      () => Promise.resolve(receivedLatestPositions),
      positions => positions.length > 0
    )

    // Later update from positionFixtures[1] should have been published
    expect(receivedLatestPositions[0]).to.eql(
      SKDelta.fromJSON(positionFixtures[1])
    )
  })
})

function startTestVesselMqttClient() {
  return startMqttClient({
    broker: config.mqtt.broker,
    username: testVessel.mqttAccount.username,
    password: vesselMqttPassword,
    clientId: randomClientId()
  })
}

function startLatestDeltaReaderMqttClient() {
  return startMqttClient({
    broker: config.mqtt.broker,
    username: latestDeltaReaderAccount.username,
    password: latestDeltaReaderPassword,
    clientId: randomClientId()
  })
}

function startRunnerMqttClient() {
  return startMqttClient({
    broker: config.mqtt.broker,
    username: runnerAccount.username,
    password: runnerPassword,
    clientId: randomClientId()
  })
}

function clearRetainedMessage(client: MqttClient, topic: MqttTopic) {
  client.publish(topic, Buffer.alloc(0), {
    qos: 1,
    retain: true
  })
}

function randomClientId() {
  return (
    'testClientId_' +
    Math.random()
      .toString(16)
      .substr(2, 8)
  )
}

async function initializeTestDb() {
  await testdb.resetTables()
  await DB.upsertVessel(testVessel)
  await insertRunnerAccount(runnerAccount)
  await insertLatestDeltaReaderAccount(latestDeltaReaderAccount)
}
