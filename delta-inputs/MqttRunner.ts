import BPromise from 'bluebird'
import * as mqtt from 'mqtt'
import { MqttClient } from 'mqtt'
import config, { MqttConfig } from '../api-server/Config'
import DB from '../api-server/db/StashDB'
import { MqttAccount, MqttACL, MqttACLLevel } from '../api-server/domain/Auth'
import SignalKDeltaWriter from '../api-server/SignalKDeltaWriter'
import MqttDeltaInput, {
  DELTASTATSWILDCARDTOPIC,
  DELTAWILDCARDTOPIC,
  vesselTopic
} from './MqttDeltaInput'

export default class MqttRunner {
  private mqttClient: MqttClient | void = undefined
  start() {
    return DB.ensureTables()
      .then(() => this.insertRunnerAccountIfNeeded())
      .then(() => startMqttClient(config.mqtt))
      .then(mqttClient => {
        const writer = new SignalKDeltaWriter(DB)
        const deltaInput = new MqttDeltaInput(mqttClient, writer)
        this.mqttClient = mqttClient
        return deltaInput.start()
      })
      .catch(err => {
        console.error(err)
        process.exit(-1)
      })
  }
  stop() {
    if (this.mqttClient) {
      this.mqttClient.end()
    } else {
      throw Error('No mqttclient to stop')
    }
  }

  private insertRunnerAccountIfNeeded() {
    if (!config.isTesting) {
      return insertRunnerAccount(
        new MqttAccount(config.mqtt.username, config.mqtt.password)
      )
    } else {
      return Promise.resolve()
    }
  }
}

export function startMqttClient(config: MqttConfig): BPromise<MqttClient> {
  const client = mqtt.connect(config.broker, {
    username: config.username,
    password: config.password
  })
  client.on('connect', () => console.log('Connected to MQTT server'))
  client.on('offline', () => console.log('Disconnected from MQTT server'))
  client.on('error', e => console.log('MQTT client error', e))

  return BPromise.fromCallback(cb =>
    client.once('connect', () => cb(null))
  ).then(() => client)
}

export async function insertRunnerAccount(account: Account) {
  await DB.upsertAccount(account)
  await DB.upsertAcl(
    new MqttACL(account.username, DELTAWILDCARDTOPIC, MqttACLLevel.ALL)
  )
  await DB.upsertAcl(
    new MqttACL(account.username, DELTASTATSWILDCARDTOPIC, MqttACLLevel.ALL)
  )
}

export function insertVesselAccount(
  vesselAccount: MqttAccount,
  vesselUuid: string
) {
  return DB.upsertAccount(vesselAccount).then(() =>
    Promise.all([
      DB.upsertAcl(
        new MqttACL(
          vesselAccount.username,
          vesselTopic(vesselUuid),
          MqttACLLevel.ALL
        )
      ),
      DB.upsertAcl(
        new MqttACL(
          vesselAccount.username,
          vesselTopic(vesselUuid) + '/stats',
          MqttACLLevel.SUBSCRIBE + MqttACLLevel.READ
        )
      )
    ])
  )
}
