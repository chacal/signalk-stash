import Debug from 'debug'
import { Express, Request, Response } from 'express'
import { DELTALATESTSWILDCARDTOPIC } from '../delta-inputs/MqttDeltaInput'
import { asyncHandler } from './API'
import config from './Config'
import DB from './db/StashDB'
import { MqttAccount, MqttACL, MqttACLLevel } from './domain/Auth'
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

export async function insertLatestDeltaReaderAccountFromConfig() {
  const account = new MqttAccount(
    config.mqtt.latestReader.username,
    config.mqtt.latestReader.password
  )

  await DB.upsertAccount(account)
  await DB.upsertAcl(
    new MqttACL(
      account.username,
      DELTALATESTSWILDCARDTOPIC,
      MqttACLLevel.SUBSCRIBE + MqttACLLevel.READ
    )
  )
}
