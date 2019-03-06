import _ from 'lodash'

export interface IConfig {
  db: {
    host: string
    port: number
    database: string
    user: string
    password: string
  }
  port: number
}

interface IEnvironments {
  [key: string]: {}
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
  port: 3000
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
  }
}

const environment = process.env.ENVIRONMENT || 'development'
const config = _.merge(baseConfig, environments[environment])
console.log(`Using ${environment} config:\n${JSON.stringify(config, null, 2)}`)
export default config
