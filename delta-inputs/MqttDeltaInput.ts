import { SKDelta } from '@chacal/signalk-ts'
import BPromise from 'bluebird'
import * as mqtt from 'mqtt'
import SignalKDeltaWriter from '../api-server/SignalKDeltaWriter'

export default class MqttDeltaInput {
  constructor(
    private readonly mqttClient: mqtt.MqttClient,
    private readonly deltaWriter: SignalKDeltaWriter
  ) {}

  start() {
    this.mqttClient.on('message', this._sendDeltaToWriter.bind(this))
    return BPromise.fromCallback(cb =>
      this.mqttClient.subscribe('signalk/delta', { qos: 1 }, cb)
    )
  }

  _sendDeltaToWriter(topic: string, payload: Buffer, packet: mqtt.Packet) {
    try {
      const delta = SKDelta.fromJSON(payload.toString())
      this.deltaWriter.writeDelta(delta).catch(err => {
        console.error(err)
      })
    } catch (e) {
      console.error(`Invalid SignalK delta from MQTT: ${payload}`)
    }
  }
}
