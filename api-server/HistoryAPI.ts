import Debug from 'debug'

import Clickhouse from '@apla/clickhouse'
import { Express, Request, Response } from 'express'
import { asyncHandler } from './API'
import SKClickHouse from './db/SKClickHouse'
import { ZonedDateTime } from '@js-joda/core'
const contextsDebug = Debug('stash:history:contexts')
const pathsDebug = Debug('stash:history:paths')
const valuesDebug = Debug('stash:history:values')

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
  app.get(
    '/signalk/v1/history/values',
    asyncHandler(fromToHandler(getValues, valuesDebug))
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

type ValuesResultRow = any[]
async function getValues(
  ch: Clickhouse,
  from: ZonedDateTime,
  to: ZonedDateTime,
  debug: (s: string) => void,
  req: Request
) {
  const timeResolutionSeconds = req.query.resolution ? Number.parseFloat(req.query.resolution) : (to.toEpochSecond() - from.toEpochSecond()) / 500
  const context = req.query.context || ''
  // \W matches [^0-9a-zA-Z_]
  const paths = (req.query.paths || '').replace(/[^0-9a-z\.,]/gi, '').split(',')
  const inPaths = paths.map((s: string) => `'${s}'`).join(',')
  const query = `
      SELECT
        (intDiv(toUnixTimestamp(ts), ${timeResolutionSeconds}) * ${timeResolutionSeconds}) as t,
        path,
        avg(value)
      FROM
        value
      WHERE
        context = '${context}'
        AND
        path in (${inPaths})
        AND
        ts >= ${from.toEpochSecond()}
        AND
        ts <= ${to.toEpochSecond()}
      GROUP BY
        t, path
      ORDER BY
        t, path
    `
  debug(query)
  return ch.querying<ValuesResultRow>(query).then((result: any) => ({
    context,
    values: paths.map((path: string) => ({
      path,
      method: 'average',
      source: null
    })),
    range: { from: from.toString(), to: to.toString() },
    data: toDataRows(result.data, paths)
  }))
}

const toDataRows = (data: any[][], paths: string[]) => {
  if (data.length === 0) {
    return []
  }
  let lastRow: any
  let lastTimestamp = ''
  return data.reduce((acc: any, valueRow: any[]) => {
    const pathIndex = paths.indexOf(valueRow[1]) + 1
    if (valueRow[0] !== lastTimestamp) {
      if (lastRow) {
        acc.push(lastRow)
      }
      lastTimestamp = valueRow[0]
      // tslint:disable-next-line: radix
      lastRow = [new Date(Number.parseInt(lastTimestamp) * 1000)]
    }
    lastRow[pathIndex] = valueRow[2]
    return acc
  }, [])
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
    debug(req.query.toString())
    const from = dateTimeFromQuery(req, 'from')
    const to = dateTimeFromQuery(req, 'to')
    contextsDebug(`${from.toString()}-${to.toString()}`)
    res.json(await wrappedHandler(ch, from, to, debug, req))
  }
}

function dateTimeFromQuery(req: Request, paramName: string): ZonedDateTime {
  return ZonedDateTime.parse(req.query[paramName]?.toString() || '')
}
