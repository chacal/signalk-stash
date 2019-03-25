import { Duration } from 'js-joda'
import _ from 'lodash'

const isDeveloping =
  process.env.ENVIRONMENT !== 'production' && process.env.ENVIRONMENT !== 'test'

export interface IConfig {
  db: {
    host: string
    port: number
    database: string
    user: string
    password: string
  }
  clickhouse: {
    host: string
    port: number
  }
  port: number
  isDeveloping: boolean
  mqtt: {
    username: string
    password: string
    broker: string
  }
  deltaWriteStreamFlushPeriod: Duration
}

type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> }

interface IEnvironments {
  [key: string]: DeepPartial<IConfig>
}

const baseConfig = {
  db: {
    host: 'localhost',
    port: 50400,
    database: 'signalk',
    user: 'signalk',
    password: 'signalk'
  },
  clickhouse: {
    host: 'localhost',
    port: 58123
  },
  port: 3000,
  isDeveloping,
  mqtt: {
    username: 'signalk',
    password: 'signalk',
    broker: 'mqtt://localhost:1883'
  },
  deltaWriteStreamFlushPeriod: Duration.ofMillis(1000)
}

const environments: IEnvironments = {
  development: {},
  production: {
    db: {
      host: 'postgis',
      port: 5432
    }
  },
  test: {
    db: {
      host: 'localhost',
      port: 50500
    },
    port: 3300
  },
  e2e: {
    db: {
      host: 'localhost',
      port: 25432,
      password: 'signalk'
    },
    clickhouse: {
      host: 'localhost',
      port: 28123
    },
    mqtt: {
      broker: 'mqtt://localhost:21883'
    },
    port: 23000
  }
}

const environment = process.env.ENVIRONMENT || 'development'
const config = _.merge(baseConfig, environments[environment])
console.log(`Using ${environment} config:\n${JSON.stringify(config, null, 2)}`)
export default config
