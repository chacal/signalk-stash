import mqtt from 'mqtt'
import BPromise from 'bluebird'

export default class MqttDeltaInput {
  constructor(mqttBrokerUrl, deltaWriter) {
    this.mqttBrokerUrl = mqttBrokerUrl
    this.deltaWriter = deltaWriter
  }

  start() {
    return this._startMqttClient(this.mqttBrokerUrl).then(mqttClient => {
      mqttClient.subscribe('signalk/delta', { qos: 1 })
      mqttClient.on('message', this._sendDeltaToWriter.bind(this))
    })
  }

  _startMqttClient(brokerUrl) {
    const client = mqtt.connect(brokerUrl)
    client.on('connect', () => console.log('Connected to MQTT server'))
    client.on('offline', () => console.log('Disconnected from MQTT server'))
    client.on('error', e => console.log('MQTT client error', e))

    return BPromise.fromCallback(cb => client.once('connect', () => cb())).then(
      () => client
    )
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
