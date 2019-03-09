import * as mqtt from 'mqtt'
import SignalKDeltaWriter from '../api-server/delta-writer'

export default class MqttDeltaInput {
  constructor(
    private readonly mqttClient: mqtt.MqttClient,
    private readonly deltaWriter: SignalKDeltaWriter
  ) {}

  start() {
    this.mqttClient.subscribe('signalk/delta', { qos: 1 })
    this.mqttClient.on('message', this._sendDeltaToWriter.bind(this))
  }

  _sendDeltaToWriter(topic: string, payload: Buffer, packet: mqtt.Packet) {
    let delta
    try {
      delta = JSON.parse(payload.toString())
    } catch (e) {
      console.error(`Invalid SignalK delta from MQTT: ${payload}`)
    }
    if (delta) {
      this.deltaWriter.writeDelta(delta)
    }
  }
}
