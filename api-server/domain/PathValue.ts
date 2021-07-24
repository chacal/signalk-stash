import Clickhouse from '@apla/clickhouse'
import { SKContext, SKValue } from '@chacal/signalk-ts'
import { ChronoField, ZonedDateTime } from '@js-joda/core'
import { Transform, TransformCallback } from 'stream'
import SKClickHouse from '../db/SKClickHouse'

export default class PathValue {
  constructor(
    readonly context: string,
    readonly timestamp: ZonedDateTime,
    readonly sourceRef: string,
    readonly pathvalue: SKValue
  ) {}
}

export function createValuesTable(ch: Clickhouse) {
  return ch.querying(`
    CREATE TABLE IF NOT EXISTS value (
      ts     DateTime,
      millis UInt16,
      context String,
      sourceRef String,
      path String,
      value Float32
    ) ENGINE = MergeTree()
    PARTITION BY (context, toYYYYMMDD(ts))
    ORDER BY (context, path, sourceRef, ts)`)
}

export function insertPathValueStream(
  ch: SKClickHouse,
  cb?: (err?: Error) => void
) {
  return ch.bufferingQuery(`INSERT INTO value`, { format: 'TSV' }, cb)
}

type PathValueRowColumns = [number, number, string, string, string, number]

export class PathValuesToClickHouseTSV extends Transform {
  constructor() {
    super({ objectMode: true, highWaterMark: 1024 })
  }

  _transform(pathValue: PathValue, encoding: string, cb: TransformCallback) {
    this.push(pathValuetoColumns(pathValue))
    cb()
  }
}

function pathValuetoColumns(pathValue: PathValue): PathValueRowColumns {
  return [
    pathValue.timestamp.toEpochSecond(),
    pathValue.timestamp.get(ChronoField.MILLI_OF_SECOND),
    pathValue.context,
    pathValue.sourceRef,
    pathValue.pathvalue.path,
    pathValue.pathvalue.value as number
  ]
}

export function getValues(
  ch: Clickhouse,
  context: SKContext,
  path: string,
  from: ZonedDateTime,
  to: ZonedDateTime,
  timeresolution: number
): Promise<[any]> {
  const query = `
    SELECT
      CAST((intDiv(toUInt32(ts), ${timeresolution}) * ${timeresolution}) AS DATETIME) as t,
      avg(value)
    FROM
      value
    WHERE
      context = '${context}'
      AND
      path = '${path}'
      AND
      ts >= ${from.toEpochSecond()}
      AND
      ts <= ${to.toEpochSecond()}
    GROUP BY
      t
    ORDER BY
      t
  `
  return ch.querying(query)
}
