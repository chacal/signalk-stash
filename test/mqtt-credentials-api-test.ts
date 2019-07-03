import { expect } from 'chai'
import config from '../api-server/Config'
import { getJson, startTestApp } from './test-util'

describe('Mqtt Credentials API', () => {
  const app = startTestApp()

  it('returns "latest reader" MQTT credentials from Config', () => {
    return getJson(app, '/mqtt-credentials').expect(res => {
      expect(res.body.latestReader.username).to.eq(
        config.mqtt.latestReader.username
      )
      expect(res.body.latestReader.password).to.eq(
        config.mqtt.latestReader.password
      )
    })
  })
})
