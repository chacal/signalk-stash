import Debug from 'debug'

import Clickhouse from '@apla/clickhouse'
import { ZonedDateTime } from '@js-joda/core'
import { Express, Request, Response } from 'express'
import { asyncHandler } from './API'
import SKClickHouse from './db/SKClickHouse'
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
    .replace(/\n/g, ' ')
    .replace(/ +/g, ' ')

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
    .replace(/\n/g, ' ')
    .replace(/ +/g, ' ')
  debug(query)
  return ch
    .querying<PathsResultRow>(query)
    .then((result: any) => result.data.map((row: any[]) => row[0]))
}

interface PathSpec {
  path: string
  method: string
}

async function getValues(
  ch: Clickhouse,
  from: ZonedDateTime,
  to: ZonedDateTime,
  debug: (s: string) => void,
  req: Request
) {
  const timeResolutionSeconds = req.query.resolution
    ? Number.parseFloat(req.query.resolution)
    : (to.toEpochSecond() - from.toEpochSecond()) / 500
  const context = req.query.context || ''
  const pathSpecs = toPathSpecs(req.query.paths)
  const valueInPaths = pathSpecs.filter(isValuePathSpec)
  const valuesRequested = valueInPaths.length > 0
  const positionRequested =
    pathSpecs.filter(ps => ps.path === 'navigation.position').length > 0

  const valuesQuery = `
      SELECT
        (intDiv(toUnixTimestamp(ts), ${timeResolutionSeconds}) * ${timeResolutionSeconds}) as t,
        path,
        avg(value) as v1_or_lat,
        null as null_or_lng
      FROM
        value
      WHERE
        context = '${context}'
        AND
        path in (${valueInPaths.map(ps => `'${ps.path}'`).join(',')})
        AND
        ts >= ${from.toEpochSecond()}
        AND
        ts <= ${to.toEpochSecond()}
      GROUP BY
        t, path
    `
    .replace(/\n/g, ' ')
    .replace(/ +/g, ' ')
  debug(valuesQuery)

  const coordinateDecimals = 5
  const trackpointsQuery = `
    SELECT
      (intDiv(toUnixTimestamp(ts), ${timeResolutionSeconds}) * ${timeResolutionSeconds}) as t,
      'navigation.position' as path,
      round(avg(lat),${coordinateDecimals}) as v1_or_lat,
      round(avg(lng),${coordinateDecimals}) as null_or_lng
    FROM trackpoint
    WHERE
      context = '${context}'
      AND
      ts >= ${from.toEpochSecond()}
      AND
      ts <= ${to.toEpochSecond()}
    GROUP BY t
  `
    .replace(/\n/g, ' ')
    .replace(/ +/g, ' ')
  debug(trackpointsQuery)

  const compositeQuery = `
    SELECT * FROM (
      ${valuesRequested ? valuesQuery : ''}
      ${valuesRequested && positionRequested ? 'UNION ALL' : ''}
      ${positionRequested ? trackpointsQuery : ''}
    ) ORDER BY t, path
  `
    .replace(/\n/g, ' ')
    .replace(/ +/g, ' ')
  debug(compositeQuery)

  return ch.querying(compositeQuery).then(result => ({
    context,
    values: pathSpecs.map((ps: PathSpec) => ({
      path: ps.path,
      method: ps.method,
      source: null
    })),
    range: { from: from.toString(), to: to.toString() },
    data: toDataRows(result.data, pathSpecs)
  }))
}

type PathValueGetter = (x: number, y: number) => any

const toDataRows = (data: any[][], pathSpecs: PathSpec[]) => {
  if (data.length === 0) {
    return []
  }

  const pathValueGetters = pathSpecs.reduce((acc: any, ps, i) => {
    let getter: PathValueGetter = (v1: number, v2: number) => v1
    if (ps.path === 'navigation.position') {
      getter = (v1, v2) => [v2, v1]
    }
    acc[ps.path] = {
      index: i + 1,
      getter
    }
    return acc
  }, {})

  let lastRow: any
  let lastTimestamp = ''

  console.log(pathValueGetters)
  return data.reduce((acc: any, valueRow: any[], i: number) => {
    const [timestamp, path, v1, v2] = valueRow
    if (valueRow[0] !== lastTimestamp) {
      if (lastRow) {
        acc.push(lastRow)
      }
      lastTimestamp = timestamp
      // tslint:disable-next-line: radix
      lastRow = [new Date(Number.parseInt(lastTimestamp) * 1000)]
    }
    lastRow[pathValueGetters[path].index] = pathValueGetters[path].getter(
      v1,
      v2
    )
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
    try {
      debug(req.query.toString())
      const from = dateTimeFromQuery(req, 'from')
      const to = dateTimeFromQuery(req, 'to')
      debug(`${from.toString()}-${to.toString()}`)
      res.json(await wrappedHandler(ch, from, to, debug, req))
    } catch (e) {
      res.status(400).send({
        message: `date parsing failed`
      })
    }
  }
}

function dateTimeFromQuery(req: Request, paramName: string): ZonedDateTime {
  return ZonedDateTime.parse(req.query[paramName]?.toString() || '')
}

const isValuePathSpec = (pathSpec: PathSpec) =>
  pathSpec.path !== 'navigation.position'

const toPathSpecs = (paths: string = ''): PathSpec[] => {
  const sanitizedRawPaths = paths.replace(/[^0-9a-z\.,\:]/gi, '').split(',')
  return sanitizedRawPaths.map(rawPath => {
    const splitPath = rawPath.split(':')
    return {
      path: splitPath[0],
      method: splitPath[1] ? splitPath[1] : 'average'
    }
  })
}
