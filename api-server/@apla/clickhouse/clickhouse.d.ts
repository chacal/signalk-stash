declare module '@apla/clickhouse' {
  import { Writable } from 'stream'

  interface DBOptions {
    readonly host: string,
    readonly port: number
  }

  interface QueryOptions {
    readonly format: string
  }

  type QueryStream = Writable
  type QueryCallback<T> = (error: any, data: T) => void

  export default class Clickhouse {
    constructor(options: DBOptions)

    querying<T = any>(query: string): Promise<T>
    query<T = any>(query: string, options: QueryOptions, cb: QueryCallback<T>): QueryStream
  }
}
