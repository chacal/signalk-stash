import BPromise from 'bluebird'
import * as mqtt from 'mqtt'
import { MqttClient } from 'mqtt'
import config, { MqttConfig } from '../api-server/Config'
import DB from '../api-server/db/StashDB'
import { MqttAccount, MqttACL, MqttACLLevel } from '../api-server/domain/Auth'
import MqttDeltaInput, {
  DELTASTATSWILDCARDTOPIC,
  DELTAWILDCARDTOPIC
} from './MqttDeltaInput'

export default class MqttRunner {
  private mqttClient: MqttClient | undefined
  private deltaInput: MqttDeltaInput | undefined
  start() {
    return DB.ensureTables()
      .then(() => this.insertRunnerAccountIfNeeded())
      .then(() => startMqttClient(config.mqtt))
      .then(mqttClient => {
        this.deltaInput = new MqttDeltaInput(mqttClient, DB.deltaWriteStream())
        this.mqttClient = mqttClient
        return this.deltaInput.start()
      })
      .catch(err => {
        console.error(err)
        process.exit(-1)
      })
  }
  stop() {
    if (this.deltaInput) {
      this.deltaInput.stop()
    }
    if (this.mqttClient) {
      this.mqttClient.end()
    } else {
      throw Error('No mqttclient to stop')
    }
  }

  private insertRunnerAccountIfNeeded() {
    if (!config.isTesting) {
      // Runner account is an MQTT superuser as wildcard subscriptions don't work with Mosquitto auth plugin at the moment..
      return insertRunnerAccount(
        new MqttAccount(config.mqtt.username, config.mqtt.password, true)
      )
    } else {
      return Promise.resolve()
    }
  }
}

export function startMqttClient(config: MqttConfig): BPromise<MqttClient> {
  const client = mqtt.connect(config.broker, {
    username: config.username,
    password: config.password,
    clientId: config.clientId,
    clean: false
  })
  client.on('connect', () => console.log('Connected to MQTT server'))
  client.on('offline', () => console.log('Disconnected from MQTT server'))
  client.on('error', e => console.log('MQTT client error', e))

  return BPromise.fromCallback(cb =>
    client.once('connect', () => cb(null))
  ).then(() => client)
}

export async function insertRunnerAccount(account: MqttAccount) {
  await DB.upsertAccount(account)
  await DB.upsertAcl(
    new MqttACL(account.username, DELTAWILDCARDTOPIC, MqttACLLevel.ALL)
  )
  await DB.upsertAcl(
    new MqttACL(account.username, DELTASTATSWILDCARDTOPIC, MqttACLLevel.ALL)
  )
}
