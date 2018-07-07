import config from './config.json'
import DB from './db'
import API from './api'

console.log('Starting SignalK Stash..')

const db = new DB(config.db)

db.ensureTables().then(() => startApi(config, db))

function startApi(config, db) {
  const api = new API(config, db)
  api.start()
}

process.on('unhandledRejection', error => {
  console.error('Unhandled promise exception:', error)
})
