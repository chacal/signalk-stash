import { SKDelta } from '@chacal/signalk-ts'
import BPromise from 'bluebird'
import * as mqtt from 'mqtt'
import SignalKDeltaWriter from '../api-server/SignalKDeltaWriter'

export type MqttTopic = string

export const DELTABASETOPIC: MqttTopic = 'signalk/delta'
const TOPICPREFIXLENGTH: number = DELTABASETOPIC.length + 1
export const DELTAWILDCARDTOPIC: MqttTopic = DELTABASETOPIC + '/+'
export const DELTASTATSWILDCARDTOPIC: MqttTopic = DELTABASETOPIC + '/+/stats'
const VESSELSPREFIX: string = 'vessels.'
const VESSELSPREFIXLENGTH: number = VESSELSPREFIX.length

const STATSINTERVAL = 60 * 1000

export default class MqttDeltaInput {
  constructor(
    private readonly mqttClient: mqtt.MqttClient,
    private readonly deltaWriter: SignalKDeltaWriter,
    private deltaCounts: { [context: string]: number } = {}
  ) {}

  start() {
    this.mqttClient.on('message', this._sendDeltaToWriter.bind(this))

    setInterval(() => {
      const now = new Date().toISOString()
      Object.keys(this.deltaCounts).forEach(context => {
        const topic =
          'signalk/delta/' +
          context.substring(VESSELSPREFIXLENGTH, context.length) +
          '/stats'
        this.mqttClient.publish(
          topic,
          JSON.stringify({
            deltas: this.deltaCounts[context],
            periodLength: STATSINTERVAL,
            timestamp: now
          })
        )
      })
      this.deltaCounts = {}
    }, STATSINTERVAL)

    return BPromise.fromCallback(cb =>
      this.mqttClient.subscribe(DELTAWILDCARDTOPIC, { qos: 1 }, cb)
    )
  }

  _sendDeltaToWriter(topic: string, payload: Buffer, packet: mqtt.Packet) {
    try {
      let delta = SKDelta.fromJSON(payload.toString())
      if (delta.context === 'self' || delta.context === 'vessels.self') {
        delta = new SKDelta(
          VESSELSPREFIX + topic.substring(TOPICPREFIXLENGTH, topic.length),
          delta.updates
        )
      }
      if (contextMatchesTopic(topic, delta)) {
        this.deltaCounts[delta.context] =
          (this.deltaCounts[delta.context] || 0) + 1
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

export function vesselTopic(vesselUuid: string): string {
  return `${DELTABASETOPIC}/${vesselUuid}`
}
