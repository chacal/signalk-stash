import Debug from 'debug'

import Clickhouse from '@apla/clickhouse'
import { Express, Request, Response } from 'express'
import { ZonedDateTime } from 'js-joda'
import { asyncHandler } from './API'
import SKClickHouse from './db/SKClickHouse'
const contextsDebug = Debug('stash:history:contexts')

const ch = new SKClickHouse().ch

export default function setupHistoryAPIRoutes(app: Express) {
  app.get('/signalk/v1/history/contexts', asyncHandler(contexts))
}

async function contexts(req: Request, res: Response) {
  contextsDebug(req.query)
  const from = dateTimeFromQuery(req, 'from')
  const to = dateTimeFromQuery(req, 'to')
  contextsDebug(`${from.toString()}-${to.toString()}`)
  res.json(await getContexts(ch, from, to))
}

function dateTimeFromQuery(req: Request, paramName: string): ZonedDateTime {
  return ZonedDateTime.parse(req.query[paramName])
}

type ContextResultRow = [string]
async function getContexts(
  ch: Clickhouse,
  from: ZonedDateTime,
  to: ZonedDateTime
) {
  const coreQuery = ['value', 'trackpoint']
    .map(
      table => `
      SELECT
        DISTINCT context
      FROM ${table}
      WHERE
        ts >= ${from.toEpochSecond()}
        AND
        ts <= ${to.toEpochSecond()}
    `
    )
    .join(' UNION ALL ')
  const distinctQuery = `SELECT DISTINCT context from (${coreQuery})`
  contextsDebug(distinctQuery)
  return ch
    .querying<ContextResultRow>(distinctQuery)
    .then((result: any) => result.data.map((row: any[]) => row[0]))
}
