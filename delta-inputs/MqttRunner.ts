import BPromise from 'bluebird'
import * as mqtt from 'mqtt'
import { MqttClient } from 'mqtt'
import config, { MqttConfig } from '../api-server/Config'
import DB from '../api-server/db/StashDB'
import SignalKDeltaWriter from '../api-server/SignalKDeltaWriter'
import MqttDeltaInput from './MqttDeltaInput'

export default class MqttRunner {
  mqttClient: MqttClient | void = undefined
  start() {
    return DB.ensureTables()
      .then(() => startMqttClient(config.mqtt))
      .then(mqttClient => {
        const writer = new SignalKDeltaWriter(DB)
        const deltaInput = new MqttDeltaInput(mqttClient, writer)
        deltaInput.start()
        this.mqttClient = mqttClient
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
