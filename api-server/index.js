import config from './config'
import DB from './db'
import API from './api'

console.log('Starting SignalK Stash..')

DB.ensureTables().then(() => startApi(config, DB))

function startApi(config, db) {
  const api = new API(config, db)
  api.start()
}

process.on('unhandledRejection', error => {
  console.error('Unhandled promise exception:', error)
})
