import { QueryStream } from '@apla/clickhouse'
import { SKContext, SKDelta, SKUpdate, SKValue } from '@chacal/signalk-ts'
import BPromise from 'bluebird'
import _ from 'lodash'
import * as mqtt from 'mqtt'
import { IPublishPacket } from 'mqtt-packet'

export type MqttTopic = string

export const DELTABASETOPIC: MqttTopic = 'signalk/delta'
const TOPICPREFIXLENGTH: number = DELTABASETOPIC.length + 1
export const DELTAWILDCARDTOPIC: MqttTopic = DELTABASETOPIC + '/+'
export const DELTASTATSWILDCARDTOPIC: MqttTopic = DELTABASETOPIC + '/+/stats'
export const DELTALATESTSWILDCARDTOPIC: MqttTopic =
  DELTABASETOPIC + '/+/latest/#'
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
        const topic = deltaTopicFor(context) + '/stats'
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
      this.mqttClient.subscribe(
        DELTAWILDCARDTOPIC,
        { qos: 1 },
        (err, granted) => {
          if (err) {
            cb(err)
          } else if (
            granted === undefined ||
            granted.length !== 1 ||
            granted[0].qos !== 1
          ) {
            cb(
              `Failed to subscribe to ${DELTAWILDCARDTOPIC}. Grant was: ${JSON.stringify(
                granted
              )}`
            )
          } else {
            cb(undefined)
          }
        }
      )
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
          this.publishToLatestDeltaTopics(delta)
          if (this.deltaWriteStream.write(delta)) {
            done()
          } else {
            this.deltaWriteStream.on('drain', done)
          }
        }
      }
    }
  }

  publishToLatestDeltaTopics(delta: SKDelta) {
    const updatesWithPosition = delta.updates.filter(
      upd =>
        upd.values.find(value => value.path === 'navigation.position') !==
        undefined
    )

    const latestUpdateWithPosition = _.sortBy(updatesWithPosition, upd =>
      upd.timestamp.getTime()
    ).slice(-1)[0]

    const positionValue = latestUpdateWithPosition.values.find(
      val => val.path === 'navigation.position'
    ) as SKValue

    const newPositionDelta = new SKDelta(delta.context, [
      new SKUpdate(
        latestUpdateWithPosition.$source,
        latestUpdateWithPosition.timestamp,
        [positionValue],
        latestUpdateWithPosition.source
      )
    ])

    const latestPositionTopic =
      deltaTopicFor(newPositionDelta.context) +
      '/latest/' +
      positionValue.path.replace('.', '/')

    this.mqttClient.publish(
      latestPositionTopic,
      JSON.stringify(newPositionDelta),
      {
        qos: 0,
        retain: true
      }
    )
  }
}

function deltaTopicFor(context: SKContext): string {
  return `${DELTABASETOPIC}/${context.substring(
    VESSELSPREFIXLENGTH,
    context.length
  )}`
}

function contextMatchesTopic(topic: string, delta: SKDelta): boolean {
  return topic === deltaTopicFor(delta.context)
}

export function vesselTopic(vesselUuid: string): string {
  return `${DELTABASETOPIC}/${vesselUuid}`
}

function isPublishPacket(object: any): object is IPublishPacket {
  return object.cmd === 'publish'
}
