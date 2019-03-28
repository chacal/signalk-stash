import { SKDelta } from '@chacal/signalk-ts'
import BPromise from 'bluebird'
import * as mqtt from 'mqtt'
import SignalKDeltaWriter from '../api-server/SignalKDeltaWriter'

export type MqttTopic = string

export const DELTABASETOPIC: MqttTopic = 'signalk/delta'
const TOPICPREFIXLENGTH: number = DELTABASETOPIC.length + 1
export const DELTAWILDCARDTOPIC: MqttTopic = DELTABASETOPIC + '/+'
const VESSELSPREFIXLENGTH: number = 'vessels.'.length

export default class MqttDeltaInput {
  constructor(
    private readonly mqttClient: mqtt.MqttClient,
    private readonly deltaWriter: SignalKDeltaWriter
  ) {}

  start() {
    this.mqttClient.on('message', this._sendDeltaToWriter.bind(this))
    return BPromise.fromCallback(cb =>
      this.mqttClient.subscribe(DELTAWILDCARDTOPIC, { qos: 1 }, cb)
    )
  }

  _sendDeltaToWriter(topic: string, payload: Buffer, packet: mqtt.Packet) {
    try {
      const delta = SKDelta.fromJSON(payload.toString())
      if (contextMatchesTopic(topic, delta) || delta.context === 'self') {
        this.deltaWriter.writeDelta(delta).catch(err => {
          console.error(err)
        })
      }
    } catch (e) {
      console.error(`Invalid SignalK delta from MQTT: ${payload}`)
    }
  }
}

function contextMatchesTopic(topic: string, delta: SKDelta): boolean {
  return (
    topic.substring(TOPICPREFIXLENGTH, topic.length) ===
    delta.context.substring(VESSELSPREFIXLENGTH, delta.context.length)
  )
}
