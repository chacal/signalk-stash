import Debug from 'debug'

import Clickhouse from '@apla/clickhouse'
import { Express, Request, Response } from 'express'
import { ZonedDateTime } from 'js-joda'
import { asyncHandler } from './API'
import SKClickHouse from './db/SKClickHouse'
const contextsDebug = Debug('stash:history:contexts')
const pathsDebug = Debug('stash:history:paths')

const ch = new SKClickHouse().ch

export default function setupHistoryAPIRoutes(app: Express) {
  app.get(
    '/signalk/v1/history/contexts',
    asyncHandler(fromToHandler(getContexts, contextsDebug))
  )
  app.get(
    '/signalk/v1/history/paths',
    asyncHandler(fromToHandler(getPaths, pathsDebug))
  )
}

type ContextResultRow = [string]
async function getContexts(
  ch: Clickhouse,
  from: ZonedDateTime,
  to: ZonedDateTime,
  debug: (s: string) => void
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
  debug(distinctQuery)
  return ch
    .querying<ContextResultRow>(distinctQuery)
    .then((result: any) => result.data.map((row: any[]) => row[0]))
}

type PathsResultRow = [string]
async function getPaths(
  ch: Clickhouse,
  from: ZonedDateTime,
  to: ZonedDateTime,
  debug: (s: string) => void,
  req: Request
) {
  const context = req.query.context || ''
  const query = `
      SELECT
        DISTINCT path
      FROM value
      WHERE
        context = '${context}'
        AND
        ts >= ${from.toEpochSecond()}
        AND
        ts <= ${to.toEpochSecond()}
    `
  debug(query)
  return ch
    .querying<PathsResultRow>(query)
    .then((result: any) => result.data.map((row: any[]) => row[0]))
}

type FromToHandler<T = any> = (
  ch: Clickhouse,
  from: ZonedDateTime,
  to: ZonedDateTime,
  debug: (d: string) => void,
  req: Request
) => Promise<T>

function fromToHandler(
  wrappedHandler: FromToHandler,
  debug: (d: string) => void
) {
  return async (req: Request, res: Response) => {
    debug(req.query)
    const from = dateTimeFromQuery(req, 'from')
    const to = dateTimeFromQuery(req, 'to')
    contextsDebug(`${from.toString()}-${to.toString()}`)
    res.json(await wrappedHandler(ch, from, to, debug, req))
  }
}

function dateTimeFromQuery(req: Request, paramName: string): ZonedDateTime {
  return ZonedDateTime.parse(req.query[paramName])
}
