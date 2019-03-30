import BPromise from 'bluebird'
import * as mqtt from 'mqtt'
import { MqttClient } from 'mqtt'
import config, { MqttConfig } from '../api-server/Config'
import DB from '../api-server/db/StashDB'
import { Account, MqttACL, MqttACLLevel } from '../api-server/domain/Auth'
import SignalKDeltaWriter from '../api-server/SignalKDeltaWriter'
import MqttDeltaInput, {
  DELTAWILDCARDTOPIC,
  vesselTopic
} from './MqttDeltaInput'

export default class MqttRunner {
  private mqttClient: MqttClient | void = undefined
  start() {
    return DB.ensureTables()
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

export function insertRunnerAccount(
  username: string,
  passwordHash: string
): Promise<void> {
  return DB.upsertAccount({
    username,
    passwordHash,
    isMqttSuperUser: true
  }).then(() =>
    DB.upsertAcl(new MqttACL(username, DELTAWILDCARDTOPIC, MqttACLLevel.ALL))
  )
}

export function insertVesselAccount(
  vesselAccount: Account,
  vesselUuid: string
) {
  return DB.upsertAccount(vesselAccount).then(() =>
    DB.upsertAcl(
      new MqttACL(
        vesselAccount.username,
        vesselTopic(vesselUuid),
        MqttACLLevel.ALL
      )
    )
  )
}
