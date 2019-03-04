export default class MqttDeltaInput {
  private readonly mqttClient
  private readonly deltaWriter

  constructor(mqttClient, deltaWriter) {
    this.mqttClient = mqttClient
    this.deltaWriter = deltaWriter
  }

  start() {
    this.mqttClient.subscribe('signalk/delta', { qos: 1 })
    this.mqttClient.on('message', this._sendDeltaToWriter.bind(this))
  }

  _sendDeltaToWriter(topic, message) {
    let delta
    try {
      delta = JSON.parse(message)
    } catch (e) {
      console.error(`Invalid SignalK delta from MQTT: ${message}`)
    }
    if (delta) {
      this.deltaWriter.writeDelta(delta)
    }
  }
}
