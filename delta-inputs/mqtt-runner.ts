import BPromise from 'bluebird'
import * as mqtt from 'mqtt'
import db from '../api-server/db'
import SignalKDeltaWriter from '../api-server/delta-writer'
import MqttDeltaInput from './mqtt'

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:11883'
const MQTT_USERNAME = process.env.MQTT_USERNAME
const MQTT_PASSWORD = process.env.MQTT_PASSWORD

startMqttClient(MQTT_BROKER, MQTT_USERNAME, MQTT_PASSWORD).then(mqttClient => {
  const writer = new SignalKDeltaWriter(db)
  const deltaInput = new MqttDeltaInput(mqttClient, writer)
  deltaInput.start()
})

process.on('unhandledRejection', error => {
  console.error('Unhandled promise exception:', error)
  process.exit(1)
})

function startMqttClient(brokerUrl, brokerUser, brokerPw) {
  const client = mqtt.connect(
    brokerUrl,
    { username: brokerUser, password: brokerPw }
  )
  client.on('connect', () => console.log('Connected to MQTT server'))
  client.on('offline', () => console.log('Disconnected from MQTT server'))
  client.on('error', e => console.log('MQTT client error', e))

  return BPromise.fromCallback(cb => client.once('connect', () => cb(null))).then(
    () => client
  )
}
