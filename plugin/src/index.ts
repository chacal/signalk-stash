/*
 * Copyright 2016 Teppo Kurki <teppo.kurki@iki.fi>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

import { SKUpdate } from '@chacal/signalk-ts'
import mqtt from 'mqtt'
import GeoFenceThrottler from '../../delta-inputs/GeoFenceThrottler'

const id = 'signalk-mqtt-stasher'

module.exports = (app: any) => {
  const plugin: any = {
    unsubscribes: []
  }

  plugin.id = id
  plugin.name = 'MQTT Stasher'
  plugin.description = 'Send self data to Stash via MQTT'

  plugin.schema = {
    title: plugin.name,
    type: 'object',
    required: ['targets'],
    properties: {
      targets: {
        type: 'array',
        description: 'Stash servers',
        default: [],
        items: {
          type: 'object',
          required: ['remoteHost'],
          properties: {
            remoteHost: {
              type: 'string',
              title: 'Stash MQTT server Url (starts with mqtt/mqtts)',
              default: 'mqtt://somehost:someport'
            },
            password: {
              type: 'string',
              title: 'Stash MQTT server password'
            },
            rejectUnauthorized: {
              type: 'boolean',
              default: false,
              title: 'Reject self signed and invalid server certificates'
            },
            bufferTime: {
              type: 'integer',
              default: 5,
              title: 'Maximum send buffering interval in seconds'
            },
            maxUpdatesToBuffer: {
              type: 'integer',
              default: 100,
              title: 'Maximum number of updates to buffer before sending'
            },
            throttleTime: {
              type: 'integer',
              default: 1000,
              title: 'Throttle deltas per path and $source by this many ms.'
            },
            sendAll: {
              type: 'boolean',
              default: true,
              title: 'Send all data (add individual paths below if unchecked)'
            },
            geoFences: {
              type: 'array',
              title: 'Geofences',
              description: 'Areas where position sending is throttled',
              default: [],
              items: {
                type: 'object',
                required: ['lat', 'lon'],
                properties: {
                  lat: {
                    type: 'number',
                    title: 'Geofence latitude'
                  },
                  lon: {
                    type: 'number',
                    title: 'Geofence longitude'
                  },
                  radius: {
                    type: 'integer',
                    default: 50,
                    title: 'Geofence radius (meters)'
                  },
                  insideFenceThrottleSeconds: {
                    type: 'integer',
                    default: 120,
                    title: 'Throttle seconds inside',
                    description:
                      'Throttle positions to one position in this many seconds when inside geofence'
                  },
                  outsideFenceThrottleSeconds: {
                    type: 'integer',
                    default: 0,
                    title: 'Throttle seconds outside',
                    description:
                      'Throttle positions to one position in this many seconds when outside geofence (0 = no throttle)'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  plugin.onStop = []

  plugin.start = (options: any) => {
    plugin.onStop = []

    const topic = `signalk/delta/${app.getPath('self').replace('vessels.', '')}`

    plugin.clientsData = options.targets.map((stashTarget: any) => {
      const mqttOptions = {
        rejectUnauthorized: options.rejectUnauthorized,
        reconnectPeriod: 60000,
        clientId: app.getPath('self'),
        username: app.getPath('self').replace('vessels.', ''),
        password: stashTarget.password
      }
      const client = mqtt.connect(stashTarget.remoteHost, mqttOptions)

      const result = {
        client,
        connected: false
      }

      client.on('connect', () => {
        result.connected = true
        app.setPluginStatus(`${stashTarget.remoteHost} connected`)
        client.subscribe(`${topic}/stats`, () => {
          app.debug(`Subscribed to ${topic}/stats`)
        })
        client.on('message', (topic, payload, packet) => {
          try {
            const stats = JSON.parse(payload.toString())
            app.setPluginStatus(
              `${stats.deltas} messages stashed in ${stats.periodLength /
                1000} seconds (${stats.timestamp})`
            )
          } catch (ex) {
            console.log(`Error parsing stats message: ${payload.toString()}`)
          }
        })
      })
      client.on('error', err => {
        app.error(err)
        app.error(mqttOptions)
        app.setPluginError(err.message)
      })
      client.on('disconnect', () => {
        result.connected = false
        console.log(`${stashTarget.remoteHost} disconnected`)
      })
      plugin.onStop.push(() => client.end())

      const geoFenceThrottlers: GeoFenceThrottler[] = []

      if (stashTarget.geoFences && Array.isArray(stashTarget.geoFences)) {
        stashTarget.geoFences.forEach((gf: any) => {
          const t = new GeoFenceThrottler(
            gf.lat,
            gf.lon,
            gf.radius,
            gf.insideFenceThrottleSeconds * 1000,
            gf.outsideFenceThrottleSeconds * 1000
          )
          geoFenceThrottlers.push(t)
          app.debug(`Using GeoFenceThrottler: ${JSON.stringify(t)}`)
        })
      }

      let updatesAccumulator: SKUpdate[] = []
      const deltaHandler = (delta: any) => {
        if (
          (delta.context && delta.context === app.selfContext) ||
          !delta.context
        ) {
          let throttled = delta
          geoFenceThrottlers.forEach(t => {
            throttled = t.throttlePositions(throttled)
          })
          if (throttled !== undefined) {
            updatesAccumulator = updatesAccumulator.concat(throttled.updates)
          }
        }
      }

      const unsubscribe = app.streambundle
        .getSelfBus()
        .groupBy((v: any) => v.$source + '-' + v.path)
        .flatMap((bySourceAndPath: any) =>
          bySourceAndPath.throttle(stashTarget.throttleTime || 1000)
        )
        .onValue((v: any) => deltaHandler(toDelta(v)))

      plugin.onStop.push(unsubscribe)

      let lastSend = 0
      const sendTimer = setInterval(() => {
        if (
          updatesAccumulator.length > stashTarget.maxUpdatesToBuffer ||
          (updatesAccumulator.length > 0 &&
            Date.now() > lastSend + stashTarget.bufferTime * 1000)
        ) {
          app.debug(`Sending ${updatesAccumulator.length} updates to ${topic}`)
          client.publish(
            topic,
            JSON.stringify({ updates: updatesAccumulator }),
            { qos: 1 }
          )
          updatesAccumulator = []
          lastSend = Date.now()
        }
      }, 1000)
      plugin.onStop.push(() => {
        clearInterval(sendTimer)
      })

      return result
    })
  }

  plugin.stop = () => {
    plugin.onStop.forEach((f: any) => f())
  }

  return plugin
}

function toDelta(normalizedDeltaData: any) {
  return {
    context: normalizedDeltaData.context,
    updates: [
      {
        source: normalizedDeltaData.source,
        $source: normalizedDeltaData.$source,
        timestamp: new Date(normalizedDeltaData.timestamp),
        values: [
          {
            path: normalizedDeltaData.path,
            value: normalizedDeltaData.value
          }
        ]
      }
    ]
  }
}
