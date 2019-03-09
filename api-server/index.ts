import API from './API'
import config, { IConfig } from './Config'
import DB from './db/StashDB'

console.log('Starting SignalK Stash..')

DB.ensureTables().then(() => startApi(config))

function startApi(config: IConfig) {
  const api = new API(config)
  api.start()
}

process.on('unhandledRejection', error => {
  console.error('Unhandled promise exception:', error)
  process.exit(1)
})