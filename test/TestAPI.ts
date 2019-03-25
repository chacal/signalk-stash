import Debug from 'debug'
import { Express, NextFunction, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { writeDeltasFromJSONArray } from './test-util'
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
    .then(() => res.status(204).end())
    .catch(next)
}
