import Debug from 'debug'
import { Express, Request, Response } from 'express'
import { authorizedGet } from './API'
import stash from './db/StashDB'

const debug = Debug('stash:vessel-api')

export default function setupVesselAPIRoutes(app: Express) {
  authorizedGet(app, '/contexts', contexts)
}

async function contexts(req: Request, res: Response) {
  debug('Request: %o', req.url)
  const contexts = await stash.getContexts()
  res.json(contexts)
}
