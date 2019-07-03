import Debug from 'debug'
import { Express, Request, Response } from 'express'
import { asyncHandler } from './API'
import config from './Config'
const debug = Debug('stash:mqtt-credentials-api')

export default function setupMqttCredentialsAPIRoutes(app: Express) {
  app.get('/mqtt-credentials', asyncHandler(getMqttCredentials))
}

async function getMqttCredentials(req: Request, res: Response) {
  debug('Request: %o', req.url)
  res.json({
    latestReader: {
      username: config.mqtt.latestReader.username,
      password: config.mqtt.latestReader.password
    }
  })
}
