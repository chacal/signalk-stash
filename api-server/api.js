const express = require('express')

class API {
  constructor(config, db) {
    this.config = config
    this.db = db
    this.app = express()
  }

  start() {
    this.app.listen(this.config.port, () => console.log(`Listening on port ${this.config.port}!`))
  }
}

module.exports = API
