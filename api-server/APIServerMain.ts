import { Express } from 'express'
import _ from 'lodash'
import API from './API'
import config, { IConfig } from './Config'
import DB from './db/StashDB'

export type ExpressAppCustomizer = (app: Express) => void

function startAPIServer(routeCustomizer: ExpressAppCustomizer = _.noop) {
  console.log('Starting SignalK Stash..')

  DB.ensureTables()
    .then(() => startApi(config as IConfig, routeCustomizer))
    .catch(err => {
      console.error(err)
    })

  process.on('unhandledRejection', error => {
    console.error('Unhandled promise exception:', error)
    process.exit(1)
  })
}

async function startApi(config: IConfig, customizer: ExpressAppCustomizer) {
  const api = new API(config, customizer)
  await api.start()
}

export default startAPIServer
