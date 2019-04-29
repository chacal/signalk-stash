import Debug from 'debug'
import { Express, NextFunction, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import DB from '../api-server/db/StashDB'
import Vessel from '../api-server/domain/Vessel'
import { testVesselUuids, writeDeltasFromJSONArray } from './test-util'
import TestDB from './TestDB'
const debug = Debug('stash:test-api')

export default function setupTestAPIRoutes(app: Express) {
  console.log('********* Setting up test routes *********')
  app.post('/test/reset-tables', resetTables)
  app.post('/test/insert-positions', insertLargePositionsFixture)
}

function resetTables(req: Request, res: Response, next: NextFunction): void {
  debug('Resetting DBs..')
  TestDB.resetTables()
    .then(() => res.status(204).end())
    .catch(next)
}

function insertLargePositionsFixture(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  debug('Inserting large positions fixture')
  const content = fs.readFileSync(
    path.join(__dirname, '../../test/data/position-fixture-large.json')
  )
  const rows = JSON.parse(content.toString())
  writeDeltasFromJSONArray(rows)
    .then(() => DB.upsertVessel(new Vessel(testVesselUuids[1], 'bar', 'baz')))
    .then(() => DB.upsertVessel(new Vessel(testVesselUuids[2], 'foo', 'BAZ')))
    .then(() => res.status(204).end())
    .catch(next)
}
