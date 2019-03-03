import * as express from 'express'

class API {
  private readonly config
  private readonly db
  private readonly app

  constructor(config, db) {
    this.config = config
    this.db = db
    this.app = express()
  }

  start() {
    this.app.listen(this.config.port, () =>
      console.log(`Listening on port ${this.config.port}!`)
    )
  }
}

export default API
