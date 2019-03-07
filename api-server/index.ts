import API from './api'
import config, { IConfig } from './config'
import DB from './db'

console.log('Starting SignalK Stash..')

DB.ensureTables().then(() => startApi(config, DB))

function startApi(config: IConfig, db) {
  const api = new API(config, db)
  api.start()
}

process.on('unhandledRejection', error => {
  console.error('Unhandled promise exception:', error)
  process.exit(1)
})
