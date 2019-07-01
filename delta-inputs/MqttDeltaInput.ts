import { QueryStream } from '@apla/clickhouse'
import { SKDelta } from '@chacal/signalk-ts'
import BPromise from 'bluebird'
import * as mqtt from 'mqtt'
import { IPublishPacket } from 'mqtt-packet'

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
    private readonly deltaWriteStream: QueryStream,
    private deltaCounts: { [context: string]: number } = {}
  ) {}

  start() {
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

    this.mqttClient.handleMessage = this.handleMessage.bind(this)
    return BPromise.fromCallback(cb =>
      this.mqttClient.subscribe(DELTAWILDCARDTOPIC, { qos: 1 }, cb)
    )
  }

  stop() {
    this.deltaWriteStream.end()
  }

  handleMessage(packet: mqtt.Packet, done: mqtt.PacketCallback) {
    if (isPublishPacket(packet)) {
      let delta
      try {
        delta = SKDelta.fromJSON(packet.payload.toString())
      } catch (e) {
        console.error(
          `Invalid SignalK delta from MQTT: ${JSON.stringify(packet)}`
        )
        done()
      }
      if (delta) {
        if (delta.context === 'self' || delta.context === 'vessels.self') {
          delta = new SKDelta(
            VESSELSPREFIX +
              packet.topic.substring(TOPICPREFIXLENGTH, packet.topic.length),
            delta.updates
          )
        }
        if (contextMatchesTopic(packet.topic, delta)) {
          this.deltaCounts[delta.context] =
            (this.deltaCounts[delta.context] || 0) + 1
          if (this.deltaWriteStream.write(delta)) {
            done()
          } else {
            this.deltaWriteStream.on('drain', done)
          }
        }
      }
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

function isPublishPacket(object: any): object is IPublishPacket {
  return object.cmd === 'publish'
}
