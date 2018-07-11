import * as R from 'ramda'

const baseConfig = {
  db: {
    host: 'localhost',
    port: 50400,
    database: 'signalk',
    user: 'signalk',
    password: 'signalk'
  },
  port: 3000
}

const environments = {
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
const config = R.mergeDeepRight(baseConfig, environments[environment])
console.log(`Using ${environment} config:\n${JSON.stringify(config, null, 2)}`)
export default config
