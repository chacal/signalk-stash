import { Duration } from 'js-joda'
import _ from 'lodash'

const isDeveloping = process.env.ENVIRONMENT === undefined
const isUnitTesting = process.env.ENVIRONMENT === 'unit-test'
const isIntegrationTesting = process.env.ENVIRONMENT === 'integration-test'
const isTesting = isUnitTesting || isIntegrationTesting
const isProduction = process.env.ENVIRONMENT === 'production'

interface StringIndexable {
  [propName: string]: string | number | boolean | {}
}

export interface MqttConfig {
  username: string
  password: string
  broker: string
}

export interface IConfig extends StringIndexable {
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
  isProduction: boolean
  mqtt: MqttConfig
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
  isProduction,
  mqtt: {
    username: 'runner',
    password: 'runnerpasswort',
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
    },
    clickhouse: {
      host: 'clickhouse',
      port: 8123
    },
    mqtt: {
      broker: 'mqtt://mqtt'
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
if (!environments[environment]) {
  throw new Error(
    `No such environment:${environment} (${Object.keys(environments)})`
  )
}
const config = _.merge(baseConfig, environments[environment])
if (config.isProduction) {
  overrideFromEnvironment(config)
}
console.log(`Using ${environment} config:\n${JSON.stringify(config, null, 2)}`)

export default config

export function overrideFromEnvironment(
  values: StringIndexable,
  prefix: string = 'SIGNALK_STASH_PROD_'
) {
  Object.keys(values).forEach(key => {
    const value = values[key]
    let keyPrefix = (prefix + key).toUpperCase()

    // Replace hyphens, local references, dots, double underscores and slashes.
    keyPrefix = keyPrefix.replace(/-|\.\/|\.|__|\//g, '_')

    if (process.env[keyPrefix] !== undefined) {
      let newValue
      try {
        // Try to parse the the environment variable and use it as object or array if possible.
        newValue = JSON.parse(process.env[keyPrefix] as string)
      } catch (e) {
        // If we are not able ot parse the object, use it as a string.
        newValue = process.env[keyPrefix] as string
      }
      console.log(
        `Using ${keyPrefix} to override config. Old value: ${
          values[key]
        } New value: ${newValue}`
      )
      values[key] = newValue
    } else if (typeof value === 'object') {
      overrideFromEnvironment(value, `${keyPrefix}_`)
    }
  })
}
