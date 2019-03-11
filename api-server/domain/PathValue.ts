import { TsvRowCallback } from '@apla/clickhouse'
import { SKValue } from '@chacal/signalk-ts'
import { ChronoField, ZonedDateTime } from 'js-joda'
import { Transform, TransformCallback } from 'stream'

export default class PathValue {
  constructor(
    readonly context: string,
    readonly timestamp: ZonedDateTime,
    readonly source: string,
    readonly pathvalue: SKValue
  ) {}
}

export function createValuesTable(ch: any) {
  return ch.querying(`
    CREATE TABLE IF NOT EXISTS value (
    ts     DateTime,
    millis UInt16,
    context String,
    source String,
    path String,
    value Float32
    ) ENGINE = MergeTree()
    PARTITION BY (context, toYYYYMMDD(ts))
    ORDER BY (ts)`)
}

type PathValueRowColumns = [number, number, string, string, string, number]

export class PathValuesToClickHouseTSV extends Transform {
  constructor(readonly tsvRowCb: TsvRowCallback = () => undefined) {
    super({ objectMode: true })
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
    pathValue.source,
    pathValue.pathvalue.path,
    pathValue.pathvalue.value as number
  ]
}
