import BPromise from 'bluebird'
import * as mqtt from 'mqtt'
import DB from '../api-server/db/StashDB'
import SignalKDeltaWriter from '../api-server/delta-writer'
import MqttDeltaInput from './mqtt'

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:11883'
const MQTT_USERNAME = process.env.MQTT_USERNAME
const MQTT_PASSWORD = process.env.MQTT_PASSWORD

if (MQTT_USERNAME === undefined || MQTT_PASSWORD === undefined) {
  console.error('Set MQTT_USERNAME and MQTT_PASSWORD env variables properly.')
  process.exit(1)
} else {
  startMqttClient(MQTT_BROKER, MQTT_USERNAME, MQTT_PASSWORD).then(
    mqttClient => {
      const writer = new SignalKDeltaWriter(DB)
      const deltaInput = new MqttDeltaInput(mqttClient, writer)
      deltaInput.start()
    }
  )
}

process.on('unhandledRejection', error => {
  console.error('Unhandled promise exception:', error)
  process.exit(1)
})

function startMqttClient(
  brokerUrl: string,
  brokerUser: string,
  brokerPw: string
) {
  const client = mqtt.connect(brokerUrl, {
    username: brokerUser,
    password: brokerPw
  })
  client.on('connect', () => console.log('Connected to MQTT server'))
  client.on('offline', () => console.log('Disconnected from MQTT server'))
  client.on('error', e => console.log('MQTT client error', e))

  return BPromise.fromCallback(cb =>
    client.once('connect', () => cb(null))
  ).then(() => client)
}
