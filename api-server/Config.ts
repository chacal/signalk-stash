import { Duration } from 'js-joda'
import _ from 'lodash'

const isDeveloping = process.env.ENVIRONMENT === undefined
const isUnitTesting = process.env.ENVIRONMENT === 'unit-test'
const isIntegrationTesting = process.env.ENVIRONMENT === 'integration-test'
const isTesting = isUnitTesting || isIntegrationTesting

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
  isTesting: boolean
  isUnitTesting: boolean
  isIntegrationTesting: boolean
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
    port: 55432,
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
  isTesting,
  isUnitTesting,
  isIntegrationTesting,
  mqtt: {
    username: 'signalk',
    password: 'signalk',
    broker: 'mqtt://localhost:1883'
  },
  deltaWriteStreamFlushPeriod: Duration.ofMillis(1000)
}

const testConfig = {
  db: {
    host: 'localhost',
    port: 45432
  },
  clickhouse: {
    host: 'localhost',
    port: 48123
  },
  mqtt: {
    broker: 'mqtt://localhost:41883'
  },
  port: 43000
}

const environments: IEnvironments = {
  development: {},
  production: {
    db: {
      host: 'postgis',
      port: 5432
    }
  },
  'unit-test': testConfig,
  'integration-test': testConfig,
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
