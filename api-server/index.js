const config = require('./config.json')
const DB = require('./db')
const API = require('./api')

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
