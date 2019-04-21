import Debug from 'debug'
import { Express, Request, Response } from 'express'
import { asyncHandler } from './API'
import stash from './db/StashDB'
const debug = Debug('stash:vessel-api')

export default function setupVesselAPIRoutes(app: Express) {
  app.get('/contexts', asyncHandler(contexts))
}

async function contexts(req: Request, res: Response) {
  debug('Request: %o', req.url)
  const contexts = await stash.getContexts()
  res.json(contexts)
}
