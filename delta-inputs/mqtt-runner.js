import db from '../api-server/db'
import SignalKDeltaWriter from '../api-server/delta-writer'
import MqttDeltaInput from './mqtt'

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:11883'

const writer = new SignalKDeltaWriter(db)
new MqttDeltaInput(MQTT_BROKER, writer).start()

process.on('unhandledRejection', error => {
  console.error('Unhandled promise exception:', error)
  process.exit(1)
})
